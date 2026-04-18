import type { PageServerLoad } from './$types';

type ListTxn = {
  id: number;
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  notes: string | null;
  counterparty: number | null;
  voided_at: string | null;
  category: { name: string } | null;
  shares: { partner_id: number; share_paise: number }[];
};

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const kind = url.searchParams.get('kind') ?? '';
  const month = url.searchParams.get('month') ?? ''; // 'YYYY-MM'
  const partnerId = url.searchParams.get('partner') ?? '';

  let query = locals.supabase
    .from('txn')
    .select(
      'id, occurred_on, kind, amount_paise, notes, counterparty, voided_at, category:category_id(name), shares:txn_share(partner_id, share_paise)'
    )
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200);

  if (q) query = query.ilike('notes', `%${q}%`);
  if (kind && ['expense', 'income', 'settlement'].includes(kind)) query = query.eq('kind', kind);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    query = query.gte('occurred_on', start).lt('occurred_on', nextMonth);
  }
  if (partnerId) query = query.eq('counterparty', Number(partnerId));

  const [txnRes, partnersRes] = await Promise.all([
    query.returns<ListTxn[]>(),
    locals.supabase.from('partner').select('id, name').order('id')
  ]);

  return {
    txns: txnRes.data ?? [],
    partners: partnersRes.data ?? [],
    error: txnRes.error?.message ?? null,
    filters: { q, kind, month, partner: partnerId }
  };
};
