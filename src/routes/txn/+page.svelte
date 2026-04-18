<script lang="ts">
  import { formatPaise } from '$lib/money';

  let { data } = $props();

  const partnerName = (id: number | null) =>
    id == null ? '—' : data.partners.find((p) => p.id === id)?.name ?? `#${id}`;

  const hasAnyFilter = $derived(
    !!(data.filters.q || data.filters.kind || data.filters.partner || data.filters.month)
  );
</script>

<section class="space-y-4">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Ledger</h1>
    {#if hasAnyFilter}
      <a href="/txn" class="text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline">
        clear filters
      </a>
    {/if}
  </div>

  <form method="get" class="space-y-2">
    <input
      name="q"
      type="search"
      placeholder="Search notes…"
      value={data.filters.q}
      class="input"
      autocomplete="off"
    />
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <select name="kind" class="input">
        <option value="">All kinds</option>
        <option value="expense" selected={data.filters.kind === 'expense'}>Expense</option>
        <option value="income" selected={data.filters.kind === 'income'}>Income</option>
        <option value="settlement" selected={data.filters.kind === 'settlement'}>Settlement</option>
      </select>
      <select name="partner" class="input">
        <option value="">Any partner</option>
        {#each data.partners as p}
          <option value={p.id} selected={data.filters.partner === String(p.id)}>{p.name}</option>
        {/each}
      </select>
      <input
        name="month"
        type="month"
        value={data.filters.month}
        class="input col-span-2 sm:col-span-1"
        aria-label="Month"
      />
    </div>
    <button type="submit" class="btn-primary w-full">Filter</button>
  </form>

  {#if data.error}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">{data.error}</div>
  {:else if data.txns.length === 0}
    <div class="card text-center text-sm text-slate-400">No transactions match.</div>
  {:else}
    <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {#each data.txns as t}
        <li class={t.voided_at ? 'opacity-60' : ''}>
          <a
            href="/txn/{t.id}"
            class="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-slate-100 sm:hover:bg-slate-50"
          >
            <div class="min-w-0 flex-1">
              <div
                class="truncate text-[15px] font-medium leading-tight text-slate-900 {t.voided_at
                  ? 'line-through'
                  : ''}"
              >
                {t.notes ?? t.category?.name ?? t.kind}
              </div>
              <div class="mt-0.5 flex flex-wrap items-center text-[11px] text-slate-500">
                <span class="num">{t.occurred_on}</span>
                <span class="divider-dot"></span>
                <span class="capitalize">{t.kind}</span>
                {#if t.counterparty != null}
                  <span class="divider-dot"></span>{partnerName(t.counterparty)}
                {/if}
                {#if t.category?.name}
                  <span class="divider-dot"></span>{t.category.name}
                {/if}
              </div>
            </div>
            <div
              class="num shrink-0 text-[15px] font-semibold {t.kind === 'income'
                ? 'text-emerald-600'
                : t.kind === 'expense'
                  ? 'text-rose-600'
                  : 'text-slate-600'}"
            >
              {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}{formatPaise(t.amount_paise)}
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
