<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
</script>

<section class="space-y-6">
  <header>
    <h2 class="text-xl font-semibold tracking-tight">Invite a partner</h2>
    <p class="mt-1 text-sm text-slate-500">
      Sends an invite email. They click the link, set a password, and they're in.
    </p>
  </header>

  <form method="post" action="?/invite" use:enhance class="card space-y-3">
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

    {#if form?.sent}
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Invite sent to <strong>{form.email}</strong>.
      </div>
    {:else if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {form.message}
      </div>
    {/if}

    <button type="submit" class="btn-primary w-full">Send invite</button>
  </form>

  <section>
    <h3 class="mb-2 text-xs uppercase tracking-[0.12em] text-slate-400">Users</h3>
    <ul class="card divide-y divide-slate-100 p-0">
      {#each data.users as u}
        <li class="flex items-center justify-between px-4 py-3 text-sm">
          <span class="truncate">{u.email}</span>
          <span class="text-xs {u.confirmed ? 'text-emerald-600' : 'text-amber-600'}">
            {u.confirmed ? 'active' : 'pending'}
          </span>
        </li>
      {:else}
        <li class="px-4 py-3 text-sm text-slate-400">No users yet.</li>
      {/each}
    </ul>
  </section>
</section>
