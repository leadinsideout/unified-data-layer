-- Migration 10b: Fix RLS on Legacy Transcript Tables
-- Date: 2025-11-24
-- Description:
--   Enable RLS on legacy transcript tables from Phase 1
--   These tables exist for backward compatibility but need to be secured

-- ============================================================================
-- PART 1: Enable RLS on Legacy Transcript Tables
-- ============================================================================

-- Enable RLS on transcripts table
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on transcript_chunks table
ALTER TABLE public.transcript_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Create RLS Policies for Transcripts Table
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

-- ============================================================================
-- PART 3: Create RLS Policies for Transcript Chunks Table
-- ============================================================================

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
-- PART 4: Verification
-- ============================================================================

-- Verify RLS is enabled
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

SELECT '✅ RLS enabled on legacy transcript tables!' AS status;
SELECT '   - 2 tables secured (transcripts, transcript_chunks)' AS detail;
SELECT '   - 8 RLS policies created' AS detail;
