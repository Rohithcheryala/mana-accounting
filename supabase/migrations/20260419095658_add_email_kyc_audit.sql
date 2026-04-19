-- =========================================================================
-- Adds: customer.email, customer_kyc table (+ kyc storage bucket),
--       txn_audit table, doc table (if missing).
-- Drops: legacy customer.kyc_note text column.
-- =========================================================================

-- customer.email -----------------------------------------------------------
ALTER TABLE customer ADD COLUMN IF NOT EXISTS email text;

-- Drop legacy text kyc_note column (KYC is now image-based via customer_kyc).
ALTER TABLE customer DROP COLUMN IF EXISTS kyc_note;

-- customer_kyc -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_kyc (
  id            bigserial PRIMARY KEY,
  customer_id   bigint NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  mime_type     text,
  label         text,
  uploaded_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_kyc_customer_idx ON customer_kyc (customer_id);
ALTER TABLE customer_kyc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON customer_kyc;
CREATE POLICY auth_all ON customer_kyc FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- txn_audit ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS txn_audit (
  id          bigserial PRIMARY KEY,
  txn_id      bigint NOT NULL REFERENCES txn(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('create','edit','void','unvoid')),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid,
  before      jsonb,
  after       jsonb,
  note        text
);
CREATE INDEX IF NOT EXISTS txn_audit_txn_idx ON txn_audit (txn_id, changed_at DESC);
ALTER TABLE txn_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON txn_audit;
CREATE POLICY auth_all ON txn_audit FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- doc (no-op if already there) --------------------------------------------
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
ALTER TABLE doc ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_all ON doc;
CREATE POLICY auth_all ON doc FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Storage: kyc bucket + policies -------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc', 'kyc', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kyc auth read"   ON storage.objects;
DROP POLICY IF EXISTS "kyc auth insert" ON storage.objects;
DROP POLICY IF EXISTS "kyc auth update" ON storage.objects;
DROP POLICY IF EXISTS "kyc auth delete" ON storage.objects;

CREATE POLICY "kyc auth read"   ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'kyc');
CREATE POLICY "kyc auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc');
CREATE POLICY "kyc auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc') WITH CHECK (bucket_id = 'kyc');
CREATE POLICY "kyc auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'kyc');
