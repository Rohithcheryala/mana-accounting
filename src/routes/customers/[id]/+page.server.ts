import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Booking, Customer } from '$lib/types';

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [customerRes, bookingsRes] = await Promise.all([
    locals.supabase
      .from('customer')
      .select('id, name, phone, kyc_note, notes, created_at')
      .eq('id', id)
      .maybeSingle()
      .returns<Customer>(),
    locals.supabase
      .from('booking')
      .select('id, customer_id, start_at, end_at, quoted_rate_paise, quoted_total_paise, deposit_held_paise, deposit_refunded_paise, deposit_retained_paise, odo_out_km, odo_in_km, fuel_out_pct, fuel_in_pct, platform, platform_fee_pct, status, notes, created_at')
      .eq('customer_id', id)
      .order('start_at', { ascending: false })
      .returns<Booking[]>()
  ]);

  if (customerRes.error) throw error(500, customerRes.error.message);
  if (!customerRes.data) throw error(404, 'Not found');

  return {
    customer: customerRes.data,
    bookings: bookingsRes.data ?? []
  };
};

export const actions: Actions = {
  update: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim() || null;
    const kyc_note = String(data.get('kyc_note') ?? '').trim() || null;
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!name) return fail(400, { message: 'Name is required' });

    const { error: upErr } = await locals.supabase
      .from('customer')
      .update({ name, phone, kyc_note, notes })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  delete: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: delErr } = await locals.supabase.from('customer').delete().eq('id', id);
    if (delErr) return fail(409, { message: delErr.message });
    throw redirect(303, '/customers');
  }
};
