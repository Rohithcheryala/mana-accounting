import { fail, redirect } from '@sveltejs/kit';
import { rupeesToPaise, equalSplit } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/i;

async function attachReceipts(
  supabase: App.Locals['supabase'],
  txnId: number,
  files: File[]
): Promise<string | null> {
  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_RECEIPT_BYTES) return `"${file.name}" exceeds 8 MB`;
    if (!ALLOWED_MIME.test(file.type)) return `"${file.name}" is not an image or PDF`;

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
    const path = `${txnId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return `Upload failed: ${upErr.message}`;

    const { error: insErr } = await supabase
      .from('txn_receipt')
      .insert({ txn_id: txnId, storage_path: path, mime_type: file.type });
    if (insErr) {
      await supabase.storage.from('receipts').remove([path]);
      return `Receipt DB insert failed: ${insErr.message}`;
    }
  }
  return null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const preselectBookingId = url.searchParams.get('booking_id');
  const [partnersRes, categoriesRes, bookingsRes, usageRes] = await Promise.all([
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

  const usageCount = new Map<number, number>();
  for (const row of (usageRes.data ?? []) as Array<{ category_id: number | null }>) {
    if (row.category_id != null) {
      usageCount.set(row.category_id, (usageCount.get(row.category_id) ?? 0) + 1);
    }
  }
  const categories = (categoriesRes.data ?? []).map((c) => ({
    ...c,
    usage: usageCount.get(c.id) ?? 0
  }));
  type BookingOption = {
    id: number;
    start_at: string;
    end_at: string;
    status: string;
    customer: { name: string } | null;
  };

  const rawBookings = (bookingsRes.data ?? []) as Array<{
    id: number;
    start_at: string;
    end_at: string;
    status: string;
    customer: { name: string } | { name: string }[] | null;
  }>;

  const bookings: BookingOption[] = rawBookings.map((b) => ({
    id: b.id,
    start_at: b.start_at,
    end_at: b.end_at,
    status: b.status,
    customer: Array.isArray(b.customer) ? (b.customer[0] ?? null) : b.customer
  }));

  return {
    partners: partnersRes.data ?? [],
    categories,
    bookings,
    preselectBookingId: preselectBookingId ? Number(preselectBookingId) : null
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

    const receipts = data
      .getAll('receipts')
      .filter((v): v is File => v instanceof File && v.size > 0);

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

      if (receipts.length > 0) {
        const upErr = await attachReceipts(locals.supabase, inserted.id, receipts);
        if (upErr) return fail(500, { message: `Txn saved (#${inserted.id}) but receipts failed: ${upErr}` });
      }

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

    if (receipts.length > 0) {
      const upErr = await attachReceipts(locals.supabase, inserted.id, receipts);
      if (upErr) return fail(500, { message: `Txn saved (#${inserted.id}) but receipts failed: ${upErr}` });
    }

    throw redirect(303, receipts.length > 0 ? `/txn/${inserted.id}` : '/');
  }
};
