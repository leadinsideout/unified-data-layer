-- Migration 005: PII Audit Trail & Content Backup
-- Phase 3 Checkpoint 8
-- Created: 2025-11-19
--
-- Purpose: Add infrastructure for PII scrubbing audit trails and content backup
--
-- Changes:
-- 1. Add raw_content_backup column for safety net (recovery if scrubbing has bugs)
-- 2. Add indexes for querying scrubbed vs unscrubbed items
-- 3. Add helper functions for PII audit trail queries

BEGIN;

-- 1. Add raw_content_backup column to data_items table
-- This stores the original content before PII scrubbing (safety net)
ALTER TABLE data_items
ADD COLUMN IF NOT EXISTS raw_content_backup TEXT;

COMMENT ON COLUMN data_items.raw_content_backup IS
'Backup of original content before PII scrubbing. Used for recovery if scrubbing has bugs. Only populated when PII_SCRUBBING_ENABLED=true.';

-- 2. Add index for querying items by PII scrubbing status
-- Allows fast queries like "find all items that were scrubbed" or "find items with PII"
CREATE INDEX IF NOT EXISTS idx_data_items_pii_scrubbed
ON data_items ((metadata->'pii_scrubbing'->>'scrubbed'))
WHERE metadata->'pii_scrubbing' IS NOT NULL;

COMMENT ON INDEX idx_data_items_pii_scrubbed IS
'Index for efficiently querying items by PII scrubbing status';

-- 3. Add index for querying by number of PII entities detected
CREATE INDEX IF NOT EXISTS idx_data_items_pii_entity_count
ON data_items (((metadata->'pii_scrubbing'->'entities'->>'total')::INTEGER))
WHERE metadata->'pii_scrubbing' IS NOT NULL;

COMMENT ON INDEX idx_data_items_pii_entity_count IS
'Index for efficiently querying items by number of PII entities detected';

-- 4. Helper function: Check if item was PII scrubbed
CREATE OR REPLACE FUNCTION is_pii_scrubbed(metadata_json JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  IF metadata_json IS NULL THEN
    RETURN FALSE;
  END IF;

  IF metadata_json->'pii_scrubbing' IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (metadata_json->'pii_scrubbing'->>'scrubbed')::BOOLEAN;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_pii_scrubbed(JSONB) IS
'Check if a data item has been PII scrubbed based on metadata';

-- 5. Helper function: Get PII entity count
CREATE OR REPLACE FUNCTION get_pii_entity_count(metadata_json JSONB)
RETURNS INTEGER AS $$
BEGIN
  IF metadata_json IS NULL THEN
    RETURN 0;
  END IF;

  IF metadata_json->'pii_scrubbing' IS NULL THEN
    RETURN 0;
  END IF;

  RETURN (metadata_json->'pii_scrubbing'->'entities'->>'total')::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_pii_entity_count(JSONB) IS
'Get the number of PII entities detected in a data item';

-- 6. Helper function: Get PII scrubbing duration
CREATE OR REPLACE FUNCTION get_pii_scrubbing_duration_ms(metadata_json JSONB)
RETURNS INTEGER AS $$
BEGIN
  IF metadata_json IS NULL THEN
    RETURN NULL;
  END IF;

  IF metadata_json->'pii_scrubbing' IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (metadata_json->'pii_scrubbing'->'performance'->>'duration_ms')::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_pii_scrubbing_duration_ms(JSONB) IS
'Get the duration of PII scrubbing operation in milliseconds';

-- 7. View: PII Scrubbing Statistics
-- Provides aggregate statistics about PII scrubbing across all data items
CREATE OR REPLACE VIEW pii_scrubbing_stats AS
SELECT
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE is_pii_scrubbed(metadata)) AS items_scrubbed,
  COUNT(*) FILTER (WHERE NOT is_pii_scrubbed(metadata)) AS items_not_scrubbed,
  ROUND(
    (COUNT(*) FILTER (WHERE is_pii_scrubbed(metadata))::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS percentage_scrubbed,
  SUM(get_pii_entity_count(metadata)) AS total_entities_detected,
  ROUND(AVG(get_pii_entity_count(metadata)), 2) AS avg_entities_per_item,
  ROUND(AVG(get_pii_scrubbing_duration_ms(metadata)), 2) AS avg_duration_ms,
  MAX(get_pii_scrubbing_duration_ms(metadata)) AS max_duration_ms,
  MIN(get_pii_scrubbing_duration_ms(metadata)) AS min_duration_ms
FROM data_items;

COMMENT ON VIEW pii_scrubbing_stats IS
'Aggregate statistics about PII scrubbing operations';

-- 8. View: Items with PII Detected
-- Lists all items that had PII detected and scrubbed
CREATE OR REPLACE VIEW items_with_pii AS
SELECT
  id,
  data_type,
  slug,
  title,
  get_pii_entity_count(metadata) AS entity_count,
  get_pii_scrubbing_duration_ms(metadata) AS scrubbing_duration_ms,
  metadata->'pii_scrubbing'->'entities'->'by_type' AS entities_by_type,
  metadata->'pii_scrubbing'->>'timestamp' AS scrubbed_at,
  created_at
FROM data_items
WHERE is_pii_scrubbed(metadata) = TRUE
  AND get_pii_entity_count(metadata) > 0
ORDER BY created_at DESC;

COMMENT ON VIEW items_with_pii IS
'All data items that had PII detected and scrubbed';

-- 9. View: PII Detection by Type
-- Shows PII scrubbing statistics grouped by data type
CREATE OR REPLACE VIEW pii_stats_by_type AS
SELECT
  data_type,
  COUNT(*) AS total_items,
  COUNT(*) FILTER (WHERE is_pii_scrubbed(metadata)) AS items_scrubbed,
  SUM(get_pii_entity_count(metadata)) AS total_entities,
  ROUND(AVG(get_pii_entity_count(metadata)), 2) AS avg_entities,
  ROUND(AVG(get_pii_scrubbing_duration_ms(metadata)), 2) AS avg_duration_ms
FROM data_items
GROUP BY data_type
ORDER BY data_type;

COMMENT ON VIEW pii_stats_by_type IS
'PII scrubbing statistics grouped by data type';

COMMIT;

-- Verification queries (for testing - run manually):
/*

-- Check if migration was successful
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'data_items'
  AND column_name = 'raw_content_backup';

-- Check indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'data_items'
  AND indexname LIKE '%pii%';

-- Check functions were created
SELECT
  proname,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS returns
FROM pg_proc
WHERE proname LIKE '%pii%';

-- Check views were created
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_name LIKE '%pii%';

-- Test the views
SELECT * FROM pii_scrubbing_stats;
SELECT * FROM items_with_pii LIMIT 5;
SELECT * FROM pii_stats_by_type;

*/
