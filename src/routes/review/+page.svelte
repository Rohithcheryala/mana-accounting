<script lang="ts">
  import { formatPaise, formatSignedPaise } from '$lib/money';
  import MonthPicker from '$lib/components/MonthPicker.svelte';

  let { data } = $props();

  let monthValue = $state(data.month);
  let formEl: HTMLFormElement | undefined = $state();

  const s = $derived(data.summary);

  const exportUrl = $derived(`/txn/export?month=${data.month}`);
  const ledgerUrl = $derived(`/txn?month=${data.month}`);

  const incomeCats = $derived(data.categoryBreakdown.filter((c) => c.kind === 'income'));
  const expenseCats = $derived(data.categoryBreakdown.filter((c) => c.kind === 'expense'));

  const maxIncome = $derived(Math.max(1, ...incomeCats.map((c) => c.total)));
  const maxExpense = $derived(Math.max(1, ...expenseCats.map((c) => c.total)));

  function print() {
    if (typeof window !== 'undefined') window.print();
  }
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Monthly review</h1>
    <div class="flex items-center gap-2">
      <button type="button" onclick={print} class="text-xs text-slate-500 hover:text-slate-900 print:hidden">Print / PDF</button>
      <a href={exportUrl} class="text-xs font-medium text-slate-700 underline-offset-2 hover:underline print:hidden">CSV</a>
    </div>
  </div>

  <form method="get" bind:this={formEl} class="print:hidden">
    <MonthPicker
      name="month"
      bind:value={monthValue}
      allowAny={false}
      onchange={() => formEl?.submit()}
    />
  </form>

  {#if data.error}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">{data.error}</div>
  {/if}

  {#if s}
    <div class="grid grid-cols-3 gap-2 sm:gap-3">
      <div class="card">
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Income</div>
        <div class="num mt-1 text-xl font-semibold text-emerald-600">{formatPaise(s.totalIncomePaise)}</div>
      </div>
      <div class="card">
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Expense</div>
        <div class="num mt-1 text-xl font-semibold text-rose-600">{formatPaise(s.totalExpensePaise)}</div>
      </div>
      <div class="card">
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-500">Net</div>
        <div class="num mt-1 text-xl font-semibold {s.netPaise >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
          {formatSignedPaise(s.netPaise)}
        </div>
      </div>
    </div>
    <p class="-mt-2 text-[11px] text-slate-500">
      {s.txnCount} transaction{s.txnCount === 1 ? '' : 's'} ·
      <a href={ledgerUrl} class="underline-offset-2 hover:underline">view in ledger</a>
    </p>

    <div class="card space-y-3">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Bookings this month</h2>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <div class="text-[11px] text-slate-400">Total</div>
          <div class="num font-medium">{data.bookings.count}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">Active</div>
          <div class="num font-medium text-emerald-700">{data.bookings.active}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">Closed</div>
          <div class="num font-medium">{data.bookings.closed}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">Cancelled</div>
          <div class="num font-medium text-rose-700">{data.bookings.cancelled}</div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-3">
        <div>
          <div class="text-[11px] text-slate-400">Quoted revenue</div>
          <div class="num font-medium">{formatPaise(data.bookings.revenuePaise)}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">Deposits held</div>
          <div class="num font-medium">{formatPaise(data.bookings.depositsHeldPaise)}</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400">Retained</div>
          <div class="num font-medium">{formatPaise(data.bookings.depositsRetainedPaise)}</div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="card space-y-2">
        <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Income by category</h2>
        {#if incomeCats.length === 0}
          <p class="text-sm text-slate-400">—</p>
        {:else}
          <ul class="space-y-2">
            {#each incomeCats as c}
              <li>
                <div class="flex items-baseline justify-between text-sm">
                  <span class="text-slate-700">{c.name} <span class="text-[11px] text-slate-400">· {c.count}</span></span>
                  <span class="num font-medium text-slate-900">{formatPaise(c.total)}</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-emerald-500" style="width: {(c.total / maxIncome) * 100}%"></div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="card space-y-2">
        <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Expense by category</h2>
        {#if expenseCats.length === 0}
          <p class="text-sm text-slate-400">—</p>
        {:else}
          <ul class="space-y-2">
            {#each expenseCats as c}
              <li>
                <div class="flex items-baseline justify-between text-sm">
                  <span class="text-slate-700">{c.name} <span class="text-[11px] text-slate-400">· {c.count}</span></span>
                  <span class="num font-medium text-slate-900">{formatPaise(c.total)}</span>
                </div>
                <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div class="h-full rounded-full bg-rose-500" style="width: {(c.total / maxExpense) * 100}%"></div>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </div>

    <div class="card space-y-3">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Partner activity</h2>
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-[11px] uppercase tracking-[0.06em] text-slate-400">
              <th class="py-1.5 pr-3 text-left font-medium">Partner</th>
              <th class="py-1.5 pr-3 text-right font-medium">Paid</th>
              <th class="py-1.5 pr-3 text-right font-medium">Received</th>
              <th class="py-1.5 pr-3 text-right font-medium">Exp&nbsp;share</th>
              <th class="py-1.5 text-right font-medium">Inc&nbsp;share</th>
            </tr>
          </thead>
          <tbody>
            {#each data.partnerBreakdown as p}
              <tr class="border-t border-slate-100">
                <td class="py-2 pr-3 font-medium text-slate-800">{p.name}</td>
                <td class="num py-2 pr-3 text-right {p.cashOutPaise > 0 ? 'text-rose-600' : 'text-slate-400'}">{formatPaise(p.cashOutPaise, { showPaise: true })}</td>
                <td class="num py-2 pr-3 text-right {p.cashInPaise > 0 ? 'text-emerald-600' : 'text-slate-400'}">{formatPaise(p.cashInPaise, { showPaise: true })}</td>
                <td class="num py-2 pr-3 text-right {p.shareExpensePaise > 0 ? 'text-slate-700' : 'text-slate-400'}">{formatPaise(p.shareExpensePaise, { showPaise: true })}</td>
                <td class="num py-2 text-right {p.shareIncomePaise > 0 ? 'text-slate-700' : 'text-slate-400'}">{formatPaise(p.shareIncomePaise, { showPaise: true })}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="text-[11px] text-slate-400">
        Paid / Received = cash out of or into this partner's pocket.
        Exp / Inc share = how each txn was split across partners.
      </p>
    </div>
  {/if}
</section>

<style>
  @media print {
    :global(nav[aria-label='Primary']) { display: none !important; }
    :global(header) { display: none !important; }
    :global(body) { background: white !important; }
  }
</style>
