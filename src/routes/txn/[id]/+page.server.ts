import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type DetailTxn = {
  id: number;
  occurred_on: string;
  created_at: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  counterparty: number | null;
  category_id: number | null;
  booking_id: number | null;
  notes: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  category: { id: number; name: string; kind: 'expense' | 'income' } | null;
  booking: { id: number; start_at: string; end_at: string; status: string; customer: { name: string } | null } | null;
};

type ReceiptRow = {
  id: number;
  storage_path: string;
  mime_type: string | null;
  uploaded_at: string;
  signed_url: string | null;
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [txnRes, sharesRes, partnersRes, settleRes, receiptsRes] = await Promise.all([
    locals.supabase
      .from('txn')
      .select(
        'id, occurred_on, created_at, kind, amount_paise, counterparty, category_id, booking_id, notes, voided_at, voided_reason, category:category_id(id, name, kind), booking:booking_id(id, start_at, end_at, status, customer:customer_id(name))'
      )
      .eq('id', id)
      .maybeSingle()
      .returns<DetailTxn>(),
    locals.supabase.from('txn_share').select('partner_id, share_paise').eq('txn_id', id),
    locals.supabase.from('partner').select('id, name').order('id'),
    locals.supabase.from('settlement').select('from_partner, to_partner').eq('txn_id', id).maybeSingle(),
    locals.supabase
      .from('txn_receipt')
      .select('id, storage_path, mime_type, uploaded_at')
      .eq('txn_id', id)
      .order('uploaded_at', { ascending: false })
  ]);

  if (txnRes.error) throw error(500, txnRes.error.message);
  if (!txnRes.data) throw error(404, 'Not found');

  const receipts: ReceiptRow[] = [];
  for (const r of receiptsRes.data ?? []) {
    const { data: signed } = await locals.supabase.storage
      .from('receipts')
      .createSignedUrl(r.storage_path, 60 * 60);
    receipts.push({ ...r, signed_url: signed?.signedUrl ?? null });
  }

  return {
    txn: txnRes.data,
    shares: sharesRes.data ?? [],
    partners: partnersRes.data ?? [],
    settlement: settleRes.data,
    receipts
  };
};

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/i;

export const actions: Actions = {
  void: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const reason = String(data.get('reason') ?? '').trim() || null;
    const { error: upErr } = await locals.supabase
      .from('txn')
      .update({ voided_at: new Date().toISOString(), voided_reason: reason })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    throw redirect(303, '/txn');
  },

  unvoid: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: upErr } = await locals.supabase
      .from('txn')
      .update({ voided_at: null, voided_reason: null })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  upload_receipt: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Pick a file to upload' });
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      return fail(400, { message: `File too large (max ${MAX_RECEIPT_BYTES / (1024 * 1024)} MB)` });
    }
    if (!ALLOWED_MIME.test(file.type)) {
      return fail(400, { message: 'Only images or PDF allowed' });
    }

    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
    const path = `${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: upErr } = await locals.supabase.storage
      .from('receipts')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return fail(500, { message: `Upload failed: ${upErr.message}` });

    const { error: insErr } = await locals.supabase
      .from('txn_receipt')
      .insert({ txn_id: id, storage_path: path, mime_type: file.type });
    if (insErr) {
      await locals.supabase.storage.from('receipts').remove([path]);
      return fail(500, { message: `DB insert failed: ${insErr.message}` });
    }
    return { ok: true };
  },

  delete_receipt: async ({ request, locals }) => {
    const data = await request.formData();
    const receiptId = Number(data.get('receipt_id'));
    if (!Number.isFinite(receiptId)) return fail(400, { message: 'Invalid receipt id' });

    const { data: row, error: fetchErr } = await locals.supabase
      .from('txn_receipt')
      .select('storage_path')
      .eq('id', receiptId)
      .maybeSingle();
    if (fetchErr) return fail(500, { message: fetchErr.message });
    if (!row) return fail(404, { message: 'Receipt not found' });

    const { error: delErr } = await locals.supabase.from('txn_receipt').delete().eq('id', receiptId);
    if (delErr) return fail(500, { message: delErr.message });

    await locals.supabase.storage.from('receipts').remove([row.storage_path]);
    return { ok: true };
  }
};
