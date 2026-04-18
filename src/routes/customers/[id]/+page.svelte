<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatPaise } from '$lib/money';

  let { data, form } = $props();
  let editing = $state(false);

  const statusTone = (s: string) =>
    s === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200'
    : s === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
</script>

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <a href="/customers" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900">
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      Back
    </a>
    <span class="num text-[11px] uppercase tracking-wide text-slate-400">#{data.customer.id}</span>
  </div>

  {#if !editing}
    <div class="card space-y-2">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold leading-tight text-slate-900">{data.customer.name}</h1>
          {#if data.customer.phone}
            <a href="tel:{data.customer.phone}" class="num mt-1 block text-sm text-slate-600 hover:underline">{data.customer.phone}</a>
          {/if}
        </div>
        <button class="btn-ghost text-xs" style="min-height: 32px; padding: 0 10px;" onclick={() => (editing = true)}>Edit</button>
      </div>
      {#if data.customer.kyc_note}
        <div class="pt-1 text-[13px] text-slate-700"><span class="text-[11px] uppercase tracking-[0.08em] text-slate-400">KYC note</span> · {data.customer.kyc_note}</div>
      {/if}
      {#if data.customer.notes}
        <p class="border-t border-slate-100 pt-2 text-sm leading-snug text-slate-700">{data.customer.notes}</p>
      {/if}
    </div>
  {:else}
    <form method="post" action="?/update" use:enhance={() => async ({ update, result }) => {
      await update();
      if (result.type === 'success') editing = false;
    }} class="card space-y-4">
      <div>
        <label class="label" for="name">Name</label>
        <input id="name" name="name" type="text" required value={data.customer.name} class="input" />
      </div>
      <div>
        <label class="label" for="phone">Phone</label>
        <input id="phone" name="phone" type="tel" inputmode="tel" value={data.customer.phone ?? ''} class="input num" />
      </div>
      <div>
        <label class="label" for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="3" class="input">{data.customer.notes ?? ''}</textarea>
      </div>
      {#if form?.message}
        <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</div>
      {/if}
      <div class="flex gap-2">
        <button type="submit" class="btn-primary flex-1">Save</button>
        <button type="button" class="btn-ghost" onclick={() => (editing = false)}>Cancel</button>
      </div>
    </form>
  {/if}

  <section class="card space-y-3">
    <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">KYC</h2>
    {#if data.kyc.length === 0}
      <p class="text-sm text-slate-400">No KYC documents yet.</p>
    {:else}
      <ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {#each data.kyc as k}
          <li class="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {#if k.signed_url && k.mime_type?.startsWith('image/')}
              <a href={k.signed_url} target="_blank" rel="noopener" class="block aspect-square">
                <img src={k.signed_url} alt={k.label ?? 'KYC'} class="h-full w-full object-cover" loading="lazy" />
              </a>
            {:else if k.signed_url}
              <a href={k.signed_url} target="_blank" rel="noopener" class="flex aspect-square flex-col items-center justify-center gap-1 text-slate-500">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
                <span class="text-[10px] font-medium">PDF</span>
              </a>
            {:else}
              <div class="flex aspect-square items-center justify-center text-xs text-slate-400">missing</div>
            {/if}
            <form
              method="post"
              action="?/delete_kyc"
              use:enhance
              onsubmit={(e) => { if (!confirm('Delete this KYC file?')) e.preventDefault(); }}
              class="absolute right-1 top-1"
            >
              <input type="hidden" name="kyc_id" value={k.id} />
              <button
                class="flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:opacity-100"
                aria-label="Delete KYC file"
              >
                <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <form
      method="post"
      action="?/upload_kyc"
      use:enhance
      enctype="multipart/form-data"
      class="flex flex-col gap-2 border-t border-slate-100 pt-3"
    >
      <input
        type="file"
        name="kyc"
        accept="image/*,application/pdf"
        multiple
        required
        class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
      />
      <button type="submit" class="btn-ghost w-full text-sm">Upload KYC</button>
    </form>
  </section>

  <section class="space-y-3">
    <div class="flex items-baseline justify-between">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Bookings</h2>
      <a href="/bookings/new?customer_id={data.customer.id}" class="text-xs font-medium text-slate-700 underline-offset-2 hover:underline">+ new booking</a>
    </div>
    {#if data.bookings.length === 0}
      <div class="card text-center text-sm text-slate-400">No bookings yet.</div>
    {:else}
      <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {#each data.bookings as b}
          <li>
            <a href="/bookings/{b.id}" class="flex items-center justify-between gap-3 px-4 py-3 active:bg-slate-100 sm:hover:bg-slate-50">
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-slate-900">
                  <span class="num">{b.start_at.slice(0, 10)}</span> → <span class="num">{b.end_at.slice(0, 10)}</span>
                </div>
                <div class="mt-0.5 text-[11px] text-slate-500">
                  <span class="num">{formatPaise(b.quoted_total_paise)}</span>
                  {#if b.platform && b.platform !== 'direct'}<span class="divider-dot"></span>{b.platform}{/if}
                </div>
              </div>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {statusTone(b.status)}">{b.status}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if data.bookings.length === 0}
    <div class="pt-4">
      <form
        method="post"
        action="?/delete"
        use:enhance
        onsubmit={(e) => { if (!confirm('Delete this customer? Cannot undo.')) e.preventDefault(); }}
      >
        <button class="btn-danger w-full">Delete customer</button>
      </form>
    </div>
  {/if}
</section>
