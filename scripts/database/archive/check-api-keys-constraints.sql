-- Check api_keys table constraints

SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'api_keys'::regclass
ORDER BY conname;
