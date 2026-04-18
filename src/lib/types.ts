export type TxnKind = 'expense' | 'income' | 'settlement';

export interface Partner {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  kind: 'expense' | 'income';
}

export interface Txn {
  id: number;
  occurred_on: string; // YYYY-MM-DD
  created_at: string;
  kind: TxnKind;
  amount_paise: number;
  counterparty: number | null;
  category_id: number | null;
  booking_id: number | null;
  notes: string | null;
  voided_at: string | null;
  voided_reason: string | null;
}

export interface TxnShare {
  txn_id: number;
  partner_id: number;
  share_paise: number;
}

export interface PartnerBalance {
  id: number;
  name: string;
  balance_paise: number;
}

export interface TxnWithShares extends Txn {
  shares: TxnShare[];
  category?: Category | null;
  counterparty_partner?: Partner | null;
}
