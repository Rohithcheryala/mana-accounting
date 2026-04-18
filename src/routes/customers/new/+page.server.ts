import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || null;
    const kyc_note = String(data.get('kyc_note') ?? '').trim() || null;
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!name) return fail(400, { message: 'Name is required', values: { name, phone, kyc_note, notes } });

    const { data: inserted, error } = await locals.supabase
      .from('customer')
      .insert({ name, phone, kyc_note, notes })
      .select('id')
      .single();
    if (error || !inserted) return fail(500, { message: error?.message ?? 'Insert failed', values: { name, phone, kyc_note, notes } });

    throw redirect(303, `/customers/${inserted.id}`);
  }
};
