import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

const MAX_KYC_BYTES = 8 * 1024 * 1024;
const KYC_MIME = /^image\/(png|jpe?g|webp|heic|heif)$|^application\/pdf$/i;

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || null;
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!name) {
      return fail(400, { message: 'Name is required', values: { name, phone, notes } });
    }

    const kycFiles = data.getAll('kyc').filter((v): v is File => v instanceof File && v.size > 0);
    for (const f of kycFiles) {
      if (f.size > MAX_KYC_BYTES) {
        return fail(400, { message: `"${f.name}" exceeds 8 MB`, values: { name, phone, notes } });
      }
      if (!KYC_MIME.test(f.type)) {
        return fail(400, { message: `"${f.name}" must be an image or PDF`, values: { name, phone, notes } });
      }
    }

    const { data: inserted, error } = await locals.supabase
      .from('customer')
      .insert({ name, phone, notes })
      .select('id')
      .single();
    if (error || !inserted) {
      return fail(500, { message: error?.message ?? 'Insert failed', values: { name, phone, notes } });
    }

    for (const file of kycFiles) {
      const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
      const path = `${inserted.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error: upErr } = await locals.supabase.storage
        .from('kyc')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        return fail(500, {
          message: `Customer saved (#${inserted.id}) but KYC upload failed: ${upErr.message}`,
          values: { name, phone, notes }
        });
      }
      const { error: insErr } = await locals.supabase
        .from('customer_kyc')
        .insert({ customer_id: inserted.id, storage_path: path, mime_type: file.type, label: file.name });
      if (insErr) {
        await locals.supabase.storage.from('kyc').remove([path]);
        return fail(500, {
          message: `Customer saved (#${inserted.id}) but KYC DB insert failed: ${insErr.message}`,
          values: { name, phone, notes }
        });
      }
    }

    throw redirect(303, `/customers/${inserted.id}`);
  }
};
