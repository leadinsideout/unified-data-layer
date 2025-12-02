-- Check which PII-related tables and views exist

-- Check for tables
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%pii%'
    OR table_name LIKE '%transcript%'
  )
ORDER BY table_name;

-- Check for views specifically
SELECT
  schemaname,
  viewname,
  viewowner,
  CASE
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'YES - SECURITY DEFINER'
    ELSE 'NO'
  END as has_security_definer
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE '%pii%'
ORDER BY viewname;
