#!/usr/bin/env node

/**
 * Checkpoint 13: Upload Transcripts to Database
 *
 * Uploads coaching transcripts directly to data_items table
 * with proper coach_id and client_id for RLS testing.
 *
 * Uses OpenAI to generate embeddings for each transcript.
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Chunk text into smaller pieces (same logic as server.js)
function chunkText(text, maxChunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let currentChunk = [];
  let wordCount = 0;

  for (const word of words) {
    currentChunk.push(word);
    wordCount++;

    if (wordCount >= maxChunkSize) {
      chunks.push(currentChunk.join(' '));
      // Keep overlap words for next chunk
      currentChunk = currentChunk.slice(-overlap);
      wordCount = overlap;
    }
  }

  // Add remaining words as final chunk
  if (currentChunk.length > overlap || chunks.length === 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

// Generate embedding for text
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

// Upload a single transcript
async function uploadTranscript(transcript, index, total) {
  console.log(`[${index + 1}/${total}] Uploading ${transcript.clientName} - ${transcript.sessionType}...`);

  try {
    // Generate slug
    const slug = `${transcript.clientName.toLowerCase().replace(/\s+/g, '-')}-${transcript.sessionType}-${Date.now()}`;

    // Create data_item record
    const { data: dataItem, error: itemError } = await supabase
      .from('data_items')
      .insert({
        data_type: 'transcript',
        coach_id: transcript.coachId,
        client_id: transcript.clientId,
        raw_content: transcript.content,
        session_date: transcript.sessionDate,
        visibility_level: 'private',
        metadata: {
          session_type: transcript.sessionType,
          client_name: transcript.clientName,
          coach_name: transcript.coachName,
          organization: transcript.org,
          unique_marker: transcript.uniqueMarker,
          themes: transcript.themes,
          checkpoint: 'checkpoint-13'
        }
      })
      .select()
      .single();

    if (itemError) {
      throw new Error(`Failed to insert data_item: ${itemError.message}`);
    }

    // Chunk the content
    const chunks = chunkText(transcript.content);
    console.log(`  - Created ${chunks.length} chunks, generating embeddings...`);

    // Generate embeddings and insert chunks
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);

      const { error: chunkError } = await supabase
        .from('data_chunks')
        .insert({
          data_item_id: dataItem.id,
          chunk_index: i,
          content: chunks[i],
          embedding: embedding,
          metadata: {
            chunk_of: chunks.length,
            client_name: transcript.clientName,
            unique_marker: transcript.uniqueMarker
          }
        });

      if (chunkError) {
        throw new Error(`Failed to insert chunk ${i}: ${chunkError.message}`);
      }
    }

    console.log(`  ✓ Successfully uploaded with ${chunks.length} chunks`);
    return { success: true, id: dataItem.id, chunks: chunks.length };

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  console.log('='.repeat(60));
  console.log('Checkpoint 13: Multi-Tenant Transcript Upload');
  console.log('='.repeat(60));

  // Load transcripts
  const dataPath = path.join(__dirname, '..', 'data', 'checkpoint13-transcripts.json');

  if (!fs.existsSync(dataPath)) {
    console.error('Error: checkpoint13-transcripts.json not found');
    console.error('Run: node scripts/generate-checkpoint13-transcripts.js > data/checkpoint13-transcripts.json');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const transcripts = data.transcripts;

  console.log(`\nLoaded ${transcripts.length} transcripts from ${data.metadata.clientCount} clients`);
  console.log('\nUnique markers for isolation testing:');
  data.metadata.uniqueMarkers.forEach(m => {
    console.log(`  - ${m.client} (${m.coach}): ${m.marker}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log('Starting upload...\n');

  const results = {
    success: 0,
    failed: 0,
    totalChunks: 0,
    byCoach: {}
  };

  // Upload each transcript with rate limiting
  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i];
    const result = await uploadTranscript(transcript, i, transcripts.length);

    if (result.success) {
      results.success++;
      results.totalChunks += result.chunks;

      // Track by coach
      if (!results.byCoach[transcript.coachName]) {
        results.byCoach[transcript.coachName] = { transcripts: 0, chunks: 0 };
      }
      results.byCoach[transcript.coachName].transcripts++;
      results.byCoach[transcript.coachName].chunks += result.chunks;
    } else {
      results.failed++;
    }

    // Rate limiting: wait 200ms between requests to avoid OpenAI rate limits
    if (i < transcripts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Upload Complete!');
  console.log('='.repeat(60));
  console.log(`\nResults:`);
  console.log(`  ✓ Successful: ${results.success}/${transcripts.length}`);
  console.log(`  ✗ Failed: ${results.failed}`);
  console.log(`  📦 Total chunks created: ${results.totalChunks}`);

  console.log('\nBy Coach:');
  for (const [coach, stats] of Object.entries(results.byCoach)) {
    console.log(`  ${coach}: ${stats.transcripts} transcripts, ${stats.chunks} chunks`);
  }

  console.log('\n✅ Ready for multi-tenant testing!');
  console.log('\nNext steps:');
  console.log('  1. Create API keys for each coach');
  console.log('  2. Configure Custom GPTs');
  console.log('  3. Run isolation tests');
}

main().catch(console.error);
