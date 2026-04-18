<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
</script>

<section class="space-y-6">
  <header>
    <h2 class="text-xl font-semibold tracking-tight">Team</h2>
    <p class="mt-1 text-sm text-slate-500">
      Any partner can send an invite. New partners set their password after clicking the link.
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
    {:else if form?.resent}
      <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        Invite re-sent to <strong>{form.email}</strong>.
      </div>
    {:else if form?.removed}
      <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        Removed <strong>{form.email}</strong>.
      </div>
    {:else if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
        {form.message}
      </div>
    {/if}

    <button type="submit" class="btn-primary w-full">Send invite</button>
  </form>

  <section>
    <div class="mb-2 flex items-baseline justify-between">
      <h3 class="text-xs uppercase tracking-[0.12em] text-slate-400">Users</h3>
      {#if data.isAdmin}
        <span class="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">admin</span>
      {/if}
    </div>
    <ul class="card divide-y divide-slate-100 p-0">
      {#each data.users as u}
        <li class="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium text-slate-900">{u.email}</div>
            <div class="text-[11px] text-slate-500">
              <span class={u.confirmed ? 'text-emerald-600' : 'text-amber-600'}>
                {u.confirmed ? 'active' : 'pending'}
              </span>
              <span class="divider-dot"></span>
              <span class="num">joined {u.createdAt.slice(0, 10)}</span>
              {#if u.lastSignInAt}
                <span class="divider-dot"></span>
                <span class="num">last {u.lastSignInAt.slice(0, 10)}</span>
              {/if}
            </div>
          </div>

          {#if data.isAdmin}
            <div class="flex items-center gap-1">
              {#if !u.confirmed}
                <form method="post" action="?/resend" use:enhance class="contents">
                  <input type="hidden" name="user_id" value={u.id} />
                  <input type="hidden" name="email" value={u.email} />
                  <button class="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100" title="Delete pending user and send fresh invite">
                    resend
                  </button>
                </form>
              {/if}
              <form
                method="post"
                action="?/remove"
                use:enhance
                onsubmit={(e) => { if (!confirm(`Remove ${u.email}? This cannot be undone.`)) e.preventDefault(); }}
                class="contents"
              >
                <input type="hidden" name="user_id" value={u.id} />
                <input type="hidden" name="email" value={u.email} />
                <button class="rounded-md px-2 py-1 text-xs text-rose-600 hover:bg-rose-50">
                  remove
                </button>
              </form>
            </div>
          {/if}
        </li>
      {:else}
        <li class="px-4 py-3 text-sm text-slate-400">No users yet.</li>
      {/each}
    </ul>
    {#if !data.isAdmin}
      <p class="mt-2 text-[11px] text-slate-400">Resend / remove actions are available to the team admin only.</p>
    {/if}
  </section>
</section>
