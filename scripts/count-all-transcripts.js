/**
 * Count all transcripts by coach and source
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

const COACHES = {
  'f5fa94f1-c76b-41b6-b6ad-f8d18cfb4b39': 'Matt Thieleman',
  '60eb2263-312b-4375-8bc9-357dfc912d39': 'Jason Pliml',
  '9185bd98-a828-414f-b335-c607b4ac3d11': 'Ryan Vaughn'
};

async function getCoachTranscripts(coachId, coachName) {
  // Use the getRecentTranscripts endpoint which is designed for this
  const response = await fetch(`${API_BASE}/api/v2/transcripts/recent?limit=200&session_type=all`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (data.error) {
    console.log(`❌ Error for ${coachName}:`, data.error);
    return;
  }

  // Filter by coach
  const coachTranscripts = (data.transcripts || []).filter(t => t.coach_id === coachId);

  // Group by source
  const bySource = {};
  for (const t of coachTranscripts) {
    const source = t.metadata?.source || 'no_source';
    if (!bySource[source]) {
      bySource[source] = [];
    }
    bySource[source].push({
      title: t.title || t.metadata?.title,
      date: t.session_date,
      fireflies_id: t.metadata?.fireflies_id
    });
  }

  console.log(`\n${coachName} (${coachId}):`);
  console.log(`  Total transcripts: ${coachTranscripts.length}`);

  for (const [source, transcripts] of Object.entries(bySource)) {
    console.log(`  ${source}: ${transcripts.length}`);
    // Show first 2 examples
    for (const t of transcripts.slice(0, 2)) {
      console.log(`    - ${t.title} (${t.date?.substring(0, 10) || 'no date'})`);
      if (t.fireflies_id) console.log(`      fireflies_id: ${t.fireflies_id}`);
    }
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ALL TRANSCRIPTS BY COACH');
  console.log('═══════════════════════════════════════════════════════════');

  for (const [coachId, coachName] of Object.entries(COACHES)) {
    await getCoachTranscripts(coachId, coachName);
  }
}

main().catch(console.error);
