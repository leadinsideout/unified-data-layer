-- Migration 012: API Usage Analytics
-- Adds tables for tracking API usage, performance, and costs

-- ============================================
-- API USAGE TABLE
-- ============================================
-- Stores individual API requests for analytics

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request info
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL,

  -- Caller info
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,

  -- Optional context
  coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for querying by date range (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);

-- Index for filtering by endpoint
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Index for filtering by api_key
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key ON api_usage(api_key_id);

-- ============================================
-- COST TRACKING TABLE
-- ============================================
-- Stores costs from external services (OpenAI, etc.)

CREATE TABLE IF NOT EXISTS cost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Service info
  service TEXT NOT NULL,  -- 'openai_embeddings', 'openai_chat', 'supabase_storage', etc.
  operation TEXT NOT NULL, -- 'embed', 'search', 'store', etc.

  -- Cost details
  units INTEGER NOT NULL,  -- tokens, bytes, requests, etc.
  unit_type TEXT NOT NULL, -- 'tokens', 'bytes', 'requests'
  cost_usd DECIMAL(10, 6), -- Estimated cost in USD (nullable if unknown)

  -- Context
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  data_item_id UUID REFERENCES data_items(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_cost_events_created_at ON cost_events(created_at DESC);

-- Index for service aggregation
CREATE INDEX IF NOT EXISTS idx_cost_events_service ON cost_events(service);

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Daily API usage summary
CREATE OR REPLACE VIEW api_usage_daily AS
SELECT
  DATE(created_at) as date,
  endpoint,
  COUNT(*) as request_count,
  AVG(response_time_ms)::INTEGER as avg_response_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::INTEGER as p95_response_time_ms,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
FROM api_usage
GROUP BY DATE(created_at), endpoint
ORDER BY date DESC, request_count DESC;

-- Daily cost summary
CREATE OR REPLACE VIEW cost_daily AS
SELECT
  DATE(created_at) as date,
  service,
  SUM(units) as total_units,
  unit_type,
  SUM(cost_usd) as total_cost_usd
FROM cost_events
GROUP BY DATE(created_at), service, unit_type
ORDER BY date DESC, service;

-- ============================================
-- RLS POLICIES (Admin only)
-- ============================================

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can manage api_usage" ON api_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage cost_events" ON cost_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Grant usage to authenticated users (for the views)
GRANT SELECT ON api_usage_daily TO authenticated;
GRANT SELECT ON cost_daily TO authenticated;

COMMENT ON TABLE api_usage IS 'Tracks API request metrics for analytics dashboard';
COMMENT ON TABLE cost_events IS 'Tracks costs from external services like OpenAI';
