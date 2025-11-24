-- Check the actual SQL definitions of the PII views

SELECT
  viewname,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('pii_stats_by_type', 'items_with_pii', 'pii_scrubbing_stats')
ORDER BY viewname;

-- Also check if there are any SECURITY DEFINER functions related to these views
SELECT
  routine_schema,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%pii%'
    OR security_type = 'DEFINER'
  )
ORDER BY routine_name;
