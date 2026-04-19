import type { SupabaseClient } from '@supabase/supabase-js';

export type TxnSnapshot = {
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  counterparty: number | null;
  category_id: number | null;
  booking_id: number | null;
  notes: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  shares: Array<{ partner_id: number; share_paise: number }>;
  settlement: { from_partner: number; to_partner: number } | null;
};

export async function snapshotTxn(
  supabase: SupabaseClient,
  txnId: number
): Promise<TxnSnapshot | null> {
  const [txnRes, sharesRes, settleRes] = await Promise.all([
    supabase
      .from('txn')
      .select('occurred_on, kind, amount_paise, counterparty, category_id, booking_id, notes, voided_at, voided_reason')
      .eq('id', txnId)
      .maybeSingle(),
    supabase
      .from('txn_share')
      .select('partner_id, share_paise')
      .eq('txn_id', txnId)
      .order('partner_id'),
    supabase
      .from('settlement')
      .select('from_partner, to_partner')
      .eq('txn_id', txnId)
      .maybeSingle()
  ]);
  if (!txnRes.data) return null;
  const t = txnRes.data as Omit<TxnSnapshot, 'shares' | 'settlement'>;
  return {
    ...t,
    shares: (sharesRes.data ?? []) as TxnSnapshot['shares'],
    settlement: (settleRes.data ?? null) as TxnSnapshot['settlement']
  };
}

export async function writeAudit(
  supabase: SupabaseClient,
  opts: {
    txnId: number;
    action: 'create' | 'edit' | 'void' | 'unvoid';
    before?: TxnSnapshot | null;
    after?: TxnSnapshot | null;
    changedBy?: string | null;
    note?: string | null;
  }
) {
  await supabase.from('txn_audit').insert({
    txn_id: opts.txnId,
    action: opts.action,
    before: opts.before ?? null,
    after: opts.after ?? null,
    changed_by: opts.changedBy ?? null,
    note: opts.note ?? null
  });
}
