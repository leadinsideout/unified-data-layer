#!/usr/bin/env node

/**
 * Health Check Query Runner
 * Executes all health check queries and outputs results
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runHealthCheck() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🏥 UNIFIED DATA LAYER - PRODUCTION HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

  // Read SQL file
  const sqlFile = join(__dirname, 'health-check-queries.sql');
  const sqlContent = readFileSync(sqlFile, 'utf-8');

  // Split by section comments
  const sections = sqlContent.split(/-- SECTION \d+:/);

  // Parse queries (split by double newlines, ignore comments)
  const queries = sqlContent
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0 && !q.startsWith('--') && q.includes('SELECT'));

  console.log(`📊 Running ${queries.length} health check queries...\n`);

  const results = {};
  let currentSection = 'General';

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i] + ';';

    try {
      // Extract check name from query
      const checkNameMatch = query.match(/'([^']+)'\s+as\s+check_name/);
      const checkName = checkNameMatch ? checkNameMatch[1] : `query_${i + 1}`;

      // Determine section
      if (query.includes('orphaned') || query.includes('ghost')) {
        currentSection = '1. Orphaned Data';
      } else if (query.includes('sync') || query.includes('fireflies') || query.includes('pending')) {
        currentSection = '2. Fireflies Sync';
      } else if (query.includes('rls') || query.includes('policies') || query.includes('audit')) {
        currentSection = '3. RLS & Security';
      } else if (query.includes('embedding') || query.includes('chunk')) {
        currentSection = '4. Embeddings';
      } else if (query.includes('api_usage') || query.includes('error_rate')) {
        currentSection = '5. API Usage';
      } else if (query.includes('cost')) {
        currentSection = '6. Costs';
      } else if (query.includes('data_type') || query.includes('storage') || query.includes('database_size')) {
        currentSection = '7. Data Growth';
      }

      // Execute query
      const { data, error } = await supabase.rpc('exec_sql', { query_text: query });

      if (error) {
        // Try direct query execution
        const response = await supabase.from('data_items').select('*').limit(0); // Test connection
        if (response.error) {
          throw new Error(`Connection error: ${response.error.message}`);
        }

        // Execute raw SQL via PostgreSQL REST endpoint
        const { data: rawData, error: rawError } = await supabase.rpc('execute_raw_sql', { sql: query });

        if (rawError) {
          console.error(`❌ Error running ${checkName}:`, rawError.message);
          continue;
        }

        results[checkName] = rawData;
      } else {
        results[checkName] = data;
      }

      console.log(`✅ ${checkName} (${currentSection})`);
    } catch (err) {
      console.error(`❌ Query ${i + 1} failed:`, err.message);
    }
  }

  // Since RPC might not work, let's run queries directly
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 RUNNING DIRECT QUERIES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Orphaned data items
  console.log('1️⃣  ORPHANED DATA DETECTION\n');
  const { data: orphanedData, error: orphanError } = await supabase
    .from('data_items')
    .select('data_type')
    .is('coach_id', null)
    .is('client_id', null)
    .is('client_organization_id', null);

  if (!orphanError && orphanedData) {
    const counts = orphanedData.reduce((acc, item) => {
      acc[item.data_type] = (acc[item.data_type] || 0) + 1;
      return acc;
    }, {});
    if (Object.keys(counts).length === 0) {
      console.log('✅ No orphaned data items found');
    } else {
      console.log('⚠️  Orphaned data items by type:');
      Object.entries(counts).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} items`);
      });
    }
  }

  // 2. Data items count
  const { count: itemCount } = await supabase
    .from('data_items')
    .select('*', { count: 'exact', head: true });
  console.log(`\n📦 Total data_items: ${itemCount || 0}`);

  // 3. Data chunks count
  const { count: chunkCount } = await supabase
    .from('data_chunks')
    .select('*', { count: 'exact', head: true });
  console.log(`📦 Total data_chunks: ${chunkCount || 0}`);

  if (itemCount && chunkCount) {
    const ratio = (chunkCount / itemCount).toFixed(2);
    console.log(`📊 Chunks per item ratio: ${ratio} (expect ~10-15)`);
    if (ratio < 5) {
      console.log('⚠️  WARNING: Ratio is low, may indicate chunking issues');
    }
  }

  // 4. RLS policies count
  const { count: policyCount } = await supabase
    .from('pg_policies')
    .select('*', { count: 'exact', head: true });
  console.log(`\n🔒 RLS policies count: ${policyCount || 'N/A'} (expect 42)`);

  // 5. Fireflies sync state
  console.log('\n2️⃣  FIREFLIES SYNC STATUS\n');
  const { data: syncState } = await supabase
    .from('fireflies_sync_state')
    .select('status')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (syncState && syncState.length > 0) {
    const stateCounts = syncState.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Sync state breakdown (last 100):');
    Object.entries(stateCounts).forEach(([status, count]) => {
      const icon = status === 'synced' ? '✅' : status === 'failed' ? '❌' : '⚠️';
      console.log(`   ${icon} ${status}: ${count}`);
    });

    const { data: lastSync } = await supabase
      .from('fireflies_sync_state')
      .select('updated_at')
      .eq('status', 'synced')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (lastSync) {
      const timeSince = Math.round((Date.now() - new Date(lastSync.updated_at).getTime()) / 1000 / 60);
      console.log(`\n⏰ Last successful sync: ${timeSince} minutes ago`);
      if (timeSince > 30) {
        console.log('⚠️  WARNING: No successful sync in last 30 minutes (expected every 10 min)');
      }
    }
  } else {
    console.log('ℹ️  No Fireflies sync history found');
  }

  // 6. Pending transcripts
  const { count: pendingCount } = await supabase
    .from('fireflies_pending')
    .select('*', { count: 'exact', head: true });
  if (pendingCount > 0) {
    console.log(`\n⏳ Pending transcripts queue: ${pendingCount}`);
    if (pendingCount > 10) {
      console.log('⚠️  WARNING: Large pending queue, may need manual coach assignment');
    }
  } else {
    console.log('\n✅ No pending transcripts in queue');
  }

  // 7. API usage stats (last 7 days)
  console.log('\n5️⃣  API USAGE (Last 7 Days)\n');
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: apiCallCount } = await supabase
    .from('api_usage')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  console.log(`📞 Total API calls: ${apiCallCount || 0}`);

  if (apiCallCount > 0) {
    const { data: endpoints } = await supabase
      .from('api_usage')
      .select('endpoint')
      .gte('created_at', sevenDaysAgo);

    if (endpoints) {
      const endpointCounts = endpoints.reduce((acc, item) => {
        acc[item.endpoint] = (acc[item.endpoint] || 0) + 1;
        return acc;
      }, {});
      console.log('\nTop endpoints:');
      Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([endpoint, count]) => {
          console.log(`   - ${endpoint}: ${count} calls`);
        });
    }
  }

  // 8. Cost events (last 30 days)
  console.log('\n6️⃣  COST TRACKING (Last 30 Days)\n');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: costs } = await supabase
    .from('cost_events')
    .select('service, cost_usd')
    .gte('created_at', thirtyDaysAgo);

  if (costs && costs.length > 0) {
    const totalCost = costs.reduce((sum, item) => sum + parseFloat(item.cost_usd || 0), 0);
    console.log(`💰 Total OpenAI costs: $${totalCost.toFixed(4)}`);

    const serviceCosts = costs.reduce((acc, item) => {
      const service = item.service || 'unknown';
      acc[service] = (acc[service] || 0) + parseFloat(item.cost_usd || 0);
      return acc;
    }, {});

    console.log('\nCost breakdown by service:');
    Object.entries(serviceCosts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([service, cost]) => {
        console.log(`   - ${service}: $${cost.toFixed(4)}`);
      });
  } else {
    console.log('ℹ️  No cost events recorded in last 30 days');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ HEALTH CHECK COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run health check
runHealthCheck().catch(err => {
  console.error('\n❌ Health check failed:', err.message);
  process.exit(1);
});
