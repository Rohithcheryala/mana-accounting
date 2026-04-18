<script lang="ts">
  import { enhance } from '$app/forms';
  import { equalSplit } from '$lib/money';

  let { data, form } = $props();

  const today = new Date().toISOString().slice(0, 10);

  let kind = $state<'expense' | 'income' | 'settlement'>('expense');
  let amount = $state<string>('');
  let occurredOn = $state<string>(today);
  let counterparty = $state<number | ''>(data.partners[0]?.id ?? '');
  let categoryId = $state<number | ''>('');
  let notes = $state<string>('');
  let splitOpen = $state<boolean>(false);
  let settleFrom = $state<number | ''>(data.partners[0]?.id ?? '');
  let settleTo = $state<number | ''>(data.partners[1]?.id ?? '');
  let bookingId = $state<number | ''>(data.preselectBookingId ?? '');

  let shares = $state<Record<number, string>>(
    Object.fromEntries(data.partners.map((p) => [p.id, '']))
  );

  const filteredCategories = $derived(
    kind === 'settlement' ? [] : data.categories.filter((c) => c.kind === kind)
  );

  let sharesTouched = $state(false);
  $effect(() => {
    if (sharesTouched) return;
    const paise = Math.round(Number(amount || 0) * 100);
    if (!Number.isFinite(paise) || paise <= 0 || data.partners.length === 0) {
      for (const p of data.partners) shares[p.id] = '';
      return;
    }
    const parts = equalSplit(paise, data.partners.length);
    data.partners.forEach((p, i) => {
      shares[p.id] = (parts[i] / 100).toFixed(2);
    });
  });

  function markSharesTouched() {
    sharesTouched = true;
  }

  const shareSum = $derived(
    data.partners.reduce((acc, p) => acc + Number(shares[p.id] || 0), 0)
  );

  const sumMatches = $derived(
    Math.round(shareSum * 100) === Math.round(Number(amount || 0) * 100)
  );
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">New transaction</h1>
    <a href="/" class="text-xs text-slate-500 hover:text-slate-900">Cancel</a>
  </div>

  <form method="post" enctype="multipart/form-data" use:enhance class="space-y-5">
    <!-- Kind toggle -->
    <div role="radiogroup" aria-label="Transaction kind" class="grid grid-cols-3 gap-2">
      {#each ['expense', 'income', 'settlement'] as k}
        <label class="relative">
          <input type="radio" name="kind" value={k} bind:group={kind} class="peer sr-only" />
          <span class="seg-option capitalize">{k}</span>
        </label>
      {/each}
    </div>

    <!-- Amount -->
    <div>
      <label class="label" for="amount">Amount</label>
      <div class="relative">
        <span
          class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl font-medium text-slate-400"
          aria-hidden="true"
        >₹</span>
        <input
          id="amount"
          name="amount"
          type="number"
          inputmode="decimal"
          step="0.01"
          min="0.01"
          required
          bind:value={amount}
          class="input num text-2xl font-semibold"
          style="padding-left: 2rem; padding-top: 0.625rem; padding-bottom: 0.625rem; min-height: 56px;"
          placeholder="0.00"
        />
      </div>
    </div>

    {#if kind !== 'settlement'}
      <!-- Payer / Receiver -->
      <div>
        <span class="label">{kind === 'expense' ? 'Paid by' : 'Received by'}</span>
        <div
          role="radiogroup"
          aria-label={kind === 'expense' ? 'Paid by' : 'Received by'}
          class="grid grid-cols-3 gap-2"
        >
          {#each data.partners as p}
            <label class="relative">
              <input
                type="radio"
                name="counterparty"
                value={p.id}
                bind:group={counterparty}
                class="peer sr-only"
              />
              <span class="seg-option truncate">{p.name}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Category -->
      <div>
        <label class="label" for="category">Category</label>
        <select id="category" name="category_id" bind:value={categoryId} class="input">
          <option value="">—</option>
          {#each filteredCategories as c}
            <option value={c.id}>{c.name}</option>
          {/each}
        </select>
      </div>
    {:else}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label" for="settle_from">From</label>
          <select id="settle_from" name="settle_from" bind:value={settleFrom} class="input">
            {#each data.partners as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label" for="settle_to">To</label>
          <select id="settle_to" name="settle_to" bind:value={settleTo} class="input">
            {#each data.partners as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
        </div>
      </div>
    {/if}

    {#if kind !== 'settlement' && data.bookings.length > 0}
      <div>
        <label class="label" for="booking_id">Link to booking (optional)</label>
        <select id="booking_id" name="booking_id" bind:value={bookingId} class="input">
          <option value="">— none —</option>
          {#each data.bookings as b}
            <option value={b.id}>
              #{b.id} · {b.customer?.name ?? 'unknown'} · {b.start_at.slice(0, 10)}→{b.end_at.slice(0, 10)} · {b.status}
            </option>
          {/each}
        </select>
      </div>
    {/if}

    <!-- Date + Notes side-by-side on wider phones -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="occurred_on">Date</label>
        <input
          id="occurred_on"
          name="occurred_on"
          type="date"
          required
          bind:value={occurredOn}
          class="input num"
        />
      </div>
      <div>
        <label class="label" for="notes">Notes</label>
        <input
          id="notes"
          name="notes"
          type="text"
          bind:value={notes}
          class="input"
          placeholder="optional"
        />
      </div>
    </div>

    {#if kind !== 'settlement'}
      <details bind:open={splitOpen} class="group rounded-lg border border-slate-200 bg-white">
        <summary
          class="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500"
        >
          <span class="flex items-center gap-2">
            Split
            {#if sharesTouched && !sumMatches}
              <span class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                mismatch
              </span>
            {:else if sharesTouched}
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                custom
              </span>
            {:else}
              <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                equal
              </span>
            {/if}
          </span>
          <svg
            class="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>
        <div class="space-y-3 border-t border-slate-200 p-4">
          {#each data.partners as p}
            <div class="flex items-center gap-3">
              <label
                class="w-16 shrink-0 truncate text-sm font-medium text-slate-700"
                for="share_{p.id}">{p.name}</label
              >
              <div class="relative flex-1">
                <span
                  class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400"
                  aria-hidden="true">₹</span
                >
                <input
                  id="share_{p.id}"
                  name="share_{p.id}"
                  type="number"
                  inputmode="decimal"
                  step="0.01"
                  min="0"
                  bind:value={shares[p.id]}
                  oninput={markSharesTouched}
                  class="input num"
                  style="padding-left: 1.75rem;"
                  placeholder="0.00"
                />
              </div>
            </div>
          {/each}
          <div class="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              class="rounded-md px-2 py-1 text-slate-500 underline-offset-2 hover:bg-slate-100 hover:text-slate-900 hover:underline"
              onclick={() => {
                sharesTouched = false;
              }}
            >
              Reset to equal
            </button>
            <span class="num {sumMatches ? 'text-slate-400' : 'text-rose-500'}">
              Σ ₹{shareSum.toFixed(2)} / ₹{Number(amount || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </details>
    {/if}

    <div>
      <label class="label" for="receipts">Receipts (optional)</label>
      <input
        id="receipts"
        name="receipts"
        type="file"
        accept="image/*,application/pdf"
        multiple
        class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
      />
      <p class="mt-1 text-[11px] text-slate-400">Images or PDF, up to 8 MB each. You can add more on the detail page too.</p>
    </div>

    {#if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {form.message}
      </div>
    {/if}

    <button type="submit" class="btn-primary w-full text-base" style="min-height: 52px;">
      Save transaction
    </button>
  </form>
</section>
