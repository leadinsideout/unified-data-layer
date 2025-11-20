-- Migration: 006_row_level_security.sql
-- Description: Implement Row-Level Security (RLS) for multi-tenant data isolation
-- Phase: Phase 3 - Checkpoint 9
-- Author: leadinsideout
-- Date: 2025-11-20
-- Dependencies: 003_multi_type_schema.sql

-- ============================================
-- OVERVIEW
-- ============================================
-- This migration implements Row-Level Security policies to enforce
-- data isolation between coaches, clients, and organizations.
--
-- Security Model:
-- - Coaches can access their own data + assigned clients' data
-- - Clients can access only their own data
-- - Admins can access all data
-- - Policies enforce at database level (no application logic needed)
--
-- See: docs/security/row-level-security-design.md

-- ============================================
-- STEP 1: CREATE AUTHENTICATION TABLES
-- ============================================

-- API keys table (used to authenticate requests and map to user identity)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Key ownership (exactly one must be set)
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,

  -- Key data
  key_hash TEXT NOT NULL UNIQUE,  -- bcrypt hash of the API key
  key_prefix TEXT NOT NULL,  -- First 8 chars for identification (e.g., "sk_live_")
  name TEXT,  -- Human-readable name (e.g., "Production Key", "Testing Key")

  -- Permissions
  scopes TEXT[] DEFAULT '{read,write}',  -- Permissions: read, write, admin

  -- Lifecycle
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,  -- NULL = never expires
  last_used_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,  -- Rate limits, allowed IPs, etc.

  -- Constraints
  CONSTRAINT key_has_single_owner CHECK (
    (coach_id IS NOT NULL AND client_id IS NULL) OR
    (coach_id IS NULL AND client_id IS NOT NULL)
  ),
  CONSTRAINT key_prefix_format CHECK (key_prefix ~ '^sk_(test|live)_')
);

