<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const defaultStart = local(now);
  const defaultEnd = local(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const fv = (k: string): string => {
    const v = form?.values?.[k];
    return typeof v === 'string' ? v : '';
  };

  let customerId = $state<number | ''>(
    Number(fv('customer_id')) || data.preselectedCustomerId || data.customers[0]?.id || ''
  );
  let startAt = $state<string>(fv('start_at') || defaultStart);
  let endAt = $state<string>(fv('end_at') || defaultEnd);
  let rate = $state<string>(fv('quoted_rate'));
  let total = $state<string>(fv('quoted_total'));
  let totalTouched = $state(false);
  let deposit = $state<string>(fv('deposit'));
  let platform = $state<string>(fv('platform') || 'direct');
  let platformFee = $state<string>(fv('platform_fee_pct') || '0');
  let notes = $state<string>(fv('notes'));

  const days = $derived.by(() => {
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 0;
    return Math.max(1, Math.ceil((e - s) / (24 * 60 * 60 * 1000)));
  });

  $effect(() => {
    if (totalTouched) return;
    const r = Number(rate || 0);
    if (!Number.isFinite(r) || r <= 0 || days <= 0) return;
    total = (r * days).toFixed(2);
  });
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">New booking</h1>
    <a href="/bookings" class="text-xs text-slate-500 hover:text-slate-900">Cancel</a>
  </div>

  {#if data.customers.length === 0}
    <div class="card text-center text-sm text-slate-500">
      You need a customer first.
      <a href="/customers/new" class="font-medium text-slate-700 underline">Add one</a>.
    </div>
  {:else}
    <form method="post" use:enhance class="space-y-5">
      <div>
        <label class="label" for="customer_id">Customer</label>
        <select id="customer_id" name="customer_id" bind:value={customerId} class="input" required>
          {#each data.customers as c}
            <option value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
          {/each}
        </select>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label" for="start_at">Start</label>
          <input id="start_at" name="start_at" type="datetime-local" required bind:value={startAt} class="input num" />
        </div>
        <div>
          <label class="label" for="end_at">End</label>
          <input id="end_at" name="end_at" type="datetime-local" required bind:value={endAt} class="input num" />
        </div>
      </div>
      {#if days > 0}
        <p class="-mt-2 text-[11px] text-slate-500">Duration: <span class="num">{days} day{days === 1 ? '' : 's'}</span></p>
      {/if}

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label class="label" for="quoted_rate">Rate / day (₹)</label>
          <input id="quoted_rate" name="quoted_rate" type="number" inputmode="decimal" step="0.01" min="0" bind:value={rate} class="input num" placeholder="0.00" />
        </div>
        <div>
          <label class="label" for="quoted_total">Total quoted (₹)</label>
          <input id="quoted_total" name="quoted_total" type="number" inputmode="decimal" step="0.01" min="0" bind:value={total} oninput={() => (totalTouched = true)} class="input num" placeholder="0.00" required />
        </div>
      </div>

      <div>
        <label class="label" for="deposit">Deposit held (₹)</label>
        <input id="deposit" name="deposit" type="number" inputmode="decimal" step="0.01" min="0" bind:value={deposit} class="input num" placeholder="0.00" />
        <p class="mt-1 text-[11px] text-slate-400">Deposits live on the booking, not the ledger.</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="platform">Platform</label>
          <input id="platform" name="platform" type="text" bind:value={platform} class="input" placeholder="direct" />
        </div>
        <div>
          <label class="label" for="platform_fee_pct">Fee %</label>
          <input id="platform_fee_pct" name="platform_fee_pct" type="number" inputmode="decimal" step="0.01" min="0" max="100" bind:value={platformFee} class="input num" />
        </div>
      </div>

      <div>
        <label class="label" for="notes">Notes</label>
        <textarea id="notes" name="notes" rows="2" bind:value={notes} class="input" placeholder="optional"></textarea>
      </div>

      {#if form?.message}
        <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</div>
      {/if}

      <button type="submit" class="btn-primary w-full">Save booking</button>
    </form>
  {/if}
</section>
