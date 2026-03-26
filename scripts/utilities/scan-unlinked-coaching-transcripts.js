#!/usr/bin/env node

/**
 * Comprehensive Coaching Transcript Audit
 *
 * Scans ALL transcripts in the database and generates a report of:
 * 1. Confirmed coaching sessions missing client links
 * 2. Likely coaching sessions (2 speakers, name patterns)
 * 3. Possible/unclear sessions that may be coaching
 *
 * Results sorted by delivering coach with proposed linking actions.
 *
 * Usage: node scripts/utilities/scan-unlinked-coaching-transcripts.js
 * Output: data/coaching-audit-report.json + console summary
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── Title Patterns (from propose-client-matches.js) ───────────────────────

const TITLE_PATTERNS = [
  /^([^<>]+)\s*<>\s*([^<>]+)$/,            // "Client <> Coach"
  /^([^&]+)\s+and\s+([^&]+?)(?:\s+Session)?$/i,  // "Client and Coach"
  /^([^&]+)\s*&\s*([^&]+?)(?:\s+Session)?$/i,    // "Client & Coach"
  /^([^-]+)\s*-\s*([^-]+)$/,               // "Coach - Client"
];

// ─── Non-coaching title keywords (from detectSessionType in fireflies.js) ──

const INTERNAL_MEETING_KEYWORDS = [
  'io co-creation', 'io-co-creation', 'io ai meeting', 'io ai ',
  'io vision', 'new fs thing', 'e7 ', 'e7-', 'coach ai', 'coachgpt',
  'retro call', 'retro meeting', 'retro for', 'strategic framework',
  'align on', 'touch base', 'discuss bamboo', 'structure on embedding',
  'operating system', 'service delivery', 'proposal review', 'copiloting',
  'collab chat'
];

const STAFF_1ON1_KEYWORDS = [
  'ryan - jem', 'jem -', 'harry - ryan', 'harry-ryan',
  'derek-ryan', 'derek - ryan', 'scott - ryan', 'scott-ryan',
  'santi and ryan', 'ryan - santi', 'pranab'
];

const TRAINING_KEYWORDS = [
  'hakomi', 'facilitator', 'pef ', 'training', 'office hours'
];

const SALES_KEYWORDS = [
  'fit call', 'fit-call', 'i-o fit', 'io fit', 'coach matching'
];

const PERSONAL_DEV_KEYWORDS = ['amita', 'ifs '];

const COACHING_CONTENT_SIGNALS = [
  'coaching session', 'how are you feeling', 'what\'s been on your mind',
  'between now and next', 'accountability', 'what goals', 'action items',
  'what do you want to focus on', 'what are you noticing', 'check-in',
  'let\'s start with', 'homework', 'follow up from last'
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function parseMeta(metadata) {
  if (typeof metadata === 'string') return JSON.parse(metadata);
  return metadata || {};
}

/**
 * Check if a title matches non-coaching patterns
 */
function isNonCoachingTitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();

  for (const kw of INTERNAL_MEETING_KEYWORDS) {
    if (t.includes(kw)) return 'internal_meeting';
  }
  // Special case: hampton + moderator
  if (t.includes('hampton') && t.includes('moderator')) return 'internal_meeting';

  for (const kw of STAFF_1ON1_KEYWORDS) {
    if (t.includes(kw)) return 'staff_1on1';
  }
  // Special case: "jem" alone (common staff name)
  if (t.includes('jem')) return 'staff_1on1';

  for (const kw of TRAINING_KEYWORDS) {
    if (t.includes(kw)) return 'training';
  }
  for (const kw of SALES_KEYWORDS) {
    if (t.includes(kw)) return 'sales_call';
  }
  for (const kw of PERSONAL_DEV_KEYWORDS) {
    if (t.includes(kw)) return 'personal_development';
  }

  // 360 interviews
  if (t.includes('360') && (t.includes('interview') || t.includes('review'))) {
    return '360_interview';
  }
  // Other coach sessions
  if (t.includes('andrea-jason') || t.includes('andrea - jason')) {
    return 'other_coach_session';
  }

  return false;
}

/**
 * Extract potential client name from meeting title
 * (Adapted from propose-client-matches.js)
 */
