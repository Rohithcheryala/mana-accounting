-- =========================================================================
-- replace_txn_shares(txn_id, shares jsonb) — atomically replace a txn's shares.
--
-- Why: txn_share has a DEFERRABLE constraint trigger that checks
-- sum(share_paise) = txn.amount_paise at commit time. When the app does
-- DELETE + INSERT as two separate PostgREST calls, each one commits
-- independently, the DELETE commits with sum=0 and the trigger fails.
--
-- This function runs both statements in a single transaction, so the
-- invariant is only checked once (at end of function), when the new shares
-- are already in place.
-- =========================================================================

CREATE OR REPLACE FUNCTION replace_txn_shares(
  p_txn_id bigint,
  p_shares jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  DELETE FROM txn_share WHERE txn_id = p_txn_id;

  INSERT INTO txn_share (txn_id, partner_id, share_paise)
  SELECT
    p_txn_id,
    (elem->>'partner_id')::int,
    (elem->>'share_paise')::bigint
  FROM jsonb_array_elements(p_shares) AS elem;
END;
$$;

-- Let any authenticated user call it; actual access is still governed by RLS
-- on txn_share itself (auth_all policy).
GRANT EXECUTE ON FUNCTION replace_txn_shares(bigint, jsonb) TO authenticated;
