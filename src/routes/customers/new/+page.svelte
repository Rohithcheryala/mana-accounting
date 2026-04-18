<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">New customer</h1>
    <a href="/customers" class="text-xs text-slate-500 hover:text-slate-900">Cancel</a>
  </div>

  <form method="post" use:enhance class="space-y-4">
    <div>
      <label class="label" for="name">Name</label>
      <input id="name" name="name" type="text" required value={form?.values?.name ?? ''} class="input" autocomplete="name" />
    </div>

    <div>
      <label class="label" for="phone">Phone</label>
      <input id="phone" name="phone" type="tel" inputmode="tel" value={form?.values?.phone ?? ''} class="input num" autocomplete="tel" placeholder="+91…" />
    </div>

    <div>
      <label class="label" for="kyc_note">KYC note</label>
      <input id="kyc_note" name="kyc_note" type="text" value={form?.values?.kyc_note ?? ''} class="input" placeholder="Aadhaar last 4, DL no, etc." />
    </div>

    <div>
      <label class="label" for="notes">Notes</label>
      <textarea id="notes" name="notes" rows="3" class="input" placeholder="optional">{form?.values?.notes ?? ''}</textarea>
    </div>

    {#if form?.message}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{form.message}</div>
    {/if}

    <button type="submit" class="btn-primary w-full">Save customer</button>
  </form>
</section>
