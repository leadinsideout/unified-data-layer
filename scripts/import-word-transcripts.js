/**
 * Import Word Transcripts Script
 *
 * Parses .docx transcript files from Matt Thieleman and Jason Pliml,
 * extracts text, matches to clients, and uploads to the database.
 *
 * Usage:
 *   node scripts/import-word-transcripts.js [--dry-run]
 *
 * Prerequisites:
 *   - Admin API key in .env as ADMIN_API_KEY
 *   - Coach and client records created in database
 */

import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!ADMIN_API_KEY) {
  console.error('❌ ADMIN_API_KEY not found in environment variables');
  process.exit(1);
}

// Coach IDs (will be fetched dynamically)
let MATT_COACH_ID = null;
let JASON_COACH_ID = null;

// Client caches (will be populated)
const MATT_CLIENTS = [];
const JASON_CLIENTS = [];

// ============================================
// API HELPER FUNCTIONS
// ============================================

async function apiRequest(method, endpoint, body = null, retries = 3) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 5000; // 5s, 10s, 20s
        console.log(`   ⏳ Rate limited. Waiting ${waitTime/1000}s before retry ${attempt + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${data.error} - ${data.message}`);
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }
  }
}

// ============================================
// SETUP FUNCTIONS
// ============================================

async function setup() {
  console.log('\n📋 Setup: Fetching coach and client data...\n');

  // Get all users
  const users = await apiRequest('GET', '/api/admin/users');

  // Find coaches
  const matt = users.coaches.find(c => c.email === 'matt@leadinsideout.io');
  const jason = users.coaches.find(c => c.email === 'jason@leadinsideout.io');

  if (!matt || !jason) {
    throw new Error('Could not find Matt or Jason in database');
  }

  MATT_COACH_ID = matt.id;
  JASON_COACH_ID = jason.id;

  console.log(`✅ Matt Thieleman: ${MATT_COACH_ID}`);
  console.log(`✅ Jason Pliml: ${JASON_COACH_ID}\n`);

  // Get clients for each coach
  const mattClientsResp = await apiRequest('GET', `/api/admin/coaches/${MATT_COACH_ID}/clients`);
  const jasonClientsResp = await apiRequest('GET', `/api/admin/coaches/${JASON_COACH_ID}/clients`);

  MATT_CLIENTS.push(...(mattClientsResp.clients || []));
  JASON_CLIENTS.push(...(jasonClientsResp.clients || []));

  console.log(`✅ Matt's clients loaded: ${MATT_CLIENTS.length}`);
  console.log(`✅ Jason's clients loaded: ${JASON_CLIENTS.length}\n`);
}

// ============================================
// PARSING FUNCTIONS
// ============================================

