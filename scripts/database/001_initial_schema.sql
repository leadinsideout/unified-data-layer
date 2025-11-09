-- Migration: 001_initial_schema.sql
-- Description: Create initial transcripts and chunks tables with pgvector support
-- Author: leadinsideout
-- Date: 2025-11-08
-- Dependencies: pgvector extension must be enabled

-- ============================================
-- ENABLE EXTENSIONS
-- ============================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- CREATE TABLES
-- ============================================

-- Transcripts table: stores raw coaching session transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  meeting_date TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB,
  coach_id UUID,
  client_id UUID,
  fireflies_meeting_id TEXT
);

-- Transcript chunks table: stores chunked text with vector embeddings
CREATE TABLE IF NOT EXISTS transcript_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(transcript_id, chunk_index)
);

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for fast lookup by transcript
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_transcript_id
  ON transcript_chunks(transcript_id);

-- IVFFLAT index for vector similarity search
-- lists=100 is a good starting point for small-medium datasets
-- Increase to 1000+ for larger datasets (>100k vectors)
CREATE INDEX IF NOT EXISTS idx_transcript_chunks_embedding
  ON transcript_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Optional indexes for filtering (uncomment if needed)
-- CREATE INDEX IF NOT EXISTS idx_transcripts_coach_id ON transcripts(coach_id);
-- CREATE INDEX IF NOT EXISTS idx_transcripts_client_id ON transcripts(client_id);
-- CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_date ON transcripts(meeting_date);

-- ============================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================

-- Verify tables were created
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('transcripts', 'transcript_chunks');

-- Verify vector extension is enabled
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- Verify indexes were created
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('transcripts', 'transcript_chunks');

-- ============================================
-- NOTES
-- ============================================

-- Row Level Security (RLS):
--   NOT enabled in Phase 1 (development only)
--   WILL enable in Phase 3 (security & privacy)
--   Until then, service_role key has full access

-- Embedding dimension:
--   1536 dimensions for OpenAI text-embedding-3-small
--   Do NOT change without migrating existing data

-- IVFFLAT Index:
--   Approximate nearest neighbor search (very fast)
--   Trade-off: slight accuracy loss for 10-100x speed gain
--   Tune 'lists' parameter based on dataset size:
--     - 100 lists: good for 1k-10k vectors
--     - 1000 lists: good for 100k-1M vectors
--     - sqrt(total_vectors) is a good heuristic

-- Cascade delete:
--   Deleting a transcript automatically deletes its chunks
--   Prevents orphaned chunks

-- ============================================
-- DOWN MIGRATION (for rollback)
-- ============================================

-- Uncomment to rollback this migration:
-- DROP INDEX IF EXISTS idx_transcript_chunks_embedding;
-- DROP INDEX IF EXISTS idx_transcript_chunks_transcript_id;
-- DROP TABLE IF EXISTS transcript_chunks CASCADE;
-- DROP TABLE IF EXISTS transcripts CASCADE;
-- -- DO NOT drop vector extension (other tables may use it)
