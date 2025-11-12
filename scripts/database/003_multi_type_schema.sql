-- Migration: 003_multi_type_schema.sql
-- Description: Migrate from single-type (transcripts) to multi-type architecture
-- Phase: Phase 2 - Checkpoint 4
-- Author: leadinsideout
-- Date: 2025-11-12
-- Dependencies: 001_initial_schema.sql, 002_vector_search_function.sql

-- ============================================
-- OVERVIEW
-- ============================================
-- This migration transforms the Phase 1 schema into a multi-tenant,
-- multi-data-type architecture that supports:
-- - Multiple data types (transcripts, assessments, coaching models, company docs)
-- - User/organization hierarchy (coaching companies → coaches → client orgs → clients)
-- - Coaching model management (shared across coaching company)
-- - Granular access controls (visibility levels, role-based access)
-- - Backward compatibility with Phase 1 API endpoints

-- ============================================
-- STEP 1: CREATE USER & ORGANIZATION TABLES
-- ============================================

-- Coaching companies (e.g., InsideOut Leadership)
CREATE TABLE IF NOT EXISTS coaching_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Coaches (employees of coaching companies)
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL REFERENCES coaching_companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Client organizations (external companies being coached)
CREATE TABLE IF NOT EXISTS client_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  industry TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clients (individual coaching clients at external orgs)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_organization_id UUID NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  primary_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE COACHING MODEL TABLES
-- ============================================

-- Coaching models (owned by coaching companies, shared across coaches)
CREATE TABLE IF NOT EXISTS coaching_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL REFERENCES coaching_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,  -- Full model content (theory of change, framework, evaluation criteria)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(coaching_company_id, slug)
);

-- Coach-to-model associations (many-to-many: coaches can use multiple models)
CREATE TABLE IF NOT EXISTS coach_model_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  coaching_model_id UUID NOT NULL REFERENCES coaching_models(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,  -- Coach's primary/default model
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(coach_id, coaching_model_id)
);

-- ============================================
-- STEP 3: CREATE NEW DATA TABLES
-- ============================================

-- Unified data items table (replaces transcripts table)
CREATE TABLE IF NOT EXISTS data_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL CHECK (data_type IN (
    'transcript',
    'assessment',
    'coaching_model',
    'company_doc',
    'goal',
    'note'
  )),

  -- Ownership hierarchy (all nullable for flexibility)
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_organization_id UUID REFERENCES client_organizations(id) ON DELETE CASCADE,
  coaching_model_id UUID REFERENCES coaching_models(id) ON DELETE SET NULL,

  -- Access control (prepare for Phase 3 RLS)
  visibility_level TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility_level IN ('private', 'coach_only', 'org_visible', 'public')),
  allowed_roles TEXT[],  -- e.g., ['coach', 'consultant', 'leadership']
  access_restrictions JSONB DEFAULT '{}'::jsonb,

  -- Content
  raw_content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit trail
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by UUID,  -- Will link to auth.users in Phase 3

  -- Optional session-specific data
  session_id UUID,  -- Groups related items from same coaching session
  session_date TIMESTAMP
);

-- Unified chunks table (replaces transcript_chunks)
CREATE TABLE IF NOT EXISTS data_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_item_id UUID NOT NULL REFERENCES data_items(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(data_item_id, chunk_index)
);

-- ============================================
-- STEP 4: CREATE INDEXES
-- ============================================

