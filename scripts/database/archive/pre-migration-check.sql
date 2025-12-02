-- Pre-migration check: Inspect api_keys data before migration

-- Show all api_keys with their current ownership
SELECT
  id,
  key_prefix,
  coach_id,
  client_id,
  CASE
    WHEN coach_id IS NOT NULL AND client_id IS NULL THEN '✅ coach_only (valid)'
    WHEN coach_id IS NULL AND client_id IS NOT NULL THEN '✅ client_only (valid)'
    WHEN coach_id IS NOT NULL AND client_id IS NOT NULL THEN '❌ BOTH coach and client (INVALID)'
    WHEN coach_id IS NULL AND client_id IS NULL THEN '❌ NO OWNER (INVALID - will become admin key)'
  END as ownership_status,
  is_revoked,
  created_at
FROM api_keys
ORDER BY
  CASE
    WHEN coach_id IS NOT NULL AND client_id IS NOT NULL THEN 1
    WHEN coach_id IS NULL AND client_id IS NULL THEN 2
    ELSE 3
  END,
  created_at DESC;

-- Summary count
SELECT
  CASE
    WHEN coach_id IS NOT NULL AND client_id IS NULL THEN 'coach_only (valid)'
    WHEN coach_id IS NULL AND client_id IS NOT NULL THEN 'client_only (valid)'
    WHEN coach_id IS NOT NULL AND client_id IS NOT NULL THEN 'BOTH (INVALID)'
    WHEN coach_id IS NULL AND client_id IS NULL THEN 'NO OWNER (will become admin key)'
  END as ownership_status,
  COUNT(*) as count
FROM api_keys
GROUP BY ownership_status
ORDER BY count DESC;
