-- ============================================
-- UNIFIED DATA LAYER - HEALTH CHECK QUERIES
-- Generated: 2026-01-09
-- ============================================

-- SECTION 1: ORPHANED DATA DETECTION
-- ============================================

-- 1.1: Data items with NO relationships at all (RED FLAG)
SELECT 'orphaned_data_items' as check_name, data_type, COUNT(*) as orphan_count
FROM data_items
WHERE coach_id IS NULL
  AND client_id IS NULL
  AND client_organization_id IS NULL
GROUP BY data_type;

-- 1.2: Data chunks with missing parent data_items (SHOULD BE ZERO)
SELECT 'orphaned_chunks' as check_name, COUNT(*) as orphaned_chunks
FROM data_chunks dc
LEFT JOIN data_items di ON dc.data_item_id = di.id
WHERE di.id IS NULL;

-- 1.3: Coaches without companies (RED FLAG - violates FK)
SELECT 'orphaned_coaches' as check_name, COUNT(*) as orphaned_coaches
FROM coaches
WHERE coaching_company_id IS NULL;

-- 1.4: Clients without primary coach (OK but worth checking)
SELECT 'clients_without_primary_coach' as check_name, COUNT(*) as count
FROM clients
WHERE primary_coach_id IS NULL;

-- 1.5: Data items with coach_id but coach doesn't exist (ghost coaches)
SELECT 'ghost_coach_references' as check_name, COUNT(*) as ghost_count
FROM data_items di
LEFT JOIN coaches c ON di.coach_id = c.id
WHERE di.coach_id IS NOT NULL AND c.id IS NULL;


-- SECTION 2: FIREFLIES SYNC INTEGRITY
-- ============================================

-- 2.1: Sync state breakdown (expect mostly 'synced')
SELECT 'sync_state_breakdown' as check_name, status, COUNT(*) as count
FROM fireflies_sync_state
GROUP BY status;

-- 2.2: Recent failed syncs (investigate if > 0)
SELECT 'recent_failed_syncs' as check_name, fireflies_meeting_id, error_message, updated_at
FROM fireflies_sync_state
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 10;

-- 2.3: Pending transcripts backlog (RED FLAG if growing)
SELECT 'pending_backlog' as check_name,
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM fireflies_pending
GROUP BY status;

-- 2.4: Last successful sync timestamp
SELECT 'last_sync' as check_name, MAX(updated_at) as last_sync_time
FROM fireflies_sync_state
WHERE status = 'synced';


-- SECTION 3: MULTI-TENANT ISOLATION (RLS POLICIES)
-- ============================================

-- 3.1: Count RLS policies (expect 42)
SELECT 'rls_policy_count' as check_name,
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC;

-- 3.2: Recent audit log analysis (suspicious patterns)
SELECT 'audit_log_breakdown' as check_name,
  user_role,
  action,
  resource_type,
  success,
  COUNT(*) as count
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_role, action, resource_type, success
ORDER BY count DESC
LIMIT 20;


-- SECTION 4: EMBEDDINGS & SEARCH QUALITY
-- ============================================

-- 4.1: Data items vs chunks ratio (expect ~10-15 chunks per item)
SELECT 'chunks_per_item_ratio' as check_name,
  COUNT(DISTINCT di.id) as total_items,
  COUNT(dc.id) as total_chunks,
  ROUND(COUNT(dc.id)::numeric / NULLIF(COUNT(DISTINCT di.id), 0), 2) as chunks_per_item
FROM data_items di
LEFT JOIN data_chunks dc ON di.id = dc.data_item_id;

-- 4.2: NULL embeddings (SHOULD BE ZERO - RED FLAG)
SELECT 'null_embeddings' as check_name, COUNT(*) as null_embeddings
FROM data_chunks
WHERE embedding IS NULL;

-- 4.3: Data items without any chunks (RED FLAG - upload failed)
SELECT 'items_without_chunks' as check_name,
  di.data_type,
  COUNT(*) as items_without_chunks
FROM data_items di
LEFT JOIN data_chunks dc ON di.id = dc.data_item_id
WHERE dc.id IS NULL
GROUP BY di.data_type;

-- 4.4: Average chunk size by data type
SELECT 'avg_chunk_size' as check_name,
  di.data_type,
  COUNT(dc.id) as chunk_count,
  AVG(LENGTH(dc.content)) as avg_chunk_length
FROM data_items di
JOIN data_chunks dc ON di.id = dc.data_item_id
GROUP BY di.data_type;


-- SECTION 5: API USAGE STATISTICS (last 30 days)
-- ============================================

-- 5.1: Total calls by endpoint
SELECT 'api_calls_by_endpoint' as check_name,
  endpoint,
  COUNT(*) as total_calls,
  ROUND(AVG(response_time_ms), 0) as avg_response_ms,
  ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY response_time_ms), 0) as p95_response_ms
FROM api_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY total_calls DESC
LIMIT 15;

-- 5.2: Error rate by endpoint (RED FLAG if > 5%)
SELECT 'error_rates' as check_name,
  endpoint,
  COUNT(*) as total_calls,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  ROUND(100.0 * SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) / COUNT(*), 2) as error_rate_pct
FROM api_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY endpoint
HAVING SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) > 0
ORDER BY error_rate_pct DESC;


-- SECTION 6: COST TRACKING (last 30 days)
-- ============================================

-- 6.1: Total costs by service
SELECT 'cost_by_service' as check_name,
  service,
  operation,
  ROUND(SUM(cost_usd)::numeric, 4) as total_cost,
  SUM(units) as total_units,
  unit_type
FROM cost_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY service, operation, unit_type
ORDER BY total_cost DESC;

-- 6.2: Daily cost trend (spot spikes)
SELECT 'daily_cost_trend' as check_name,
  DATE(created_at) as date,
  ROUND(SUM(cost_usd)::numeric, 4) as total_cost,
  COUNT(*) as event_count
FROM cost_events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 30;


-- SECTION 7: DATA GROWTH METRICS
-- ============================================

-- 7.1: Total counts by data type
SELECT 'data_counts_by_type' as check_name,
  data_type,
  COUNT(*) as item_count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM data_items
GROUP BY data_type
ORDER BY item_count DESC;

-- 7.2: Total chunks and storage estimate
SELECT 'storage_estimates' as check_name,
  COUNT(*) as total_chunks,
  SUM(LENGTH(content)) as total_content_bytes,
  ROUND(SUM(LENGTH(content))::numeric / 1024 / 1024, 2) as total_content_mb,
  SUM(LENGTH(embedding::text)) as total_embedding_bytes,
  ROUND(SUM(LENGTH(embedding::text))::numeric / 1024 / 1024, 2) as total_embedding_mb
FROM data_chunks;

-- 7.3: Database size (PostgreSQL specific)
SELECT 'database_size' as check_name,
  pg_size_pretty(pg_database_size(current_database())) as size;

-- 7.4: Connection pool status
SELECT 'connection_pool' as check_name,
  NOW() as current_time,
  COUNT(*) as active_connections
FROM pg_stat_activity
WHERE datname = current_database();
