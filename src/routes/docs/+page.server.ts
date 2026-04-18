import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type DocRow = {
  id: number;
  name: string;
  category: string | null;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

type DocWithUrl = DocRow & {
  view_url: string | null;
  download_url: string | null;
};

const MAX_DOC_BYTES = 25 * 1024 * 1024;

export const load: PageServerLoad = async ({ locals, url }) => {
  const q = url.searchParams.get('q')?.trim() ?? '';
  const category = url.searchParams.get('category')?.trim() ?? '';

  let query = locals.supabase
    .from('doc')
    .select('id, name, category, storage_path, mime_type, size_bytes, notes, uploaded_by, uploaded_at')
    .order('uploaded_at', { ascending: false });

  if (q) query = query.ilike('name', `%${q}%`);
  if (category) query = query.eq('category', category);

  const { data, error } = await query.returns<DocRow[]>();

  const rows = data ?? [];
  const docs: DocWithUrl[] = [];
  const categorySet = new Set<string>();

  const downloadFilename = (d: DocRow) => {
    const ext = d.storage_path.includes('.') ? d.storage_path.split('.').pop() : '';
    const base = d.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'doc';
    return base.toLowerCase().endsWith('.' + ext?.toLowerCase()) || !ext ? base : `${base}.${ext}`;
  };

  for (const d of rows) {
    if (d.category) categorySet.add(d.category);
    const [viewRes, dlRes] = await Promise.all([
      locals.supabase.storage.from('docs').createSignedUrl(d.storage_path, 60 * 60),
      locals.supabase.storage.from('docs').createSignedUrl(d.storage_path, 60 * 60, {
        download: downloadFilename(d)
      })
    ]);
    docs.push({
      ...d,
      view_url: viewRes.data?.signedUrl ?? null,
      download_url: dlRes.data?.signedUrl ?? null
    });
  }

  // Also seed the category dropdown from distinct values even if filter is applied.
  if (category && !q) {
    const { data: allCats } = await locals.supabase.from('doc').select('category').not('category', 'is', null);
    for (const r of (allCats ?? []) as { category: string | null }[]) {
      if (r.category) categorySet.add(r.category);
    }
  }

  return {
    docs,
    categories: Array.from(categorySet).sort(),
    filters: { q, category },
    error: error?.message ?? null
  };
};

export const actions: Actions = {
  upload: async ({ request, locals }) => {
    const data = await request.formData();
    const file = data.get('file');
    const name = String(data.get('name') ?? '').trim();
    const category = String(data.get('category') ?? '').trim() || null;
    const notes = String(data.get('notes') ?? '').trim() || null;

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Pick a file', values: { name, category, notes } });
    }
    if (file.size > MAX_DOC_BYTES) {
      return fail(400, { message: `File too large (max ${MAX_DOC_BYTES / (1024 * 1024)} MB)`, values: { name, category, notes } });
    }

    const displayName = name || file.name;
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName || `file.${ext}`}`;

    const { error: upErr } = await locals.supabase.storage
      .from('docs')
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) return fail(500, { message: `Upload failed: ${upErr.message}` });

    const { error: insErr } = await locals.supabase.from('doc').insert({
      name: displayName,
      category,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      notes,
      uploaded_by: locals.user?.id ?? null
    });
    if (insErr) {
      await locals.supabase.storage.from('docs').remove([path]);
      return fail(500, { message: `DB insert failed: ${insErr.message}` });
    }
    return { uploaded: true, name: displayName };
  },

  delete: async ({ request, locals }) => {
    const data = await request.formData();
    const id = Number(data.get('id'));
    if (!Number.isFinite(id)) return fail(400, { message: 'Invalid id' });

    const { data: row, error: fetchErr } = await locals.supabase
      .from('doc')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return fail(500, { message: fetchErr.message });
    if (!row) return fail(404, { message: 'Not found' });

    const { error: delErr } = await locals.supabase.from('doc').delete().eq('id', id);
    if (delErr) return fail(500, { message: delErr.message });

    await locals.supabase.storage.from('docs').remove([(row as { storage_path: string }).storage_path]);
    return { deleted: true };
  }
};
