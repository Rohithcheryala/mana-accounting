import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Booking, Customer, CustomerKyc } from '$lib/types';

const MAX_KYC_BYTES = 8 * 1024 * 1024;
const KYC_MIME = /^image\/(png|jpe?g|webp|heic|heif)$|^application\/pdf$/i;

type KycWithUrl = CustomerKyc & { signed_url: string | null };

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [customerRes, bookingsRes, kycRes] = await Promise.all([
    locals.supabase
      .from('customer')
      .select('id, name, phone, email, notes, created_at')
      .eq('id', id)
      .maybeSingle()
      .returns<Customer>(),
    locals.supabase
      .from('booking')
      .select('id, customer_id, start_at, end_at, quoted_rate_paise, quoted_total_paise, deposit_held_paise, deposit_refunded_paise, deposit_retained_paise, odo_out_km, odo_in_km, fuel_out_pct, fuel_in_pct, platform, platform_fee_pct, status, notes, created_at')
      .eq('customer_id', id)
      .order('start_at', { ascending: false })
      .returns<Booking[]>(),
    locals.supabase
      .from('customer_kyc')
      .select('id, customer_id, storage_path, mime_type, label, uploaded_at')
      .eq('customer_id', id)
      .order('uploaded_at', { ascending: false })
      .returns<CustomerKyc[]>()
  ]);

  if (customerRes.error) throw error(500, customerRes.error.message);
  if (!customerRes.data) throw error(404, 'Not found');

  const kyc: KycWithUrl[] = [];
  for (const k of kycRes.data ?? []) {
    const { data: signed } = await locals.supabase.storage
      .from('kyc')
      .createSignedUrl(k.storage_path, 60 * 60);
    kyc.push({ ...k, signed_url: signed?.signedUrl ?? null });
  }

  return {
    customer: customerRes.data,
    bookings: bookingsRes.data ?? [],
    kyc
  };
};

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || null;
    const email = String(data.get('email') ?? '').trim() || null;
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!name) return fail(400, { message: 'Name is required' });

    const { error: upErr } = await locals.supabase
      .from('customer')
      .update({ name, phone, email, notes })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  upload_kyc: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const files = data.getAll('kyc').filter((v): v is File => v instanceof File && v.size > 0);
    if (files.length === 0) return fail(400, { message: 'Pick at least one file' });

    for (const file of files) {
      if (file.size > MAX_KYC_BYTES) return fail(400, { message: `"${file.name}" exceeds 8 MB` });
      if (!KYC_MIME.test(file.type)) return fail(400, { message: `"${file.name}" must be an image or PDF` });

      const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
      const path = `${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: upErr } = await locals.supabase.storage
        .from('kyc')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) return fail(500, { message: `Upload failed: ${upErr.message}` });

      const { error: insErr } = await locals.supabase
        .from('customer_kyc')
        .insert({ customer_id: id, storage_path: path, mime_type: file.type, label: file.name });
      if (insErr) {
        await locals.supabase.storage.from('kyc').remove([path]);
        return fail(500, { message: `DB insert failed: ${insErr.message}` });
      }
    }
    return { ok: true };
  },

  delete_kyc: async ({ request, locals }) => {
    const data = await request.formData();
    const kycId = Number(data.get('kyc_id'));
    if (!Number.isFinite(kycId)) return fail(400, { message: 'Invalid id' });

    const { data: row, error: fetchErr } = await locals.supabase
      .from('customer_kyc')
      .select('storage_path')
      .eq('id', kycId)
      .maybeSingle();
    if (fetchErr) return fail(500, { message: fetchErr.message });
    if (!row) return fail(404, { message: 'Not found' });

    const { error: delErr } = await locals.supabase.from('customer_kyc').delete().eq('id', kycId);
    if (delErr) return fail(500, { message: delErr.message });

    await locals.supabase.storage.from('kyc').remove([(row as { storage_path: string }).storage_path]);
    return { ok: true };
  },

  delete: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: delErr } = await locals.supabase.from('customer').delete().eq('id', id);
    if (delErr) return fail(409, { message: delErr.message });
    throw redirect(303, '/customers');
  }
};
