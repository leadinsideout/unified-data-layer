-- ============================================
-- Checkpoint 5b: Seed Test Data
-- ============================================
-- Purpose: Populate user/org tables for testing multi-type data pipeline
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
--
-- To clear and reseed:
--   DELETE FROM clients;
--   DELETE FROM client_organizations;
--   DELETE FROM coaches;
--   DELETE FROM coaching_companies;
--   Then run this script
-- ============================================

-- ============================================
-- 1. Coaching Company
-- ============================================
INSERT INTO coaching_companies (id, name, slug, metadata)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100',
  'InsideOut Leadership',
  'insideout-leadership',
  '{"website": "https://insideoutdev.com", "active": true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Coaches (3 total)
-- ============================================
INSERT INTO coaches (id, coaching_company_id, name, email, bio, metadata)
VALUES
  -- Coach A: Senior executive coach
  (
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440100',
    'Alex Rivera',
    'alex.rivera@insideoutdev.com',
    'Senior executive coach with 15 years experience. Specializes in C-suite leadership development and organizational transformation.',
    '{"active": true, "experience_years": 15}'::jsonb
  ),
  -- Coach B: Mid-level coach
  (
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440100',
    'Sam Chen',
    'sam.chen@insideoutdev.com',
    'Executive coach focused on emerging leaders and career transitions. Expert in DISC assessments and strengths-based coaching.',
    '{"active": true, "experience_years": 8}'::jsonb
  ),
  -- Coach C: New coach
  (
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440100',
    'Jordan Taylor',
    'jordan.taylor@insideoutdev.com',
    'Professional coach specializing in team dynamics and leadership presence.',
    '{"active": true, "experience_years": 3}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Client Organizations (2 total)
-- ============================================
INSERT INTO client_organizations (id, name, slug, industry, metadata)
VALUES
  -- Org A: Media company
  (
    '550e8400-e29b-41d4-a716-446655440200',
    'Acme Media',
    'acme-media',
    'Media & Publishing',
    '{"size": "mid-market", "active": true}'::jsonb
  ),
  -- Org B: Tech startup
  (
    '550e8400-e29b-41d4-a716-446655440201',
    'TechCorp Inc',
    'techcorp-inc',
    'Technology',
    '{"size": "enterprise", "active": true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. Clients (4 total)
-- ============================================
INSERT INTO clients (id, name, email, title, client_organization_id, primary_coach_id, metadata)
VALUES
  -- Client 1: Executive at Acme Media, coached by Alex
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Sarah Williams',
    'sarah.williams@acmemedia.com',
    'VP of Product',
    '550e8400-e29b-41d4-a716-446655440200',
    '550e8400-e29b-41d4-a716-446655440010',
    '{"department": "Product", "active": true}'::jsonb
  ),
  -- Client 2: Executive at Acme Media, coached by Sam
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Michael Torres',
    'michael.torres@acmemedia.com',
    'Director of Engineering',
    '550e8400-e29b-41d4-a716-446655440200',
    '550e8400-e29b-41d4-a716-446655440011',
    '{"department": "Engineering", "active": true}'::jsonb
  ),
  -- Client 3: Executive at TechCorp, coached by Alex
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Emily Zhang',
    'emily.zhang@techcorp.com',
    'CEO',
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440010',
    '{"department": "Executive", "active": true}'::jsonb
  ),
  -- Client 4: Executive at TechCorp, coached by Jordan
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'David Kim',
    'david.kim@techcorp.com',
    'VP of Sales',
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440012',
    '{"department": "Sales", "active": true}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Summary
-- ============================================
-- 1 coaching company: InsideOut Leadership
-- 3 coaches: Alex Rivera, Sam Chen, Jordan Taylor
-- 2 client organizations: Acme Media, TechCorp Inc
-- 4 clients: Sarah Williams, Michael Torres, Emily Zhang, David Kim
--
-- Valid FK Combinations for Testing:
-- - Alex coaching Sarah at Acme Media
--   coach_id: 550e8400-e29b-41d4-a716-446655440010
--   client_id: 550e8400-e29b-41d4-a716-446655440001
--   client_organization_id: 550e8400-e29b-41d4-a716-446655440200
--
-- - Sam coaching Michael at Acme Media
--   coach_id: 550e8400-e29b-41d4-a716-446655440011
--   client_id: 550e8400-e29b-41d4-a716-446655440002
--   client_organization_id: 550e8400-e29b-41d4-a716-446655440200
--
-- - Alex coaching Emily at TechCorp
--   coach_id: 550e8400-e29b-41d4-a716-446655440010
--   client_id: 550e8400-e29b-41d4-a716-446655440003
--   client_organization_id: 550e8400-e29b-41d4-a716-446655440201
--
-- - Jordan coaching David at TechCorp
--   coach_id: 550e8400-e29b-41d4-a716-446655440012
--   client_id: 550e8400-e29b-41d4-a716-446655440004
--   client_organization_id: 550e8400-e29b-41d4-a716-446655440201
-- ============================================
