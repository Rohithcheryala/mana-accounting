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

  let customerMode = $state<'existing' | 'new'>(
    fv('customer_mode') === 'new' || data.customers.length === 0 ? 'new' : 'existing'
  );
  let customerId = $state<number | ''>(
    Number(fv('customer_id')) || data.preselectedCustomerId || data.customers[0]?.id || ''
  );
  let newCustName = $state<string>(fv('new_customer_name'));
  let newCustPhone = $state<string>(fv('new_customer_phone'));
  let newCustKyc = $state<string>(fv('new_customer_kyc'));
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

    <form method="post" use:enhance class="space-y-5">
      <input type="hidden" name="customer_mode" value={customerMode} />

      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="label mb-0">Customer</span>
          <div class="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onclick={() => (customerMode = 'existing')}
              disabled={data.customers.length === 0}
              class="rounded px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 {customerMode === 'existing' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              existing
            </button>
            <button
              type="button"
              onclick={() => (customerMode = 'new')}
              class="rounded px-2 py-1 transition-colors {customerMode === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}"
            >
              + new
            </button>
          </div>
        </div>

        {#if customerMode === 'existing'}
          {#if data.customers.length === 0}
            <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No customers yet — switch to <strong>+ new</strong> above.
            </div>
          {:else}
            <select id="customer_id" name="customer_id" bind:value={customerId} class="input" required>
              {#each data.customers as c}
                <option value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>
              {/each}
            </select>
          {/if}
        {:else}
          <div class="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
              <label class="label" for="new_customer_name">Name</label>
              <input id="new_customer_name" name="new_customer_name" type="text" class="input" required bind:value={newCustName} autocomplete="name" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="label" for="new_customer_phone">Phone</label>
                <input id="new_customer_phone" name="new_customer_phone" type="tel" inputmode="tel" class="input num" bind:value={newCustPhone} placeholder="+91…" />
              </div>
              <div>
                <label class="label" for="new_customer_kyc">KYC</label>
                <input id="new_customer_kyc" name="new_customer_kyc" type="text" class="input" bind:value={newCustKyc} placeholder="Aadhaar / DL last 4" />
              </div>
            </div>
            <p class="text-[11px] text-slate-500">Customer will be saved when you save the booking.</p>
          </div>
        {/if}
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
</section>