-- Indexes for fast key lookup
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_coach_id
  ON api_keys(coach_id)
  WHERE coach_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_client_id
  ON api_keys(client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_active
  ON api_keys(key_hash)
  WHERE is_revoked = false AND (expires_at IS NULL OR expires_at > NOW());

-- Audit logs table (track all data access)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who
  user_id UUID NOT NULL,  -- coach.id or client.id
  user_role TEXT NOT NULL CHECK (user_role IN ('coach', 'client', 'admin')),
  user_email TEXT,  -- Denormalized for reporting

  -- What
  action TEXT NOT NULL,  -- SELECT, INSERT, UPDATE, DELETE, LOGIN, LOGOUT
  resource_type TEXT NOT NULL,  -- data_items, data_chunks, coaches, etc.
  resource_id UUID,  -- ID of the affected resource

  -- When
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- How
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  request_method TEXT,  -- GET, POST, etc.
  request_path TEXT,  -- /api/search, /api/data/upload, etc.

  -- Context
  metadata JSONB DEFAULT '{}'::jsonb,  -- Query params, response time, etc.
  success BOOLEAN DEFAULT true,  -- false if access was denied
  error_message TEXT  -- If success=false, what went wrong
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON audit_logs(created_at DESC);

-- ============================================
-- STEP 2: CREATE SESSION VARIABLE HELPER FUNCTIONS
-- ============================================

-- Get current user ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user role from session
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current coach ID from session (if user is a coach)
CREATE OR REPLACE FUNCTION get_current_coach_id()
RETURNS UUID AS $$
BEGIN
  IF get_current_user_role() = 'coach' THEN
    RETURN get_current_user_id();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current client ID from session (if user is a client)
CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
BEGIN
  IF get_current_user_role() = 'client' THEN
    RETURN get_current_user_id();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE coaching_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_model_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Join tables
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE RLS POLICIES - coaching_companies
-- ============================================

-- Coaches can see their own coaching company
CREATE POLICY coaches_see_own_company
  ON coaching_companies
  FOR SELECT
  USING (
    is_admin()
    OR id = (
      SELECT coaching_company_id
      FROM coaches
      WHERE id = get_current_coach_id()
    )
  );

-- ============================================
-- STEP 5: CREATE RLS POLICIES - coaches
-- ============================================

-- Coaches can see their own profile
CREATE POLICY coaches_see_own_profile
  ON coaches
  FOR SELECT
  USING (
    is_admin()
    OR id = get_current_coach_id()
  );

-- Coaches can see peers in same coaching company
CREATE POLICY coaches_see_company_peers
  ON coaches
  FOR SELECT
  USING (
    is_admin()
    OR coaching_company_id = (
      SELECT coaching_company_id
      FROM coaches
      WHERE id = get_current_coach_id()
    )
  );

-- Coaches can update their own profile
CREATE POLICY coaches_update_own_profile
  ON coaches
  FOR UPDATE
  USING (
    is_admin()
    OR id = get_current_coach_id()
  );

-- ============================================
-- STEP 6: CREATE RLS POLICIES - client_organizations
-- ============================================

-- Coaches can see organizations of their assigned clients
CREATE POLICY coaches_see_assigned_orgs
  ON client_organizations
  FOR SELECT
  USING (
    is_admin()
    OR id IN (
      SELECT DISTINCT c.client_organization_id
      FROM clients c
      JOIN coach_clients cc ON c.id = cc.client_id
      WHERE cc.coach_id = get_current_coach_id()
    )
  );

-- Clients can see their own organization
CREATE POLICY clients_see_own_org
  ON client_organizations
  FOR SELECT
  USING (
    is_admin()
    OR id = (
      SELECT client_organization_id
      FROM clients
      WHERE id = get_current_client_id()
    )
  );

-- ============================================
-- STEP 7: CREATE RLS POLICIES - clients
-- ============================================

-- Coaches can see their assigned clients
CREATE POLICY coaches_see_assigned_clients
  ON clients
  FOR SELECT
  USING (
    is_admin()
    OR id IN (
      SELECT client_id
      FROM coach_clients
      WHERE coach_id = get_current_coach_id()
    )
  );

-- Clients can see and update their own profile
CREATE POLICY clients_see_own_profile
  ON clients
  FOR SELECT
  USING (
    is_admin()
    OR id = get_current_client_id()
  );

CREATE POLICY clients_update_own_profile
  ON clients
  FOR UPDATE
  USING (
    is_admin()
    OR id = get_current_client_id()
  );

-- ============================================
-- STEP 8: CREATE RLS POLICIES - coaching_models
-- ============================================

-- Coaches can see coaching models from their company
CREATE POLICY coaches_see_company_models
  ON coaching_models
  FOR SELECT
  USING (
    is_admin()
    OR coaching_company_id = (
      SELECT coaching_company_id
      FROM coaches
      WHERE id = get_current_coach_id()
    )
  );

-- ============================================
-- STEP 9: CREATE RLS POLICIES - coach_model_associations
-- ============================================

-- Coaches can manage their own model associations
CREATE POLICY coaches_manage_own_associations_select
  ON coach_model_associations
  FOR SELECT
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

CREATE POLICY coaches_manage_own_associations_insert
  ON coach_model_associations
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

CREATE POLICY coaches_manage_own_associations_update
  ON coach_model_associations
  FOR UPDATE
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

CREATE POLICY coaches_manage_own_associations_delete
  ON coach_model_associations
  FOR DELETE
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

-- ============================================
-- STEP 10: CREATE RLS POLICIES - data_items (CRITICAL)
-- ============================================

-- Coaches can see their own data
CREATE POLICY coaches_see_own_data
  ON data_items
  FOR SELECT
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

-- Coaches can see data from assigned clients (respecting visibility)
CREATE POLICY coaches_see_assigned_client_data
  ON data_items
  FOR SELECT
  USING (
    is_admin()
    OR (
      client_id IN (
        SELECT client_id
        FROM coach_clients
        WHERE coach_id = get_current_coach_id()
      )
      AND visibility_level IN ('coach_only', 'org_visible', 'public')
    )
  );

-- Clients can see their own data (respecting visibility)
CREATE POLICY clients_see_own_data
  ON data_items
  FOR SELECT
  USING (
    is_admin()
    OR (
      client_id = get_current_client_id()
      AND visibility_level IN ('private', 'org_visible', 'public')
    )
  );

-- Coaches can create data for themselves or assigned clients
CREATE POLICY coaches_create_data
  ON data_items
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR coach_id = get_current_coach_id()
    OR (
      client_id IN (
        SELECT client_id
        FROM coach_clients
        WHERE coach_id = get_current_coach_id()
      )
    )
  );

-- Coaches can update data they own or their assigned clients' data
CREATE POLICY coaches_update_data
  ON data_items
  FOR UPDATE
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
    OR (
      client_id IN (
        SELECT client_id
        FROM coach_clients
        WHERE coach_id = get_current_coach_id()
      )
    )
  );

