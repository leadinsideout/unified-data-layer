#!/usr/bin/env node

/**
 * Investigate Orphaned Data Items
 * Identifies data items with no coach/client/org relationships
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function investigateOrphanedData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 INVESTIGATING ORPHANED DATA ITEMS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Query orphaned data items
  const { data: orphans, error } = await supabase
    .from('data_items')
    .select('id, data_type, created_at, metadata, raw_content')
    .is('coach_id', null)
    .is('client_id', null)
    .is('client_organization_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error querying orphaned data:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${orphans.length} orphaned data items\n`);

  if (orphans.length === 0) {
    console.log('✅ No orphaned data items found!');
    return;
  }

  // Analyze orphans
  const byType = orphans.reduce((acc, item) => {
    acc[item.data_type] = (acc[item.data_type] || 0) + 1;
    return acc;
  }, {});

  console.log('📦 Breakdown by type:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}`);
  });
  console.log();

  // Show details of first 5 orphans
  console.log('🔍 Sample orphaned items (first 5):\n');
  orphans.slice(0, 5).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.data_type} (ID: ${item.id.slice(0, 8)}...)`);
    console.log(`   Created: ${new Date(item.created_at).toISOString()}`);

    // Try to extract useful info from metadata
    if (item.metadata) {
      const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;

      if (meta.meeting_id) {
        console.log(`   Fireflies Meeting ID: ${meta.meeting_id}`);
      }
      if (meta.host_email) {
        console.log(`   Host Email: ${meta.host_email}`);
      }
      if (meta.organizer_email) {
        console.log(`   Organizer Email: ${meta.organizer_email}`);
      }
      if (meta.attendee_emails) {
        console.log(`   Attendees: ${meta.attendee_emails.join(', ')}`);
      }
      if (meta.title) {
        console.log(`   Title: ${meta.title}`);
      }
    }

    // Show first 100 chars of content
    if (item.raw_content) {
      const preview = item.raw_content.slice(0, 100).replace(/\n/g, ' ');
      console.log(`   Content preview: "${preview}..."`);
    }
    console.log();
  });

  // Check if they're in fireflies_sync_state
  console.log('🔗 Checking Fireflies sync state...\n');

  const orphanIds = orphans.map(o => o.id);
  const { data: syncStates } = await supabase
    .from('fireflies_sync_state')
    .select('data_item_id, fireflies_meeting_id, status')
    .in('data_item_id', orphanIds);

  if (syncStates && syncStates.length > 0) {
    console.log(`   ✅ Found ${syncStates.length} orphans with Fireflies sync records`);
    syncStates.slice(0, 3).forEach(state => {
      console.log(`      - Meeting ${state.fireflies_meeting_id}: ${state.status}`);
    });
  } else {
    console.log('   ℹ️  No Fireflies sync records for these orphans');
  }
  console.log();

  // Check fireflies_pending for unmatched emails
  console.log('📧 Checking pending queue for email hints...\n');
  const { data: pending } = await supabase
    .from('fireflies_pending')
    .select('id, unmatched_emails, title, created_at')
    .limit(10);

  if (pending && pending.length > 0) {
    console.log(`   Found ${pending.length} items in pending queue`);

    // Extract all unmatched emails
    const allEmails = pending.flatMap(p => p.unmatched_emails || []);
    const emailCounts = allEmails.reduce((acc, email) => {
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {});

    console.log('\n   Top unmatched emails:');
    Object.entries(emailCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([email, count]) => {
        console.log(`      - ${email}: ${count} occurrences`);
      });
  } else {
    console.log('   ℹ️  No items in pending queue');
  }
  console.log();

  // Recommendations
  console.log('═══════════════════════════════════════════════════════════');
  console.log('💡 REMEDIATION RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Option 1: Identify coaches from metadata');
  console.log('   - Extract emails from metadata (host_email, organizer_email)');
  console.log('   - Match against coaches table');
  console.log('   - Update data_items.coach_id via SQL UPDATE\n');

  console.log('Option 2: Delete orphaned items (if invalid data)');
  console.log('   - If these are test data or invalid imports');
  console.log('   - DELETE FROM data_items WHERE id IN (...)');
  console.log('   - Cascades to data_chunks (automatically deleted)\n');

  console.log('Option 3: Assign to default/admin coach');
  console.log('   - If content is valuable but coach unknown');
  console.log('   - Create "Unknown Coach" placeholder');
  console.log('   - UPDATE data_items SET coach_id = <admin_id>\n');

  console.log('⚠️  WARNING: Do not delete data without user approval!');
  console.log('⚠️  Review metadata and content before taking action\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ INVESTIGATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');
}

// Run investigation
investigateOrphanedData().catch(err => {
  console.error('\n❌ Investigation failed:', err.message);
  process.exit(1);
});
