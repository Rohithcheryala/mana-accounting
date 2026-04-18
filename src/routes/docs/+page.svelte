<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const formValues = $derived(
    form && 'values' in form ? (form.values as Record<string, string>) : ({} as Record<string, string>)
  );

  const suggestedCategories = ['Insurance', 'RC', 'PUC', 'Permit', 'Licence', 'Contract', 'Misc'];

  const allCategories = $derived.by(() => {
    const set = new Set<string>([...data.categories, ...suggestedCategories]);
    return Array.from(set).sort();
  });

  function fmtSize(n: number | null): string {
    if (!n) return '—';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  function isViewable(mime: string | null): boolean {
    if (!mime) return false;
    return mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('text/');
  }
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Docs</h1>
    <span class="text-xs text-slate-500">{data.docs.length} file{data.docs.length === 1 ? '' : 's'}</span>
  </div>

  <details class="card">
    <summary class="flex cursor-pointer items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
      <span>Upload a document</span>
      <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </summary>

    <form
      method="post"
      action="?/upload"
      use:enhance
      enctype="multipart/form-data"
      class="mt-4 space-y-3 border-t border-slate-100 pt-4"
    >
      <div>
        <label class="label" for="file">File</label>
        <input
          id="file"
          name="file"
          type="file"
          required
          class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
        />
        <p class="mt-1 text-[11px] text-slate-400">Max 25 MB. Any format. Images, PDF and text open in-browser; others download.</p>
      </div>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label" for="name">Display name</label>
          <input id="name" name="name" type="text" class="input" placeholder="Honda Amaze – insurance 2026" value={formValues.name ?? ''} />
        </div>
        <div>
          <label class="label" for="category">Category</label>
          <input id="category" name="category" type="text" list="doc-categories" class="input" placeholder="Insurance" value={formValues.category ?? ''} />
          <datalist id="doc-categories">
            {#each suggestedCategories as c}
              <option value={c}></option>
            {/each}
          </datalist>
        </div>
      </div>
      <div>
        <label class="label" for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="2" class="input" placeholder="optional">{formValues.notes ?? ''}</textarea>
      </div>
      {#if form?.uploaded}
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Uploaded <strong>{form.name}</strong>.
        </div>
      {:else if form?.message}
        <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</div>
      {/if}
      <button type="submit" class="btn-primary w-full">Upload</button>
    </form>
  </details>

  <form method="get" class="space-y-2">
    <input name="q" type="search" placeholder="Search by name…" value={data.filters.q} class="input" autocomplete="off" />
    <div class="grid grid-cols-2 gap-2">
      <select name="category" class="input">
        <option value="">All categories</option>
        {#each allCategories as c}
          <option value={c} selected={data.filters.category === c}>{c}</option>
        {/each}
      </select>
      <button type="submit" class="btn-primary">Filter</button>
    </div>
    {#if data.filters.q || data.filters.category}
      <a href="/docs" class="block text-right text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">clear filters</a>
    {/if}
  </form>

  {#if data.error}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">{data.error}</div>
  {:else if data.docs.length === 0}
    <div class="card text-center text-sm text-slate-400">No documents yet.</div>
  {:else}
    <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {#each data.docs as d}
        <li class="flex items-start gap-3 px-4 py-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500" aria-hidden="true">
            {#if d.mime_type?.startsWith('image/')}
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
            {:else if d.mime_type === 'application/pdf'}
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
            {:else}
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 13h6M9 17h6" /></svg>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="truncate text-[15px] font-medium leading-tight text-slate-900">{d.name}</div>
                <div class="mt-0.5 flex flex-wrap items-center text-[11px] text-slate-500">
                  {#if d.category}<span class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">{d.category}</span>{/if}
                  {#if d.category}<span class="divider-dot"></span>{/if}
                  <span class="num">{d.uploaded_at.slice(0, 10)}</span>
                  <span class="divider-dot"></span>
                  <span class="num">{fmtSize(d.size_bytes)}</span>
                </div>
              </div>
            </div>
            {#if d.notes}
              <p class="mt-1 text-[13px] leading-snug text-slate-600">{d.notes}</p>
            {/if}
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              {#if d.view_url && isViewable(d.mime_type)}
                <a href={d.view_url} target="_blank" rel="noopener" class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200">
                  view
                </a>
              {/if}
              {#if d.download_url}
                <a href={d.download_url} class="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200">
                  download
                </a>
              {/if}
              <form
                method="post"
                action="?/delete"
                use:enhance
                onsubmit={(e) => { if (!confirm(`Delete "${d.name}"? Cannot undo.`)) e.preventDefault(); }}
                class="contents"
              >
                <input type="hidden" name="id" value={d.id} />
                <button class="rounded-md px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50">delete</button>
              </form>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>
