/**
 * Reset Fireflies Sync State for Micah's Meetings
 *
 * Deletes sync state entries for meetings where Micah should be the coach,
 * allowing them to be re-synced with correct coach assignment.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Fireflies meeting IDs where Micah appears (from search results)
const MICAH_MEETING_IDS = [
  '01KAED74STBXC73486ARXQVDHA', // Micah <> Ryan Jam on Webinar
  '01KC3RYK48C1PBJ5Q740FV9RYH', // IO Co-Creation Call
  '01KCS7NTZQHDS5AEVTXRCWZMXC', // Retro: Designing 2026 Webinar
  '01KCSKHNG3EGEW84PNC6CZ7BF9', // IO Co-Creation Call
  '01KEPDB3JPJY15EAZ4PW266KSY', // IO Co-Creation Call
  '01KF82DATKQYSZQ2KMQQXYQP0C', // IO Co-Creation Call
  '01KFNY3Q3Y82D25X95JBY1QGC5', // IO Co-Creation Call
  '01KFP78XAB7BTY6ZKZZP61C4KT', // Micah and Matt, StVenture Lab
  '01KGG19NF45F2NEJE7B82YVTSX', // Inside Out <> ST Ventures Lab
  '01KGG19NF5HAYB51668NTSQP8N', // IO Co-Creation Call
  '01KGJHKRKZ3VPE3J55QY8ANC2A', // Micah <> JJ Borg Jam
  '01KGJVQVY55YP0MR861CKWBJ42', // Micah/Matt/Ryan discuss ST Ventures
];

async function main() {
  console.log('🔄 Resetting sync state for Micah\'s meetings...\n');

  // Step 1: Check current sync state entries
  const { data: existing, error: checkError } = await supabase
    .from('fireflies_sync_state')
    .select('fireflies_meeting_id, status, data_item_id')
    .in('fireflies_meeting_id', MICAH_MEETING_IDS);

  if (checkError) {
    console.error('❌ Error checking sync state:', checkError.message);
    process.exit(1);
  }

  console.log(`Found ${existing?.length || 0} sync state entries to reset:\n`);
  existing?.forEach(e => console.log(`  - ${e.fireflies_meeting_id} (${e.status})`));

  if (!existing || existing.length === 0) {
    console.log('\n⚠️  No sync state entries found for these meetings.');
    console.log('They may not have been synced via Fireflies yet.');
    process.exit(0);
  }

  // Step 2: Get the data_item_ids to delete the actual transcripts
  const dataItemIds = existing
    .filter(e => e.data_item_id)
    .map(e => e.data_item_id);

  console.log(`\n📋 Found ${dataItemIds.length} data items to remove`);

  // Step 3: Delete data_chunks first (foreign key constraint)
  if (dataItemIds.length > 0) {
    console.log('\n🗑️  Deleting data_chunks...');
    const { error: chunksError, count: chunksCount } = await supabase
      .from('data_chunks')
      .delete({ count: 'exact' })
      .in('data_item_id', dataItemIds);

    if (chunksError) {
      console.error('❌ Error deleting chunks:', chunksError.message);
      process.exit(1);
    }
    console.log(`   Deleted ${chunksCount || 0} chunks`);

    // Step 4: Delete data_items
    console.log('\n🗑️  Deleting data_items...');
    const { error: itemsError, count: itemsCount } = await supabase
      .from('data_items')
      .delete({ count: 'exact' })
      .in('id', dataItemIds);

    if (itemsError) {
      console.error('❌ Error deleting items:', itemsError.message);
      process.exit(1);
    }
    console.log(`   Deleted ${itemsCount || 0} items`);
  }

  // Step 5: Delete sync state entries
  console.log('\n🗑️  Deleting sync state entries...');
  const { error: syncError, count: syncCount } = await supabase
    .from('fireflies_sync_state')
    .delete({ count: 'exact' })
    .in('fireflies_meeting_id', MICAH_MEETING_IDS);

  if (syncError) {
    console.error('❌ Error deleting sync state:', syncError.message);
    process.exit(1);
  }
  console.log(`   Deleted ${syncCount || 0} sync state entries`);

  console.log('\n✅ Reset complete!');
  console.log('\nNext steps:');
  console.log('1. Run: gh workflow run fireflies-sync.yml -f days_back=90');
  console.log('2. Meetings where micah@leadinsideout.io is organizer will sync to his account');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
