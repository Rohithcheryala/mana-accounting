-- =========================================================================
-- mana-accounting — Supabase Storage bucket for txn receipts
-- Apply AFTER schema.sql. Safe to re-run.
-- =========================================================================

-- Private bucket: access is via signed URLs, not public URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Drop any prior policies so re-applying is idempotent.
DROP POLICY IF EXISTS "receipts auth read"    ON storage.objects;
DROP POLICY IF EXISTS "receipts auth insert"  ON storage.objects;
DROP POLICY IF EXISTS "receipts auth update"  ON storage.objects;
DROP POLICY IF EXISTS "receipts auth delete"  ON storage.objects;

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
