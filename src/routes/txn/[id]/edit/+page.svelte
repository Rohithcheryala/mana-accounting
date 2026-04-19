<script lang="ts">
  import { enhance } from '$app/forms';
  import { equalSplit, paiseToRupees } from '$lib/money';

  let { data, form } = $props();

  type Cat = { id: number; name: string; kind: 'expense' | 'income'; usage?: number };

  const t = data.txn;
  const kind = t.kind as 'expense' | 'income' | 'settlement';

  let amount = $state<string>(paiseToRupees(t.amount_paise).toFixed(2));
  let occurredOn = $state<string>(t.occurred_on);
  let counterparty = $state<number | ''>(t.counterparty ?? '');
  let categoryId = $state<number | ''>(t.category_id ?? '');
  let bookingId = $state<number | ''>(t.booking_id ?? '');
  let notes = $state<string>(t.notes ?? '');
  let changeNote = $state<string>('');

  let settleFrom = $state<number | ''>(data.settlement?.from_partner ?? data.partners[0]?.id ?? '');
  let settleTo = $state<number | ''>(data.settlement?.to_partner ?? data.partners[1]?.id ?? '');

  // Shares: initialize from existing row. Fallback: equal split of current amount.
  let shares = $state<Record<number, string>>(
    Object.fromEntries(
      data.partners.map((p) => {
        const s = data.shares.find((x) => x.partner_id === p.id);
        return [p.id, s ? (s.share_paise / 100).toFixed(2) : ''];
      })
    )
  );

  let sharesTouched = $state(true); // existing shares count as touched so we don't auto-override

  $effect(() => {
    if (sharesTouched) return;
    const paise = Math.round(Number(amount || 0) * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      for (const p of data.partners) shares[p.id] = '';
      return;
    }
    const parts = equalSplit(paise, data.partners.length);
    data.partners.forEach((p, i) => {
      shares[p.id] = (parts[i] / 100).toFixed(2);
    });
  });

  function resetSharesToEqual() {
    sharesTouched = false;
  }
  function markSharesTouched() {
    sharesTouched = true;
  }

  const shareSum = $derived(
    data.partners.reduce((acc, p) => acc + Number(shares[p.id] || 0), 0)
  );
  const sumMatches = $derived(
    Math.round(shareSum * 100) === Math.round(Number(amount || 0) * 100)
  );

  const kindCategories = $derived(
    kind === 'settlement' ? [] : (data.categories as Cat[]).filter((c) => c.kind === kind)
  );
  const kindCategoriesByUsage = $derived(
    [...kindCategories].sort(
      (a, b) => (b.usage ?? 0) - (a.usage ?? 0) || a.name.localeCompare(b.name)
    )
  );
  let showAllCats = $state(false);
  let catSearch = $state('');

  const filteredCategories = $derived.by(() => {
    const q = catSearch.trim().toLowerCase();
    if (q) return kindCategories.filter((c) => c.name.toLowerCase().includes(q));
    if (showAllCats) return kindCategoriesByUsage;
    return [] as Cat[];
  });

  const selectedCategory = $derived(kindCategories.find((c) => c.id === categoryId) ?? null);
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Edit transaction</h1>
    <a href="/txn/{t.id}" class="text-xs text-slate-500 hover:text-slate-900">Cancel</a>
  </div>

  <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
    Editing <span class="num">#{t.id}</span> · {kind}. Kind can't be changed. Every edit is logged.
  </div>

  <form method="post" use:enhance class="space-y-5">
    <!-- Amount -->
    <div>
      <label class="label" for="amount">Amount</label>
      <div class="relative">
        <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xl font-medium text-slate-400" aria-hidden="true">₹</span>
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
        />
      </div>
    </div>

    {#if kind !== 'settlement'}
      <div>
        <span class="label">{kind === 'expense' ? 'Paid by' : 'Received by'}</span>
        <div role="radiogroup" class="grid grid-cols-3 gap-2">
          {#each data.partners as p}
            <label class="relative">
              <input type="radio" name="counterparty" value={p.id} bind:group={counterparty} class="peer sr-only" />
              <span class="seg-option truncate">{p.name}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Category -->
      <div>
        <input type="hidden" name="category_id" value={categoryId} />
        <div class="mb-1.5 flex items-center justify-between">
          <span class="label mb-0">Category</span>
          {#if kindCategories.length > 0 && !catSearch}
            <button
              type="button"
              onclick={() => (showAllCats = !showAllCats)}
              class="text-[11px] font-medium text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
            >
              {showAllCats ? 'hide all' : `show all (${kindCategories.length})`}
            </button>
          {/if}
        </div>

        {#if selectedCategory}
          <div class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 py-1 pl-3 pr-1 text-sm font-medium text-white">
            <span>{selectedCategory.name}</span>
            <button
              type="button"
              onclick={() => (categoryId = '')}
              aria-label="Clear category"
              class="flex h-5 w-5 items-center justify-center rounded-full text-white/70 hover:bg-white/20 hover:text-white"
            >
              <svg viewBox="0 0 24 24" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        {/if}

        <input
          type="text"
          bind:value={catSearch}
          placeholder="Search existing categories…"
          class="input"
          autocomplete="off"
        />

        {#if filteredCategories.length > 0}
          <div class="mt-2 flex flex-wrap gap-1.5">
            {#each filteredCategories as c}
              <button
                type="button"
                onclick={() => { categoryId = c.id; catSearch = ''; showAllCats = false; }}
                class="cat-chip {categoryId === c.id ? 'border-slate-900 bg-slate-900 text-white' : ''}"
              >
                {c.name}
              </button>
            {/each}
          </div>
        {:else if catSearch}
          <p class="mt-2 text-[12px] text-slate-400">No matches. Create new categories from the new-txn page.</p>
        {/if}
      </div>

      {#if data.bookings.length > 0}
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

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="label" for="occurred_on">Date</label>
        <input id="occurred_on" name="occurred_on" type="date" required bind:value={occurredOn} class="input num" />
      </div>
      <div>
        <label class="label" for="notes">Notes</label>
        <input id="notes" name="notes" type="text" bind:value={notes} class="input" />
      </div>
    </div>

    {#if kind !== 'settlement'}
      <details open class="group rounded-lg border border-slate-200 bg-white">
        <summary class="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
          <span class="flex items-center gap-2">
            Split
            {#if !sumMatches}
              <span class="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">mismatch</span>
            {:else}
              <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">ok</span>
            {/if}
          </span>
          <svg class="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div class="space-y-3 border-t border-slate-200 p-4">
          {#each data.partners as p}
            <div class="flex items-center gap-3">
              <label class="w-16 shrink-0 truncate text-sm font-medium text-slate-700" for="share_{p.id}">{p.name}</label>
              <div class="relative flex-1">
                <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400" aria-hidden="true">₹</span>
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
                />
              </div>
            </div>
          {/each}
          <div class="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              class="rounded-md px-2 py-1 text-slate-500 underline-offset-2 hover:bg-slate-100 hover:text-slate-900 hover:underline"
              onclick={resetSharesToEqual}
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
      <label class="label" for="change_note">Reason for edit (optional)</label>
      <input id="change_note" name="change_note" type="text" bind:value={changeNote} class="input" placeholder="e.g. fixed wrong amount" />
    </div>

    {#if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {form.message}
      </div>
    {/if}

    <button type="submit" class="btn-primary w-full text-base" style="min-height: 52px;">Save changes</button>
  </form>
</section>
