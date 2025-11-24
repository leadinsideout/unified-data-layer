-- Inspect api_keys table to understand current data

-- Check all api_keys and their ownership
SELECT
  id,
  coaching_company_id,
  coach_id,
  client_id,
  CASE
    WHEN coach_id IS NOT NULL AND client_id IS NULL THEN 'coach_only'
    WHEN coach_id IS NULL AND client_id IS NOT NULL THEN 'client_only'
    WHEN coach_id IS NOT NULL AND client_id IS NOT NULL THEN 'BOTH (violation!)'
    WHEN coach_id IS NULL AND client_id IS NULL THEN 'NEITHER (violation!)'
  END as ownership_status,
  created_at
FROM api_keys
ORDER BY created_at DESC;

-- Count by ownership type
SELECT
  CASE
    WHEN coach_id IS NOT NULL AND client_id IS NULL THEN 'coach_only'
    WHEN coach_id IS NULL AND client_id IS NOT NULL THEN 'client_only'
    WHEN coach_id IS NOT NULL AND client_id IS NOT NULL THEN 'BOTH (violation!)'
    WHEN coach_id IS NULL AND client_id IS NULL THEN 'NEITHER (violation!)'
  END as ownership_status,
  COUNT(*) as count
FROM api_keys
GROUP BY ownership_status;
