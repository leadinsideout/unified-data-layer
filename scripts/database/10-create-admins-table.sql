-- Migration: Create admins table and update api_keys
-- Checkpoint: 10
-- Date: 2025-11-24
-- Description:
--   1. Creates admins table for platform administrators (executive assistants, etc.)
--   2. Adds admin_id column to api_keys table
--   3. Updates key_has_single_owner constraint to include admin_id
--   4. Enables RLS on admins table
--   5. Creates RLS policies for admins
--   6. Seeds first admin user

-- ============================================================================
-- STEP 0: Create helper function if it doesn't exist
-- ============================================================================

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 1: Create admins table
-- ============================================================================

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL
    REFERENCES coaching_companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK (role IN ('super_admin', 'admin', 'support')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for admins table
CREATE INDEX IF NOT EXISTS idx_admins_company
  ON admins(coaching_company_id);
CREATE INDEX IF NOT EXISTS idx_admins_email
  ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_role
  ON admins(role);

-- Add updated_at trigger
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 2: Add admin_id column to api_keys table
-- ============================================================================

-- Add admin_id column (nullable initially for migration)
ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS admin_id UUID
  REFERENCES admins(id) ON DELETE CASCADE;

-- Create index for admin_id
CREATE INDEX IF NOT EXISTS idx_api_keys_admin
  ON api_keys(admin_id);

-- ============================================================================
-- STEP 3: Update key_has_single_owner constraint
-- ============================================================================

-- First, check if there are any rows that violate the constraint
-- (This is informational only - the constraint will still be added)
DO $$
DECLARE
  violation_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO violation_count
  FROM api_keys
  WHERE NOT (
    (coach_id IS NOT NULL AND client_id IS NULL AND admin_id IS NULL) OR
    (coach_id IS NULL AND client_id IS NOT NULL AND admin_id IS NULL) OR
    (coach_id IS NULL AND client_id IS NULL AND admin_id IS NOT NULL)
  );

  IF violation_count > 0 THEN
    RAISE NOTICE 'Found % api_keys rows that violate the constraint', violation_count;
    RAISE NOTICE 'These rows need to be fixed before adding the constraint';
  ELSE
    RAISE NOTICE 'All api_keys rows satisfy the constraint';
  END IF;
END $$;

-- Drop the old constraint
ALTER TABLE api_keys
DROP CONSTRAINT IF EXISTS key_has_single_owner;

-- Add new constraint that includes admin_id
-- Note: This will fail if any rows violate the constraint
ALTER TABLE api_keys
ADD CONSTRAINT key_has_single_owner CHECK (
  (coach_id IS NOT NULL AND client_id IS NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NOT NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NULL AND admin_id IS NOT NULL)
);

-- ============================================================================
-- STEP 4: Enable RLS on admins table
-- ============================================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies for admins table
-- ============================================================================

-- Policy 1: Admins can view all admins in their company
CREATE POLICY "Admins can view admins in their company"
  ON admins
  FOR SELECT
  USING (
    -- Admin users can see all admins in their company
    EXISTS (
      SELECT 1 FROM api_keys
      WHERE api_keys.admin_id = auth.uid()
        AND api_keys.coaching_company_id = admins.coaching_company_id
    )
  );

-- Policy 2: Super admins can insert new admins
CREATE POLICY "Super admins can create admins"
  ON admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins AS current_admin
      JOIN api_keys ON api_keys.admin_id = current_admin.id
      WHERE api_keys.admin_id = auth.uid()
        AND current_admin.role = 'super_admin'
        AND current_admin.coaching_company_id = coaching_company_id
    )
  );

-- Policy 3: Super admins can update admins
CREATE POLICY "Super admins can update admins"
  ON admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins AS current_admin
      JOIN api_keys ON api_keys.admin_id = current_admin.id
      WHERE api_keys.admin_id = auth.uid()
        AND current_admin.role = 'super_admin'
        AND current_admin.coaching_company_id = coaching_company_id
    )
  );

