<script lang="ts">
  interface Props {
    name?: string;
    value?: string;
    allowAny?: boolean;
    onchange?: () => void;
  }

  let {
    name = 'month',
    value = $bindable(''),
    allowAny = true,
    onchange
  }: Props = $props();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function parseValue(v: string): { year: number; month: number } | null {
    return /^\d{4}-\d{2}$/.test(v)
      ? { year: Number(v.slice(0, 4)), month: Number(v.slice(5, 7)) }
      : null;
  }

  let open = $state(false);
  let viewYear = $state(parseValue(value)?.year ?? new Date().getFullYear());
  let rootEl: HTMLDivElement | undefined = $state();

  const current = $derived(parseValue(value));
  const label = $derived(
    current ? `${months[current.month - 1]} ${current.year}` : allowAny ? 'Any month' : '—'
  );

  function pick(month: number) {
    value = `${viewYear}-${String(month).padStart(2, '0')}`;
    open = false;
    onchange?.();
  }

  function clear() {
    value = '';
    open = false;
    onchange?.();
  }

  function toggle() {
    open = !open;
    if (open && current) viewYear = current.year;
  }

  $effect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootEl && !rootEl.contains(e.target as Node)) open = false;
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') open = false;
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  });
</script>

<div bind:this={rootEl} class="relative">
  <input type="hidden" {name} {value} />
  <button
    type="button"
    onclick={toggle}
    aria-haspopup="dialog"
    aria-expanded={open}
    class="input flex w-full items-center justify-between pr-3 text-left"
  >
    <span class={current ? 'text-slate-900' : 'text-slate-400'}>{label}</span>
    <svg
      viewBox="0 0 24 24"
      class="h-4 w-4 shrink-0 text-slate-400 transition-transform {open ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {#if open}
    <div
      class="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
      role="dialog"
      aria-label="Select month"
    >
      <div class="flex items-center justify-between">
        <button
          type="button"
          onclick={() => (viewYear -= 1)}
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Previous year"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <span class="num text-sm font-semibold tracking-tight text-slate-900">{viewYear}</span>
        <button
          type="button"
          onclick={() => (viewYear += 1)}
          class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Next year"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>

      <div class="mt-2 grid grid-cols-3 gap-1">
        {#each months as m, i}
          {@const isSelected = current?.year === viewYear && current?.month === i + 1}
          <button
            type="button"
            onclick={() => pick(i + 1)}
            class="rounded-md px-2 py-2 text-sm transition-colors {isSelected
              ? 'bg-slate-900 font-semibold text-white'
              : 'text-slate-700 hover:bg-slate-100'}"
          >
            {m}
          </button>
        {/each}
      </div>

      {#if allowAny}
        <button
          type="button"
          onclick={clear}
          class="mt-2 block w-full rounded-md py-1.5 text-center text-[12px] text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          Any month
        </button>
      {/if}
    </div>
  {/if}
</div>
