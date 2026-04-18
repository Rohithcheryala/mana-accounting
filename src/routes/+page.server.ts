import type { PageServerLoad } from './$types';
import type { PartnerBalance } from '$lib/types';

type RecentTxn = {
  id: number;
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  notes: string | null;
  category: { name: string } | null;
};

export const load: PageServerLoad = async ({ locals }) => {
  const [balancesRes, recentRes] = await Promise.all([
    locals.supabase
      .from('partner_balance')
      .select('id, name, balance_paise')
      .order('id')
      .returns<PartnerBalance[]>(),
    locals.supabase
      .from('txn')
      .select('id, occurred_on, kind, amount_paise, notes, category:category_id(name)')
      .is('voided_at', null)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10)
      .returns<RecentTxn[]>()
  ]);

  return {
    balances: balancesRes.data ?? [],
    recent: recentRes.data ?? [],
    balancesError: balancesRes.error?.message ?? null,
    recentError: recentRes.error?.message ?? null
  };
};