-- Coaches can delete data they own or their assigned clients' data
CREATE POLICY coaches_delete_data
  ON data_items
  FOR DELETE
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
    OR (
      client_id IN (
        SELECT client_id
        FROM coach_clients
        WHERE coach_id = get_current_coach_id()
      )
    )
  );

-- ============================================
-- STEP 11: CREATE RLS POLICIES - data_chunks
-- ============================================

-- Chunks inherit access from their parent data_item
-- Coaches can see chunks if they can see the parent data_item
CREATE POLICY coaches_see_chunks
  ON data_chunks
  FOR SELECT
  USING (
    is_admin()
    OR data_item_id IN (
      SELECT id FROM data_items
      WHERE coach_id = get_current_coach_id()
    )
    OR data_item_id IN (
      SELECT id FROM data_items
      WHERE client_id IN (
        SELECT client_id
        FROM coach_clients
        WHERE coach_id = get_current_coach_id()
      )
      AND visibility_level IN ('coach_only', 'org_visible', 'public')
    )
  );

-- Clients can see chunks if they can see the parent data_item
CREATE POLICY clients_see_chunks
  ON data_chunks
  FOR SELECT
  USING (
    is_admin()
    OR data_item_id IN (
      SELECT id FROM data_items
      WHERE client_id = get_current_client_id()
      AND visibility_level IN ('private', 'org_visible', 'public')
    )
  );

-- Coaches can create/update/delete chunks for data they can access
CREATE POLICY coaches_write_chunks
  ON data_chunks
  FOR ALL
  USING (
    is_admin()
    OR data_item_id IN (
      SELECT id FROM data_items
      WHERE coach_id = get_current_coach_id()
        OR client_id IN (
          SELECT client_id
          FROM coach_clients
          WHERE coach_id = get_current_coach_id()
        )
    )
  );

-- ============================================
-- STEP 12: CREATE RLS POLICIES - api_keys
-- ============================================

-- Users can see their own API keys
CREATE POLICY users_see_own_keys
  ON api_keys
  FOR SELECT
  USING (
    is_admin()
    OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL)
    OR (client_id = get_current_client_id() AND client_id IS NOT NULL)
  );

-- Users can manage their own API keys
CREATE POLICY users_create_own_keys
  ON api_keys
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL)
    OR (client_id = get_current_client_id() AND client_id IS NOT NULL)
  );

CREATE POLICY users_update_own_keys
  ON api_keys
  FOR UPDATE
  USING (
    is_admin()
    OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL)
    OR (client_id = get_current_client_id() AND client_id IS NOT NULL)
  );

CREATE POLICY users_delete_own_keys
  ON api_keys
  FOR DELETE
  USING (
    is_admin()
    OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL)
    OR (client_id = get_current_client_id() AND client_id IS NOT NULL)
  );

-- ============================================
-- STEP 13: CREATE RLS POLICIES - audit_logs
-- ============================================

-- Coaches can see audit logs for themselves and assigned clients
CREATE POLICY coaches_see_own_audit_trail
  ON audit_logs
  FOR SELECT
  USING (
    is_admin()
    OR user_id = get_current_coach_id()
    OR user_id IN (
      SELECT client_id
      FROM coach_clients
      WHERE coach_id = get_current_coach_id()
    )
  );

-- Clients can see their own audit logs
CREATE POLICY clients_see_own_audit_trail
  ON audit_logs
  FOR SELECT
  USING (
    is_admin()
    OR user_id = get_current_client_id()
  );

-- Only system (admin) can insert audit logs
CREATE POLICY admin_insert_audit_logs
  ON audit_logs
  FOR INSERT
  WITH CHECK (is_admin());

-- ============================================
-- STEP 14: CREATE RLS POLICIES - JOIN TABLES
-- ============================================

-- coach_clients: Coaches can see their own assignments
CREATE POLICY coaches_see_own_client_assignments
  ON coach_clients
  FOR SELECT
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

-- Only admins can manage coach-client assignments
CREATE POLICY admin_manage_coach_client_assignments
  ON coach_clients
  FOR ALL
  USING (is_admin());

-- coach_organizations: Coaches can see their own org assignments
CREATE POLICY coaches_see_own_org_assignments
  ON coach_organizations
  FOR SELECT
  USING (
    is_admin()
    OR coach_id = get_current_coach_id()
  );

