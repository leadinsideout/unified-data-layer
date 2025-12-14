-- Migration 013: Add unmatched_emails column to fireflies_pending
-- Purpose: Track emails that couldn't be matched during Fireflies sync
-- Note: fireflies_pending table already existed, this adds the missing column
-- Created: 2025-12-14
-- Applied: 2025-12-14

-- Add unmatched_emails column to fireflies_pending
ALTER TABLE fireflies_pending
ADD COLUMN IF NOT EXISTS unmatched_emails TEXT[] DEFAULT '{}';

-- Add session_date column if missing (maps from meeting_date)
ALTER TABLE fireflies_pending
ADD COLUMN IF NOT EXISTS session_date TIMESTAMPTZ;

-- Update session_date from meeting_date where null
UPDATE fireflies_pending
SET session_date = meeting_date
WHERE session_date IS NULL AND meeting_date IS NOT NULL;

-- Add comment for the new column
COMMENT ON COLUMN fireflies_pending.unmatched_emails IS 'Email addresses that did not match any coach or client in the database';
