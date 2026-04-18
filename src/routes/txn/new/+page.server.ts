import { fail, redirect } from '@sveltejs/kit';
import { rupeesToPaise, equalSplit } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const [partnersRes, categoriesRes] = await Promise.all([
    locals.supabase.from('partner').select('id, name').order('id'),
    locals.supabase.from('category').select('id, name, kind').order('name')
  ]);
  return {
    partners: partnersRes.data ?? [],
    categories: categoriesRes.data ?? []
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();

    const kind = String(data.get('kind') ?? '');
    const amountRupees = String(data.get('amount') ?? '').trim();
    const occurredOn = String(data.get('occurred_on') ?? '');
    const counterpartyRaw = String(data.get('counterparty') ?? '');
    const categoryRaw = String(data.get('category_id') ?? '');
    const bookingRaw = String(data.get('booking_id') ?? '');
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!['expense', 'income', 'settlement'].includes(kind)) {
      return fail(400, { message: 'Invalid kind', values: Object.fromEntries(data) });
    }
    let amountPaise: number;
    try {
      amountPaise = rupeesToPaise(amountRupees);
    } catch {
      return fail(400, { message: 'Invalid amount', values: Object.fromEntries(data) });
    }
    if (amountPaise <= 0) {
      return fail(400, { message: 'Amount must be > 0', values: Object.fromEntries(data) });
    }
    if (!occurredOn) {
      return fail(400, { message: 'Date required', values: Object.fromEntries(data) });
    }

    const counterparty = counterpartyRaw ? Number(counterpartyRaw) : null;
    const categoryId = categoryRaw ? Number(categoryRaw) : null;
    const bookingId = bookingRaw ? Number(bookingRaw) : null;

    // shares
    const partnersRes = await locals.supabase.from('partner').select('id').order('id');
    const partners = partnersRes.data ?? [];
    const shares: { partner_id: number; share_paise: number }[] = [];

    if (kind === 'settlement') {
      // settlement specific
      const fromRaw = String(data.get('settle_from') ?? '');
      const toRaw = String(data.get('settle_to') ?? '');
      if (!fromRaw || !toRaw || fromRaw === toRaw) {
        return fail(400, { message: 'Pick two different partners' });
      }
      // insert txn and settlement row; no shares
      const { data: inserted, error: insErr } = await locals.supabase
        .from('txn')
        .insert({
          occurred_on: occurredOn,
          kind: 'settlement',
          amount_paise: amountPaise,
          counterparty: null,
          category_id: null,
          booking_id: null,
          notes
        })
        .select('id')
        .single();
      if (insErr || !inserted) return fail(500, { message: insErr?.message ?? 'Insert failed' });

      const { error: sErr } = await locals.supabase.from('settlement').insert({
        txn_id: inserted.id,
        from_partner: Number(fromRaw),
        to_partner: Number(toRaw)
      });
      if (sErr) return fail(500, { message: sErr.message });

      throw redirect(303, `/txn/${inserted.id}`);
    }

    // expense / income: read per-partner shares from the form
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
      // Fall back to equal split if user didn't adjust (all zero) OR return error otherwise
      const allZero = shares.every((s) => s.share_paise === 0);
      if (allZero) {
        const parts = equalSplit(amountPaise, partners.length);
        shares.forEach((s, i) => (s.share_paise = parts[i]));
      } else {
        return fail(400, { message: `Shares sum to ${providedSum / 100}; amount is ${amountPaise / 100}` });
      }
    }

    const { data: inserted, error: insErr } = await locals.supabase
      .from('txn')
      .insert({
        occurred_on: occurredOn,
        kind,
        amount_paise: amountPaise,
        counterparty,
        category_id: categoryId,
        booking_id: bookingId,
        notes
      })
      .select('id')
      .single();
    if (insErr || !inserted) return fail(500, { message: insErr?.message ?? 'Insert failed' });

    const rows = shares.map((s) => ({ ...s, txn_id: inserted.id }));
    const { error: sErr } = await locals.supabase.from('txn_share').insert(rows);
    if (sErr) {
      // Clean up the partial txn row.
      await locals.supabase.from('txn').delete().eq('id', inserted.id);
      return fail(500, { message: sErr.message });
    }

    throw redirect(303, '/');
  }
};