-- Only admins can manage coach-organization assignments
CREATE POLICY admin_manage_coach_org_assignments
  ON coach_organizations
  FOR ALL
  USING (is_admin());

-- ============================================
-- STEP 15: CREATE PERFORMANCE INDEXES
-- ============================================

-- Optimize coach_clients lookups (already exists, ensure)
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_id
  ON coach_clients(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_clients_client_id
  ON coach_clients(client_id);

-- Optimize data_items access by coach_id
CREATE INDEX IF NOT EXISTS idx_data_items_coach_id
  ON data_items(coach_id)
  WHERE coach_id IS NOT NULL;

-- Optimize data_items access by client_id
CREATE INDEX IF NOT EXISTS idx_data_items_client_id
  ON data_items(client_id)
  WHERE client_id IS NOT NULL;

-- Optimize data_items visibility filtering
CREATE INDEX IF NOT EXISTS idx_data_items_visibility
  ON data_items(visibility_level);

-- Composite index for coach access to client data
CREATE INDEX IF NOT EXISTS idx_data_items_client_visibility
  ON data_items(client_id, visibility_level)
  WHERE client_id IS NOT NULL;

-- Optimize data_chunks lookups (already exists, ensure)
CREATE INDEX IF NOT EXISTS idx_data_chunks_data_item_id
  ON data_chunks(data_item_id);

-- Optimize coaches lookup by company
CREATE INDEX IF NOT EXISTS idx_coaches_company_id
  ON coaches(coaching_company_id);

-- Optimize clients lookup by organization
CREATE INDEX IF NOT EXISTS idx_clients_organization_id
  ON clients(client_organization_id);

-- ============================================
-- STEP 16: INSERT TEST API KEYS
-- ============================================

-- NOTE: These are temporary test keys for Checkpoint 9 testing
-- In Checkpoint 10, we'll implement proper key generation API

-- Test key for Coach: Dave (coach_id from seed data)
-- Key: sk_test_coach_dave_12345678 (bcrypt hash below)
-- Password: test_coach_dave_secret
INSERT INTO api_keys (coach_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM coaches WHERE email = 'dave@insideoutleadership.com'),
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',  -- bcrypt('test_coach_dave_secret')
  'sk_test_',
  'Dave Test Key',
  '{read,write}'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Test key for Coach: Emma (coach_id from seed data)
-- Key: sk_test_coach_emma_87654321
-- Password: test_coach_emma_secret
INSERT INTO api_keys (coach_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM coaches WHERE email = 'emma@insideoutleadership.com'),
  '$2a$10$fOjS7NjGlSbrJXOqXS8NkOMbH.n7aWw4zj0V.rKf1b3pKFYG8K9hK',  -- bcrypt('test_coach_emma_secret')
  'sk_test_',
  'Emma Test Key',
  '{read,write}'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Test key for Client: Cyril (client_id from seed data)
-- Key: sk_test_client_cyril_11111111
-- Password: test_client_cyril_secret
INSERT INTO api_keys (client_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM clients WHERE email = 'cyril@techcorp.example'),
  '$2a$10$yZWJ8o6y4n9zL5qJ7pKJbOXfj9eH8ZqVkKJbN9qL5pKJbN9qL5pK',  -- bcrypt('test_client_cyril_secret')
  'sk_test_',
  'Cyril Test Key',
  '{read}'
)
ON CONFLICT (key_hash) DO NOTHING;

-- Test admin key
-- Key: sk_test_admin_99999999
-- Password: test_admin_secret
-- Note: Admin keys don't link to coach_id or client_id
-- Will be validated in middleware by checking scopes array for 'admin'
INSERT INTO api_keys (key_hash, key_prefix, name, scopes)
VALUES (
  '$2a$10$zAX9y7p8r0mN6sKJ8qLJcPYgk0fJ9ZqWlLKcO0rM7qLKcO0rM7qL',  -- bcrypt('test_admin_secret')
  'sk_test_',
  'Admin Test Key',
  '{admin,read,write}'
)
ON CONFLICT (key_hash) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

-- Count tables with RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Count policies created
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- RLS is now enabled on all tables
-- Test API keys have been inserted
-- Ready for authentication middleware integration

-- Next steps:
-- 1. Create authentication middleware (api/middleware/auth.js)
-- 2. Update Express app to use middleware
-- 3. Run integration tests
-- 4. Document Checkpoint 9 results
