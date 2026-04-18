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

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  kyc_note: string | null;
  notes: string | null;
  created_at: string;
}

export interface CustomerKyc {
  id: number;
  customer_id: number;
  storage_path: string;
  mime_type: string | null;
  label: string | null;
  uploaded_at: string;
}

export type BookingStatus = 'reserved' | 'active' | 'closed' | 'cancelled';

export interface Booking {
  id: number;
  customer_id: number | null;
  start_at: string;
  end_at: string;
  quoted_rate_paise: number;
  quoted_total_paise: number;
  deposit_held_paise: number;
  deposit_refunded_paise: number;
  deposit_retained_paise: number;
  odo_out_km: number | null;
  odo_in_km: number | null;
  fuel_out_pct: number | null;
  fuel_in_pct: number | null;
  platform: string;
  platform_fee_pct: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
}

export interface TxnReceipt {
  id: number;
  txn_id: number;
  storage_path: string;
  mime_type: string | null;
  uploaded_at: string;
}
