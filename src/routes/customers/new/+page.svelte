<script lang="ts">
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<section class="space-y-5">
  <div class="flex items-baseline justify-between">
    <h1 class="text-lg font-semibold tracking-tight">New customer</h1>
    <a href="/customers" class="text-xs text-slate-500 hover:text-slate-900">Cancel</a>
  </div>

  <form method="post" enctype="multipart/form-data" use:enhance class="space-y-4">
    <div>
      <label class="label" for="name">Name</label>
      <input id="name" name="name" type="text" required value={form?.values?.name ?? ''} class="input" autocomplete="name" />
    </div>

    <div>
      <label class="label" for="phone">Phone</label>
      <input id="phone" name="phone" type="tel" inputmode="tel" value={form?.values?.phone ?? ''} class="input num" autocomplete="tel" placeholder="+91…" />
    </div>

    <div>
      <label class="label" for="email">Email</label>
      <input id="email" name="email" type="email" inputmode="email" autocapitalize="none" autocomplete="email" value={form?.values?.email ?? ''} class="input" placeholder="optional" />
    </div>

    <div>
      <label class="label" for="kyc">KYC</label>
      <input
        id="kyc"
        name="kyc"
        type="file"
        accept="image/*,application/pdf"
        multiple
        class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
      />
      <p class="mt-1 text-[11px] text-slate-400">Aadhaar / DL / etc. Images or PDF, up to 8 MB each. You can add more later.</p>
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
