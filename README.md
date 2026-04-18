# mana-accounting

Ledger app for a self-drive car rental run by three equal partners. Invite-only; all three partners are peers. Supabase for database + auth + storage.

## Stack

- **SvelteKit** (TypeScript) + **Tailwind CSS**
- **Supabase** — Postgres, Auth, Storage
- Deploy target: **Cloudflare Pages** (no TOS issue with commercial use)

## One-time setup

### 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Pick a strong DB password and the nearest region.
3. Once provisioned, open **SQL Editor**.
4. Paste and run `db/schema.sql`, then `db/seed.sql`.
5. In **Authentication → Providers → Email**, **disable "Allow new users to sign up"**. Access is invite-only.
6. In **Authentication → Users**, invite yourself as the first partner. Click the email link and set a password at `/set-password`.
7. Additional partners are invited from the app itself at `/team`. Any signed-in partner can invite — all three are peers.

### 2. Get credentials

**Project Settings → API:**
- `Project URL` → `PUBLIC_SUPABASE_URL`
- `anon / public` key → `PUBLIC_SUPABASE_ANON_KEY`
- `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never shipped to the browser)

Copy `.env.example` to `.env` and paste them in.

### 3. Install and run

```sh
npm install
npm run dev
```

Open http://localhost:5173.

## Data model (short)

- `partner` — the three of you. Fixed, seeded.
- `category` — expense/income buckets. Seeded with car-specific defaults.
- `customer`, `booking` — self-drive rental side.
- `txn` — one row per money event (expense / income / settlement).
- `txn_share` — how each txn splits across partners (sums to `amount_paise`; enforced by trigger).
- `settlement` — two-sided detail for settlement txns.
- `txn_receipt` — UPI screenshots etc. (Phase 3, uses Supabase Storage).
- `partner_balance` — **view**, computed from the above. Never stored.

Money is stored in **paise** (integers) everywhere. No floats.

## Deploying to Cloudflare Pages

The project uses `@sveltejs/adapter-cloudflare`. Two paths:

### A. Git-connected deploy (recommended)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**. Pick the repo.
3. Build settings:
   - **Framework preset:** SvelteKit
   - **Build command:** `npm run build`
   - **Build output directory:** `.svelte-kit/cloudflare`
4. **Settings → Environment variables (Production)** — add:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**mark as Secret**)
5. **Settings → Functions → Compatibility flags** — add `nodejs_compat` for both Production and Preview. (Also already set in `wrangler.toml`.)
6. In Supabase → **Authentication → URL Configuration**, add your Pages URL (e.g. `https://mana-accounting.pages.dev`) to the allowed redirect URLs.
7. Trigger a deploy. Every push to the main branch redeploys.

### B. Manual one-off via wrangler

```sh
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name mana-accounting
```

Set the env vars via `npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name mana-accounting` (and the public ones as regular env vars in the dashboard or with `--compatibility-flag=nodejs_compat`).

## Phase status

- [x] **Phase 1** — foundation, schema, auth, transaction entry/list/detail, dashboard.
- [ ] **Phase 2** — bookings + customers.
- [ ] **Phase 3** — receipt upload, monthly review dashboard, CSV/PDF export.
- [x] **Phase 4** — Cloudflare Pages deploy config. (PWA manifest still open.)

## Design invariants

1. **Balances are derived, never stored.** The `partner_balance` view computes fresh every time.
2. **Shares sum to amount.** Trigger enforces it at the DB level.
3. **Soft delete only.** `voided_at` + `voided_reason`. No hard deletes.
4. **Money in paise.** The `money.ts` lib converts at UI boundaries only.
5. **Bookings ≠ transactions.** A booking is operational; a booking generates many transactions linked via `booking_id`. Deposit amounts live on the booking row, not the ledger (see project memo).

## Running a local Supabase (optional)

If you'd rather not touch the hosted Supabase while developing:

```sh
npx supabase init
npx supabase start
npx supabase db reset --db-url <local-db-url>
# Then point .env at the local URLs supabase start prints.
```

Requires Docker.
