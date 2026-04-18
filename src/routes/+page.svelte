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

  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
    {#each data.balances as b}
      <div class="card flex items-center justify-between sm:block">
        <div>
          <div class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
            {b.name}
          </div>
          <div class="mt-0.5 text-[11px] text-slate-400 sm:mt-1">{balanceNote(b.balance_paise)}</div>
        </div>
        <div
          class="num text-2xl font-semibold sm:mt-2 sm:text-[28px] sm:leading-none {balanceTone(b.balance_paise)}"
        >
          {formatSignedPaise(b.balance_paise)}
        </div>
      </div>
    {/each}
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