-- User/org table indexes
CREATE INDEX IF NOT EXISTS idx_coaches_company ON coaches(coaching_company_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(client_organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_coach ON clients(primary_coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_models_company ON coaching_models(coaching_company_id);
CREATE INDEX IF NOT EXISTS idx_coach_model_assoc_coach ON coach_model_associations(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_model_assoc_model ON coach_model_associations(coaching_model_id);

-- Data items indexes (for common query patterns)
CREATE INDEX IF NOT EXISTS idx_data_items_type ON data_items(data_type);
CREATE INDEX IF NOT EXISTS idx_data_items_coach ON data_items(coach_id);
CREATE INDEX IF NOT EXISTS idx_data_items_client ON data_items(client_id);
CREATE INDEX IF NOT EXISTS idx_data_items_org ON data_items(client_organization_id);
CREATE INDEX IF NOT EXISTS idx_data_items_model ON data_items(coaching_model_id);
CREATE INDEX IF NOT EXISTS idx_data_items_visibility ON data_items(visibility_level);
CREATE INDEX IF NOT EXISTS idx_data_items_created_at ON data_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_items_session ON data_items(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_items_session_date ON data_items(session_date) WHERE session_date IS NOT NULL;

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_data_items_coach_type ON data_items(coach_id, data_type);
CREATE INDEX IF NOT EXISTS idx_data_items_client_type ON data_items(client_id, data_type);
CREATE INDEX IF NOT EXISTS idx_data_items_org_type ON data_items(client_organization_id, data_type);
CREATE INDEX IF NOT EXISTS idx_data_items_type_created ON data_items(data_type, created_at DESC);

-- Data chunks indexes
CREATE INDEX IF NOT EXISTS idx_data_chunks_item ON data_chunks(data_item_id);

-- IVFFLAT index for vector similarity search
-- Reuse same configuration as Phase 1 (lists=100)
CREATE INDEX IF NOT EXISTS idx_data_chunks_embedding
  ON data_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================
-- STEP 5: MIGRATE EXISTING DATA
-- ============================================

-- Note: This migration assumes Phase 1 data exists with coach_id and client_id
-- If your Phase 1 data doesn't have these fields, you'll need to:
-- 1. Create placeholder coaching_company, coaches, client_orgs, and clients
-- 2. Then migrate transcripts with those placeholder IDs
-- 3. Update the data later with real user information

-- Check if we have existing data to migrate
DO $$
DECLARE
  transcript_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO transcript_count FROM transcripts;

  IF transcript_count > 0 THEN
    RAISE NOTICE 'Found % transcripts to migrate', transcript_count;

    -- Migrate transcript data to data_items
    -- Assumes coach_id and client_id exist in transcripts table
    -- If not, this will insert NULL for those fields (valid for now)
    INSERT INTO data_items (
      id,
      data_type,
      coach_id,
      client_id,
      client_organization_id,
      raw_content,
      metadata,
      created_at,
      session_date,
      visibility_level
    )
    SELECT
      id,
      'transcript' AS data_type,
      coach_id,
      client_id,
      NULL AS client_organization_id,  -- Phase 1 didn't track org
      raw_text AS raw_content,
      metadata,
      created_at,
      meeting_date AS session_date,
      'coach_only' AS visibility_level  -- Safe default for existing data
    FROM transcripts;

    RAISE NOTICE 'Migrated % transcripts to data_items', transcript_count;

    -- Migrate chunks to data_chunks
    INSERT INTO data_chunks (
      id,
      data_item_id,
      chunk_index,
      content,
      embedding,
      created_at
    )
    SELECT
      id,
      transcript_id AS data_item_id,
      chunk_index,
      content,
      embedding,
      created_at
    FROM transcript_chunks;

    RAISE NOTICE 'Migrated chunks to data_chunks';
  ELSE
    RAISE NOTICE 'No existing transcripts to migrate';
  END IF;
END $$;

-- ============================================
-- STEP 6: CREATE/UPDATE RPC FUNCTIONS
-- ============================================

-- Drop old RPC function if it exists
DROP FUNCTION IF EXISTS match_transcript_chunks(TEXT, FLOAT, INT);

-- Create new multi-type vector search function
CREATE OR REPLACE FUNCTION match_data_chunks(
  query_embedding_text TEXT,
  filter_types TEXT[] DEFAULT NULL,
  filter_coach_id UUID DEFAULT NULL,
  filter_client_id UUID DEFAULT NULL,
  filter_org_id UUID DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  data_item_id UUID,
  content TEXT,
  similarity FLOAT,
  data_type TEXT,
  coach_id UUID,
  client_id UUID,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sub.id,
    sub.data_item_id,
    sub.content,
    sub.similarity,
    sub.data_type,
    sub.coach_id,
    sub.client_id,
    sub.metadata
  FROM (
    SELECT
      dc.id,
      dc.data_item_id,
      dc.content,
      1 - (dc.embedding <=> query_embedding_text::vector(1536)) AS similarity,
      di.data_type,
      di.coach_id,
      di.client_id,
      di.metadata
    FROM data_chunks dc
    JOIN data_items di ON dc.data_item_id = di.id
    WHERE
      (filter_types IS NULL OR di.data_type = ANY(filter_types))
      AND (filter_coach_id IS NULL OR di.coach_id = filter_coach_id)
      AND (filter_client_id IS NULL OR di.client_id = filter_client_id)
      AND (filter_org_id IS NULL OR di.client_organization_id = filter_org_id)
  ) sub
  WHERE sub.similarity > match_threshold
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- ============================================
-- STEP 7: VALIDATION
-- ============================================

-- Verify migration counts match
DO $$
DECLARE
  old_transcript_count INTEGER;
  new_transcript_count INTEGER;
  old_chunk_count INTEGER;
  new_chunk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_transcript_count FROM transcripts;
  SELECT COUNT(*) INTO new_transcript_count FROM data_items WHERE data_type = 'transcript';
  SELECT COUNT(*) INTO old_chunk_count FROM transcript_chunks;
  SELECT COUNT(*) INTO new_chunk_count FROM data_chunks;

  RAISE NOTICE '=== MIGRATION VALIDATION ===';
  RAISE NOTICE 'Old transcripts: %', old_transcript_count;
  RAISE NOTICE 'New transcripts: %', new_transcript_count;
  RAISE NOTICE 'Old chunks: %', old_chunk_count;
  RAISE NOTICE 'New chunks: %', new_chunk_count;

  IF old_transcript_count = new_transcript_count AND old_chunk_count = new_chunk_count THEN
    RAISE NOTICE 'Migration validation: PASSED ✓';
  ELSE
    RAISE WARNING 'Migration validation: FAILED - counts do not match!';
  END IF;
END $$;

-- ============================================
-- STEP 8: DROP OLD TABLES (COMMENTED OUT FOR SAFETY)
-- ============================================
-- IMPORTANT: Only run this after thoroughly validating the migration!
-- Recommend keeping old tables for at least one week in production.

-- DROP TABLE IF EXISTS transcript_chunks CASCADE;
-- DROP TABLE IF EXISTS transcripts CASCADE;

-- ============================================
-- NOTES
-- ============================================

-- Data Type Enum:
--   - 'transcript': Coaching session conversations
--   - 'assessment': DISC, Myers-Briggs, Enneagram, 360-degree feedback
--   - 'coaching_model': Coach's theory of change, frameworks, evaluation criteria
--   - 'company_doc': Client org's OKRs, org charts, operating system materials
--   - 'goal': Client development goals and milestones
--   - 'note': Coach-private session notes and observations

-- Visibility Levels:
--   - 'private': Only creator/owner can see
--   - 'coach_only': Only assigned coach can see
--   - 'org_visible': All coaches working with this org can see
--   - 'public': Available to all (use sparingly)

-- Ownership Hierarchy:
--   - coaching_company → coach → client_organization → client → data_item
--   - All foreign keys are nullable for flexibility
--   - Use coach_id for coach-owned data (coaching models)
--   - Use client_id for client-owned data (assessments, goals)
--   - Use client_organization_id for org-owned data (company docs)

-- Backward Compatibility:
--   - Old /api/transcripts/upload endpoint will continue to work
--   - Old /api/search endpoint will work with new match_data_chunks function
--   - API server needs updates to use new table names
--   - No breaking changes to Custom GPT integration

-- Row Level Security:
--   - NOT enabled in this migration (Checkpoint 4)
--   - WILL be enabled in Phase 3 (Checkpoint 7)
--   - Schema is designed to support RLS policies

-- ============================================
-- DOWN MIGRATION (ROLLBACK)
-- ============================================

-- Uncomment to rollback this migration:
/*
-- Drop new tables (in reverse order of creation)
DROP TABLE IF EXISTS data_chunks CASCADE;
DROP TABLE IF EXISTS data_items CASCADE;
DROP TABLE IF EXISTS coach_model_associations CASCADE;
DROP TABLE IF EXISTS coaching_models CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS client_organizations CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;
DROP TABLE IF EXISTS coaching_companies CASCADE;

-- Drop new RPC function
DROP FUNCTION IF EXISTS match_data_chunks(TEXT, TEXT[], UUID, UUID, UUID, FLOAT, INT);

-- Recreate old RPC function (from 002_vector_search_function.sql)
CREATE OR REPLACE FUNCTION match_transcript_chunks(
  query_embedding_text TEXT,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  transcript_id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sub.id,
    sub.transcript_id,
    sub.content,
    sub.similarity
  FROM (
    SELECT
      tc.id,
      tc.transcript_id,
      tc.content,
      1 - (tc.embedding <=> query_embedding_text::vector(1536)) AS similarity
    FROM transcript_chunks tc
  ) sub
  WHERE sub.similarity > match_threshold
  ORDER BY sub.similarity DESC
  LIMIT match_count;
END;
$$;

-- Note: Old transcript tables still exist if you didn't drop them in Step 8
*/
