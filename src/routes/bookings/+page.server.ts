import type { PageServerLoad } from './$types';

type BookingRow = {
  id: number;
  start_at: string;
  end_at: string;
  quoted_total_paise: number;
  deposit_held_paise: number;
  platform: string;
  status: 'reserved' | 'active' | 'closed' | 'cancelled';
  customer: { id: number; name: string } | null;
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const status = url.searchParams.get('status') ?? '';
  const q = url.searchParams.get('q')?.trim() ?? '';

  let query = locals.supabase
    .from('booking')
    .select('id, start_at, end_at, quoted_total_paise, deposit_held_paise, platform, status, customer:customer_id(id, name)')
    .order('start_at', { ascending: false })
    .limit(200);

  if (status && ['reserved', 'active', 'closed', 'cancelled'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.returns<BookingRow[]>();
  let bookings = data ?? [];

  if (q) {
    const needle = q.toLowerCase();
    bookings = bookings.filter((b) => b.customer?.name.toLowerCase().includes(needle));
  }

  return {
    bookings,
    error: error?.message ?? null,
    filters: { status, q }
  };
};
