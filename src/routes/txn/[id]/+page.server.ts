import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type DetailTxn = {
  id: number;
  occurred_on: string;
  created_at: string;
  kind: 'expense' | 'income' | 'settlement';
  amount_paise: number;
  counterparty: number | null;
  category_id: number | null;
  booking_id: number | null;
  notes: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  category: { id: number; name: string; kind: 'expense' | 'income' } | null;
};

export const load: PageServerLoad = async ({ locals, params }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw error(400, 'Invalid id');

  const [txnRes, sharesRes, partnersRes, settleRes] = await Promise.all([
    locals.supabase
      .from('txn')
      .select(
        'id, occurred_on, created_at, kind, amount_paise, counterparty, category_id, booking_id, notes, voided_at, voided_reason, category:category_id(id, name, kind)'
      )
      .eq('id', id)
      .maybeSingle()
      .returns<DetailTxn>(),
    locals.supabase.from('txn_share').select('partner_id, share_paise').eq('txn_id', id),
    locals.supabase.from('partner').select('id, name').order('id'),
    locals.supabase.from('settlement').select('from_partner, to_partner').eq('txn_id', id).maybeSingle()
  ]);

  if (txnRes.error) throw error(500, txnRes.error.message);
  if (!txnRes.data) throw error(404, 'Not found');

  return {
    txn: txnRes.data,
    shares: sharesRes.data ?? [],
    partners: partnersRes.data ?? [],
    settlement: settleRes.data
  };
};

export const actions: Actions = {
  void: async ({ request, locals, params }) => {
    const id = Number(params.id);
    const data = await request.formData();
    const reason = String(data.get('reason') ?? '').trim() || null;
    const { error: upErr } = await locals.supabase
      .from('txn')
      .update({ voided_at: new Date().toISOString(), voided_reason: reason })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    throw redirect(303, '/txn');
  },

  unvoid: async ({ locals, params }) => {
    const id = Number(params.id);
    const { error: upErr } = await locals.supabase
      .from('txn')
      .update({ voided_at: null, voided_reason: null })
      .eq('id', id);
    if (upErr) return fail(500, { message: upErr.message });
    return { ok: true };
  }
};