function parseFilename(filename) {
  // Extract ISO timestamp (YYYY-MM-DDTHH-MM-SS.MMMZ)
  const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2})T\d{2}-\d{2}-\d{2}\.\d{3}Z/);
  const sessionDate = timestampMatch ? timestampMatch[1] : null;

  // Determine coach and extract client name
  let clientName, coachName, coachId, clients;

  if (filename.includes('Matt')) {
    // Matt's formats:
    // "Brian F- Matt Coaching-transcript-2025-07-31..."
    // "Matt - Lindsay L-Coaching Call-transcript-2025-..."
    // "Discuss about Justin-s Exit with Matt-transcript-..."

    if (filename.startsWith('Matt -')) {
      // Format: "Matt - Client Name-..."
      const parts = filename.replace(/^Matt - /i, '').split('-transcript')[0].split('-Coaching')[0].split('- Next Steps')[0].split('- Coaching')[0].trim();
      clientName = parts.trim();
    } else {
      // Format: "Client - Matt..." or "Discuss about... with Matt..."
      const parts = filename.split(/- Matt|with Matt/i);
      if (parts.length > 0) {
        let extracted = parts[0].replace(/^Discuss about /i, '').replace(/-s /g, '\'s ').trim();

        // Handle "Justin's Exit" → extract just "Justin"
        if (extracted.includes('\'s ')) {
          extracted = extracted.split('\'s ')[0];
        }

        // Handle multi-client sessions (take first name only)
        if (extracted.includes(' - ')) {
          extracted = extracted.split(' - ')[0];
        }

        clientName = extracted.trim();
      }
    }
    coachName = 'Matt';
    coachId = MATT_COACH_ID;
    clients = MATT_CLIENTS;
  } else if (filename.includes('Jason')) {
    // Jason's formats:
    // "Copy of Alex-Jason session-transcript-2025-06-24..."
    // "Copy of Phyl x Jason session-transcript-2026-01-20..."
    // "Copy of Heath O_Leary and Jason Pliml-transcript-2026-01-13..."
    // "Copy of Jason-Liang session-transcript-2025-07-11..."
    // "Copy of Alex - Jason-transcript-2025-12-11..."
    // Remove "Copy of" prefix (handle multiple occurrences)
    let cleaned = filename.replace(/^(Copy of )+/gi, '').trim();

    // Try different separators (order matters - check "Client [sep] Jason" formats FIRST)
    if (cleaned.includes(' and Jason Pliml')) {
      // "Client and Jason Pliml" format
      clientName = cleaned.split(' and Jason Pliml')[0].trim();
    } else if (cleaned.includes(' - Jason')) {
      // "Client - Jason" format (handles both "- Jason-transcript" and "- Jason ")
      clientName = cleaned.split(' - Jason')[0].trim();
    } else if (cleaned.includes(' x Jason')) {
      // "Client x Jason" format (handles both " x Jason-transcript" and " x Jason ")
      clientName = cleaned.split(' x Jason')[0].trim();
    } else if (cleaned.includes('_ Jason')) {
      // "Client _ Jason" format (handles both "_ Jason-transcript" and "_ Jason ")
      clientName = cleaned.split('_ Jason')[0].trim();
    } else if (cleaned.includes('-Jason ')) {
      // "Client-Jason " format (with space after Jason)
      clientName = cleaned.split('-Jason ')[0].trim();
    } else if (cleaned.includes('Jason-')) {
      // "Jason-Client" format (check this LAST to avoid false positives)
      clientName = cleaned.split('Jason-')[1].split('-transcript')[0].split(' session')[0].trim();
    }

    // Fix underscores in names (Heath O_Leary → Heath O'Leary)
    if (clientName) {
      clientName = clientName.replace(/_/g, '\'');

      // Handle "Alexander" → "Alex" (first name matching)
      if (clientName.toLowerCase().includes('alexander')) {
        clientName = 'Alex';
      }

      // Handle "Phyllip" or "Phyl" → "Phyllip Hall"
      if (clientName.toLowerCase() === 'phyllip' || clientName.toLowerCase() === 'phyl') {
        clientName = 'Phyllip Hall';
      }
    }

    coachName = 'Jason';
    coachId = JASON_COACH_ID;
    clients = JASON_CLIENTS;
  } else {
    return { clientName: null, coachName: null, coachId: null, sessionDate, error: 'Unknown coach' };
  }

  return { clientName, coachName, coachId, sessionDate, clients };
}

function matchClient(clientName, clients) {
  if (!clientName || !clients || clients.length === 0) {
    return null;
  }

  // Normalize search term
  const searchTerm = clientName.toLowerCase().trim();

  // Try exact match first
  let match = clients.find(c => c.name.toLowerCase() === searchTerm);
  if (match) return match;

  // Try fuzzy match (each part of search term starts a part of the name)
  const searchParts = searchTerm.split(/[\s-]+/);
  match = clients.find(c => {
    const nameParts = c.name.toLowerCase().split(/[\s-]+/);
    return searchParts.every(searchPart =>
      nameParts.some(namePart => namePart.startsWith(searchPart))
    );
  });

  return match || null;
}

async function extractText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

// ============================================
// UPLOAD FUNCTION
// ============================================

async function uploadTranscript(data) {
  const response = await apiRequest('POST', '/api/data/upload', {
    content: data.text,
    data_type: 'transcript',
    metadata: {
      ...data.metadata,
      coach_id: data.coach_id,
      client_id: data.client_id,
      session_date: data.session_date
    }
  });

  return response;
}

// ============================================
// PROCESSING FUNCTION
// ============================================

