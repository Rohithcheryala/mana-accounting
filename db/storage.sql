-- =========================================================================
-- mana-accounting — Supabase Storage buckets (receipts + docs)
-- Apply AFTER schema.sql. Safe to re-run.
-- =========================================================================

-- Private buckets: access is via signed URLs, not public URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('docs', 'docs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc', 'kyc', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any prior policies so re-applying is idempotent.
DROP POLICY IF EXISTS "receipts auth read"    ON storage.objects;
DROP POLICY IF EXISTS "receipts auth insert"  ON storage.objects;
DROP POLICY IF EXISTS "receipts auth update"  ON storage.objects;
DROP POLICY IF EXISTS "receipts auth delete"  ON storage.objects;
DROP POLICY IF EXISTS "docs auth read"        ON storage.objects;
DROP POLICY IF EXISTS "docs auth insert"      ON storage.objects;
DROP POLICY IF EXISTS "docs auth update"      ON storage.objects;
DROP POLICY IF EXISTS "docs auth delete"      ON storage.objects;
DROP POLICY IF EXISTS "kyc auth read"         ON storage.objects;
DROP POLICY IF EXISTS "kyc auth insert"       ON storage.objects;
DROP POLICY IF EXISTS "kyc auth update"       ON storage.objects;
DROP POLICY IF EXISTS "kyc auth delete"       ON storage.objects;

CREATE POLICY "receipts auth read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'receipts');

CREATE POLICY "receipts auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'receipts');

CREATE POLICY "docs auth read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'docs');

CREATE POLICY "docs auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'docs');

CREATE POLICY "docs auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'docs')
  WITH CHECK (bucket_id = 'docs');

CREATE POLICY "docs auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'docs');

CREATE POLICY "kyc auth read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'kyc');

CREATE POLICY "kyc auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc');

CREATE POLICY "kyc auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kyc')
  WITH CHECK (bucket_id = 'kyc');

CREATE POLICY "kyc auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'kyc');
