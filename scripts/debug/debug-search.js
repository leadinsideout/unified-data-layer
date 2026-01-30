/**
 * Debug the search function to see what's happening
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function debugSearch() {
  console.log('=== DEBUGGING SEARCH ISSUE ===\n');

  // Step 1: Get the stored chunk
  console.log('Step 1: Fetching stored chunk...');
  const { data: storedChunk } = await supabase
    .from('transcript_chunks')
    .select('id, content, embedding')
    .eq('transcript_id', '8570747c-33e2-4be0-8051-9d355be251a1')
    .single();

  console.log(`  Chunk ID: ${storedChunk.id}`);
  console.log(`  Content preview: ${storedChunk.content.substring(0, 60)}...`);
  const storedEmbedding = JSON.parse(storedChunk.embedding);
  console.log(`  Embedding dimensions: ${storedEmbedding.length}`);
  console.log(`  First 3 values: [${storedEmbedding.slice(0, 3).join(', ')}]\n`);

  // Step 2: Generate query embedding
  console.log('Step 2: Generating query embedding...');
  const query = "imposter syndrome";
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  const queryEmbedding = response.data[0].embedding;
  console.log(`  Query: "${query}"`);
  console.log(`  Embedding dimensions: ${queryEmbedding.length}`);
  console.log(`  First 3 values: [${queryEmbedding.slice(0, 3).join(', ')}]\n`);

  // Step 3: Format embedding for database (with rounding to match storage precision)
  console.log('Step 3: Formatting embedding for database...');
  const roundedEmbedding = queryEmbedding.map(val => parseFloat(val.toFixed(8)));
  const embeddingText = '[' + roundedEmbedding.join(',') + ']';
  console.log(`  Formatted string length: ${embeddingText.length} chars`);
  console.log(`  Preview: ${embeddingText.substring(0, 50)}...\n`);

  // Step 4: Test direct RPC call with different thresholds
  console.log('Step 4: Testing RPC with various thresholds...\n');

  for (const threshold of [-1.0, 0.0, 0.3, 0.5, 0.7]) {
    const { data: results, error } = await supabase
      .rpc('match_transcript_chunks', {
        query_embedding_text: embeddingText,
        match_threshold: threshold,
        match_count: 5
      });

    if (error) {
      console.log(`  Threshold ${threshold}: ERROR - ${error.message}`);
    } else {
      console.log(`  Threshold ${threshold}: ${results.length} results`);
      if (results.length > 0) {
        const sim = results[0].similarity;
        console.log(`    Best match similarity: ${sim.toFixed(4)}`);
      }
    }
  }

  // Step 5: Manual similarity calculation (using rounded query embedding)
  console.log('\nStep 5: Manual cosine similarity calculation...');
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 1536; i++) {
    dotProduct += roundedEmbedding[i] * storedEmbedding[i];
    normA += roundedEmbedding[i] * roundedEmbedding[i];
    normB += storedEmbedding[i] * storedEmbedding[i];
  }
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  console.log(`  Cosine similarity: ${similarity.toFixed(4)}`);
  console.log(`  Distance (1 - similarity): ${(1 - similarity).toFixed(4)}`);

  // Step 6: Test with the EXACT stored embedding (should return 1.0)
  console.log('\nStep 6: Testing with exact stored embedding (should be perfect match)...');
  const { data: exactResults, error: exactError } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: storedChunk.embedding,
      match_threshold: 0.0,
      match_count: 5
    });

  if (exactError) {
    console.log(`  ERROR: ${exactError.message}`);
  } else {
    console.log(`  Results: ${exactResults.length}`);
    if (exactResults.length > 0) {
      const exactSim = exactResults[0].similarity;
      console.log(`  Similarity: ${exactSim.toFixed(4)} (should be 1.0000)`);
    }
  }
}

debugSearch().catch(console.error);
