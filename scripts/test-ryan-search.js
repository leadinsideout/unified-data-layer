#!/usr/bin/env node
/**
 * Test semantic search for Ryan Vaughn's data
 * Uses service role to bypass API key auth for testing
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RYAN_COACH_ID = '9185bd98-a828-414f-b335-c607b4ac3d11';

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim()
  });
  return response.data[0].embedding;
}

function formatEmbeddingForDB(embedding) {
  return '[' + embedding.join(',') + ']';
}

async function searchRyanData(query, types = null, limit = 5) {
  console.log(`\nSearching for: "${query}"`);
  console.log(`Types: ${types || 'all'}, Limit: ${limit}`);

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  const embeddingText = formatEmbeddingForDB(queryEmbedding);

  // Call the RPC function
  const { data: chunks, error } = await supabase
    .rpc('match_data_chunks', {
      query_embedding_text: embeddingText,
      filter_types: types,
      filter_coach_id: RYAN_COACH_ID,
      match_threshold: 0.3,
      match_count: limit
    });

  if (error) {
    console.error('Search error:', error);
    return [];
  }

  return chunks;
}

async function main() {
  console.log('='.repeat(60));
  console.log('RYAN VAUGHN SEMANTIC SEARCH TEST');
  console.log('='.repeat(60));

  // Test 1: General leadership query
  console.log('\n--- TEST 1: Leadership challenges ---');
  const results1 = await searchRyanData('leadership challenges and delegation');
  console.log(`Found ${results1.length} results:`);
  for (const r of results1) {
    console.log(`  [${r.similarity?.toFixed(3)}] ${r.data_type}: ${r.content?.substring(0, 100)}...`);
  }

  // Test 2: Search transcripts only
  console.log('\n--- TEST 2: Transcripts about communication ---');
  const results2 = await searchRyanData('communication skills and feedback', ['transcript'], 5);
  console.log(`Found ${results2.length} results:`);
  for (const r of results2) {
    console.log(`  [${r.similarity?.toFixed(3)}] ${r.data_type}: ${r.content?.substring(0, 100)}...`);
  }

  // Test 3: Search assessments
  console.log('\n--- TEST 3: Assessments about goals ---');
  const results3 = await searchRyanData('coaching goals and objectives', ['assessment'], 5);
  console.log(`Found ${results3.length} results:`);
  for (const r of results3) {
    console.log(`  [${r.similarity?.toFixed(3)}] ${r.data_type}: ${r.content?.substring(0, 100)}...`);
  }

  // Test 4: Search coaching models
  console.log('\n--- TEST 4: Coaching models about 1:1 meetings ---');
  const results4 = await searchRyanData('running effective one on one meetings', ['coaching_model'], 5);
  console.log(`Found ${results4.length} results:`);
  for (const r of results4) {
    console.log(`  [${r.similarity?.toFixed(3)}] ${r.data_type}: ${r.content?.substring(0, 100)}...`);
  }

  // Test 5: Search for a specific client
  console.log('\n--- TEST 5: Sessions with Amar ---');
  const results5 = await searchRyanData('Amar coaching session discussion', ['transcript'], 5);
  console.log(`Found ${results5.length} results:`);
  for (const r of results5) {
    console.log(`  [${r.similarity?.toFixed(3)}] ${r.data_type}: ${r.content?.substring(0, 100)}...`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('SEARCH TESTS COMPLETE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
