-- Migration 011: Fireflies Sync State Table
-- Tracks which Fireflies transcripts have been synced to prevent duplicates
-- Used by the GitHub Actions polling workflow

-- Create the sync state table
CREATE TABLE IF NOT EXISTS fireflies_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fireflies_meeting_id TEXT NOT NULL UNIQUE,
  data_item_id UUID REFERENCES data_items(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'synced' CHECK (status IN ('synced', 'failed', 'skipped')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by meeting ID
CREATE INDEX IF NOT EXISTS idx_fireflies_sync_meeting_id
  ON fireflies_sync_state(fireflies_meeting_id);

-- Index for finding failed syncs that need retry
CREATE INDEX IF NOT EXISTS idx_fireflies_sync_status
  ON fireflies_sync_state(status) WHERE status = 'failed';

-- Add update trigger for updated_at
CREATE TRIGGER update_fireflies_sync_state_updated_at
  BEFORE UPDATE ON fireflies_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies (service role bypasses, but good to have)
ALTER TABLE fireflies_sync_state ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to fireflies_sync_state"
  ON fireflies_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE fireflies_sync_state IS 'Tracks Fireflies transcript sync status for polling-based import';
COMMENT ON COLUMN fireflies_sync_state.fireflies_meeting_id IS 'Unique meeting ID from Fireflies API';
COMMENT ON COLUMN fireflies_sync_state.data_item_id IS 'Reference to imported data_item, null if failed/skipped';
COMMENT ON COLUMN fireflies_sync_state.status IS 'synced = successfully imported, failed = error during import, skipped = intentionally not imported';
