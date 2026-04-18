<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
</script>

<div class="mx-auto flex min-h-[100svh] max-w-sm flex-col justify-center px-5 py-10">
  <div class="mb-8 text-center">
    <h1 class="flex items-baseline justify-center gap-1 text-3xl tracking-tight">
      <span class="wordmark leading-none">mana</span>
      <span class="num text-base text-slate-300">·</span>
      <span class="text-lg font-medium text-slate-600">accounting</span>
    </h1>
    <p class="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">set your password</p>
  </div>

  <form method="post" use:enhance class="card space-y-3">
    <p class="text-sm text-slate-600">
      Signing in as <strong>{data.email}</strong>. Pick a password to finish setting up your account.
    </p>

    <div>
      <label class="label" for="password">New password</label>
      <input
        class="input"
        id="password"
        name="password"
        type="password"
        required
        minlength="8"
        autocomplete="new-password"
      />
    </div>

    <div>
      <label class="label" for="confirm">Confirm password</label>
      <input
        class="input"
        id="confirm"
        name="confirm"
        type="password"
        required
        minlength="8"
        autocomplete="new-password"
      />
    </div>

    {#if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {form.message}
      </div>
    {/if}

    <button type="submit" class="btn-primary w-full">Save password</button>
  </form>
</div>
