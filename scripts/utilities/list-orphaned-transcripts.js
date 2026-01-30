#!/usr/bin/env node

/**
 * List All Orphaned Transcripts with Details
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function listOrphanedTranscripts() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 ALL 19 ORPHANED TRANSCRIPTS - DETAILED ANALYSIS');
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
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log(`Total Orphaned Items: ${orphans.length}\n`);

  orphans.forEach((item, idx) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`#${idx + 1} - ${item.data_type.toUpperCase()}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`ID: ${item.id}`);
    console.log(`Created: ${new Date(item.created_at).toISOString()}`);

    // Extract metadata
    const meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;

    if (meta) {
      if (meta.title) console.log(`Title: ${meta.title}`);
      if (meta.meeting_id) console.log(`Fireflies Meeting ID: ${meta.meeting_id}`);
      if (meta.host_email) console.log(`Host Email: ${meta.host_email}`);
      if (meta.organizer_email) console.log(`Organizer Email: ${meta.organizer_email}`);
      if (meta.attendee_emails && meta.attendee_emails.length > 0) {
        console.log(`Attendees: ${meta.attendee_emails.join(', ')}`);
      }
    }

    // Content preview (first 200 chars)
    if (item.raw_content) {
      const preview = item.raw_content.slice(0, 200).replace(/\n/g, ' ');
      console.log(`\nContent Preview:`);
      console.log(`"${preview}..."`);
    }

    // Analysis
    console.log(`\n📊 Analysis:`);

    // Determine if test data
    const isTestData =
      (item.raw_content && (
        item.raw_content.toLowerCase().includes('test session') ||
        item.raw_content.toLowerCase().includes('bulk test') ||
        item.raw_content.toLowerCase().includes('this is a test')
      )) ||
      (meta && meta.title && meta.title.toLowerCase().includes('test'));

    if (isTestData) {
      console.log(`🧪 Classification: TEST DATA`);
      console.log(`💡 Recommendation: DELETE (test data from bulk upload testing)`);
    } else {
      // Try to identify real sessions
      const hasSarah = item.raw_content && item.raw_content.includes('Sarah');
      const hasCoachingContent = item.raw_content && (
        item.raw_content.includes('coaching session') ||
        item.raw_content.includes('leadership') ||
        item.raw_content.includes('growth') ||
        item.raw_content.includes('client discussed')
      );

      if (hasSarah && hasCoachingContent) {
        console.log(`👤 Classification: REAL COACHING SESSION (Sarah)`);
        console.log(`💡 Recommendation: ASSIGN to appropriate coach`);
        console.log(`   - Appears to be real coaching data for client "Sarah"`);
        console.log(`   - Need to identify coach from context or metadata`);
      } else if (hasCoachingContent) {
        console.log(`📝 Classification: COACHING CONTENT (unclear)`);
        console.log(`💡 Recommendation: REVIEW MANUALLY`);
        console.log(`   - Has coaching-related content but unclear ownership`);
      } else {
        console.log(`❓ Classification: UNCLEAR`);
        console.log(`💡 Recommendation: REVIEW MANUALLY or DELETE if uncertain`);
      }
    }
  });

  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY & RECOMMENDATIONS');
  console.log(`${'='.repeat(70)}\n`);

  // Count by classification
  let testCount = 0;
  let sarahCount = 0;
  let unclearCount = 0;

  orphans.forEach(item => {
    const isTestData =
      (item.raw_content && (
        item.raw_content.toLowerCase().includes('test session') ||
        item.raw_content.toLowerCase().includes('bulk test') ||
        item.raw_content.toLowerCase().includes('this is a test')
      ));

    if (isTestData) {
      testCount++;
    } else {
      const hasSarah = item.raw_content && item.raw_content.includes('Sarah');
      if (hasSarah) {
        sarahCount++;
      } else {
        unclearCount++;
      }
    }
  });

  console.log(`Test Data (delete): ${testCount} transcripts`);
  console.log(`Sarah Sessions (assign to coach): ${sarahCount} transcripts`);
  console.log(`Unclear (manual review): ${unclearCount} transcripts`);

  console.log(`\n💡 RECOMMENDED ACTIONS:\n`);

  console.log(`1. DELETE test data (${testCount} items):`);
  console.log(`   SQL: DELETE FROM data_items WHERE id IN (`);
  orphans.filter(item => {
    const isTestData =
      (item.raw_content && (
        item.raw_content.toLowerCase().includes('test session') ||
        item.raw_content.toLowerCase().includes('bulk test') ||
        item.raw_content.toLowerCase().includes('this is a test')
      ));
    return isTestData;
  }).forEach(item => {
    console.log(`     '${item.id}',`);
  });
  console.log(`   );\n`);

  if (sarahCount > 0) {
    console.log(`2. ASSIGN Sarah sessions to coach (${sarahCount} items):`);
    console.log(`   - Identify coach who works with client "Sarah"`);
    console.log(`   - UPDATE data_items SET coach_id = <coach_id>, client_id = <sarah_id>`);
    console.log(`     WHERE id IN (...);`);
  }

  console.log(`\n✅ DONE\n`);
}

listOrphanedTranscripts().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
