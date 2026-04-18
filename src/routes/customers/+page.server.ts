import type { PageServerLoad } from './$types';
import type { Customer } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  let query = locals.supabase
    .from('customer')
    .select('id, name, phone, kyc_note, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query.returns<Customer[]>();
  return {
    customers: data ?? [],
    error: error?.message ?? null,
    filters: { q }
  };
};
