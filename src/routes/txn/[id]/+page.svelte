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

  type SnapshotMap = Record<string, unknown>;
  type SharePair = { partner_id: number; share_paise: number };

  const FIELD_LABELS: Record<string, string> = {
    occurred_on: 'date',
    amount_paise: 'amount',
    counterparty: 'counterparty',
    category_id: 'category',
    booking_id: 'booking',
    notes: 'notes',
    voided_at: 'voided',
    voided_reason: 'void reason'
  };

  function fmtValue(field: string, v: unknown): string {
    if (v == null || v === '') return '—';
    if (field === 'amount_paise') return formatPaise(Number(v), { showPaise: true });
    if (field === 'counterparty') return partnerName(Number(v));
    if (field === 'occurred_on') return String(v);
    if (field === 'voided_at') return v ? 'yes' : 'no';
    if (Array.isArray(v)) return JSON.stringify(v);
    return String(v);
  }

  function summarizeChanges(before: SnapshotMap | null, after: SnapshotMap | null) {
    const rows: { field: string; before: string; after: string }[] = [];
    if (!before || !after) return rows;
    for (const key of Object.keys(FIELD_LABELS)) {
      const a = before[key];
      const b = after[key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        rows.push({ field: FIELD_LABELS[key], before: fmtValue(key, a), after: fmtValue(key, b) });
      }
    }
    // Shares diff
    const sa = (before.shares as SharePair[]) ?? [];
    const sb = (after.shares as SharePair[]) ?? [];
    for (const p of data.partners) {
      const av = sa.find((x) => x.partner_id === p.id)?.share_paise ?? 0;
      const bv = sb.find((x) => x.partner_id === p.id)?.share_paise ?? 0;
      if (av !== bv) {
        rows.push({
          field: `${p.name}'s share`,
          before: formatPaise(av, { showPaise: true }),
          after: formatPaise(bv, { showPaise: true })
        });
      }
    }
    return rows;
  }

  function fmtTs(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const actionTone = (a: string) =>
    a === 'create' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : a === 'edit' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : a === 'void' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-slate-100 text-slate-600 border-slate-200';
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
    <div class="flex items-center gap-1.5">
      <span class="num text-[11px] uppercase tracking-wide text-slate-400">#{t.id}</span>
      <details class="relative">
        <summary
          class="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 [&::-webkit-details-marker]:hidden"
          aria-label="More actions"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </summary>
        <div class="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {#if !t.voided_at}
            <a
              href="/txn/{t.id}/edit"
              class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              Edit transaction
            </a>
          {/if}
          {#if t.voided_at}
            <form method="post" action="?/unvoid" use:enhance>
              <button class="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                Restore transaction
              </button>
            </form>
          {:else}
            <form
              method="post"
              action="?/void"
              use:enhance
              onsubmit={(e) => { if (!confirm('Void this transaction?')) e.preventDefault(); }}
              class="space-y-2 border-t border-slate-100 p-1 pt-2"
            >
              <input
                name="reason"
                type="text"
                placeholder="Reason (optional)"
                class="input text-sm"
                style="min-height: 36px;"
              />
              <button class="btn-danger w-full text-sm" style="min-height: 36px;">Void transaction</button>
            </form>
          {/if}
        </div>
      </details>
    </div>
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

  {#if t.booking}
    <a href="/bookings/{t.booking.id}" class="card flex items-center justify-between gap-3 hover:bg-slate-50">
      <div class="min-w-0">
        <div class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Linked booking</div>
        <div class="mt-1 truncate text-sm text-slate-900">
          #{t.booking.id} · {t.booking.customer?.name ?? 'unknown'}
        </div>
        <div class="mt-0.5 text-[11px] text-slate-500">
          <span class="num">{t.booking.start_at.slice(0, 10)}</span> →
          <span class="num">{t.booking.end_at.slice(0, 10)}</span>
          <span class="divider-dot"></span>{t.booking.status}
        </div>
      </div>
      <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </a>
  {/if}

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

  <section class="card space-y-3">
    <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Receipts</h2>
    {#if data.receipts.length === 0}
      <p class="text-sm text-slate-400">No receipts attached.</p>
    {:else}
      <ul class="space-y-2">
        {#each data.receipts as r}
          <li class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
            {#if r.signed_url && r.mime_type?.startsWith('image/')}
              <a href={r.signed_url} target="_blank" rel="noopener" class="shrink-0">
                <img src={r.signed_url} alt="receipt" class="h-16 w-16 rounded-md border border-slate-200 object-cover" loading="lazy" />
              </a>
            {:else}
              <div class="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400" aria-hidden="true">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></svg>
              </div>
            {/if}
            <div class="min-w-0 flex-1">
              <a href={r.signed_url ?? '#'} target="_blank" rel="noopener" class="block truncate text-sm font-medium text-slate-900 hover:underline">
                {r.storage_path.split('/').pop()}
              </a>
              <div class="mt-0.5 text-[11px] text-slate-500">
                <span class="num">{r.uploaded_at.slice(0, 10)}</span>
                {#if r.mime_type}<span class="divider-dot"></span>{r.mime_type}{/if}
              </div>
            </div>
            <form
              method="post"
              action="?/delete_receipt"
              use:enhance
              onsubmit={(e) => { if (!confirm('Delete this receipt?')) e.preventDefault(); }}
            >
              <input type="hidden" name="receipt_id" value={r.id} />
              <button class="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50" aria-label="Delete receipt">
                Remove
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <form
      method="post"
      action="?/upload_receipt"
      use:enhance
      enctype="multipart/form-data"
      class="flex flex-col gap-2 border-t border-slate-100 pt-3"
    >
      <input
        type="file"
        name="file"
        accept="image/*,application/pdf"
        class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
        required
      />
      <button type="submit" class="btn-ghost w-full text-sm">Upload receipt</button>
    </form>
  </section>

  {#if form?.message}
    <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {form.message}
    </div>
  {/if}

  {#if data.audit.length > 0}
    <details class="card">
      <summary class="flex cursor-pointer items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        <span>History · {data.audit.length}</span>
        <svg viewBox="0 0 24 24" class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <ul class="mt-3 space-y-3 border-t border-slate-100 pt-3">
        {#each data.audit as entry}
          {@const diffs = entry.action === 'edit' ? summarizeChanges(entry.before, entry.after) : []}
          <li class="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div class="flex flex-wrap items-center gap-2 text-[12px]">
              <span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {actionTone(entry.action)}">{entry.action}</span>
              <span class="num text-slate-500">{fmtTs(entry.changed_at)}</span>
              {#if entry.changed_by_email}
                <span class="divider-dot"></span>
                <span class="text-slate-600">{entry.changed_by_email}</span>
              {/if}
            </div>
            {#if entry.note}
              <p class="mt-1 text-[13px] text-slate-700">{entry.note}</p>
            {/if}
            {#if entry.action === 'edit' && diffs.length > 0}
              <ul class="mt-2 space-y-1 text-[12px]">
                {#each diffs as d}
                  <li class="flex flex-wrap items-baseline gap-x-2">
                    <span class="w-24 shrink-0 text-slate-500">{d.field}</span>
                    <span class="text-rose-600 line-through">{d.before}</span>
                    <svg viewBox="0 0 24 24" class="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    <span class="text-emerald-700">{d.after}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    </details>
  {/if}
</section>