async function processTranscript(filePath, filename) {
  // Parse filename
  const { clientName, coachName, coachId, sessionDate, clients, error } = parseFilename(filename);

  if (error) {
    return {
      filename,
      status: 'error',
      error,
      clientName: null,
      client: null,
      sessionDate,
      wordCount: 0
    };
  }

  // Match client
  const client = matchClient(clientName, clients);

  // Extract text
  const text = await extractText(filePath);
  const wordCount = text.split(/\s+/).length;

  // Build metadata
  const metadata = {
    title: `${clientName} - ${coachName} Coaching`,
    source: 'word_import',
    original_filename: filename,
    session_type: 'regular'  // Valid options: regular, intake, closure, check-in
  };

  return {
    filename,
    status: client ? 'ready' : 'unmatched',
    clientName,
    client,
    coachName,
    coachId,
    sessionDate,
    text,
    wordCount,
    metadata
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📄 IMPORT WORD TRANSCRIPTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No uploads will be performed\n');
  }

  // Setup
  await setup();

  const mattDir = '/Users/jjvega/Downloads/Matt Thieleman/Transcripts';
  const jasonDir = '/Users/jjvega/Downloads/Jason Pliml/Transcripts';

  // ============================================
  // PROCESS MATT'S TRANSCRIPTS
  // ============================================
  console.log('\n🎯 Processing Matt Thieleman Transcripts');
  console.log('─────────────────────────────────────\n');

  const mattFiles = fs.readdirSync(mattDir).filter(f => f.endsWith('.docx'));
  const mattResults = [];

  for (const file of mattFiles) {
    const filePath = path.join(mattDir, file);
    console.log(`📄 ${file}`);

    try {
      const result = await processTranscript(filePath, file);
      mattResults.push(result);

      if (result.status === 'ready') {
        console.log(`   ✅ Client: ${result.client.name} (${result.client.email})`);
        console.log(`   📅 Date: ${result.sessionDate}`);
        console.log(`   📝 Words: ${result.wordCount.toLocaleString()}`);

        if (!DRY_RUN) {
          const uploadResult = await uploadTranscript({
            text: result.text,
            coach_id: result.coachId,
            client_id: result.client.id,
            session_date: result.sessionDate,
            metadata: result.metadata
          });
          console.log(`   🆔 Data Item: ${uploadResult.data_item_id}`);

          // Add delay to avoid rate limiting (1 second between uploads)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else if (result.status === 'unmatched') {
        console.log(`   ⚠️  Could not match client: "${result.clientName}"`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error processing: ${error.message}`);
      mattResults.push({ filename: file, status: 'error', error: error.message });
    }

    console.log('');
  }

  // ============================================
  // PROCESS JASON'S TRANSCRIPTS
  // ============================================
  console.log('\n🎯 Processing Jason Pliml Transcripts');
  console.log('─────────────────────────────────────\n');

  const jasonFiles = fs.readdirSync(jasonDir).filter(f => f.endsWith('.docx'));
  const jasonResults = [];

  for (const file of jasonFiles) {
    const filePath = path.join(jasonDir, file);
    console.log(`📄 ${file}`);

    try {
      const result = await processTranscript(filePath, file);
      jasonResults.push(result);

      if (result.status === 'ready') {
        console.log(`   ✅ Client: ${result.client.name} (${result.client.email})`);
        console.log(`   📅 Date: ${result.sessionDate}`);
        console.log(`   📝 Words: ${result.wordCount.toLocaleString()}`);

        if (!DRY_RUN) {
          const uploadResult = await uploadTranscript({
            text: result.text,
            coach_id: result.coachId,
            client_id: result.client.id,
            session_date: result.sessionDate,
            metadata: result.metadata
          });
          console.log(`   🆔 Data Item: ${uploadResult.data_item_id}`);

          // Add delay to avoid rate limiting (1 second between uploads)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } else if (result.status === 'unmatched') {
        console.log(`   ⚠️  Could not match client: "${result.clientName}"`);
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`   ❌ Error processing: ${error.message}`);
      jasonResults.push({ filename: file, status: 'error', error: error.message });
    }

    console.log('');
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mattReady = mattResults.filter(r => r.status === 'ready').length;
  const mattUnmatched = mattResults.filter(r => r.status === 'unmatched').length;
  const mattErrors = mattResults.filter(r => r.status === 'error').length;

  const jasonReady = jasonResults.filter(r => r.status === 'ready').length;
  const jasonUnmatched = jasonResults.filter(r => r.status === 'unmatched').length;
  const jasonErrors = jasonResults.filter(r => r.status === 'error').length;

  console.log('Matt Thieleman:');
  console.log(`  ✅ Ready: ${mattReady}/${mattFiles.length}`);
  if (mattUnmatched > 0) console.log(`  ⚠️  Unmatched: ${mattUnmatched}`);
  if (mattErrors > 0) console.log(`  ❌ Errors: ${mattErrors}`);

  console.log('\nJason Pliml:');
  console.log(`  ✅ Ready: ${jasonReady}/${jasonFiles.length}`);
  if (jasonUnmatched > 0) console.log(`  ⚠️  Unmatched: ${jasonUnmatched}`);
  if (jasonErrors > 0) console.log(`  ❌ Errors: ${jasonErrors}`);

  console.log(`\n📈 Total: ${mattReady + jasonReady}/${mattFiles.length + jasonFiles.length} transcripts processed`);

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN COMPLETE - No data was uploaded');
  } else {
    console.log('\n✅ IMPORT COMPLETE');
  }

  // List unmatched files
  const allUnmatched = [
    ...mattResults.filter(r => r.status === 'unmatched'),
    ...jasonResults.filter(r => r.status === 'unmatched')
  ];

  if (allUnmatched.length > 0) {
    console.log('\n⚠️  UNMATCHED TRANSCRIPTS (manual linking required):');
    allUnmatched.forEach(r => {
      console.log(`  - ${r.filename}`);
      console.log(`    Client name extracted: "${r.clientName}"`);
    });
  }

  console.log('');
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
