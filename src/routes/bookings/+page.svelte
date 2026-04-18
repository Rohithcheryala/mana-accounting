<script lang="ts">
  import { formatPaise } from '$lib/money';

  let { data } = $props();

  const statusTone = (s: string) =>
    s === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : s === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200'
    : s === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  const hasAnyFilter = $derived(!!(data.filters.status || data.filters.q));
</script>

<section class="space-y-4">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Bookings</h1>
    <a href="/bookings/new" class="text-xs font-medium text-slate-700 underline-offset-2 hover:underline">+ new</a>
  </div>

  <form method="get" class="space-y-2">
    <input name="q" type="search" placeholder="Search customer…" value={data.filters.q} class="input" autocomplete="off" />
    <div class="grid grid-cols-2 gap-2">
      <select name="status" class="input">
        <option value="">All statuses</option>
        <option value="reserved" selected={data.filters.status === 'reserved'}>Reserved</option>
        <option value="active" selected={data.filters.status === 'active'}>Active</option>
        <option value="closed" selected={data.filters.status === 'closed'}>Closed</option>
        <option value="cancelled" selected={data.filters.status === 'cancelled'}>Cancelled</option>
      </select>
      <button type="submit" class="btn-primary">Filter</button>
    </div>
    {#if hasAnyFilter}
      <a href="/bookings" class="block text-right text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">clear filters</a>
    {/if}
  </form>

  {#if data.error}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">{data.error}</div>
  {:else if data.bookings.length === 0}
    <div class="card text-center text-sm text-slate-400">No bookings match.</div>
  {:else}
    <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {#each data.bookings as b}
        <li>
          <a href="/bookings/{b.id}" class="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-slate-100 sm:hover:bg-slate-50">
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-medium leading-tight text-slate-900">
                {b.customer?.name ?? 'Unknown customer'}
              </div>
              <div class="mt-0.5 flex flex-wrap items-center text-[11px] text-slate-500">
                <span class="num">{b.start_at.slice(0, 10)}</span>
                <span class="mx-1">→</span>
                <span class="num">{b.end_at.slice(0, 10)}</span>
                {#if b.platform && b.platform !== 'direct'}<span class="divider-dot"></span>{b.platform}{/if}
              </div>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <span class="num text-[15px] font-semibold text-slate-900">{formatPaise(b.quoted_total_paise)}</span>
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {statusTone(b.status)}">{b.status}</span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
