#!/usr/bin/env node

/**
 * Propose Client Matches from Meeting Titles
 *
 * Extracts client names from meeting titles and matches against existing clients
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Common coaching session patterns
const TITLE_PATTERNS = [
  // "Client <> Coach" or "Coach <> Client"
  /^([^<>]+)\s*<>\s*([^<>]+)$/,

  // "Client and Coach Session" or "Coach and Client Session"
  /^([^&]+)\s+and\s+([^&]+?)(?:\s+Session)?$/i,

  // "Client & Coach" or "Coach & Client"
  /^([^&]+)\s*&\s*([^&]+?)(?:\s+Session)?$/i,

  // "Coach - Client"
  /^([^-]+)\s*-\s*([^-]+)$/,
];

// Known coach names/patterns to filter out
const COACH_KEYWORDS = [
  'ryan', 'vaughn', 'ryan vaughn',
  'jj', 'vega', 'jj vega',
  'coaching', 'session', 'call', 'meeting'
];

/**
 * Extract potential client name from meeting title
 */
function extractClientName(title, coachName) {
  if (!title) return null;

  const titleLower = title.toLowerCase();
  const coachLower = coachName?.toLowerCase() || '';

  // Try each pattern
  for (const pattern of TITLE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const [, name1, name2] = match;

      // Filter out the coach name
      const candidates = [name1.trim(), name2.trim()];
      for (const candidate of candidates) {
        const candidateLower = candidate.toLowerCase();

        // Skip if it contains coach keywords
        const hasCoachKeyword = COACH_KEYWORDS.some(kw =>
          candidateLower.includes(kw)
        );

        if (!hasCoachKeyword && candidateLower !== coachLower) {
          return candidate;
        }
      }
    }
  }

  return null;
}

/**
 * Fuzzy match client name against existing clients
 * Returns array of matches with confidence scores
 */
function fuzzyMatchClients(extractedName, existingClients) {
  if (!extractedName) return [];

  const matches = [];
  const nameLower = extractedName.toLowerCase();

  for (const client of existingClients) {
    const clientNameLower = client.name?.toLowerCase() || '';
    const clientEmailLower = client.email?.toLowerCase() || '';

    let confidence = 0;

    // Exact match
    if (clientNameLower === nameLower) {
      confidence = 1.0;
    }
    // Contains match
    else if (clientNameLower.includes(nameLower) || nameLower.includes(clientNameLower)) {
      confidence = 0.8;
    }
    // First/last name match
    else {
      const extractedParts = nameLower.split(/\s+/);
      const clientParts = clientNameLower.split(/\s+/);

      const commonParts = extractedParts.filter(part =>
        clientParts.some(cp => cp === part)
      );

      if (commonParts.length > 0) {
        confidence = commonParts.length / Math.max(extractedParts.length, clientParts.length);
      }
    }

    // Email domain match (if email in extracted name)
    if (extractedName.includes('@')) {
      const extractedEmail = extractedName.toLowerCase();
      if (clientEmailLower === extractedEmail) {
        confidence = 1.0;
      }
    }

    if (confidence > 0) {
      matches.push({
        client,
        confidence,
        matchType: confidence === 1.0 ? 'exact' : confidence >= 0.8 ? 'high' : 'medium'
      });
    }
  }

  // Sort by confidence (highest first)
  return matches.sort((a, b) => b.confidence - a.confidence);
}