function extractClientName(title, coachName) {
  if (!title) return null;

  const coachLower = coachName?.toLowerCase() || '';
  const coachFirstName = coachLower.split(' ')[0];

  // Build coach keywords dynamically from actual coach name
  const coachKeywords = [coachLower, coachFirstName, 'coaching', 'session', 'call', 'meeting', 'biweekly', 'bi-weekly'];

  for (const pattern of TITLE_PATTERNS) {
    const match = title.match(pattern);
    if (match) {
      const [, name1, name2] = match;
      const candidates = [name1.trim(), name2.trim()];

      for (const candidate of candidates) {
        const candidateLower = candidate.toLowerCase();
        const hasCoachKeyword = coachKeywords.some(kw =>
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
 * Fuzzy match a name against existing clients
 * (Adapted from propose-client-matches.js)
 */
function fuzzyMatchClients(extractedName, existingClients) {
  if (!extractedName) return [];
  const nameLower = extractedName.toLowerCase().trim();
  const matches = [];

  for (const client of existingClients) {
    const clientNameLower = (client.name || '').toLowerCase();
    let confidence = 0;

    if (clientNameLower === nameLower) {
      confidence = 1.0;
    } else if (clientNameLower.includes(nameLower) || nameLower.includes(clientNameLower)) {
      confidence = 0.8;
    } else {
      const extractedParts = nameLower.split(/\s+/);
      const clientParts = clientNameLower.split(/\s+/);
      const commonParts = extractedParts.filter(part =>
        clientParts.some(cp => cp === part)
      );
      if (commonParts.length > 0) {
        confidence = commonParts.length / Math.max(extractedParts.length, clientParts.length);
      }
    }

    if (confidence > 0) {
      matches.push({ client, confidence, matchType: confidence === 1.0 ? 'exact' : confidence >= 0.8 ? 'high' : 'medium' });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extract client emails from transcript metadata, excluding coach email
 */
function extractClientEmails(meta, coachEmail) {
  const emails = [];
  const coachLower = coachEmail?.toLowerCase();

  if (Array.isArray(meta.attendee_emails)) {
    for (const e of meta.attendee_emails) {
      if (e && e.toLowerCase() !== coachLower && !emails.includes(e.toLowerCase())) {
        emails.push(e.toLowerCase());
      }
    }
  }

  // Also check meeting_attendees (Fireflies format)
  if (Array.isArray(meta.meeting_attendees)) {
    for (const att of meta.meeting_attendees) {
      const e = att.email?.toLowerCase();
      if (e && e !== coachLower && !emails.includes(e)) {
        emails.push(e);
      }
    }
  }

  if (meta.organizer_email) {
    const e = meta.organizer_email.toLowerCase();
    if (e !== coachLower && !emails.includes(e)) emails.push(e);
  }
  if (meta.host_email) {
    const e = meta.host_email.toLowerCase();
    if (e !== coachLower && !emails.includes(e)) emails.push(e);
  }

  // Filter out known non-client emails
  const excludePatterns = ['noreply', 'no-reply', 'fireflies', 'calendar', 'zoom'];
  return emails.filter(e => !excludePatterns.some(p => e.includes(p)));
}

// ─── Classification Engine ──────────────────────────────────────────────────

function classifyTranscript(item, coachMap, coachNames) {
  const meta = parseMeta(item.metadata);
  const sessionType = meta.session_type;
  const title = meta.title || '';
  const coach = coachMap[item.coach_id];

  // Heuristic 1: Session type is definitive for confirmed coaching types
  if (sessionType === 'client_coaching' || sessionType === 'unmatched_client') {
    return {
      classification: 'coaching_unlinked',
      reason: `session_type=${sessionType}`
    };
  }

  // Heuristic 2: Check if title matches known non-coaching patterns
  const nonCoachingType = isNonCoachingTitle(title);
  if (nonCoachingType) {
    return {
      classification: 'non_coaching',
      reason: `title matched ${nonCoachingType} pattern`
    };
  }

  // Also trust session_type if it was explicitly set to a non-coaching value
  const NON_COACHING_TYPES = ['internal_meeting', 'staff_1on1', 'training', 'sales_call',
    'personal_development', '360_interview', 'other_coach_session', 'networking'];
  if (NON_COACHING_TYPES.includes(sessionType)) {
    return {
      classification: 'non_coaching',
      reason: `session_type=${sessionType}`
    };
  }

  // Heuristic 3: Speaker count — 2 speakers with one being the coach suggests coaching
  const speakers = meta.speakers || [];
  const speakerNames = speakers.map(s => (s.name || '').toLowerCase());
  const coachNameLower = coach?.name?.toLowerCase() || '';
  const coachFirstName = coachNameLower.split(' ')[0];

  if (speakers.length === 2) {
    const coachIsSpeaker = speakerNames.some(n =>
      n.includes(coachFirstName) || coachNameLower.includes(n)
    );
    if (coachIsSpeaker) {
      return {
        classification: 'likely_coaching',
        reason: `2 speakers, one matches coach "${coach?.name}"`
      };
    }
  }

  // Heuristic 4: Title contains a name pair (Client - Coach pattern)
  const extractedName = extractClientName(title, coach?.name);
  if (extractedName) {
    return {
      classification: 'likely_coaching',
      reason: `title contains name pair, extracted: "${extractedName}"`
    };
  }

  // Heuristic 5: Content keyword scan (first 1000 chars)
  const contentPreview = (item.raw_content || '').substring(0, 1000).toLowerCase();
  const hitSignals = COACHING_CONTENT_SIGNALS.filter(signal =>
    contentPreview.includes(signal)
  );
  if (hitSignals.length >= 2) {
    return {
      classification: 'possible_coaching',
      reason: `${hitSignals.length} coaching content signals: ${hitSignals.join(', ')}`
    };
  }

  // Heuristic 6: 2 speakers but couldn't confirm coach is one of them
  if (speakers.length === 2) {
    return {
      classification: 'possible_coaching',
      reason: '2 speakers but coach name not confirmed in speaker list'
    };
  }

  // Default
  return {
    classification: 'unclear',
    reason: `session_type=${sessionType || 'null'}, ${speakers.length} speakers, no matching patterns`
  };
}

// ─── Linking Analysis ───────────────────────────────────────────────────────

function analyzeLinking(item, coach, clientByEmail, allClients) {
  const meta = parseMeta(item.metadata);

  // Strategy 1: Email-based match
  const clientEmails = extractClientEmails(meta, coach?.email);
  for (const email of clientEmails) {
    const matchedClient = clientByEmail[email];
    if (matchedClient) {
      return {
        action: 'link_existing',
        confidence: 'high',
        method: 'email_match',
        proposed_client_id: matchedClient.id,
        proposed_client_name: matchedClient.name,
        proposed_client_email: matchedClient.email,
        alternative_matches: []
      };
    }
  }

  // Strategy 2: Title-based name extraction + fuzzy match
  const extractedName = extractClientName(meta.title, coach?.name);
  if (extractedName) {
    const fuzzyMatches = fuzzyMatchClients(extractedName, allClients);
    if (fuzzyMatches.length > 0 && fuzzyMatches[0].confidence >= 0.7) {
      const best = fuzzyMatches[0];
      return {
        action: 'link_existing',
        confidence: 'medium',
        method: 'name_fuzzy',
        proposed_client_id: best.client.id,
        proposed_client_name: best.client.name,
        proposed_client_email: best.client.email,
        extracted_name: extractedName,
        match_score: Math.round(best.confidence * 100),
        alternative_matches: fuzzyMatches.slice(1, 3).map(m => ({
          client_name: m.client.name,
          client_email: m.client.email,
          score: Math.round(m.confidence * 100)
        }))
      };
    }
  }

  // Strategy 3: Unmatched email exists — propose new client creation
  if (clientEmails.length > 0) {
    return {
      action: 'create_new_client',
      confidence: 'medium',
      method: 'email_unmatched',
      proposed_email: clientEmails[0],
      all_unmatched_emails: clientEmails,
      extracted_name: extractedName || null
    };
  }

  // No signals
  return {
    action: 'manual_review',
    confidence: 'low',
    method: 'no_signals',
    extracted_name: extractedName || null
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE COACHING TRANSCRIPT AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Load support data
  console.log('Loading coaches...');
  const { data: coaches, error: coachErr } = await supabase
    .from('coaches')
    .select('id, name, email');
  if (coachErr) throw new Error(`Failed to load coaches: ${coachErr.message}`);

  const coachMap = {};
  const coachNames = [];
  for (const c of coaches) {
    coachMap[c.id] = c;
    coachNames.push(c.name.toLowerCase());
  }
  console.log(`  Found ${coaches.length} coaches: ${coaches.map(c => c.name).join(', ')}\n`);

  console.log('Loading clients...');
  const { data: allClients, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, email, primary_coach_id');
  if (clientErr) throw new Error(`Failed to load clients: ${clientErr.message}`);

  const clientByEmail = {};
  for (const c of allClients) {
    if (c.email) clientByEmail[c.email.toLowerCase()] = c;
  }
  console.log(`  Found ${allClients.length} clients\n`);

  // Population 1+2: All transcripts with coach but no client
  console.log('Querying unlinked transcripts (coach assigned, no client)...');
  const { data: unlinkedWithCoach, error: err1 } = await supabase
    .from('data_items')
    .select('id, data_type, coach_id, client_id, metadata, session_date, raw_content, created_at')
    .eq('data_type', 'transcript')
    .not('coach_id', 'is', null)
    .is('client_id', null)
    .order('session_date', { ascending: false, nullsFirst: false });
  if (err1) throw new Error(`Query failed: ${err1.message}`);
  console.log(`  Found ${unlinkedWithCoach.length} transcripts with coach but no client\n`);

  // Population 3: Fully orphaned transcripts
  console.log('Querying fully orphaned transcripts...');
  const { data: orphaned, error: err2 } = await supabase
    .from('data_items')
    .select('id, data_type, coach_id, client_id, metadata, session_date, raw_content, created_at')
    .eq('data_type', 'transcript')
    .is('coach_id', null)
    .is('client_id', null)
    .order('created_at', { ascending: false });
  if (err2) throw new Error(`Query failed: ${err2.message}`);
  console.log(`  Found ${orphaned.length} fully orphaned transcripts\n`);

  // Also get total transcript count for context
  const { count: totalCount } = await supabase
    .from('data_items')
    .select('id', { count: 'exact', head: true })
    .eq('data_type', 'transcript');

  const { count: linkedCount } = await supabase
    .from('data_items')
    .select('id', { count: 'exact', head: true })
    .eq('data_type', 'transcript')
    .not('client_id', 'is', null);

  console.log(`  Total transcripts in database: ${totalCount}`);
  console.log(`  Already linked to clients: ${linkedCount}`);
  console.log(`  Missing client link: ${totalCount - linkedCount}\n`);

  // ─── Classify all transcripts ───────────────────────────────────────────

  console.log('Classifying transcripts...\n');

  const classified = [];
  const nonCoachingExcluded = [];

  // Process unlinked-with-coach transcripts
  for (const item of unlinkedWithCoach) {
    const meta = parseMeta(item.metadata);
    const coach = coachMap[item.coach_id];
    const result = classifyTranscript(item, coachMap, coachNames);

    if (result.classification === 'non_coaching') {
      nonCoachingExcluded.push({
        id: item.id,
        title: meta.title || 'Untitled',
        coach_name: coach?.name || 'Unknown',
        session_type: meta.session_type,
        excluded_reason: result.reason
      });
      continue;
    }

    const linking = analyzeLinking(item, coach, clientByEmail, allClients);

    classified.push({
      id: item.id,
      session_date: item.session_date,
      created_at: item.created_at,
      title: meta.title || 'Untitled',
      coach_name: coach?.name || 'Unknown',
      coach_id: item.coach_id,
      coach_email: coach?.email,
      session_type: meta.session_type || null,
      source: meta.source || 'unknown',
      classification: result.classification,
      classification_reason: result.reason,
      speaker_count: (meta.speakers || []).length,
      speakers: (meta.speakers || []).map(s => s.name),
      attendee_emails: extractClientEmails(meta, coach?.email),
      duration_seconds: meta.duration_seconds || null,
      transcript_url: meta.transcript_url || null,
      linking
    });
  }

  // Process fully orphaned transcripts
  for (const item of orphaned) {
    const meta = parseMeta(item.metadata);

    // Try to identify if it's coaching
    const title = meta.title || '';
    const nonCoachingType = isNonCoachingTitle(title);
    if (nonCoachingType) {
      nonCoachingExcluded.push({
        id: item.id,
        title: title || 'Untitled',
        coach_name: 'NONE (orphaned)',
        session_type: meta.session_type,
        excluded_reason: `orphaned, title matched ${nonCoachingType}`
      });
      continue;
    }

    // Check speaker count for coaching signal
    const speakers = meta.speakers || [];
    let classification = 'unclear';
    let reason = `orphaned (no coach/client), ${speakers.length} speakers`;

    if (speakers.length === 2) {
      // Check if either speaker name matches a known coach
      for (const coach of coaches) {
        const coachFirst = coach.name.toLowerCase().split(' ')[0];
        const speakerNames = speakers.map(s => (s.name || '').toLowerCase());
        if (speakerNames.some(n => n.includes(coachFirst))) {
          classification = 'possible_coaching';
          reason = `orphaned, 2 speakers, one may be coach "${coach.name}"`;
          break;
        }
      }
    }

    classified.push({
      id: item.id,
      session_date: item.session_date,
      created_at: item.created_at,
      title: title || 'Untitled',
      coach_name: 'NONE (orphaned)',
      coach_id: null,
      coach_email: null,
      session_type: meta.session_type || null,
      source: meta.source || 'unknown',
      classification,
      classification_reason: reason,
      speaker_count: speakers.length,
      speakers: speakers.map(s => s.name),
      attendee_emails: extractClientEmails(meta, null),
      duration_seconds: meta.duration_seconds || null,
      transcript_url: meta.transcript_url || null,
      linking: { action: 'manual_review', confidence: 'low', method: 'orphaned' }
    });
  }

  // ─── Group by coach ─────────────────────────────────────────────────────

  const byCoach = {};
  for (const t of classified) {
    const key = t.coach_name;
    if (!byCoach[key]) {
      byCoach[key] = { coach_id: t.coach_id, coach_email: t.coach_email, total: 0, transcripts: [] };
    }
    byCoach[key].total++;
    byCoach[key].transcripts.push(t);
  }
  // Sort each coach's transcripts by session_date descending
  for (const group of Object.values(byCoach)) {
    group.transcripts.sort((a, b) =>
      (b.session_date || b.created_at || '').localeCompare(a.session_date || a.created_at || '')
    );
  }

  // ─── Build summary ──────────────────────────────────────────────────────

  const summary = {
    total_transcripts_in_db: totalCount,
    already_linked: linkedCount,
    total_scanned_unlinked: unlinkedWithCoach.length + orphaned.length,
    coaching_unlinked: classified.filter(t => t.classification === 'coaching_unlinked').length,
    likely_coaching: classified.filter(t => t.classification === 'likely_coaching').length,
    possible_coaching: classified.filter(t => t.classification === 'possible_coaching').length,
    unclear: classified.filter(t => t.classification === 'unclear').length,
    non_coaching_excluded: nonCoachingExcluded.length,
    link_actions: {
      can_link_high_confidence: classified.filter(t => t.linking.action === 'link_existing' && t.linking.confidence === 'high').length,
      can_link_medium_confidence: classified.filter(t => t.linking.action === 'link_existing' && t.linking.confidence === 'medium').length,
      need_new_client: classified.filter(t => t.linking.action === 'create_new_client').length,
      need_manual_review: classified.filter(t => t.linking.action === 'manual_review').length
    }
  };

  // Unique new client emails
  const newClientEmails = {};
  classified.filter(t => t.linking.action === 'create_new_client').forEach(t => {
    const email = t.linking.proposed_email;
    if (!newClientEmails[email]) newClientEmails[email] = { email, count: 0, coaches: new Set(), sample_titles: [] };
    newClientEmails[email].count++;
    newClientEmails[email].coaches.add(t.coach_name);
    if (newClientEmails[email].sample_titles.length < 3) {
      newClientEmails[email].sample_titles.push(t.title);
    }
  });

  const newClientsNeeded = Object.values(newClientEmails).map(e => ({
    ...e,
    coaches: [...e.coaches]
  }));

  const manualReviewQueue = classified.filter(t => t.linking.action === 'manual_review');

  // ─── Console Output ─────────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  AUDIT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Total transcripts in DB:        ${summary.total_transcripts_in_db}`);
  console.log(`  Already linked to clients:      ${summary.already_linked}`);
  console.log(`  Scanned (unlinked):             ${summary.total_scanned_unlinked}`);
  console.log(`  Non-coaching (excluded):        ${summary.non_coaching_excluded}\n`);

  console.log('  CLASSIFICATION BREAKDOWN:');
  console.log(`    Coaching (confirmed unlinked): ${summary.coaching_unlinked}`);
  console.log(`    Likely coaching:               ${summary.likely_coaching}`);
  console.log(`    Possible coaching:             ${summary.possible_coaching}`);
  console.log(`    Unclear:                       ${summary.unclear}\n`);

  console.log('  PROPOSED ACTIONS:');
  console.log(`    Can link now (high confidence): ${summary.link_actions.can_link_high_confidence}`);
  console.log(`    Can link (medium confidence):   ${summary.link_actions.can_link_medium_confidence}`);
  console.log(`    Need new client created:        ${summary.link_actions.need_new_client}`);
  console.log(`    Need manual review:             ${summary.link_actions.need_manual_review}\n`);

  // Per-coach details
  const coachOrder = Object.keys(byCoach).sort();
  for (const coachName of coachOrder) {
    const group = byCoach[coachName];
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  COACH: ${coachName} (${group.total} unlinked sessions)`);
    console.log('───────────────────────────────────────────────────────────────\n');

    for (const t of group.transcripts) {
      const date = (t.session_date || t.created_at || '').substring(0, 10);
      const classIcon = {
        coaching_unlinked: 'COACHING',
        likely_coaching: 'LIKELY  ',
        possible_coaching: 'POSSIBLE',
        unclear: 'UNCLEAR '
      }[t.classification] || 'UNKNOWN ';

      const actionIcon = {
        link_existing: t.linking.confidence === 'high' ? 'LINK-HI' : 'LINK-MED',
        create_new_client: 'NEW-CLI',
        manual_review: 'REVIEW '
      }[t.linking.action] || '???    ';

      console.log(`  [${classIcon}] [${actionIcon}] ${date}  ${t.title}`);

      if (t.linking.action === 'link_existing') {
        console.log(`           -> ${t.linking.proposed_client_name} (${t.linking.proposed_client_email}) [${t.linking.method}]`);
      } else if (t.linking.action === 'create_new_client') {
        console.log(`           -> New client: ${t.linking.proposed_email}${t.linking.extracted_name ? ` (name: "${t.linking.extracted_name}")` : ''}`);
      } else {
        console.log(`           -> ${t.classification_reason}`);
      }

      if (t.speakers.length > 0) {
        console.log(`           speakers: ${t.speakers.join(', ')}`);
      }
      console.log();
    }
  }

  // Non-coaching excluded summary
  if (nonCoachingExcluded.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  NON-COACHING EXCLUDED (${nonCoachingExcluded.length} transcripts)`);
    console.log('───────────────────────────────────────────────────────────────\n');

    for (const t of nonCoachingExcluded.slice(0, 20)) {
      console.log(`  [EXCLUDED] ${t.title}  (${t.coach_name}) — ${t.excluded_reason}`);
    }
    if (nonCoachingExcluded.length > 20) {
      console.log(`  ... and ${nonCoachingExcluded.length - 20} more\n`);
    }
    console.log();
  }

  // New clients needed summary
  if (newClientsNeeded.length > 0) {
    console.log('───────────────────────────────────────────────────────────────');
    console.log(`  NEW CLIENTS NEEDED (${newClientsNeeded.length} unique emails)`);
    console.log('───────────────────────────────────────────────────────────────\n');

    for (const nc of newClientsNeeded) {
      console.log(`  ${nc.email} — ${nc.count} transcripts (coach: ${nc.coaches.join(', ')})`);
      nc.sample_titles.forEach(t => console.log(`    - ${t}`));
      console.log();
    }
  }

  // ─── Write JSON report ──────────────────────────────────────────────────

  const report = {
    generated_at: new Date().toISOString(),
    summary,
    by_coach: byCoach,
    all_transcripts: classified,
    non_coaching_excluded: nonCoachingExcluded,
    new_clients_needed: newClientsNeeded,
    manual_review_queue: manualReviewQueue
  };

  const reportPath = 'data/coaching-audit-report.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n  Report saved to: ${reportPath}\n`);
  console.log('  AUDIT COMPLETE\n');
}

main().catch(err => {
  console.error('\nError:', err.message);
  console.error(err.stack);
  process.exit(1);
});
