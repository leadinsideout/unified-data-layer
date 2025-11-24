-- Migration: Create admins table and update api_keys (CORRECTED)
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
DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
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
-- STEP 3: Seed first admin user (do this BEFORE adding constraint)
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
-- STEP 3b: Assign orphaned API keys to admin user (BEFORE adding constraint)
-- ============================================================================

-- Update any API keys that have no owner (neither coach_id nor client_id)
-- to be owned by the admin user we just created
UPDATE api_keys
SET admin_id = (
  SELECT id FROM admins
  WHERE email = 'admin@insideoutdev.com'
  LIMIT 1
)
WHERE coach_id IS NULL
  AND client_id IS NULL
  AND admin_id IS NULL;

-- Log the number of keys updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM api_keys
  WHERE admin_id = (SELECT id FROM admins WHERE email = 'admin@insideoutdev.com' LIMIT 1);
  RAISE NOTICE 'Assigned % API keys to admin user', updated_count;
END $$;

-- ============================================================================
-- STEP 4: Update key_has_single_owner constraint (AFTER fixing orphaned keys)
-- ============================================================================

-- First, check if there are any rows that violate the constraint
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
    RAISE EXCEPTION 'Cannot add constraint - there are still % rows that violate it', violation_count;
  ELSE
    RAISE NOTICE 'All api_keys rows satisfy the constraint - proceeding';
  END IF;
END $$;

-- Drop the old constraint
ALTER TABLE api_keys
DROP CONSTRAINT IF EXISTS key_has_single_owner;

-- Add new constraint that includes admin_id
ALTER TABLE api_keys
ADD CONSTRAINT key_has_single_owner CHECK (
  (coach_id IS NOT NULL AND client_id IS NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NOT NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NULL AND admin_id IS NOT NULL)
);

-- ============================================================================
-- STEP 5: Enable RLS on admins table
-- ============================================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies for admins table
-- ============================================================================

-- Policy 1: Admins can view all admins in their company
DROP POLICY IF EXISTS "Admins can view admins in their company" ON admins;
CREATE POLICY "Admins can view admins in their company"
  ON admins
  FOR SELECT
  USING (
    -- Admin users can see all admins in their company
    coaching_company_id IN (
      SELECT a.coaching_company_id
      FROM admins a
      WHERE a.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
    )
  );

-- Policy 2: Super admins can insert new admins
DROP POLICY IF EXISTS "Super admins can create admins" ON admins;
CREATE POLICY "Super admins can create admins"
  ON admins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins AS current_admin
      WHERE current_admin.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
      AND current_admin.role = 'super_admin'
      AND current_admin.coaching_company_id = coaching_company_id
    )
  );

-- Policy 3: Super admins can update admins
DROP POLICY IF EXISTS "Super admins can update admins" ON admins;
CREATE POLICY "Super admins can update admins"
  ON admins
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admins AS current_admin
      WHERE current_admin.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
      AND current_admin.role = 'super_admin'
      AND current_admin.coaching_company_id = coaching_company_id
    )
  );

-- Policy 4: Super admins can delete admins (except themselves)
DROP POLICY IF EXISTS "Super admins can delete admins" ON admins;
CREATE POLICY "Super admins can delete admins"
  ON admins
  FOR DELETE
  USING (
    id != auth.uid() -- Cannot delete yourself
    AND EXISTS (
      SELECT 1 FROM admins AS current_admin
      WHERE current_admin.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
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

-- Create api_keys INSERT policy for admins (simplified - admins can create any key)
DROP POLICY IF EXISTS "Admins can create API keys" ON api_keys;
CREATE POLICY "Admins can create API keys"
  ON api_keys
  FOR INSERT
  WITH CHECK (
    -- Check if the caller is an admin
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
    )
  );

-- Create api_keys UPDATE policy for admins (simplified - admins can revoke any key in their company)
DROP POLICY IF EXISTS "Admins can revoke API keys in their company" ON api_keys;
CREATE POLICY "Admins can revoke API keys in their company"
  ON api_keys
  FOR UPDATE
  USING (
    -- Admins can revoke keys in their company
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id IN (
        SELECT admin_id FROM api_keys WHERE admin_id = auth.uid()
      )
      AND admins.coaching_company_id IN (
        -- Keys owned by coaches in same company
        SELECT c.coaching_company_id FROM coaches c WHERE c.id = api_keys.coach_id
        UNION
        -- Keys owned by clients whose coaches are in same company
        SELECT DISTINCT coach.coaching_company_id
        FROM clients cl
        JOIN coach_clients cc ON cc.client_id = cl.id
        JOIN coaches coach ON coach.id = cc.coach_id
        WHERE cl.id = api_keys.client_id
        UNION
        -- Keys owned by admins in same company
        SELECT a.coaching_company_id FROM admins a WHERE a.id = api_keys.admin_id
      )
    )
  );

-- ============================================================================
-- STEP 7: Migration verification queries
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
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('admins', 'api_keys')
ORDER BY tablename, policyname;

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
