# mana-accounting

Ledger app for a self-drive car rental run by three equal partners. Invite-only; all three partners are peers. Supabase for database + auth + storage.

## Stack

- **SvelteKit** (TypeScript) + **Tailwind CSS**
- **Supabase** — Postgres, Auth, Storage
- Deploy target: **Cloudflare Workers** (with Static Assets)

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

## Deploying to Cloudflare Workers (with Static Assets)

The project uses `@sveltejs/adapter-cloudflare`. It deploys to **Workers**, not Pages — Cloudflare merged the two platforms and Workers-with-Static-Assets is now the recommended target.

### A. Git-connected deploy (recommended)

1. Push this repo to GitHub.
2. Cloudflare dashboard → **Workers & Pages → Create → Workers → Import a repository**. Pick the repo.
3. Build configuration:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. **Build → Variables and secrets** (build-time, needed by `$env/static/public` at compile):
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
5. **Settings → Variables and Secrets** (runtime):
   - `SUPABASE_SERVICE_ROLE_KEY` — mark as **Secret**
6. Compatibility flag `nodejs_compat` is already set in `wrangler.toml`, so no extra dashboard step needed.
7. In Supabase → **Authentication → URL Configuration**, add your Worker URL (e.g. `https://mana-accounting.<subdomain>.workers.dev`) to the allowed redirect URLs — otherwise invite/reset links will fail to callback.
8. Trigger a deploy. Every push to `main` redeploys.

### B. Manual one-off via wrangler

```sh
npm run build
npx wrangler deploy
```

Set the runtime secret once:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

The two `PUBLIC_*` vars must be in your local `.env` at build time (they're inlined into the client bundle).

## Phase status

- [x] **Phase 1** — foundation, schema, auth, transaction entry/list/detail, dashboard.
- [ ] **Phase 2** — bookings + customers.
- [ ] **Phase 3** — receipt upload, monthly review dashboard, CSV/PDF export.
- [x] **Phase 4** — Cloudflare Workers deploy config. (PWA manifest still open.)

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
