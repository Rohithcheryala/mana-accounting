<script lang="ts">
  import { enhance } from '$app/forms';

  let { form } = $props();
  let mode = $state<'login' | 'forgot'>(form?.mode === 'forgot' ? 'forgot' : 'login');
</script>

<div class="mx-auto flex min-h-[100svh] max-w-sm flex-col justify-center px-5 py-10">
  <div class="mb-8 text-center">
    <h1 class="flex items-baseline justify-center gap-1 text-3xl tracking-tight">
      <span class="wordmark leading-none">mana</span>
      <span class="num text-base text-slate-300">·</span>
      <span class="text-lg font-medium text-slate-600">accounting</span>
    </h1>
    <p class="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
      {mode === 'forgot' ? 'reset password' : 'partner sign-in'}
    </p>
  </div>

  {#if form?.sent}
    <div class="card border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
      Reset link sent to <strong>{form.email}</strong>. Check your email.
    </div>
  {:else}
    <form method="post" action="?/{mode}" use:enhance class="card space-y-3">
      <div>
        <label class="label" for="email">Email</label>
        <input
          class="input"
          id="email"
          name="email"
          type="email"
          required
          autocomplete="email"
          autocapitalize="none"
          value={form?.email ?? ''}
        />
      </div>

      {#if mode === 'login'}
        <div>
          <label class="label" for="password">Password</label>
          <input
            class="input"
            id="password"
            name="password"
            type="password"
            required
            autocomplete="current-password"
          />
        </div>
      {/if}

      {#if form?.message}
        <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {form.message}
        </div>
      {/if}

      <button type="submit" class="btn-primary w-full">
        {mode === 'login' ? 'Sign in' : 'Send reset link'}
      </button>

      <button
        type="button"
        class="btn-ghost w-full text-xs"
        onclick={() => (mode = mode === 'login' ? 'forgot' : 'login')}
      >
        {mode === 'login' ? 'Forgot password?' : 'Back to sign in'}
      </button>
    </form>
  {/if}

  {#if mode === 'login' && !form?.sent}
    <p class="mt-4 text-center text-xs text-slate-400">
      Access is invite-only. Ask the admin to send you an invite.
    </p>
  {/if}
</div>
