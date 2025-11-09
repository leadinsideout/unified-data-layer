/**
 * Embedding Generation Script
 *
 * Generates embeddings for transcript chunks that don't have them yet.
 * Can also re-generate embeddings for specific transcripts.
 *
 * Usage:
 *   node scripts/embed.js                    # Process all transcripts without embeddings
 *   node scripts/embed.js <transcript-id>    # Process specific transcript
 *   node scripts/embed.js --all              # Re-process ALL transcripts (destructive)
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure SUPABASE_URL, SUPABASE_SERVICE_KEY, and OPENAI_API_KEY are set in .env');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Chunks text into overlapping segments
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);

    start += chunkSize - overlap;
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim()
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    throw error;
  }
}

/**
 * Format embedding for PostgreSQL
 */
function formatEmbeddingForDB(embedding) {
  return '[' + embedding.join(',') + ']';
}

// ============================================
// PROCESSING FUNCTIONS
// ============================================

/**
 * Process a single transcript
 */
async function processTranscript(transcriptId) {
  console.log(`\nProcessing transcript: ${transcriptId}`);

  // Fetch transcript
  const { data: transcript, error: fetchError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single();

  if (fetchError || !transcript) {
    console.error('❌ Transcript not found');
    return false;
  }

  console.log(`  Meeting date: ${transcript.meeting_date}`);
  console.log(`  Text length: ${transcript.raw_text.length} characters`);

  // Chunk the text
  const chunks = chunkText(transcript.raw_text);
  console.log(`  Created ${chunks.length} chunks`);

  // Delete existing chunks (if re-processing)
  const { error: deleteError } = await supabase
    .from('transcript_chunks')
    .delete()
    .eq('transcript_id', transcriptId);

  if (deleteError) {
    console.error('  ❌ Failed to delete old chunks:', deleteError.message);
    return false;
  }

  // Generate embeddings and save chunks
  const chunkRecords = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`\r  Generating embeddings... ${i + 1}/${chunks.length}`);

    try {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        transcript_id: transcriptId,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding)
      });
    } catch (error) {
      console.error(`\n  ❌ Failed to generate embedding for chunk ${i}`);
      return false;
    }
  }

  console.log(''); // New line after progress

  // Batch insert chunks
  const { error: insertError } = await supabase
    .from('transcript_chunks')
    .insert(chunkRecords);

  if (insertError) {
    console.error('  ❌ Failed to save chunks:', insertError.message);
    return false;
  }

  console.log(`  ✅ Successfully processed ${chunks.length} chunks`);
  return true;
}

/**
 * Find transcripts without embeddings
 */
async function findTranscriptsWithoutEmbeddings() {
  const { data: transcripts, error } = await supabase
    .from('transcripts')
    .select('id');

  if (error) {
    console.error('❌ Failed to fetch transcripts:', error.message);
    return [];
  }

  const transcriptsWithoutEmbeddings = [];

  for (const transcript of transcripts) {
    const { data: chunks } = await supabase
      .from('transcript_chunks')
      .select('id')
      .eq('transcript_id', transcript.id)
      .limit(1);

    if (!chunks || chunks.length === 0) {
      transcriptsWithoutEmbeddings.push(transcript.id);
    }
  }

  return transcriptsWithoutEmbeddings;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🔄 Embedding Generation Script');
  console.log('='.repeat(50));

  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      // Mode 1: Process transcripts without embeddings
      console.log('\n📋 Finding transcripts without embeddings...\n');

      const transcriptIds = await findTranscriptsWithoutEmbeddings();

      if (transcriptIds.length === 0) {
        console.log('✅ All transcripts already have embeddings');
        return;
      }

      console.log(`Found ${transcriptIds.length} transcript(s) to process\n`);

      let successCount = 0;
      for (const id of transcriptIds) {
        const success = await processTranscript(id);
        if (success) successCount++;
      }

      console.log('\n' + '='.repeat(50));
      console.log(`✅ Processed ${successCount}/${transcriptIds.length} transcripts`);
      console.log('='.repeat(50) + '\n');

    } else if (args[0] === '--all') {
      // Mode 2: Re-process all transcripts (destructive)
      console.log('\n⚠️  WARNING: Re-processing ALL transcripts (destructive)');
      console.log('This will delete and regenerate all embeddings\n');

      const { data: transcripts, error } = await supabase
        .from('transcripts')
        .select('id');

      if (error) {
        console.error('❌ Failed to fetch transcripts:', error.message);
        process.exit(1);
      }

      console.log(`Found ${transcripts.length} transcript(s) to re-process\n`);

      let successCount = 0;
      for (const transcript of transcripts) {
        const success = await processTranscript(transcript.id);
        if (success) successCount++;
      }

      console.log('\n' + '='.repeat(50));
      console.log(`✅ Re-processed ${successCount}/${transcripts.length} transcripts`);
      console.log('='.repeat(50) + '\n');

    } else {
      // Mode 3: Process specific transcript
      const transcriptId = args[0];

      console.log(`\n🎯 Processing specific transcript: ${transcriptId}\n`);

      const success = await processTranscript(transcriptId);

      console.log('\n' + '='.repeat(50));
      if (success) {
        console.log('✅ Transcript processed successfully');
      } else {
        console.log('❌ Failed to process transcript');
        process.exit(1);
      }
      console.log('='.repeat(50) + '\n');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
