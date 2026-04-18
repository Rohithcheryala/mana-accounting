import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.session) throw error(401, 'Unauthorized');

  const body = (await request.json().catch(() => null)) as { name?: string; kind?: string } | null;
  const name = String(body?.name ?? '').trim();
  const kind = String(body?.kind ?? '');

  if (!name) throw error(400, 'Name required');
  if (name.length > 40) throw error(400, 'Name too long');
  if (kind !== 'expense' && kind !== 'income') throw error(400, 'Invalid kind');

  const { data: existing } = await locals.supabase
    .from('category')
    .select('id, name, kind')
    .ilike('name', name)
    .maybeSingle();
  if (existing) return json(existing);

  const { data: created, error: insErr } = await locals.supabase
    .from('category')
    .insert({ name, kind })
    .select('id, name, kind')
    .single();
  if (insErr || !created) throw error(500, insErr?.message ?? 'Insert failed');

  return json(created);
};
