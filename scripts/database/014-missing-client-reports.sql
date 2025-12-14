-- Migration 014: Create missing_client_reports table
-- Purpose: Store history of weekly missing client reports for audit trail
-- Created: 2025-12-14

-- Table: missing_client_reports
-- Stores sent report history and data for reference
CREATE TABLE IF NOT EXISTS missing_client_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Report period
  report_date DATE NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Summary stats
  total_transcripts_synced INT NOT NULL DEFAULT 0,
  transcripts_missing_client INT NOT NULL DEFAULT 0,
  unique_unmatched_emails INT NOT NULL DEFAULT 0,
  coaches_affected INT NOT NULL DEFAULT 0,

  -- Full report data (for regenerating or viewing history)
  report_data JSONB NOT NULL,

  -- Delivery tracking
  sent_to TEXT[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
  delivery_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_missing_client_reports_date
  ON missing_client_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_missing_client_reports_period
  ON missing_client_reports(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_missing_client_reports_status
  ON missing_client_reports(delivery_status);

-- RLS Policies (admins only)
ALTER TABLE missing_client_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all reports
CREATE POLICY "Admins can view reports"
  ON missing_client_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.role IN ('super_admin', 'admin')
    )
  );

-- Policy: Service role can manage reports (for API operations)
CREATE POLICY "Service role bypass for reports"
  ON missing_client_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE missing_client_reports IS 'History of weekly missing client reports sent to admins';
COMMENT ON COLUMN missing_client_reports.report_data IS 'Full JSON report data including per-coach breakdown';
COMMENT ON COLUMN missing_client_reports.sent_to IS 'Array of email addresses that received this report';
