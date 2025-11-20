-- Migration: 006_row_level_security.sql (FINAL)
-- Description: Implement Row-Level Security (RLS) for multi-tenant data isolation
-- Phase: Phase 3 - Checkpoint 9
-- Author: leadinsideout
-- Date: 2025-11-20
-- Fix: Allow admin keys without owner constraint

-- ============================================
-- STEP 1: CREATE AUTHENTICATION TABLES
-- ============================================

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT,
  scopes TEXT[] DEFAULT '{read,write}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  last_used_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT key_prefix_format CHECK (key_prefix ~ '^sk_(test|live)_')
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_coach_id ON api_keys(coach_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_client_id ON api_keys(client_id);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('coach', 'client', 'admin')),
  user_email TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  request_method TEXT,
  request_path TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================
-- STEP 2: CREATE HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_role', true);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_coach_id()
RETURNS UUID AS $$
BEGIN
  IF get_current_user_role() = 'coach' THEN
    RETURN get_current_user_id();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_client_id()
RETURNS UUID AS $$
BEGIN
  IF get_current_user_role() = 'client' THEN
    RETURN get_current_user_id();
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 3: ENABLE RLS
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
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================

-- coaching_companies
CREATE POLICY coaches_see_own_company ON coaching_companies FOR SELECT
  USING (is_admin() OR id = (SELECT coaching_company_id FROM coaches WHERE id = get_current_coach_id()));

-- coaches
CREATE POLICY coaches_see_own_profile ON coaches FOR SELECT
  USING (is_admin() OR id = get_current_coach_id());

CREATE POLICY coaches_see_company_peers ON coaches FOR SELECT
  USING (is_admin() OR coaching_company_id = (SELECT coaching_company_id FROM coaches WHERE id = get_current_coach_id()));

CREATE POLICY coaches_update_own_profile ON coaches FOR UPDATE
  USING (is_admin() OR id = get_current_coach_id());

-- client_organizations
CREATE POLICY coaches_see_assigned_orgs ON client_organizations FOR SELECT
  USING (is_admin() OR id IN (SELECT DISTINCT c.client_organization_id FROM clients c JOIN coach_clients cc ON c.id = cc.client_id WHERE cc.coach_id = get_current_coach_id()));

CREATE POLICY clients_see_own_org ON client_organizations FOR SELECT
  USING (is_admin() OR id = (SELECT client_organization_id FROM clients WHERE id = get_current_client_id()));

-- clients
CREATE POLICY coaches_see_assigned_clients ON clients FOR SELECT
  USING (is_admin() OR id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));

CREATE POLICY clients_see_own_profile ON clients FOR SELECT
  USING (is_admin() OR id = get_current_client_id());

CREATE POLICY clients_update_own_profile ON clients FOR UPDATE
  USING (is_admin() OR id = get_current_client_id());

-- coaching_models
CREATE POLICY coaches_see_company_models ON coaching_models FOR SELECT
  USING (is_admin() OR coaching_company_id = (SELECT coaching_company_id FROM coaches WHERE id = get_current_coach_id()));

-- coach_model_associations
CREATE POLICY coaches_manage_own_associations_select ON coach_model_associations FOR SELECT
  USING (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY coaches_manage_own_associations_insert ON coach_model_associations FOR INSERT
  WITH CHECK (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY coaches_manage_own_associations_update ON coach_model_associations FOR UPDATE
  USING (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY coaches_manage_own_associations_delete ON coach_model_associations FOR DELETE
  USING (is_admin() OR coach_id = get_current_coach_id());

-- data_items
CREATE POLICY coaches_see_own_data ON data_items FOR SELECT
  USING (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY coaches_see_assigned_client_data ON data_items FOR SELECT
  USING (is_admin() OR (client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()) AND visibility_level IN ('coach_only', 'org_visible', 'public')));

CREATE POLICY clients_see_own_data ON data_items FOR SELECT
  USING (is_admin() OR (client_id = get_current_client_id() AND visibility_level IN ('private', 'org_visible', 'public')));

CREATE POLICY coaches_create_data ON data_items FOR INSERT
  WITH CHECK (is_admin() OR coach_id = get_current_coach_id() OR client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));

CREATE POLICY coaches_update_data ON data_items FOR UPDATE
  USING (is_admin() OR coach_id = get_current_coach_id() OR client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));

CREATE POLICY coaches_delete_data ON data_items FOR DELETE
  USING (is_admin() OR coach_id = get_current_coach_id() OR client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));

-- data_chunks
CREATE POLICY coaches_see_chunks ON data_chunks FOR SELECT
  USING (is_admin() OR data_item_id IN (SELECT id FROM data_items WHERE coach_id = get_current_coach_id()) OR data_item_id IN (SELECT id FROM data_items WHERE client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()) AND visibility_level IN ('coach_only', 'org_visible', 'public')));

