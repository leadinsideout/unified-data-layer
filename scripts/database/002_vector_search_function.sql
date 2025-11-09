-- Migration: 002_vector_search_function.sql
-- Description: Create vector similarity search function for semantic search
-- Author: leadinsideout
-- Date: 2025-11-08
-- Dependencies: 001_initial_schema.sql (transcripts and transcript_chunks tables)

-- ============================================
-- CREATE VECTOR SEARCH FUNCTION
-- ============================================

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
    tc.id,
    tc.transcript_id,
    tc.content,
    -- Calculate similarity score (1 - cosine_distance)
    -- Higher score = more similar (0.0 = completely different, 1.0 = identical)
    1 - (tc.embedding <=> query_embedding_text::vector) AS similarity
  FROM transcript_chunks tc
  WHERE 1 - (tc.embedding <=> query_embedding_text::vector) > match_threshold
  ORDER BY tc.embedding <=> query_embedding_text::vector
  LIMIT match_count;
END;
$$;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Example 1: Basic search
-- SELECT * FROM match_transcript_chunks(
--   '[0.1, 0.2, ..., 0.5]',  -- Query embedding (1536 dimensions)
--   0.3,                      -- Threshold (0.0-1.0)
--   5                         -- Max results
-- );

-- Example 2: Lower threshold for broader results
-- SELECT * FROM match_transcript_chunks(
--   '[0.1, 0.2, ..., 0.5]',
--   0.2,   -- Lower threshold = more results
--   10
-- );

-- Example 3: Higher threshold for precise matches
-- SELECT * FROM match_transcript_chunks(
--   '[0.1, 0.2, ..., 0.5]',
--   0.7,   -- Higher threshold = fewer, more precise results
--   5
-- );

-- ============================================
-- NOTES
-- ============================================

-- Cosine Distance Operator (<=>):
--   Measures angular distance between vectors
--   Range: 0.0 (identical) to 2.0 (opposite)
--   We convert to similarity: 1 - distance
--   Result range: -1.0 to 1.0 (we filter negatives with threshold)

-- Similarity Score Interpretation:
--   0.8-1.0: Very high similarity (nearly identical meaning)
--   0.6-0.8: High similarity (related topics)
--   0.4-0.6: Moderate similarity (some relevance)
--   0.2-0.4: Low similarity (tangentially related)
--   0.0-0.2: Very low similarity (mostly unrelated)

-- Performance:
--   Uses IVFFLAT index for fast approximate search
--   Typical query time: 10-100ms for 10k vectors
--   Exact nearest neighbor would be 100-1000ms

-- match_threshold:
--   Higher = fewer, more precise results
--   Lower = more, broader results
--   0.3 is a good default for most use cases
--   Tune based on your data and needs

-- match_count:
--   Limits number of results returned
--   Always returns at most match_count results
--   May return fewer if not enough meet threshold

-- Text-to-Vector Conversion:
--   query_embedding_text must be a string like "[0.1, 0.2, ...]"
--   We cast it to vector type using ::vector
--   The API will generate embeddings via OpenAI
--   Then convert to this text format for the query

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- No results returned:
--   1. Check threshold is not too high
--   2. Verify embeddings exist in database
--   3. Ensure query embedding is 1536 dimensions
--   4. Try lowering threshold to 0.1 for testing

-- Slow performance:
--   1. Verify IVFFLAT index exists
--   2. Increase 'lists' parameter in index
--   3. Reduce match_count
--   4. Increase match_threshold (fewer comparisons)

-- "vector type not found" error:
--   1. Ensure pgvector extension is enabled
--   2. Run: CREATE EXTENSION vector;

-- ============================================
-- DOWN MIGRATION (for rollback)
-- ============================================

-- Uncomment to rollback this migration:
-- DROP FUNCTION IF EXISTS match_transcript_chunks(TEXT, FLOAT, INT);
