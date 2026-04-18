import { error, fail, redirect } from '@sveltejs/kit';
import { rupeesToPaise } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';
import type { Booking, BookingStatus } from '$lib/types';

type LinkedTxn = {
  id: number;
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  notes: string | null;
  voided_at: string | null;
  category: { name: string } | null;
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [bookingRes, customerJoinRes, txnsRes] = await Promise.all([
    locals.supabase
      .from('booking')
      .select('id, customer_id, start_at, end_at, quoted_rate_paise, quoted_total_paise, deposit_held_paise, deposit_refunded_paise, deposit_retained_paise, odo_out_km, odo_in_km, fuel_out_pct, fuel_in_pct, platform, platform_fee_pct, status, notes, created_at')
      .eq('id', id)
      .maybeSingle(),
    locals.supabase
      .from('booking')
      .select('customer:customer_id(id, name, phone)')
      .eq('id', id)
      .maybeSingle(),
    locals.supabase
      .from('txn')
      .select('id, occurred_on, kind, amount_paise, notes, voided_at, category:category_id(name)')
      .eq('booking_id', id)
      .order('occurred_on', { ascending: false })
  ]);

  if (bookingRes.error) throw error(500, bookingRes.error.message);
  if (!bookingRes.data) throw error(404, 'Not found');

  const joined = customerJoinRes.data as { customer: unknown } | null;
  const c = joined?.customer;
  const customer = Array.isArray(c) ? (c[0] ?? null) : (c ?? null);

  return {
    booking: bookingRes.data as unknown as Booking,
    customer: customer as { id: number; name: string; phone: string | null } | null,
    txns: (txnsRes.data ?? []) as unknown as LinkedTxn[]
  };
};

async function updateBooking(
  supabase: App.Locals['supabase'],
  id: number,
  patch: Record<string, unknown>
) {
  return supabase.from('booking').update(patch).eq('id', id);
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export const actions: Actions = {
  activate: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const odo_out_km = intOrNull(data.get('odo_out_km'));
    const fuel_out_pct = intOrNull(data.get('fuel_out_pct'));
    if (fuel_out_pct != null && (fuel_out_pct < 0 || fuel_out_pct > 100)) {
      return fail(400, { message: 'Fuel % must be 0–100' });
    }
    const { error: upErr } = await updateBooking(locals.supabase, id, {
      status: 'active' as BookingStatus,
      odo_out_km,
      fuel_out_pct
    });
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  close: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const odo_in_km = intOrNull(data.get('odo_in_km'));
    const fuel_in_pct = intOrNull(data.get('fuel_in_pct'));
    if (fuel_in_pct != null && (fuel_in_pct < 0 || fuel_in_pct > 100)) {
      return fail(400, { message: 'Fuel % must be 0–100' });
    }

    let deposit_refunded_paise = 0;
    let deposit_retained_paise = 0;
    try {
      deposit_refunded_paise = rupeesToPaise(String(data.get('deposit_refunded') ?? '0') || '0');
      deposit_retained_paise = rupeesToPaise(String(data.get('deposit_retained') ?? '0') || '0');
    } catch {
      return fail(400, { message: 'Invalid deposit amount' });
    }

    const { error: upErr } = await updateBooking(locals.supabase, id, {
      status: 'closed' as BookingStatus,
      odo_in_km,
      fuel_in_pct,
      deposit_refunded_paise,
      deposit_retained_paise
    });
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  cancel: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: upErr } = await updateBooking(locals.supabase, id, { status: 'cancelled' as BookingStatus });
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  reopen: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: upErr } = await updateBooking(locals.supabase, id, { status: 'reserved' as BookingStatus });
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  },

  delete: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: delErr } = await locals.supabase.from('booking').delete().eq('id', id);
    if (delErr) return fail(409, { message: delErr.message });
    throw redirect(303, '/bookings');
  }
};