CREATE POLICY clients_see_chunks ON data_chunks FOR SELECT
  USING (is_admin() OR data_item_id IN (SELECT id FROM data_items WHERE client_id = get_current_client_id() AND visibility_level IN ('private', 'org_visible', 'public')));

CREATE POLICY coaches_write_chunks ON data_chunks FOR ALL
  USING (is_admin() OR data_item_id IN (SELECT id FROM data_items WHERE coach_id = get_current_coach_id() OR client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id())));

-- api_keys
CREATE POLICY users_see_own_keys ON api_keys FOR SELECT
  USING (is_admin() OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL) OR (client_id = get_current_client_id() AND client_id IS NOT NULL));

CREATE POLICY users_create_own_keys ON api_keys FOR INSERT
  WITH CHECK (is_admin() OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL) OR (client_id = get_current_client_id() AND client_id IS NOT NULL));

CREATE POLICY users_update_own_keys ON api_keys FOR UPDATE
  USING (is_admin() OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL) OR (client_id = get_current_client_id() AND client_id IS NOT NULL));

CREATE POLICY users_delete_own_keys ON api_keys FOR DELETE
  USING (is_admin() OR (coach_id = get_current_coach_id() AND coach_id IS NOT NULL) OR (client_id = get_current_client_id() AND client_id IS NOT NULL));

-- audit_logs
CREATE POLICY coaches_see_own_audit_trail ON audit_logs FOR SELECT
  USING (is_admin() OR user_id = get_current_coach_id() OR user_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));

CREATE POLICY clients_see_own_audit_trail ON audit_logs FOR SELECT
  USING (is_admin() OR user_id = get_current_client_id());

CREATE POLICY admin_insert_audit_logs ON audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- coach_clients
CREATE POLICY coaches_see_own_client_assignments ON coach_clients FOR SELECT
  USING (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY admin_manage_coach_client_assignments ON coach_clients FOR ALL
  USING (is_admin());

-- coach_organizations
CREATE POLICY coaches_see_own_org_assignments ON coach_organizations FOR SELECT
  USING (is_admin() OR coach_id = get_current_coach_id());

CREATE POLICY admin_manage_coach_org_assignments ON coach_organizations FOR ALL
  USING (is_admin());

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_data_items_coach_id ON data_items(coach_id);
CREATE INDEX IF NOT EXISTS idx_data_items_client_id ON data_items(client_id);
CREATE INDEX IF NOT EXISTS idx_data_items_visibility ON data_items(visibility_level);
CREATE INDEX IF NOT EXISTS idx_data_items_client_visibility ON data_items(client_id, visibility_level);
CREATE INDEX IF NOT EXISTS idx_data_chunks_data_item_id ON data_chunks(data_item_id);
CREATE INDEX IF NOT EXISTS idx_coaches_company_id ON coaches(coaching_company_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON clients(client_organization_id);

-- ============================================
-- STEP 6: INSERT TEST API KEYS
-- ============================================

-- Coach: Dave
INSERT INTO api_keys (coach_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM coaches WHERE email = 'dave@insideoutleadership.com'),
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'sk_test_',
  'Dave Test Key',
  '{read,write}'
) ON CONFLICT (key_hash) DO NOTHING;

-- Coach: Emma
INSERT INTO api_keys (coach_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM coaches WHERE email = 'emma@insideoutleadership.com'),
  '$2a$10$fOjS7NjGlSbrJXOqXS8NkOMbH.n7aWw4zj0V.rKf1b3pKFYG8K9hK',
  'sk_test_',
  'Emma Test Key',
  '{read,write}'
) ON CONFLICT (key_hash) DO NOTHING;

-- Client: Cyril
INSERT INTO api_keys (client_id, key_hash, key_prefix, name, scopes)
VALUES (
  (SELECT id FROM clients WHERE email = 'cyril@techcorp.example'),
  '$2a$10$yZWJ8o6y4n9zL5qJ7pKJbOXfj9eH8ZqVkKJbN9qL5pKJbN9qL5pK',
  'sk_test_',
  'Cyril Test Key',
  '{read}'
) ON CONFLICT (key_hash) DO NOTHING;

-- Admin (no coach_id or client_id - special case)
INSERT INTO api_keys (key_hash, key_prefix, name, scopes)
VALUES (
  '$2a$10$zAX9y7p8r0mN6sKJ8qLJcPYgk0fJ9ZqWlLKcO0rM7qLKcO0rM7qL',
  'sk_test_',
  'Admin Test Key',
  '{admin,read,write}'
) ON CONFLICT (key_hash) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
