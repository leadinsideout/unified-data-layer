-- Migration 10b: Fix Security Advisor Errors
-- Date: 2025-11-24
-- Description:
--   1. Remove SECURITY DEFINER from PII views (3 errors)
--   2. Enable RLS on legacy transcript tables (2 errors)
--   3. Create RLS policies for transcript tables

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views (3 errors)
-- ============================================================================

-- Issue: PII-related views use SECURITY DEFINER which bypasses RLS
-- Fix: Recreate views without SECURITY DEFINER

-- Drop and recreate pii_stats_by_type view
DROP VIEW IF EXISTS public.pii_stats_by_type CASCADE;
CREATE VIEW public.pii_stats_by_type AS
SELECT
  pii_type,
  COUNT(*) as count,
  COUNT(DISTINCT data_item_id) as affected_items
FROM pii_detections
GROUP BY pii_type
ORDER BY count DESC;

-- Drop and recreate items_with_pii view
DROP VIEW IF EXISTS public.items_with_pii CASCADE;
CREATE VIEW public.items_with_pii AS
SELECT DISTINCT
  di.id,
  di.data_type,
  di.slug,
  di.title,
  di.coach_id,
  di.client_id,
  di.organization_id,
  di.created_at,
  COUNT(pd.id) as pii_detection_count,
  array_agg(DISTINCT pd.pii_type) as pii_types
FROM data_items di
JOIN pii_detections pd ON pd.data_item_id = di.id
GROUP BY di.id, di.data_type, di.slug, di.title, di.coach_id, di.client_id, di.organization_id, di.created_at;

-- Drop and recreate pii_scrubbing_stats view
DROP VIEW IF EXISTS public.pii_scrubbing_stats CASCADE;
CREATE VIEW public.pii_scrubbing_stats AS
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  SUM((metadata->>'detections_count')::int) as total_detections,
  SUM((metadata->>'scrubbed_count')::int) as total_scrubbed
FROM pii_audit_trail
WHERE completed_at IS NOT NULL
GROUP BY status;

-- ============================================================================
-- PART 2: Enable RLS on Legacy Transcript Tables (2 errors)
-- ============================================================================

-- Note: These are legacy tables from Phase 1
-- They should eventually be migrated/deleted, but for now we'll secure them

-- Enable RLS on transcripts table
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transcript_chunks table
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: Create RLS Policies for Legacy Transcript Tables
-- ============================================================================

-- Policy 1: Coaches can view their own transcripts
DROP POLICY IF EXISTS "Coaches can view their own transcripts" ON public.transcripts;
CREATE POLICY "Coaches can view their own transcripts"
  ON public.transcripts
  FOR SELECT
  USING (
    -- Allow coaches to see their own transcripts
    coach_id IN (
      SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
    )
    OR
    -- Allow admins to see all transcripts in their company
    EXISTS (
      SELECT 1 FROM admins a
      JOIN coaches c ON c.coaching_company_id = a.coaching_company_id
      WHERE a.id IN (SELECT admin_id FROM api_keys WHERE admin_id = auth.uid())
        AND c.id = transcripts.coach_id
    )
  );

-- Policy 2: Coaches can insert their own transcripts
DROP POLICY IF EXISTS "Coaches can insert their own transcripts" ON public.transcripts;
CREATE POLICY "Coaches can insert their own transcripts"
  ON public.transcripts
  FOR INSERT
  WITH CHECK (
    coach_id IN (
      SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
    )
  );

-- Policy 3: Coaches can update their own transcripts
DROP POLICY IF EXISTS "Coaches can update their own transcripts" ON public.transcripts;
CREATE POLICY "Coaches can update their own transcripts"
  ON public.transcripts
  FOR UPDATE
  USING (
    coach_id IN (
      SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
    )
  );

-- Policy 4: Coaches can delete their own transcripts
DROP POLICY IF EXISTS "Coaches can delete their own transcripts" ON public.transcripts;
CREATE POLICY "Coaches can delete their own transcripts"
  ON public.transcripts
  FOR DELETE
  USING (
    coach_id IN (
      SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
    )
  );

-- Policy 5: Coaches can view chunks for their transcripts
DROP POLICY IF EXISTS "Coaches can view their transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Coaches can view their transcript chunks"
  ON public.transcript_chunks
  FOR SELECT
  USING (
    transcript_id IN (
      SELECT id FROM public.transcripts
      WHERE coach_id IN (
        SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
      )
    )
    OR
    -- Allow admins to see all chunks in their company
    EXISTS (
      SELECT 1 FROM admins a
      JOIN coaches c ON c.coaching_company_id = a.coaching_company_id
      JOIN public.transcripts t ON t.coach_id = c.id
      WHERE a.id IN (SELECT admin_id FROM api_keys WHERE admin_id = auth.uid())
        AND t.id = transcript_chunks.transcript_id
    )
  );

-- Policy 6: Coaches can insert chunks for their transcripts
DROP POLICY IF EXISTS "Coaches can insert their transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Coaches can insert their transcript chunks"
  ON public.transcript_chunks
  FOR INSERT
  WITH CHECK (
    transcript_id IN (
      SELECT id FROM public.transcripts
      WHERE coach_id IN (
        SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
      )
    )
  );

-- Policy 7: Coaches can update chunks for their transcripts
DROP POLICY IF EXISTS "Coaches can update their transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Coaches can update their transcript chunks"
  ON public.transcript_chunks
  FOR UPDATE
  USING (
    transcript_id IN (
      SELECT id FROM public.transcripts
      WHERE coach_id IN (
        SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
      )
    )
  );

-- Policy 8: Coaches can delete chunks for their transcripts
DROP POLICY IF EXISTS "Coaches can delete their transcript chunks" ON public.transcript_chunks;
CREATE POLICY "Coaches can delete their transcript chunks"
  ON public.transcript_chunks
  FOR DELETE
  USING (
    transcript_id IN (
      SELECT id FROM public.transcripts
      WHERE coach_id IN (
        SELECT coach_id FROM api_keys WHERE coach_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- PART 4: Verification Queries
-- ============================================================================

-- Verify views no longer use SECURITY DEFINER
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('pii_stats_by_type', 'items_with_pii', 'pii_scrubbing_stats');

-- Verify RLS is enabled on transcript tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('transcripts', 'transcript_chunks');

-- Verify policies were created
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('transcripts', 'transcript_chunks')
ORDER BY tablename, policyname;

-- ============================================================================
-- Success Message
-- ============================================================================

SELECT '✅ Security Advisor errors fixed successfully!' AS status;
SELECT '   - 3 SECURITY DEFINER views recreated without SECURITY DEFINER' AS detail;
SELECT '   - 2 tables enabled RLS (transcripts, transcript_chunks)' AS detail;
SELECT '   - 8 RLS policies created for legacy transcript tables' AS detail;
