import type { PageServerLoad } from './$types';

type ReviewTxn = {
  id: number;
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  counterparty: number | null;
  category: { name: string; kind: 'expense' | 'income' } | null;
  shares: { partner_id: number; share_paise: number }[];
};

type BookingRow = {
  id: number;
  start_at: string;
  end_at: string;
  status: 'reserved' | 'active' | 'closed' | 'cancelled';
  quoted_total_paise: number;
  deposit_held_paise: number;
  deposit_refunded_paise: number;
  deposit_retained_paise: number;
};

function currentYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month: string): { start: string; nextStart: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const nextStart = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start, nextStart };
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const month = url.searchParams.get('month') || currentYYYYMM();
  const range = monthRange(month);
  if (!range) return {
    month,
    error: 'Invalid month',
    summary: null,
    partners: [],
    categoryBreakdown: [],
    partnerBreakdown: [],
    bookings: { count: 0, active: 0, closed: 0, cancelled: 0, reserved: 0, revenuePaise: 0, depositsHeldPaise: 0, depositsRetainedPaise: 0 }
  };

  const [txnsRes, partnersRes, bookingsRes] = await Promise.all([
    locals.supabase
      .from('txn')
      .select('id, occurred_on, kind, amount_paise, counterparty, category:category_id(name, kind), shares:txn_share(partner_id, share_paise)')
      .is('voided_at', null)
      .gte('occurred_on', range.start)
      .lt('occurred_on', range.nextStart)
      .returns<ReviewTxn[]>(),
    locals.supabase.from('partner').select('id, name').order('id'),
    locals.supabase
      .from('booking')
      .select('id, start_at, end_at, status, quoted_total_paise, deposit_held_paise, deposit_refunded_paise, deposit_retained_paise')
      .gte('start_at', range.start)
      .lt('start_at', range.nextStart)
      .returns<BookingRow[]>()
  ]);

  const txns = txnsRes.data ?? [];
  const partners = partnersRes.data ?? [];
  const bookings = bookingsRes.data ?? [];

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;
  const categoryMap = new Map<string, { name: string; kind: 'expense' | 'income'; total: number; count: number }>();

  const perPartner = new Map<number, { id: number; name: string; cashInPaise: number; cashOutPaise: number; shareIncomePaise: number; shareExpensePaise: number }>();
  for (const p of partners) {
    perPartner.set(p.id, { id: p.id, name: p.name, cashInPaise: 0, cashOutPaise: 0, shareIncomePaise: 0, shareExpensePaise: 0 });
  }

  for (const t of txns) {
    if (t.kind === 'income') totalIncomePaise += t.amount_paise;
    else if (t.kind === 'expense') totalExpensePaise += t.amount_paise;

    if (t.category && t.kind !== 'settlement') {
      const key = `${t.category.kind}:${t.category.name}`;
      const entry = categoryMap.get(key) ?? { name: t.category.name, kind: t.category.kind, total: 0, count: 0 };
      entry.total += t.amount_paise;
      entry.count += 1;
      categoryMap.set(key, entry);
    }

    if (t.counterparty != null) {
      const p = perPartner.get(t.counterparty);
      if (p) {
        if (t.kind === 'expense') p.cashOutPaise += t.amount_paise;
        else if (t.kind === 'income') p.cashInPaise += t.amount_paise;
      }
    }
    for (const s of t.shares ?? []) {
      const p = perPartner.get(s.partner_id);
      if (!p) continue;
      if (t.kind === 'expense') p.shareExpensePaise += s.share_paise;
      else if (t.kind === 'income') p.shareIncomePaise += s.share_paise;
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

  const bookingSummary = {
    count: bookings.length,
    active: bookings.filter((b) => b.status === 'active').length,
    closed: bookings.filter((b) => b.status === 'closed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    reserved: bookings.filter((b) => b.status === 'reserved').length,
    revenuePaise: bookings.filter((b) => b.status !== 'cancelled').reduce((a, b) => a + b.quoted_total_paise, 0),
    depositsHeldPaise: bookings.reduce((a, b) => a + b.deposit_held_paise, 0),
    depositsRetainedPaise: bookings.reduce((a, b) => a + b.deposit_retained_paise, 0)
  };

  return {
    month,
    error: null,
    summary: {
      totalIncomePaise,
      totalExpensePaise,
      netPaise: totalIncomePaise - totalExpensePaise,
      txnCount: txns.length
    },
    partners,
    categoryBreakdown,
    partnerBreakdown: Array.from(perPartner.values()),
    bookings: bookingSummary
  };
};
