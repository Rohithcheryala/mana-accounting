<script lang="ts">
  let { data } = $props();
</script>

<section class="space-y-4">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">Customers</h1>
    <a href="/customers/new" class="text-xs font-medium text-slate-700 underline-offset-2 hover:underline">+ new</a>
  </div>

  <form method="get">
    <input
      name="q"
      type="search"
      placeholder="Search name or phone…"
      value={data.filters.q}
      class="input"
      autocomplete="off"
    />
  </form>

  {#if data.error}
    <div class="card border-rose-200 bg-rose-50 text-sm text-rose-700">{data.error}</div>
  {:else if data.customers.length === 0}
    <div class="card text-center text-sm text-slate-400">
      No customers yet.
      <a href="/customers/new" class="font-medium text-slate-700 underline">Add one</a>.
    </div>
  {:else}
    <ul class="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {#each data.customers as c}
        <li>
          <a
            href="/customers/{c.id}"
            class="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-slate-100 sm:hover:bg-slate-50"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-[15px] font-medium leading-tight text-slate-900">{c.name}</div>
              <div class="mt-0.5 text-[11px] text-slate-500">
                {#if c.phone}<span class="num">{c.phone}</span>{/if}
                {#if c.phone && c.kyc_note}<span class="divider-dot"></span>{/if}
                {#if c.kyc_note}{c.kyc_note}{/if}
              </div>
            </div>
            <svg viewBox="0 0 24 24" class="h-4 w-4 shrink-0 text-slate-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>