async function proposeClientMatches() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 PROPOSING CLIENT MATCHES FROM MEETING TITLES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // 1. Get all unlinked transcripts (coach assigned but no client)
  const { data: unlinked, error: unlinkedError } = await supabase
    .from('data_items')
    .select('id, data_type, metadata, coach_id')
    .not('coach_id', 'is', null)
    .is('client_id', null)
    .eq('data_type', 'transcript')
    .order('created_at', { ascending: false });

  if (unlinkedError) {
    console.error('❌ Error fetching unlinked transcripts:', unlinkedError.message);
    process.exit(1);
  }

  console.log(`📊 Found ${unlinked.length} unlinked transcripts\n`);

  // 2. Get all coaches
  const { data: coaches, error: coachesError } = await supabase
    .from('coaches')
    .select('id, name, email');

  if (coachesError) {
    console.error('❌ Error fetching coaches:', coachesError.message);
    process.exit(1);
  }

  // Create coach lookup
  const coachById = {};
  coaches.forEach(c => {
    coachById[c.id] = c;
  });

  // 3. Get all existing clients
  const { data: existingClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, email, primary_coach_id');

  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError.message);
    process.exit(1);
  }

  console.log(`👥 Found ${existingClients.length} existing clients\n`);

  // 4. Analyze each unlinked transcript
  const proposals = [];
  const needNewClient = [];
  const noMatch = [];

  for (const item of unlinked) {
    const meta = typeof item.metadata === 'string'
      ? JSON.parse(item.metadata)
      : item.metadata;

    const coach = coachById[item.coach_id];
    const title = meta?.title || 'Untitled';

    // Extract potential client name from title
    const extractedName = extractClientName(title, coach?.name);

    if (!extractedName) {
      noMatch.push({
        transcriptId: item.id,
        title,
        coach: coach?.name,
        reason: 'Could not extract client name from title'
      });
      continue;
    }

    // Fuzzy match against existing clients
    const matches = fuzzyMatchClients(extractedName, existingClients);

    if (matches.length > 0 && matches[0].confidence >= 0.7) {
      // High confidence match found
      proposals.push({
        transcriptId: item.id,
        title,
        coach: coach?.name,
        extractedName,
        match: matches[0],
        alternativeMatches: matches.slice(1, 3) // Top 2 alternatives
      });
    } else {
      // No good match - propose creating new client
      needNewClient.push({
        transcriptId: item.id,
        title,
        coach: coach?.name,
        coachId: coach?.id,
        extractedName,
        lowConfidenceMatches: matches.filter(m => m.confidence < 0.7)
      });
    }
  }

  // 5. Output proposals
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ HIGH CONFIDENCE MATCHES (Can Link Immediately)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Found ${proposals.length} transcripts with high-confidence matches\n`);

  // Group by coach
  const byCoach = {};
  proposals.forEach(p => {
    if (!byCoach[p.coach]) byCoach[p.coach] = [];
    byCoach[p.coach].push(p);
  });

  for (const [coachName, items] of Object.entries(byCoach)) {
    console.log(`\n👤 Coach: ${coachName}`);
    console.log(`   Matched transcripts: ${items.length}\n`);

    items.slice(0, 10).forEach((item, idx) => {
      console.log(`   ${idx + 1}. "${item.title}"`);
      console.log(`      Extracted: "${item.extractedName}"`);
      console.log(`      ✅ Match: ${item.match.client.name} (${item.match.matchType}, ${Math.round(item.match.confidence * 100)}% confidence)`);
      console.log(`      Client ID: ${item.match.client.id}`);
      console.log(`      Transcript ID: ${item.transcriptId.slice(0, 8)}...`);

      if (item.alternativeMatches.length > 0) {
        console.log(`      Alternatives:`);
        item.alternativeMatches.forEach(alt => {
          console.log(`        - ${alt.client.name} (${Math.round(alt.confidence * 100)}%)`);
        });
      }
      console.log();
    });

    if (items.length > 10) {
      console.log(`   ... and ${items.length - 10} more\n`);
    }
  }

  // 6. Output new client proposals
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  NEED NEW CLIENT CREATION (No Good Match Found)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Found ${needNewClient.length} transcripts needing new clients\n`);

  const byCoachNew = {};
  needNewClient.forEach(p => {
    if (!byCoachNew[p.coach]) byCoachNew[p.coach] = [];
    byCoachNew[p.coach].push(p);
  });

  for (const [coachName, items] of Object.entries(byCoachNew)) {
    console.log(`\n👤 Coach: ${coachName}`);
    console.log(`   New clients needed: ${items.length}\n`);

    // Group by extracted name to avoid duplicates
    const byName = {};
    items.forEach(item => {
      const nameLower = item.extractedName.toLowerCase();
      if (!byName[nameLower]) {
        byName[nameLower] = {
          extractedName: item.extractedName,
          coachId: item.coachId,
          transcripts: []
        };
      }
      byName[nameLower].transcripts.push(item);
    });

    Object.values(byName).forEach((group, idx) => {
      console.log(`   ${idx + 1}. Proposed new client: "${group.extractedName}"`);
      console.log(`      Transcripts: ${group.transcripts.length}`);
      console.log(`      Sample titles:`);
      group.transcripts.slice(0, 3).forEach(t => {
        console.log(`        - "${t.title}"`);
      });
      if (group.transcripts.length > 3) {
        console.log(`        ... and ${group.transcripts.length - 3} more`);
      }
      console.log();
    });
  }

  // 7. Output no-match cases
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('❌ COULD NOT EXTRACT CLIENT NAME (Manual Review Needed)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Found ${noMatch.length} transcripts with unclear client names\n`);

  noMatch.slice(0, 10).forEach((item, idx) => {
    console.log(`${idx + 1}. "${item.title}"`);
    console.log(`   Coach: ${item.coach}`);
    console.log(`   Reason: ${item.reason}`);
    console.log(`   Transcript ID: ${item.transcriptId.slice(0, 8)}...`);
    console.log();
  });

  if (noMatch.length > 10) {
    console.log(`... and ${noMatch.length - 10} more\n`);
  }

  // 8. Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY & RECOMMENDED ACTIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`✅ Can link immediately: ${proposals.length} transcripts`);
  console.log(`   (High confidence matches with existing clients)\n`);

  console.log(`⚠️  Need new client creation: ${needNewClient.length} transcripts`);
  console.log(`   (Client name extracted but no matching client in DB)\n`);

  console.log(`❌ Need manual review: ${noMatch.length} transcripts`);
  console.log(`   (Could not extract client name from title)\n`);

  // Count unique new clients needed
  const uniqueNewClients = new Set();
  needNewClient.forEach(item => {
    uniqueNewClients.add(item.extractedName.toLowerCase());
  });

  console.log(`\n💡 PROPOSED ACTIONS:\n`);

  console.log(`1. AUTO-LINK ${proposals.length} transcripts to existing clients`);
  console.log(`   - Use UPDATE query with transcript_id → client_id mapping\n`);

  console.log(`2. CREATE ${uniqueNewClients.size} new client records`);
  console.log(`   - Extract name from meeting title`);
  console.log(`   - Set primary_coach_id to transcript's coach_id`);
  console.log(`   - Link associated transcripts\n`);

  console.log(`3. MANUAL REVIEW ${noMatch.length} unclear transcripts`);
  console.log(`   - Review meeting titles and content`);
  console.log(`   - Manually assign correct client\n`);

  console.log('\n✅ ANALYSIS COMPLETE\n');

  // Write results to JSON for processing
  const results = {
    timestamp: new Date().toISOString(),
    summary: {
      total: unlinked.length,
      canLinkImmediately: proposals.length,
      needNewClient: needNewClient.length,
      uniqueNewClients: uniqueNewClients.size,
      needManualReview: noMatch.length
    },
    proposals,
    needNewClient,
    noMatch
  };

  const fs = await import('fs');
  fs.writeFileSync(
    'CLIENT_MATCH_PROPOSALS.json',
    JSON.stringify(results, null, 2)
  );

  console.log('💾 Full results saved to: CLIENT_MATCH_PROPOSALS.json\n');
}

proposeClientMatches().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
