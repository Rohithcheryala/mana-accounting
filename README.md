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
3. Link the CLI to this project and apply migrations (see **Migrations** below).
4. In **Authentication → Providers → Email**, **disable "Allow new users to sign up"**. Access is invite-only.
5. In **Authentication → Users**, invite yourself as the first partner. Click the email link and set a password at `/set-password`.
6. Additional partners are invited from the app itself at `/team`. Any signed-in partner can invite — all three are peers.

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
- [x] **Phase 2** — bookings + customers. `/customers` CRUD, `/bookings` with reserve→active→close state machine, optional `booking_id` on each transaction.
- [x] **Phase 3** — receipt upload (Supabase Storage `receipts` bucket), monthly review dashboard at `/review` with category/partner breakdown, CSV export at `/txn/export`, print-to-PDF from the review page.
- [x] **Phase 4** — Cloudflare Workers deploy config + PWA manifest (`static/manifest.webmanifest`, SVG icon).

## App surface

- `/` — balances and recent transactions.
- `/txn`, `/txn/new`, `/txn/[id]` — ledger, create, detail (with receipts + linked booking).
- `/bookings`, `/bookings/new`, `/bookings/[id]` — operational side.
- `/customers`, `/customers/new`, `/customers/[id]` — customer book + per-customer booking history.
- `/review?month=YYYY-MM` — monthly P&L, category breakdown, partner activity, bookings summary. Print → PDF.
- `/txn/export?month=YYYY-MM&kind=…&partner=…&q=…` — CSV download respecting the same filters as the ledger.
- `/team` — invite a new partner.

## Design invariants

1. **Balances are derived, never stored.** The `partner_balance` view computes fresh every time.
2. **Shares sum to amount.** Trigger enforces it at the DB level.
3. **Soft delete only.** `voided_at` + `voided_reason`. No hard deletes.
4. **Money in paise.** The `money.ts` lib converts at UI boundaries only.
5. **Bookings ≠ transactions.** A booking is operational; a booking generates many transactions linked via `booking_id`. Deposit amounts live on the booking row, not the ledger (see project memo).

## Migrations

Schema is managed with the **Supabase CLI**. The source of truth is the timestamped SQL files under `supabase/migrations/`.

### Link the CLI (once per machine)

```sh
npx supabase login                                  # opens a browser
npx supabase link --project-ref <your-project-ref>  # prompts for DB password
```

### Adopt the current remote DB as a baseline (once)

If the remote already has schema/data (the usual case), pull it into a baseline migration:

```sh
npx supabase db pull
```

This writes `supabase/migrations/<timestamp>_remote_schema.sql` and marks it as applied on the remote.

### Make a schema change

```sh
npx supabase migration new add_something_cool
# edit the generated file under supabase/migrations/
npx supabase db push                                # applies pending migrations to remote
```

Every change becomes a file in git. Migration order = filename timestamp.

### Regenerate TypeScript types after a migration

```sh
npx supabase gen types typescript \
  --project-id <your-project-ref> \
  > src/lib/database.types.ts
```

Then use `createClient<Database>(...)` for full query autocomplete. (Not wired in yet — opt-in.)

### Spin up a local Postgres for development (optional)

```sh
npx supabase start         # requires Docker
npx supabase db reset      # replays all migrations + supabase/seed.sql
```

`supabase/seed.sql` inserts the three partners and default categories on every reset.
