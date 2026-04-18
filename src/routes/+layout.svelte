<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';

  let { data, children } = $props();

  const nav = [
    {
      href: '/',
      label: 'Home',
      icon: 'M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5'
    },
    {
      href: '/txn/new',
      label: 'New',
      icon: 'M12 5v14M5 12h14'
    },
    {
      href: '/txn',
      label: 'Ledger',
      icon: 'M5 4h14M5 9h14M5 14h9M5 19h14'
    }
  ];

  function active(href: string) {
    const path = $page.url.pathname;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(href + '/');
  }
</script>

{#if data.session}
  <div class="mx-auto max-w-3xl px-4 pb-28 pt-4">
    <header class="mb-6 flex items-center justify-between">
      <a href="/" class="group flex items-baseline gap-1 text-lg tracking-tight">
        <span class="wordmark text-xl leading-none">mana</span>
        <span class="num text-xs text-slate-300">·</span>
        <span class="text-sm font-medium text-slate-500 group-hover:text-slate-900">accounting</span>
      </a>
      <div class="flex items-center gap-1">
        <a
          href="/team"
          class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          team
        </a>
        <form method="post" action="/login?/logout" class="contents">
          <button
            class="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Sign out"
          >
            sign&nbsp;out
          </button>
        </form>
      </div>
    </header>
    {@render children()}
  </div>

  <nav
    class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/80 backdrop-blur-md"
    style="padding-bottom: env(safe-area-inset-bottom);"
    aria-label="Primary"
  >
    <div class="mx-auto grid max-w-3xl grid-cols-3">
      {#each nav as item}
        {@const isActive = active(item.href)}
        <a
          href={item.href}
          aria-current={isActive ? 'page' : undefined}
          class="relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium tracking-wide transition-colors {isActive
            ? 'text-slate-900'
            : 'text-slate-400 hover:text-slate-700'}"
        >
          {#if isActive}
            <span
              class="pointer-events-none absolute inset-x-8 top-0 h-0.5 rounded-full bg-slate-900"
              aria-hidden="true"
            ></span>
          {/if}
          {#if item.label === 'New'}
            <span
              class="flex h-8 w-8 items-center justify-center rounded-full {isActive
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700'}"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={item.icon} />
              </svg>
            </span>
          {:else}
            <svg viewBox="0 0 24 24" class="h-[22px] w-[22px]" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d={item.icon} />
            </svg>
          {/if}
          <span>{item.label}</span>
        </a>
      {/each}
    </div>
  </nav>
{:else}
  <div class="min-h-[100svh]">
    {@render children()}
  </div>
{/if}
