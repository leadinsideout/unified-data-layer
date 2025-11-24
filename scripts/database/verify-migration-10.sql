-- Verification script for Migration 10: Create admins table
-- Run this after the migration to confirm everything is correct

-- ============================================================================
-- 1. Verify admins table structure
-- ============================================================================

SELECT 'Checking admins table structure...' AS step;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'admins'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. Verify admin user was created
-- ============================================================================

SELECT 'Checking admin users...' AS step;

SELECT
  id,
  email,
  name,
  role,
  coaching_company_id,
  created_at
FROM admins;

-- ============================================================================
-- 3. Verify admin_id column added to api_keys
-- ============================================================================

SELECT 'Checking admin_id column in api_keys...' AS step;

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys' AND column_name = 'admin_id';

-- ============================================================================
-- 4. Verify orphaned keys were assigned to admin
-- ============================================================================

SELECT 'Checking API key ownership distribution...' AS step;

SELECT
  CASE
    WHEN coach_id IS NOT NULL THEN 'Coach-owned'
    WHEN client_id IS NOT NULL THEN 'Client-owned'
    WHEN admin_id IS NOT NULL THEN 'Admin-owned'
    ELSE 'NO OWNER (ERROR!)'
  END as owner_type,
  COUNT(*) as count
FROM api_keys
GROUP BY owner_type
ORDER BY count DESC;

-- ============================================================================
-- 5. Verify constraint is in place
-- ============================================================================

SELECT 'Checking key_has_single_owner constraint...' AS step;

SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'key_has_single_owner';

-- ============================================================================
-- 6. Verify RLS is enabled on admins table
-- ============================================================================

SELECT 'Checking RLS status on admins table...' AS step;

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'admins';

-- ============================================================================
-- 7. Verify RLS policies were created
-- ============================================================================

SELECT 'Checking RLS policies...' AS step;

SELECT
  tablename,
  policyname,
  cmd as command,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE tablename IN ('admins', 'api_keys')
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. Verify indexes were created
-- ============================================================================

SELECT 'Checking indexes...' AS step;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('admins', 'api_keys')
  AND indexname LIKE '%admin%'
ORDER BY tablename, indexname;

-- ============================================================================
-- Summary
-- ============================================================================

SELECT '✅ Migration verification complete!' AS status;
