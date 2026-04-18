import type { PageServerLoad } from './$types';
import type { Customer } from '$lib/types';

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  let query = locals.supabase
    .from('customer')
    .select('id, name, phone, email, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) {
    const safeQ = q.replace(/[,()*]/g, ' ');
    query = query.or(`name.ilike.*${safeQ}*,phone.ilike.*${safeQ}*,email.ilike.*${safeQ}*`);
  }

  const { data, error } = await query.returns<Customer[]>();
  return {
    customers: data ?? [],
    error: error?.message ?? null,
    filters: { q }
  };
};
