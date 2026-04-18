<script lang="ts">
  import { enhance } from '$app/forms';
  import { formatPaise, paiseToRupees } from '$lib/money';

  let { data, form } = $props();

  const b = $derived(data.booking);

  const statusTone = $derived(
    b.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : b.status === 'closed' ? 'bg-slate-100 text-slate-600 border-slate-200'
    : b.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'
  );

  const days = $derived.by(() => {
    const s = new Date(b.start_at).getTime();
    const e = new Date(b.end_at).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
    return Math.max(1, Math.ceil((e - s) / (24 * 60 * 60 * 1000)));
  });

  const kmDriven = $derived(
    b.odo_out_km != null && b.odo_in_km != null ? b.odo_in_km - b.odo_out_km : null
  );

  const depositBalance = $derived(
    b.deposit_held_paise - b.deposit_refunded_paise - b.deposit_retained_paise
  );

  function fmtDateTime(s: string) {
    const d = new Date(s);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
</script>

<section class="space-y-4">
  <div class="flex items-center justify-between">
    <a href="/bookings" class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900">
      <svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      Back
    </a>
    <span class="num text-[11px] uppercase tracking-wide text-slate-400">#{b.id}</span>
  </div>

  <div class="card space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        {#if data.customer}
          <a href="/customers/{data.customer.id}" class="text-lg font-semibold leading-tight text-slate-900 hover:underline">
            {data.customer.name}
          </a>
          {#if data.customer.phone}
            <a href="tel:{data.customer.phone}" class="num block text-sm text-slate-500 hover:underline">{data.customer.phone}</a>
          {/if}
        {:else}
          <h1 class="text-lg font-semibold text-slate-500">Unknown customer</h1>
        {/if}
      </div>
      <span class="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide {statusTone}">{b.status}</span>
    </div>

    <div class="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Start</div>
        <div class="num mt-0.5 text-slate-900">{fmtDateTime(b.start_at)}</div>
      </div>
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">End</div>
        <div class="num mt-0.5 text-slate-900">{fmtDateTime(b.end_at)}</div>
      </div>
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Duration</div>
        <div class="num mt-0.5 text-slate-900">{days} day{days === 1 ? '' : 's'}</div>
      </div>
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Platform</div>
        <div class="mt-0.5 text-slate-900">{b.platform}{b.platform_fee_pct ? ` · ${b.platform_fee_pct}%` : ''}</div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Rate / day</div>
        <div class="num mt-0.5 text-slate-900">{formatPaise(b.quoted_rate_paise)}</div>
      </div>
      <div>
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Quoted total</div>
        <div class="num mt-0.5 font-semibold text-slate-900">{formatPaise(b.quoted_total_paise)}</div>
      </div>
    </div>

    {#if b.odo_out_km != null || b.odo_in_km != null || b.fuel_out_pct != null || b.fuel_in_pct != null}
      <div class="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
        <div>
          <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Odo out / in</div>
          <div class="num mt-0.5 text-slate-900">
            {b.odo_out_km ?? '—'} → {b.odo_in_km ?? '—'}
            {#if kmDriven != null}<span class="ml-1 text-[11px] text-slate-500">({kmDriven} km)</span>{/if}
          </div>
        </div>
        <div>
          <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Fuel out / in</div>
          <div class="num mt-0.5 text-slate-900">{b.fuel_out_pct ?? '—'}% → {b.fuel_in_pct ?? '—'}%</div>
        </div>
      </div>
    {/if}

    {#if b.deposit_held_paise > 0}
      <div class="border-t border-slate-100 pt-3 text-sm">
        <div class="text-[11px] uppercase tracking-[0.08em] text-slate-400">Deposit</div>
        <div class="num mt-0.5 flex flex-wrap gap-x-4 text-slate-900">
          <span>Held {formatPaise(b.deposit_held_paise)}</span>
          {#if b.deposit_refunded_paise > 0}<span class="text-emerald-700">Refunded {formatPaise(b.deposit_refunded_paise)}</span>{/if}
          {#if b.deposit_retained_paise > 0}<span class="text-rose-700">Retained {formatPaise(b.deposit_retained_paise)}</span>{/if}
          {#if depositBalance !== 0}<span class="text-slate-500">Balance {formatPaise(depositBalance)}</span>{/if}
        </div>
      </div>
    {/if}

    {#if b.notes}
      <p class="border-t border-slate-100 pt-3 text-[15px] leading-snug text-slate-700">{b.notes}</p>
    {/if}
  </div>

  {#if form?.message}
    <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</div>
  {/if}

  {#if b.status === 'reserved'}
    <form method="post" action="?/activate" use:enhance class="card space-y-3">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Activate — car handed over</h2>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="odo_out_km">Odo out (km)</label>
          <input id="odo_out_km" name="odo_out_km" type="number" inputmode="numeric" step="1" min="0" class="input num" />
        </div>
        <div>
          <label class="label" for="fuel_out_pct">Fuel out (%)</label>
          <input id="fuel_out_pct" name="fuel_out_pct" type="number" inputmode="numeric" step="1" min="0" max="100" class="input num" />
        </div>
      </div>
      <button type="submit" class="btn-primary w-full">Mark active</button>
    </form>
  {:else if b.status === 'active'}
    <form method="post" action="?/close" use:enhance class="card space-y-3">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">Close — car returned</h2>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="odo_in_km">Odo in (km)</label>
          <input id="odo_in_km" name="odo_in_km" type="number" inputmode="numeric" step="1" min="0" class="input num" />
        </div>
        <div>
          <label class="label" for="fuel_in_pct">Fuel in (%)</label>
          <input id="fuel_in_pct" name="fuel_in_pct" type="number" inputmode="numeric" step="1" min="0" max="100" class="input num" />
        </div>
      </div>
      {#if b.deposit_held_paise > 0}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="deposit_refunded">Deposit refunded (₹)</label>
            <input id="deposit_refunded" name="deposit_refunded" type="number" inputmode="decimal" step="0.01" min="0" value={paiseToRupees(b.deposit_held_paise).toFixed(2)} class="input num" />
          </div>
          <div>
            <label class="label" for="deposit_retained">Retained (₹)</label>
            <input id="deposit_retained" name="deposit_retained" type="number" inputmode="decimal" step="0.01" min="0" value="0" class="input num" />
          </div>
        </div>
        <p class="text-[11px] text-slate-500">If retained for damage/fuel/fines, record a separate income txn linked to this booking.</p>
      {/if}
      <button type="submit" class="btn-primary w-full">Mark closed</button>
    </form>
  {:else}
    <form method="post" action="?/reopen" use:enhance>
      <button class="btn-ghost w-full">Re-open as reserved</button>
    </form>
  {/if}

  <section class="space-y-3 pt-2">
    <div class="flex items-baseline justify-between">
      <h2 class="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-500">Linked transactions</h2>
      <a href="/txn/new?booking_id={b.id}" class="text-xs font-medium text-slate-700 underline-offset-2 hover:underline">+ new txn</a>
    </div>
    {#if data.txns.length === 0}
      <div class="card text-center text-sm text-slate-400">No transactions yet.</div>
    {:else}
      <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {#each data.txns as t}
          <li class={t.voided_at ? 'opacity-60' : ''}>
            <a href="/txn/{t.id}" class="flex items-center justify-between gap-3 px-4 py-3 active:bg-slate-100 sm:hover:bg-slate-50">
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm {t.voided_at ? 'line-through' : ''} text-slate-900">
                  {t.notes ?? t.category?.name ?? t.kind}
                </div>
                <div class="mt-0.5 text-[11px] text-slate-500">
                  <span class="num">{t.occurred_on}</span>
                  <span class="divider-dot"></span>
                  <span class="capitalize">{t.kind}</span>
                  {#if t.category?.name}<span class="divider-dot"></span>{t.category.name}{/if}
                </div>
              </div>
              <div class="num shrink-0 text-sm font-semibold {t.kind === 'income' ? 'text-emerald-600' : t.kind === 'expense' ? 'text-rose-600' : 'text-slate-600'}">
                {t.kind === 'income' ? '+' : t.kind === 'expense' ? '−' : ''}{formatPaise(t.amount_paise)}
              </div>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="grid grid-cols-2 gap-2 pt-2">
    {#if b.status !== 'cancelled'}
      <form
        method="post"
        action="?/cancel"
        use:enhance
        onsubmit={(e) => { if (!confirm('Cancel this booking?')) e.preventDefault(); }}
      >
        <button class="btn-ghost w-full">Cancel booking</button>
      </form>
    {:else}
      <span></span>
    {/if}
    {#if data.txns.length === 0}
      <form
        method="post"
        action="?/delete"
        use:enhance
        onsubmit={(e) => { if (!confirm('Delete this booking? Cannot undo.')) e.preventDefault(); }}
      >
        <button class="btn-danger w-full">Delete</button>
      </form>
    {:else}
      <span></span>
    {/if}
  </div>
</section>
