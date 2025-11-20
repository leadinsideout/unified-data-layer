-- Migration: 005b_add_join_tables.sql
-- Description: Add missing join tables for coach-client and coach-organization relationships
-- Phase: Phase 3 - Checkpoint 9 (prerequisite for RLS)
-- Date: 2025-11-20

-- ============================================
-- OVERVIEW
-- ============================================
-- This migration adds the join tables that were designed but not implemented
-- in Phase 2. These tables are needed for RLS policies to enforce access control.

-- ============================================
-- CREATE JOIN TABLES
-- ============================================

-- Coach-to-Client assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS coach_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,  -- Admin who created the assignment
  UNIQUE(coach_id, client_id)
);

-- Coach-to-Organization assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS coach_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  client_organization_id UUID NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,  -- Admin who created the assignment
  UNIQUE(coach_id, client_organization_id)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_id ON coach_clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client_id ON coach_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_coach_organizations_coach_id ON coach_organizations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_organizations_org_id ON coach_organizations(client_organization_id);

-- ============================================
-- SEED INITIAL ASSIGNMENTS (from existing data)
-- ============================================

-- Assign coaches to clients based on primary_coach_id in clients table
INSERT INTO coach_clients (coach_id, client_id)
SELECT DISTINCT
  c.primary_coach_id,
  c.id
FROM clients c
WHERE c.primary_coach_id IS NOT NULL
ON CONFLICT (coach_id, client_id) DO NOTHING;

-- Assign coaches to organizations based on client assignments
INSERT INTO coach_organizations (coach_id, client_organization_id)
SELECT DISTINCT
  cc.coach_id,
  c.client_organization_id
FROM coach_clients cc
JOIN clients c ON cc.client_id = c.id
WHERE c.client_organization_id IS NOT NULL
ON CONFLICT (coach_id, client_organization_id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'coach_clients' as table_name, COUNT(*) as row_count FROM coach_clients
UNION ALL
SELECT 'coach_organizations' as table_name, COUNT(*) as row_count FROM coach_organizations;
