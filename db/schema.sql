-- =========================================================================
-- mana-accounting — Postgres schema
-- Apply in Supabase SQL editor on a fresh project (or run against any Postgres).
-- =========================================================================

-- Money is stored in paise (integers). Never floats.
-- Amounts, shares, balances all use bigint paise.

-- ------------------------------------------------------------------ EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------------ PARTNERS
CREATE TABLE IF NOT EXISTS partner (
  id         int PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ CATEGORIES
CREATE TABLE IF NOT EXISTS category (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('expense', 'income'))
);

-- ------------------------------------------------------------------ CUSTOMERS
CREATE TABLE IF NOT EXISTS customer (
  id         bigserial PRIMARY KEY,
  name       text NOT NULL,
  phone      text,
  kyc_note   text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ BOOKINGS
CREATE TABLE IF NOT EXISTS booking (
  id                      bigserial PRIMARY KEY,
  customer_id             bigint REFERENCES customer(id) ON DELETE RESTRICT,
  start_at                timestamptz NOT NULL,
  end_at                  timestamptz NOT NULL,
  quoted_rate_paise       bigint NOT NULL CHECK (quoted_rate_paise >= 0),
  quoted_total_paise      bigint NOT NULL CHECK (quoted_total_paise >= 0),
  deposit_held_paise      bigint NOT NULL DEFAULT 0 CHECK (deposit_held_paise >= 0),
  deposit_refunded_paise  bigint NOT NULL DEFAULT 0 CHECK (deposit_refunded_paise >= 0),
  deposit_retained_paise  bigint NOT NULL DEFAULT 0 CHECK (deposit_retained_paise >= 0),
  odo_out_km              int,
  odo_in_km               int,
  fuel_out_pct            int CHECK (fuel_out_pct BETWEEN 0 AND 100),
  fuel_in_pct             int CHECK (fuel_in_pct BETWEEN 0 AND 100),
  platform                text NOT NULL DEFAULT 'direct',
  platform_fee_pct        numeric(5,2) NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'reserved'
                           CHECK (status IN ('reserved', 'active', 'closed', 'cancelled')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_start_at_idx ON booking (start_at DESC);
CREATE INDEX IF NOT EXISTS booking_status_idx   ON booking (status);

-- ------------------------------------------------------------------ TRANSACTIONS
CREATE TABLE IF NOT EXISTS txn (
  id            bigserial PRIMARY KEY,
  occurred_on   date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  kind          text NOT NULL CHECK (kind IN ('expense', 'income', 'settlement')),
  amount_paise  bigint NOT NULL CHECK (amount_paise > 0),
  counterparty  int REFERENCES partner(id),       -- payer for expense, receiver for income
  category_id   int REFERENCES category(id),
  booking_id    bigint REFERENCES booking(id) ON DELETE SET NULL,
  notes         text,
  voided_at     timestamptz,
  voided_reason text
);

CREATE INDEX IF NOT EXISTS txn_occurred_on_idx ON txn (occurred_on DESC);
CREATE INDEX IF NOT EXISTS txn_booking_idx     ON txn (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS txn_kind_idx        ON txn (kind);
CREATE INDEX IF NOT EXISTS txn_notes_trgm_idx  ON txn USING gin (notes gin_trgm_ops);

-- ------------------------------------------------------------------ TXN SHARES
CREATE TABLE IF NOT EXISTS txn_share (
  txn_id       bigint NOT NULL REFERENCES txn(id) ON DELETE CASCADE,
  partner_id   int    NOT NULL REFERENCES partner(id),
  share_paise  bigint NOT NULL CHECK (share_paise >= 0),
  PRIMARY KEY (txn_id, partner_id)
);

-- Settlements are two rows: from_partner with share = -amount, to_partner with share = +amount.
-- For expense/income: sum of shares must equal txn.amount_paise.

-- ------------------------------------------------------------------ SETTLEMENT DETAIL
-- Tracks the two sides of a settlement transaction.
CREATE TABLE IF NOT EXISTS settlement (
  txn_id        bigint PRIMARY KEY REFERENCES txn(id) ON DELETE CASCADE,
  from_partner  int NOT NULL REFERENCES partner(id),
  to_partner    int NOT NULL REFERENCES partner(id),
  CHECK (from_partner <> to_partner)
);

-- ------------------------------------------------------------------ RECEIPTS
CREATE TABLE IF NOT EXISTS txn_receipt (
  id            bigserial PRIMARY KEY,
  txn_id        bigint NOT NULL REFERENCES txn(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  mime_type     text,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS txn_receipt_txn_idx ON txn_receipt (txn_id);

-- ------------------------------------------------------------------ DOCS
-- Shared document store: insurance, RC, PUC, permits, licences, etc.
CREATE TABLE IF NOT EXISTS doc (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  category      text,
  storage_path  text NOT NULL,
  mime_type     text,
  size_bytes    bigint,
  notes         text,
  uploaded_by   uuid,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS doc_uploaded_at_idx ON doc (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS doc_category_idx    ON doc (category);

-- ------------------------------------------------------------------ SHARE SUM INVARIANT
-- For expense/income txns, sum of shares must equal amount_paise.
-- Checked after insert/update on txn_share (constraint trigger, deferred to end of txn).
CREATE OR REPLACE FUNCTION check_txn_share_sum() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_kind   text;
  v_amount bigint;
  v_sum    bigint;
  v_txn_id bigint;
BEGIN
  v_txn_id := COALESCE(NEW.txn_id, OLD.txn_id);
  SELECT kind, amount_paise INTO v_kind, v_amount FROM txn WHERE id = v_txn_id;
  IF v_kind IS NULL OR v_kind = 'settlement' THEN
    RETURN NULL; -- settlements do not use the same share rule
  END IF;
  SELECT COALESCE(SUM(share_paise), 0) INTO v_sum FROM txn_share WHERE txn_id = v_txn_id;
  IF v_sum <> v_amount THEN
    RAISE EXCEPTION 'share sum (% paise) does not equal txn amount (% paise) for txn %',
                    v_sum, v_amount, v_txn_id;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_txn_share_sum ON txn_share;
CREATE CONSTRAINT TRIGGER trg_txn_share_sum
  AFTER INSERT OR UPDATE OR DELETE ON txn_share
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_txn_share_sum();

-- ------------------------------------------------------------------ BALANCE VIEW
-- One row per partner. Positive = owed money by partnership. Negative = owes partnership.
CREATE OR REPLACE VIEW partner_balance AS
WITH cash AS (
  -- payer of expense pays cash out of pocket: +amount to their balance
  -- receiver of income takes cash in: -amount from their balance
  SELECT counterparty AS partner_id,
         SUM(CASE WHEN kind = 'expense' THEN  amount_paise
                  WHEN kind = 'income'  THEN -amount_paise
                  ELSE 0 END) AS delta
  FROM txn
  WHERE voided_at IS NULL AND kind IN ('expense', 'income') AND counterparty IS NOT NULL
  GROUP BY counterparty
),
shares AS (
  -- each partner's share of an expense reduces their balance (they owe it)
  -- each partner's share of income increases their balance (they are owed it)
  SELECT s.partner_id,
         SUM(CASE WHEN t.kind = 'expense' THEN -s.share_paise
                  WHEN t.kind = 'income'  THEN  s.share_paise
                  ELSE 0 END) AS delta
  FROM txn_share s
  JOIN txn t ON t.id = s.txn_id
  WHERE t.voided_at IS NULL
  GROUP BY s.partner_id
),
settle AS (
  -- settlement: from_partner pays to_partner; from's balance -= amount, to's balance += amount
  SELECT p.id AS partner_id,
         COALESCE(SUM(CASE
           WHEN s.from_partner = p.id THEN -t.amount_paise
           WHEN s.to_partner   = p.id THEN  t.amount_paise
           ELSE 0 END), 0) AS delta
  FROM partner p
  LEFT JOIN settlement s ON s.from_partner = p.id OR s.to_partner = p.id
  LEFT JOIN txn t ON t.id = s.txn_id AND t.voided_at IS NULL
  GROUP BY p.id
)
SELECT p.id,
       p.name,
       COALESCE(cash.delta,   0)
     + COALESCE(shares.delta, 0)
     + COALESCE(settle.delta, 0) AS balance_paise
FROM partner p
LEFT JOIN cash   ON cash.partner_id   = p.id
LEFT JOIN shares ON shares.partner_id = p.id
LEFT JOIN settle ON settle.partner_id = p.id;

-- ------------------------------------------------------------------ ROW LEVEL SECURITY
-- Admin-only app: a single authenticated user has full access.
-- Any signed-in user can read/write everything. Unauth'd users see nothing.
ALTER TABLE partner      ENABLE ROW LEVEL SECURITY;
ALTER TABLE category     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer     ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking      ENABLE ROW LEVEL SECURITY;
ALTER TABLE txn          ENABLE ROW LEVEL SECURITY;
ALTER TABLE txn_share    ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement   ENABLE ROW LEVEL SECURITY;
ALTER TABLE txn_receipt  ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'partner','category','customer','booking','txn','txn_share','settlement','txn_receipt','doc'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_all ON %I', t);
    EXECUTE format('CREATE POLICY auth_all ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
