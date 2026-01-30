/**
 * Debug transcript sources - check what metadata.source values exist
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function main() {
  const response = await fetch(`${API_BASE}/api/v2/search/filtered`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'coaching',
      types: ['transcript'],
      limit: 100
    })
  });

  const data = await response.json();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 DEBUG: TRANSCRIPT SOURCES');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (data.error) {
    console.log('Error:', data.error, data.message);
    return;
  }

  console.log('Total results:', data.results?.length || 0);
  console.log();

  // Show all unique sources
  const sources = new Set();
  for (const r of data.results || []) {
    sources.add(r.metadata?.source || 'undefined');
  }
  console.log('Unique sources found:', Array.from(sources));
  console.log();

  // Show sample metadata for each coach
  const byCoach = {};
  for (const r of data.results || []) {
    const coachId = r.coach_id || 'unknown';
    if (!byCoach[coachId]) {
      byCoach[coachId] = [];
    }
    if (byCoach[coachId].length < 3) {
      byCoach[coachId].push({
        title: r.title || r.metadata?.title,
        source: r.metadata?.source,
        synced_via: r.metadata?.synced_via,
        fireflies_id: r.metadata?.fireflies_id,
        session_date: r.session_date
      });
    }
  }

  console.log('Sample metadata by coach:');
  for (const [coachId, samples] of Object.entries(byCoach)) {
    console.log(`\nCoach ID: ${coachId}`);
    for (const s of samples) {
      console.log('  Title:', s.title);
      console.log('    source:', s.source);
      console.log('    synced_via:', s.synced_via);
      console.log('    fireflies_id:', s.fireflies_id);
      console.log('    session_date:', s.session_date);
    }
  }
}

main().catch(console.error);
