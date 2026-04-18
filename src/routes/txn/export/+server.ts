import type { RequestHandler } from './$types';
import { paiseToRupees } from '$lib/money';

type ExportTxn = {
  id: number;
  occurred_on: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  counterparty: number | null;
  notes: string | null;
  voided_at: string | null;
  booking_id: number | null;
  category: { name: string } | null;
  shares: { partner_id: number; share_paise: number }[];
};

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export const GET: RequestHandler = async ({ locals, url }) => {
  const month = url.searchParams.get('month') ?? '';
  const kind = url.searchParams.get('kind') ?? '';
  const partner = url.searchParams.get('partner') ?? '';
  const q = url.searchParams.get('q')?.trim() ?? '';

  let query = locals.supabase
    .from('txn')
    .select(
      'id, occurred_on, kind, amount_paise, counterparty, notes, voided_at, booking_id, category:category_id(name), shares:txn_share(partner_id, share_paise)'
    )
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });

  if (q) query = query.ilike('notes', `%${q}%`);
  if (kind && ['expense', 'income', 'settlement'].includes(kind)) query = query.eq('kind', kind);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    query = query.gte('occurred_on', start).lt('occurred_on', nextMonth);
  }
  if (partner) query = query.eq('counterparty', Number(partner));

  const [txnsRes, partnersRes, settlementsRes] = await Promise.all([
    query.returns<ExportTxn[]>(),
    locals.supabase.from('partner').select('id, name').order('id'),
    locals.supabase.from('settlement').select('txn_id, from_partner, to_partner')
  ]);

  if (txnsRes.error) {
    return new Response(`Error: ${txnsRes.error.message}`, { status: 500 });
  }
  const txns = txnsRes.data ?? [];
  const partners = partnersRes.data ?? [];
  const settlementMap = new Map<number, { from_partner: number; to_partner: number }>();
  for (const s of settlementsRes.data ?? []) settlementMap.set(s.txn_id, s);
  const partnerName = (id: number | null) =>
    id == null ? '' : partners.find((p) => p.id === id)?.name ?? `#${id}`;

  const header = [
    'id', 'date', 'kind', 'amount_rupees', 'counterparty', 'category',
    'booking_id', 'notes', 'voided',
    ...partners.map((p) => `share_${p.name}`),
    'settlement_from', 'settlement_to'
  ];

  const rows: string[] = [header.map(csvEscape).join(',')];
  for (const t of txns) {
    const shareByPartner = new Map<number, number>();
    for (const s of t.shares ?? []) shareByPartner.set(s.partner_id, s.share_paise);
    const row = [
      t.id,
      t.occurred_on,
      t.kind,
      paiseToRupees(t.amount_paise).toFixed(2),
      partnerName(t.counterparty),
      t.category?.name ?? '',
      t.booking_id ?? '',
      t.notes ?? '',
      t.voided_at ? 'voided' : '',
      ...partners.map((p) => {
        const v = shareByPartner.get(p.id);
        return v != null ? paiseToRupees(v).toFixed(2) : '';
      }),
      partnerName(settlementMap.get(t.id)?.from_partner ?? null),
      partnerName(settlementMap.get(t.id)?.to_partner ?? null)
    ];
    rows.push(row.map(csvEscape).join(','));
  }

  const filename = month
    ? `mana-accounting-${month}.csv`
    : `mana-accounting-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
};
