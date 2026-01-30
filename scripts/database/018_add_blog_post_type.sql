-- Migration: 018_add_blog_post_type.sql
-- Description: Add 'blog_post' to supported data types
-- Purpose: Enable storage of Ryan Vaughn's newsletter blog posts
-- Author: JJ Vega
-- Date: 2026-01-30
-- Dependencies: 003_multi_type_schema.sql

-- ============================================
-- OVERVIEW
-- ============================================
-- This migration adds 'blog_post' as a supported data type for
-- storing coach-authored articles and newsletter content.
-- Blog posts are distinct from coaching_models in that they are:
-- - Public thought leadership content (vs private frameworks)
-- - Dated publications (vs versioned methodologies)
-- - Searchable by topic for coaching context

-- ============================================
-- STEP 1: UPDATE DATA_TYPE CHECK CONSTRAINT
-- ============================================

-- Drop existing constraint
ALTER TABLE data_items
DROP CONSTRAINT IF EXISTS data_items_data_type_check;

-- Add updated constraint with blog_post
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
  'blog_post'
));

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify the constraint was created correctly
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conname = 'data_items_data_type_check';
