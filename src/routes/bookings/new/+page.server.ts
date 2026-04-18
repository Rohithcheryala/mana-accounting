import { fail, redirect } from '@sveltejs/kit';
import { rupeesToPaise } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';
import type { Customer } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const preselect = url.searchParams.get('customer_id');
  const { data } = await locals.supabase
    .from('customer')
    .select('id, name, phone, notes, created_at')
    .order('name')
    .returns<Customer[]>();

  return {
    customers: data ?? [],
    preselectedCustomerId: preselect ? Number(preselect) : null
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const values = Object.fromEntries(data);

    const customerMode = String(data.get('customer_mode') ?? 'existing');
    const customerIdRaw = String(data.get('customer_id') ?? '').trim();
    const newCustName = String(data.get('new_customer_name') ?? '').trim();
    const newCustPhone = String(data.get('new_customer_phone') ?? '').trim() || null;

    const start = String(data.get('start_at') ?? '').trim();
    const end = String(data.get('end_at') ?? '').trim();
    const rateStr = String(data.get('quoted_rate') ?? '').trim();
    const totalStr = String(data.get('quoted_total') ?? '').trim();
    const depositStr = String(data.get('deposit') ?? '').trim() || '0';
    const platform = String(data.get('platform') ?? 'direct').trim() || 'direct';
    const platformFeeStr = String(data.get('platform_fee_pct') ?? '').trim() || '0';
    const notes = String(data.get('notes') ?? '').trim() || null;

    let customerId: number | null = null;
    if (customerMode === 'new') {
      if (!newCustName) return fail(400, { message: 'Customer name is required', values });
      const { data: cust, error: custErr } = await locals.supabase
        .from('customer')
        .insert({ name: newCustName, phone: newCustPhone })
        .select('id')
        .single();
      if (custErr || !cust) return fail(500, { message: `Customer create failed: ${custErr?.message ?? 'unknown'}`, values });
      customerId = cust.id;
    } else {
      if (!customerIdRaw) return fail(400, { message: 'Pick a customer', values });
      customerId = Number(customerIdRaw);
    }

    if (!start || !end) return fail(400, { message: 'Start and end required', values });
    if (new Date(end) <= new Date(start)) return fail(400, { message: 'End must be after start', values });

    let quoted_rate_paise = 0;
    let quoted_total_paise = 0;
    let deposit_held_paise = 0;
    let platform_fee_pct = 0;
    try {
      quoted_rate_paise = rupeesToPaise(rateStr || '0');
      quoted_total_paise = rupeesToPaise(totalStr || '0');
      deposit_held_paise = rupeesToPaise(depositStr);
      platform_fee_pct = Number(platformFeeStr);
    } catch {
      return fail(400, { message: 'Invalid number', values });
    }
    if (!Number.isFinite(platform_fee_pct) || platform_fee_pct < 0 || platform_fee_pct > 100) {
      return fail(400, { message: 'Platform fee % must be 0–100', values });
    }
    if (quoted_total_paise < 0 || quoted_rate_paise < 0 || deposit_held_paise < 0) {
      return fail(400, { message: 'Amounts must be ≥ 0', values });
    }

    const { data: inserted, error } = await locals.supabase
      .from('booking')
      .insert({
        customer_id: customerId,
        start_at: start,
        end_at: end,
        quoted_rate_paise,
        quoted_total_paise,
        deposit_held_paise,
        platform,
        platform_fee_pct,
        notes,
        status: 'reserved'
      })
      .select('id')
      .single();
    if (error || !inserted) return fail(500, { message: error?.message ?? 'Insert failed', values });

    throw redirect(303, `/bookings/${inserted.id}`);
  }
};
