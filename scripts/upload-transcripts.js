#!/usr/bin/env node
/**
 * CLI tool for uploading transcripts to the API
 *
 * Usage:
 *   node scripts/upload-transcripts.js <file.json>
 *   node scripts/upload-transcripts.js --from-fireflies <fireflies-export.json>
 *   node scripts/upload-transcripts.js --interactive
 *
 * JSON file format:
 * [
 *   {
 *     "text": "Full transcript text...",
 *     "meeting_date": "2025-11-15T10:00:00",
 *     "metadata": {
 *       "client_name": "John Doe",
 *       "session_number": 1,
 *       "topics": ["leadership", "goal-setting"]
 *     }
 *   },
 *   ...
 * ]
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const API_URL = process.env.API_URL || 'https://unified-data-layer.vercel.app';

async function uploadTranscripts(transcripts, options = {}) {
  const { dryRun = false } = options;

  console.log('\n' + '='.repeat(60));
  console.log('📤 TRANSCRIPT UPLOAD TOOL');
  console.log('='.repeat(60));
  console.log(`API: ${API_URL}`);
  console.log(`Transcripts to upload: ${transcripts.length}`);

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No data will be uploaded\n');
    transcripts.forEach((t, i) => {
      console.log(`[${i + 1}] ${t.metadata?.session_number || 'N/A'} - ${t.meeting_date || 'No date'}`);
      console.log(`    Text length: ${t.text.length} chars`);
      console.log(`    Topics: ${t.metadata?.topics?.join(', ') || 'None'}\n`);
    });
    return;
  }

  console.log('\n');

  try {
    const response = await fetch(`${API_URL}/api/transcripts/bulk-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ transcripts })
    });

    const result = await response.json();

    console.log('\n' + '='.repeat(60));
    console.log('📊 UPLOAD RESULTS');
    console.log('='.repeat(60));
    console.log(`Total: ${result.total}`);
    console.log(`✅ Successful: ${result.successful}`);
    console.log(`❌ Failed: ${result.failed}`);

    if (result.results && result.results.length > 0) {
      console.log('\n📝 Created Transcripts:');
      result.results.forEach(r => {
        console.log(`  [${r.index + 1}] ${r.transcript_id} - ${r.chunks_created} chunks`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      result.errors.forEach(e => {
        console.log(`  [${e.index + 1}] ${e.error}`);
      });
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Upload failed:', error.message);
    process.exit(1);
  }
}

async function loadFromFile(filePath) {
  try {
    const absolutePath = resolve(filePath);
    const content = await readFile(absolutePath, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error('JSON file must contain an array of transcripts');
    }

    // Validate format
    data.forEach((item, i) => {
      if (!item.text) {
        throw new Error(`Transcript at index ${i} is missing required field: text`);
      }
    });

    return data;
  } catch (error) {
    console.error('❌ Error loading file:', error.message);
    process.exit(1);
  }
}

async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n📝 INTERACTIVE TRANSCRIPT UPLOAD\n');

  const transcripts = [];
  let addMore = true;

  while (addMore) {
    const text = await question('Transcript text (or "done" to finish): ');

    if (text.toLowerCase() === 'done') {
      addMore = false;
      break;
    }

    if (!text.trim()) {
      console.log('⚠️  Text cannot be empty\n');
      continue;
    }

    const date = await question('Meeting date (YYYY-MM-DD or enter for today): ');
    const clientName = await question('Client name (optional): ');
    const topics = await question('Topics (comma-separated, optional): ');

    const transcript = {
      text: text.trim(),
      meeting_date: date.trim() || new Date().toISOString().split('T')[0] + 'T10:00:00',
      metadata: {}
    };

    if (clientName.trim()) {
      transcript.metadata.client_name = clientName.trim();
    }

    if (topics.trim()) {
      transcript.metadata.topics = topics.split(',').map(t => t.trim());
    }

    transcripts.push(transcript);
    console.log(`✅ Transcript added (${transcripts.length} total)\n`);

    const more = await question('Add another? (y/n): ');
    addMore = more.toLowerCase() === 'y';
    console.log('');
  }

  rl.close();

  if (transcripts.length === 0) {
    console.log('No transcripts to upload.');
    process.exit(0);
  }

  const confirm = await new Promise(resolve => {
    const rl2 = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl2.question(`\nUpload ${transcripts.length} transcript(s)? (y/n): `, answer => {
      rl2.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (confirm) {
    await uploadTranscripts(transcripts);
  } else {
    console.log('Upload cancelled.');
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Usage:
  node scripts/upload-transcripts.js <file.json>         Upload from JSON file
  node scripts/upload-transcripts.js --dry-run <file>    Preview without uploading
  node scripts/upload-transcripts.js --interactive       Interactive mode
  node scripts/upload-transcripts.js --help              Show this help

JSON file format:
  [
    {
      "text": "Transcript content...",
      "meeting_date": "2025-11-15T10:00:00",  // optional
      "metadata": {                            // optional
        "client_name": "John Doe",
        "session_number": 1,
        "topics": ["leadership"]
      }
    }
  ]

Environment:
  API_URL: ${API_URL}
    `);
    process.exit(0);
  }

  if (args[0] === '--interactive' || args[0] === '-i') {
    await interactiveMode();
    return;
  }

  const dryRun = args[0] === '--dry-run';
  const filePath = dryRun ? args[1] : args[0];

  if (!filePath) {
    console.error('❌ Error: File path required');
    console.error('Usage: node scripts/upload-transcripts.js <file.json>');
    process.exit(1);
  }

  const transcripts = await loadFromFile(filePath);
  await uploadTranscripts(transcripts, { dryRun });
}

main().catch(console.error);
