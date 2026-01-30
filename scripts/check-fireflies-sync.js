/**
 * Check Fireflies Sync Status for Matt and Jason
 *
 * Verifies if their transcripts are being auto-synced from Fireflies
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

const MATT_COACH_ID = 'f5fa94f1-c76b-41b6-b6ad-f8d18cfb4b39';
const JASON_COACH_ID = '60eb2263-312b-4375-8bc9-357dfc912d39';
const RYAN_COACH_ID = '9185bd98-a828-414f-b335-c607b4ac3d11';

async function searchTranscripts(coachName, coachId) {
  const response = await fetch(`${API_BASE}/api/v2/search/filtered`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'coaching session',
      types: ['transcript'],
      limit: 100
    })
  });

  const data = await response.json();

  if (data.error) {
    console.log(`❌ Error for ${coachName}:`, data.error, data.message);
    return { fireflies: 0, word_import: 0, other: 0, total: 0 };
  }

  // Filter by coach and count by source
  const coachResults = (data.results || []).filter(r => r.coach_id === coachId);

  let fireflies = 0;
  let word_import = 0;
  let other = 0;
  const fireflyTitles = [];

  for (const r of coachResults) {
    const source = r.metadata?.source || 'unknown';
    if (source === 'fireflies') {
      fireflies++;
      fireflyTitles.push({
        title: r.title || r.metadata?.title,
        date: r.session_date,
        synced_via: r.metadata?.synced_via
      });
    } else if (source === 'word_import') {
      word_import++;
    } else {
      other++;
    }
  }

  return {
    fireflies,
    word_import,
    other,
    total: coachResults.length,
    fireflyTitles: fireflyTitles.slice(0, 5)
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 FIREFLIES SYNC STATUS CHECK');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Check Ryan (should have many Fireflies transcripts)
  console.log('🔍 Ryan Vaughn (reference - should have Fireflies data)');
  const ryan = await searchTranscripts('Ryan', RYAN_COACH_ID);
  console.log(`   Fireflies transcripts: ${ryan.fireflies}`);
  console.log(`   Word imports: ${ryan.word_import}`);
  console.log(`   Other: ${ryan.other}`);
  console.log(`   Total: ${ryan.total}`);
  if (ryan.fireflyTitles.length > 0) {
    console.log('   Recent Fireflies transcripts:');
    ryan.fireflyTitles.forEach(t => {
      console.log(`     - ${t.title} (${t.date}) [${t.synced_via || 'unknown'}]`);
    });
  }
  console.log();

  // Check Matt
  console.log('🔍 Matt Thieleman');
  const matt = await searchTranscripts('Matt', MATT_COACH_ID);
  console.log(`   Fireflies transcripts: ${matt.fireflies}`);
  console.log(`   Word imports: ${matt.word_import}`);
  console.log(`   Other: ${matt.other}`);
  console.log(`   Total: ${matt.total}`);
  if (matt.fireflies > 0) {
    console.log('   ✅ Fireflies sync is WORKING!');
    matt.fireflyTitles.forEach(t => {
      console.log(`     - ${t.title} (${t.date})`);
    });
  } else {
    console.log('   ⚠️  No Fireflies transcripts found yet');
    console.log('   This could mean:');
    console.log('     1. Matt hasn\'t had any Fireflies meetings in the last 7 days');
    console.log('     2. His email doesn\'t match (check Fireflies account email)');
    console.log('     3. His meetings are "Only Me" private (need admin API key)');
  }
  console.log();

  // Check Jason
  console.log('🔍 Jason Pliml');
  const jason = await searchTranscripts('Jason', JASON_COACH_ID);
  console.log(`   Fireflies transcripts: ${jason.fireflies}`);
  console.log(`   Word imports: ${jason.word_import}`);
  console.log(`   Other: ${jason.other}`);
  console.log(`   Total: ${jason.total}`);
  if (jason.fireflies > 0) {
    console.log('   ✅ Fireflies sync is WORKING!');
    jason.fireflyTitles.forEach(t => {
      console.log(`     - ${t.title} (${t.date})`);
    });
  } else {
    console.log('   ⚠️  No Fireflies transcripts found yet');
    console.log('   This could mean:');
    console.log('     1. Jason hasn\'t had any Fireflies meetings in the last 7 days');
    console.log('     2. His email doesn\'t match (check Fireflies account email)');
    console.log('     3. His meetings are "Only Me" private (need admin API key)');
  }
  console.log();

  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (matt.fireflies > 0 && jason.fireflies > 0) {
    console.log('✅ SUCCESS! Both Matt and Jason have Fireflies transcripts syncing.');
    console.log('   The auto-sync pipeline is working correctly.');
  } else if (matt.fireflies === 0 && jason.fireflies === 0) {
    console.log('⏳ PENDING: No Fireflies transcripts found for Matt or Jason yet.');
    console.log('   Wait for their next Fireflies meetings, or check:');
    console.log('   1. Their Fireflies email matches @leadinsideout.io');
    console.log('   2. They have had meetings in the last 7 days');
    console.log('   3. Their meetings are not "Only Me" private');
  } else {
    if (matt.fireflies > 0) console.log('✅ Matt: Fireflies sync working');
    else console.log('⏳ Matt: No Fireflies transcripts yet');
    if (jason.fireflies > 0) console.log('✅ Jason: Fireflies sync working');
    else console.log('⏳ Jason: No Fireflies transcripts yet');
  }

  console.log();
  console.log('Note: Word imports (from manual upload) are separate from Fireflies auto-sync.');
  console.log('The manual imports we did earlier don\'t affect the auto-sync pipeline.');
}

main().catch(console.error);
