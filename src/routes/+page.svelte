<script lang="ts">
  import { formatPaise, formatSignedPaise } from '$lib/money';

  let { data } = $props();

  function balanceTone(paise: number) {
    if (paise > 0) return 'text-emerald-600';
    if (paise < 0) return 'text-rose-600';
    return 'text-slate-400';
  }

  function balanceNote(paise: number) {
    if (paise > 0) return 'is owed';
    if (paise < 0) return 'owes';
    return 'settled';
  }

  const totalAbs = $derived(
    data.balances.reduce((acc: number, b: { balance_paise: number }) => acc + Math.abs(b.balance_paise), 0)
  );
</script>

<section class="space-y-3">
  <div class="flex items-baseline justify-between">
    <h1 class="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Balances</h1>
    {#if totalAbs > 0}
      <span class="num text-[11px] text-slate-400">
        outstanding {formatPaise(totalAbs / 2)}
      </span>
    {/if}
  </div>

  {#if data.balancesError}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">
      Couldn't load balances: {data.balancesError}. Did you apply <code>db/schema.sql</code> and
      <code>db/seed.sql</code> to your Supabase project?
    </div>
  {/if}

  <div class="grid grid-cols-3 gap-2">
    {#each data.balances as b}
      <div class="card p-3">
        <div class="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
          {b.name}
        </div>
        <div class="num mt-1 text-base font-semibold leading-tight sm:text-lg {balanceTone(b.balance_paise)}">
          {formatSignedPaise(b.balance_paise)}
        </div>
        <div class="mt-0.5 text-[10px] text-slate-400">{balanceNote(b.balance_paise)}</div>
      </div>
    {/each}
  </div>
</section>

<section class="mt-8 space-y-3">
  <h2 class="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Shortcuts</h2>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
    <a
      href="/customers"
      class="card flex items-center gap-3 p-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
      </span>
      <span class="text-sm font-medium text-slate-800">Customers</span>
    </a>
    <a
      href="/docs"
      class="card flex items-center gap-3 p-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
      </span>
      <span class="text-sm font-medium text-slate-800">Docs</span>
    </a>
    <a
      href="/bookings"
      class="card flex items-center gap-3 p-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v4M17 3v4M3 9h18M5 7h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /></svg>
      </span>
      <span class="text-sm font-medium text-slate-800">Bookings</span>
    </a>
    <a
      href="/review"
      class="card flex items-center gap-3 p-3 hover:border-slate-300 hover:bg-slate-50"
    >
      <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 20V10M10 20V6M15 20v-8M20 20V4" /></svg>
      </span>
      <span class="text-sm font-medium text-slate-800">Review</span>
    </a>
  </div>
</section>

<section class="mt-8 space-y-3">
  <div class="flex items-baseline justify-between">
    <h2 class="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Recent</h2>
    <a href="/txn" class="text-xs text-slate-500 hover:text-slate-900">See all →</a>
  </div>

  {#if data.recent.length === 0}
    <div class="card text-center text-sm text-slate-400">
      No transactions yet.
      <a href="/txn/new" class="font-medium text-slate-700 underline">Add one</a>.
    </div>
  {:else}
    <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {#each data.recent as t}
        <li>
          <a
            href="/txn/{t.id}"
            class="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-slate-100 sm:hover:bg-slate-50"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-medium leading-tight text-slate-900">
                {t.notes ?? t.category?.name ?? t.kind}
              </div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                <span class="num">{t.occurred_on}</span>
                {#if t.category?.name}<span class="divider-dot"></span>{t.category.name}{/if}
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
