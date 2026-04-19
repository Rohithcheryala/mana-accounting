import { error, fail, redirect } from '@sveltejs/kit';
import { equalSplit, rupeesToPaise } from '$lib/money';
import { snapshotTxn, writeAudit } from '$lib/server/txn-audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [txnRes, sharesRes, settleRes, partnersRes, categoriesRes, bookingsRes, usageRes] =
    await Promise.all([
      locals.supabase
        .from('txn')
        .select('id, occurred_on, kind, amount_paise, counterparty, category_id, booking_id, notes, voided_at')
        .eq('id', id)
        .maybeSingle(),
      locals.supabase.from('txn_share').select('partner_id, share_paise').eq('txn_id', id),
      locals.supabase.from('settlement').select('from_partner, to_partner').eq('txn_id', id).maybeSingle(),
      locals.supabase.from('partner').select('id, name').order('id'),
      locals.supabase.from('category').select('id, name, kind').order('name'),
      locals.supabase
        .from('booking')
        .select('id, start_at, end_at, status, customer:customer_id(name)')
        .in('status', ['reserved', 'active', 'closed'])
        .order('start_at', { ascending: false })
        .limit(50),
      locals.supabase
        .from('txn')
        .select('category_id')
        .not('category_id', 'is', null)
        .is('voided_at', null)
        .limit(2000)
    ]);

  if (txnRes.error) throw error(500, txnRes.error.message);
  if (!txnRes.data) throw error(404, 'Not found');

  const usageCount = new Map<number, number>();
  for (const row of (usageRes.data ?? []) as Array<{ category_id: number | null }>) {
    if (row.category_id != null) usageCount.set(row.category_id, (usageCount.get(row.category_id) ?? 0) + 1);
  }
  const categories = (categoriesRes.data ?? []).map((c) => ({
    ...c,
    usage: usageCount.get(c.id) ?? 0
  }));

  const rawBookings = (bookingsRes.data ?? []) as Array<{
    id: number;
    start_at: string;
    end_at: string;
    status: string;
    customer: { name: string } | { name: string }[] | null;
  }>;
  const bookings = rawBookings.map((b) => ({
    id: b.id,
    start_at: b.start_at,
    end_at: b.end_at,
    status: b.status,
    customer: Array.isArray(b.customer) ? (b.customer[0] ?? null) : b.customer
  }));

  return {
    txn: txnRes.data,
    shares: sharesRes.data ?? [],
    settlement: settleRes.data,
    partners: partnersRes.data ?? [],
    categories,
    bookings
  };
};

export const actions: Actions = {
  default: async ({ request, locals, params }) => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return fail(400, { message: 'Invalid id' });

    const data = await request.formData();
    const amountRupees = String(data.get('amount') ?? '').trim();
    const occurredOn = String(data.get('occurred_on') ?? '');
    const counterpartyRaw = String(data.get('counterparty') ?? '');
    const categoryRaw = String(data.get('category_id') ?? '');
    const bookingRaw = String(data.get('booking_id') ?? '');
    const notes = String(data.get('notes') ?? '').trim() || null;
    const changeNote = String(data.get('change_note') ?? '').trim() || null;

    const before = await snapshotTxn(locals.supabase, id);
    if (!before) return fail(404, { message: 'Not found' });
    if (before.voided_at) return fail(400, { message: 'Voided transactions cannot be edited. Restore it first.' });

    let amountPaise: number;
    try {
      amountPaise = rupeesToPaise(amountRupees);
    } catch {
      return fail(400, { message: 'Invalid amount' });
    }
    if (amountPaise <= 0) return fail(400, { message: 'Amount must be > 0' });
    if (!occurredOn) return fail(400, { message: 'Date required' });

    const kind = before.kind;
    const counterparty = counterpartyRaw && kind !== 'settlement' ? Number(counterpartyRaw) : null;
    const categoryId = categoryRaw && kind !== 'settlement' ? Number(categoryRaw) : null;
    const bookingId = bookingRaw && kind !== 'settlement' ? Number(bookingRaw) : null;

    if (kind === 'settlement') {
      const fromRaw = String(data.get('settle_from') ?? '');
      const toRaw = String(data.get('settle_to') ?? '');
      if (!fromRaw || !toRaw || fromRaw === toRaw) {
        return fail(400, { message: 'Pick two different partners' });
      }
      const { error: upErr } = await locals.supabase
        .from('txn')
        .update({ occurred_on: occurredOn, amount_paise: amountPaise, notes })
        .eq('id', id);
      if (upErr) return fail(500, { message: upErr.message });

      const { error: sErr } = await locals.supabase
        .from('settlement')
        .update({ from_partner: Number(fromRaw), to_partner: Number(toRaw) })
        .eq('txn_id', id);
      if (sErr) return fail(500, { message: sErr.message });
    } else {
      const partnersRes = await locals.supabase.from('partner').select('id').order('id');
      const partners = partnersRes.data ?? [];
      const shares: { partner_id: number; share_paise: number }[] = [];
      let providedSum = 0;
      for (const p of partners) {
        const raw = String(data.get(`share_${p.id}`) ?? '').trim();
        const rupees = raw === '' ? 0 : Number(raw);
        if (!Number.isFinite(rupees) || rupees < 0) {
          return fail(400, { message: `Invalid share for partner ${p.id}` });
        }
        const paise = Math.round(rupees * 100);
        shares.push({ partner_id: p.id, share_paise: paise });
        providedSum += paise;
      }
      if (providedSum !== amountPaise) {
        const allZero = shares.every((s) => s.share_paise === 0);
        if (allZero) {
          const parts = equalSplit(amountPaise, partners.length);
          shares.forEach((s, i) => (s.share_paise = parts[i]));
        } else {
          return fail(400, {
            message: `Shares sum to ${providedSum / 100}; amount is ${amountPaise / 100}`
          });
        }
      }

      const { error: upErr } = await locals.supabase
        .from('txn')
        .update({
          occurred_on: occurredOn,
          amount_paise: amountPaise,
          counterparty,
          category_id: categoryId,
          booking_id: bookingId,
          notes
        })
        .eq('id', id);
      if (upErr) return fail(500, { message: upErr.message });

      // Replace shares atomically (sum invariant is deferrable so delete + insert inside the same statement pairing is fine).
      const { error: delErr } = await locals.supabase.from('txn_share').delete().eq('txn_id', id);
      if (delErr) return fail(500, { message: delErr.message });
      const rows = shares.map((s) => ({ ...s, txn_id: id }));
      const { error: insErr } = await locals.supabase.from('txn_share').insert(rows);
      if (insErr) return fail(500, { message: insErr.message });
    }

    const after = await snapshotTxn(locals.supabase, id);
    await writeAudit(locals.supabase, {
      txnId: id,
      action: 'edit',
      before,
      after,
      changedBy: locals.user?.id ?? null,
      note: changeNote
    });

    throw redirect(303, `/txn/${id}`);
  }
};