-- Policy 4: Super admins can delete admins (except themselves)
CREATE POLICY "Super admins can delete admins"
  ON admins
  FOR DELETE
  USING (
    id != auth.uid() -- Cannot delete yourself
    AND EXISTS (
      SELECT 1 FROM admins AS current_admin
      JOIN api_keys ON api_keys.admin_id = current_admin.id
      WHERE api_keys.admin_id = auth.uid()
        AND current_admin.role = 'super_admin'
        AND current_admin.coaching_company_id = coaching_company_id
    )
  );

-- ============================================================================
-- STEP 6: Update existing RLS policies to handle admin_id
-- ============================================================================

-- Update api_keys SELECT policy to include admin_id
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;
CREATE POLICY "Users can view their own API keys"
  ON api_keys
  FOR SELECT
  USING (
    coach_id = auth.uid()
    OR client_id = auth.uid()
    OR admin_id = auth.uid()
  );

-- Update api_keys INSERT policy for admins
DROP POLICY IF EXISTS "Only admins can create API keys" ON api_keys;
CREATE POLICY "Only admins can create API keys"
  ON api_keys
  FOR INSERT
  WITH CHECK (
    -- Check if the caller is an admin in the same company
    EXISTS (
      SELECT 1 FROM admins
      JOIN api_keys AS admin_keys ON admin_keys.admin_id = admins.id
      WHERE admin_keys.admin_id = auth.uid()
        AND admins.coaching_company_id = coaching_company_id
    )
  );

-- Update api_keys UPDATE policy (revocation) for admins
DROP POLICY IF EXISTS "Admins can revoke any key in their company" ON api_keys;
CREATE POLICY "Admins can revoke any key in their company"
  ON api_keys
  FOR UPDATE
  USING (
    -- Admins can revoke keys in their company
    EXISTS (
      SELECT 1 FROM admins
      JOIN api_keys AS admin_keys ON admin_keys.admin_id = admins.id
      WHERE admin_keys.admin_id = auth.uid()
        AND admins.coaching_company_id = api_keys.coaching_company_id
    )
  );

-- ============================================================================
-- STEP 7: Seed first admin user (InsideOut executive assistant)
-- ============================================================================

-- Insert first admin for InsideOut Leadership
INSERT INTO admins (
  coaching_company_id,
  email,
  name,
  role,
  metadata
)
SELECT
  cc.id,
  'admin@insideoutdev.com',
  'InsideOut Admin',
  'super_admin',
  '{"note": "Executive assistant with full admin privileges"}'::jsonb
FROM coaching_companies cc
WHERE cc.name = 'InsideOut Leadership'
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- STEP 8: Migration verification queries
-- ============================================================================

-- Verify admins table created
SELECT COUNT(*) as admin_count FROM admins;

-- Verify admin_id column added to api_keys
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys' AND column_name = 'admin_id';

-- Verify constraint updated
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'key_has_single_owner';

-- Verify RLS enabled on admins
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'admins';

-- Verify policies created
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'admins';

-- ============================================================================
-- Rollback script (if needed)
-- ============================================================================

-- ROLLBACK INSTRUCTIONS (DO NOT RUN UNLESS REVERTING):
--
-- -- Drop admins table
-- DROP TABLE IF EXISTS admins CASCADE;
--
-- -- Remove admin_id from api_keys
-- ALTER TABLE api_keys DROP COLUMN IF EXISTS admin_id;
--
-- -- Restore original key_has_single_owner constraint
-- ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS key_has_single_owner;
-- ALTER TABLE api_keys ADD CONSTRAINT key_has_single_owner CHECK (
--   (coach_id IS NOT NULL AND client_id IS NULL) OR
--   (coach_id IS NULL AND client_id IS NOT NULL)
-- );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Success message
SELECT 'Migration 10-create-admins-table.sql completed successfully' AS status;
