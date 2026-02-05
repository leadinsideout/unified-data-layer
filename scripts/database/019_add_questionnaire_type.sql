-- Migration: 019_add_questionnaire_type.sql
-- Description: Add 'questionnaire' to supported data types
-- Purpose: Enable storage of coaching intake questionnaires
-- Author: JJ Vega
-- Date: 2026-02-05
-- Dependencies: 018_add_blog_post_type.sql

-- ============================================
-- OVERVIEW
-- ============================================
-- This migration adds 'questionnaire' as a supported data type for
-- storing client intake questionnaires and coaching forms.
-- Questionnaires are distinct from assessments in that they are:
-- - Open-ended Q&A format (vs structured scores/ratings)
-- - Intake-focused (coaching goals, background, challenges)
-- - Rich context for understanding client motivations

-- ============================================
-- STEP 1: UPDATE DATA_TYPE CHECK CONSTRAINT
-- ============================================

-- Drop existing constraint
ALTER TABLE data_items
DROP CONSTRAINT IF EXISTS data_items_data_type_check;

-- Add updated constraint with questionnaire
ALTER TABLE data_items
ADD CONSTRAINT data_items_data_type_check
CHECK (data_type IN (
  'transcript',
  'assessment',
  'coaching_model',
  'company_doc',
  'goal',
  'note',
  'coach_assessment',
  'blog_post',
  'questionnaire'
));

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the constraint was created correctly
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'data_items_data_type_check';
