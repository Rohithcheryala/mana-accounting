<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatPaise } from '$lib/money';

  let { data, form } = $props();

  const t = $derived(data.txn);
  const partnerName = (id: number | null) =>
    id == null ? '—' : data.partners.find((p) => p.id === id)?.name ?? `#${id}`;

  const kindTone = $derived(
    t.kind === 'income'
      ? 'text-emerald-600'
      : t.kind === 'expense'
        ? 'text-rose-600'
        : 'text-slate-900'
  );
</script>

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <a
      href="/txn"
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    >
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back
    </a>
    <span class="num text-[11px] uppercase tracking-wide text-slate-400">#{t.id}</span>
  </div>

  <div class="card {t.voided_at ? 'opacity-60' : ''}">
    <div class="flex items-center gap-2">
      <span class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{t.kind}</span>
      {#if t.voided_at}
        <span
          class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600"
        >
          voided
        </span>
      {/if}
    </div>
    <div class="num mt-2 text-4xl font-semibold leading-none {kindTone}">
      {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}{formatPaise(t.amount_paise, { showPaise: true })}
    </div>
    <div class="mt-3 text-sm text-slate-500">
      <span class="num">{t.occurred_on}</span>
      {#if t.counterparty != null}
        <span class="divider-dot"></span>
        {t.kind === 'income' ? 'received by' : 'paid by'}
        <strong class="font-medium text-slate-800">{partnerName(t.counterparty)}</strong>
      {/if}
    </div>
    {#if t.notes}
      <p class="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-snug text-slate-700">
        {t.notes}
      </p>
    {/if}
    {#if t.category?.name}
      <div
        class="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
      >
        {t.category.name}
      </div>
    {/if}
  </div>

  {#if t.kind === 'settlement' && data.settlement}
    <div class="card">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Settlement</h2>
      <p class="mt-2 text-[15px] leading-snug text-slate-700">
        <strong class="font-semibold text-slate-900">{partnerName(data.settlement.from_partner)}</strong>
        paid
        <strong class="font-semibold text-slate-900">{partnerName(data.settlement.to_partner)}</strong>.
      </p>
    </div>
  {:else if data.shares.length > 0}
    <div class="card">
      <h2 class="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Split</h2>
      <ul class="divide-y divide-slate-100">
        {#each data.shares as s}
          <li class="flex items-center justify-between py-2 text-sm">
            <span class="text-slate-700">{partnerName(s.partner_id)}</span>
            <span class="num text-slate-900">{formatPaise(s.share_paise, { showPaise: true })}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if form?.message}
    <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {form.message}
    </div>
  {/if}

  <div class="pt-2">
    {#if t.voided_at}
      <form method="post" action="?/unvoid" use:enhance>
        <button class="btn-ghost w-full">Restore transaction</button>
      </form>
    {:else}
      <form
        method="post"
        action="?/void"
        use:enhance
        onsubmit={(e) => {
          if (!confirm('Void this transaction?')) e.preventDefault();
        }}
        class="space-y-2"
      >
        <input
          name="reason"
          type="text"
          placeholder="Reason (optional)"
          class="input"
        />
        <button class="btn-danger w-full">Void transaction</button>
      </form>
    {/if}
  </div>
</section>
