#!/usr/bin/env node
/**
 * Backfill Chunks Script
 *
 * Generates chunks and embeddings for data_items that don't have them yet.
 * This is needed when data was imported directly without going through the API.
 *
 * Usage:
 *   node scripts/backfill-chunks.js                     # Process all items without chunks
 *   node scripts/backfill-chunks.js --coach <coach_id>  # Process only a specific coach's items
 *   node scripts/backfill-chunks.js --dry-run           # Preview without making changes
 *   node scripts/backfill-chunks.js --limit 10          # Process only first N items
 *
 * Example:
 *   node scripts/backfill-chunks.js --coach 9185bd98-a828-414f-b335-c607b4ac3d11 --limit 5
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.OPENAI_API_KEY) {
  console.error('Missing required environment variables');
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
 * Chunks text into overlapping segments for embedding generation
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);

    // Move start pointer (accounting for overlap)
    start += chunkSize - overlap;

    // Prevent infinite loop
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

/**
 * Generate embedding for text using OpenAI
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
 * Convert embedding array to PostgreSQL vector format
 */
function formatEmbeddingForDB(embedding) {
  return '[' + embedding.join(',') + ']';
}

/**
 * Sleep for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// MAIN PROCESSING FUNCTIONS
// ============================================

/**
 * Find data_items that don't have any data_chunks
 */
async function findItemsWithoutChunks(coachId = null, limit = null) {
  let query = supabase
    .from('data_items')
    .select(`
      id,
      data_type,
      coach_id,
      raw_content,
      metadata
    `)
    .not('raw_content', 'is', null)
    .neq('raw_content', '');

  if (coachId) {
    query = query.eq('coach_id', coachId);
  }

  // Get all items first
  const { data: allItems, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Failed to fetch data items: ${fetchError.message}`);
  }

  // Now find which ones don't have chunks
  const itemsWithoutChunks = [];

  for (const item of allItems) {
    const { count, error: countError } = await supabase
      .from('data_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('data_item_id', item.id);

    if (countError) {
      console.error(`Error checking chunks for ${item.id}: ${countError.message}`);
      continue;
    }

    if (count === 0) {
      itemsWithoutChunks.push(item);
    }
  }

  // Apply limit if specified
  if (limit && itemsWithoutChunks.length > limit) {
    return itemsWithoutChunks.slice(0, limit);
  }

  return itemsWithoutChunks;
}

/**
 * Process a single data_item - create chunks and embeddings
 */
async function processDataItem(item) {
  const startTime = Date.now();

  // Chunk the raw content
  const chunks = chunkText(item.raw_content);

  if (chunks.length === 0) {
    return {
      success: true,
      itemId: item.id,
      chunksCreated: 0,
      message: 'No content to chunk',
      timeMs: Date.now() - startTime
    };
  }

  // Generate embeddings and prepare chunk records
  const chunkRecords = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        data_item_id: item.id,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding),
        metadata: {
          data_type: item.data_type,
          title: item.metadata?.title || null
        }
      });

      // Rate limiting - small delay between embeddings
      if (i < chunks.length - 1) {
        await sleep(50);
      }
    } catch (error) {
      return {
        success: false,
        itemId: item.id,
        chunksCreated: 0,
        message: `Failed at chunk ${i}: ${error.message}`,
        timeMs: Date.now() - startTime
      };
    }
  }

  // Batch insert chunks
  const { error: insertError } = await supabase
    .from('data_chunks')
    .insert(chunkRecords);

  if (insertError) {
    return {
      success: false,
      itemId: item.id,
      chunksCreated: 0,
      message: `Failed to insert chunks: ${insertError.message}`,
      timeMs: Date.now() - startTime
    };
  }

  return {
    success: true,
    itemId: item.id,
    chunksCreated: chunks.length,
    message: 'OK',
    timeMs: Date.now() - startTime
  };
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let coachId = null;
  let limit = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--coach' && args[i + 1]) {
      coachId = args[i + 1];
      i++;
    }
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL CHUNKS SCRIPT');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Coach filter: ${coachId || 'ALL coaches'}`);
  console.log(`Limit: ${limit || 'No limit'}`);
  console.log('='.repeat(60) + '\n');

  // Find items without chunks
  console.log('Finding data_items without chunks...');
  const itemsToProcess = await findItemsWithoutChunks(coachId, limit);

  console.log(`Found ${itemsToProcess.length} items needing chunks\n`);

  if (itemsToProcess.length === 0) {
    console.log('No items to process. All data_items have chunks.');
    return;
  }

  // Group by data_type for reporting
  const byType = {};
  for (const item of itemsToProcess) {
    byType[item.data_type] = (byType[item.data_type] || 0) + 1;
  }
  console.log('By data type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - Would process these items:');
    for (const item of itemsToProcess.slice(0, 10)) {
      const title = item.metadata?.title || item.id;
      const contentLen = item.raw_content?.length || 0;
      const estimatedChunks = Math.ceil(contentLen / 2500); // ~500 words * 5 chars/word
      console.log(`  [${item.data_type}] ${title.substring(0, 50)}... (~${estimatedChunks} chunks)`);
    }
    if (itemsToProcess.length > 10) {
      console.log(`  ... and ${itemsToProcess.length - 10} more`);
    }

    // Estimate costs
    const totalChars = itemsToProcess.reduce((sum, item) => sum + (item.raw_content?.length || 0), 0);
    const estimatedTokens = totalChars / 4; // Rough estimate
    const estimatedCost = (estimatedTokens / 1000000) * 0.02; // $0.02 per 1M tokens for embedding
    console.log(`\nEstimated embedding cost: $${estimatedCost.toFixed(2)}`);
    console.log('Run without --dry-run to process\n');
    return;
  }

  // Process each item
  console.log('Processing items...\n');
  let successful = 0;
  let failed = 0;
  let totalChunks = 0;
  const startTime = Date.now();

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const title = item.metadata?.title || item.id;

    process.stdout.write(`[${i + 1}/${itemsToProcess.length}] ${title.substring(0, 40)}... `);

    const result = await processDataItem(item);

    if (result.success) {
      successful++;
      totalChunks += result.chunksCreated;
      console.log(`${result.chunksCreated} chunks (${result.timeMs}ms)`);
    } else {
      failed++;
      console.log(`FAILED: ${result.message}`);
    }

    // Progress update every 10 items
    if ((i + 1) % 10 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (i + 1) / elapsed;
      const remaining = (itemsToProcess.length - i - 1) / rate;
      console.log(`  Progress: ${i + 1}/${itemsToProcess.length} | Rate: ${rate.toFixed(1)}/s | ETA: ${Math.ceil(remaining)}s`);
    }

    // Small delay between items for rate limiting
    await sleep(100);
  }

  // Final report
  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  console.log(`Items processed: ${successful + failed}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total chunks created: ${totalChunks}`);
  console.log(`Total time: ${totalTime.toFixed(1)}s`);
  console.log(`Average: ${(totalTime / (successful + failed)).toFixed(2)}s per item`);
  console.log('='.repeat(60) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
