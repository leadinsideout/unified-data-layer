/**
 * Test raw SQL query to bypass RPC and see what's happening
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testRawSQL() {
  // Get the stored chunk to test with
  const { data: storedChunk } = await supabase
    .from('transcript_chunks')
    .select('id, content, embedding')
    .eq('transcript_id', '8570747c-33e2-4be0-8051-9d355be251a1')
    .single();

  console.log('Testing with stored chunk embedding (should work)...\n');

  // Test 1: Use the exact stored embedding (this should work)
  const { data: test1, error: err1 } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: storedChunk.embedding,
      match_threshold: 0.0,
      match_count: 5
    });

  console.log(`Test 1 - Stored embedding: ${test1 ? test1.length : 0} results`);
  if (test1 && test1.length > 0) {
    console.log(`  Similarity: ${test1[0].similarity}`);
  }
  if (err1) console.error('  Error:', err1);

  // Test 2: Generate fresh embedding with rounding
  console.log('\nGenerating fresh embedding for "imposter syndrome"...\n');
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'imposter syndrome'
  });

  const embedding = response.data[0].embedding;
  const roundedEmbedding = embedding.map(val => parseFloat(val.toFixed(8)));
  const embeddingText = '[' + roundedEmbedding.join(',') + ']';

  console.log(`Embedding text length: ${embeddingText.length}`);
  console.log(`First 50 chars: ${embeddingText.substring(0, 50)}\n`);

  const { data: test2, error: err2 } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: embeddingText,
      match_threshold: -1.0,
      match_count: 10
    });

  console.log(`Test 2 - Fresh embedding (threshold -1.0): ${test2 ? test2.length : 0} results`);
  if (test2 && test2.length > 0) {
    console.log(`  Best similarity: ${test2[0].similarity}`);
  }
  if (err2) console.error('  Error:', err2);

  // Test 3: Try to manually calculate what the database sees
  console.log('\n\nTest 3 - Manual verification of vector casting...');

  // Try to get all chunks without filtering
  const { data: allChunks, error: err3 } = await supabase
    .from('transcript_chunks')
    .select('id, content, embedding')
    .eq('transcript_id', '8570747c-33e2-4be0-8051-9d355be251a1');

  if (allChunks && allChunks.length > 0) {
    console.log(`\nFound ${allChunks.length} chunks in database`);

    // Parse both embeddings
    const storedEmb = JSON.parse(allChunks[0].embedding);

    console.log(`\nStored embedding type: ${typeof storedEmb}`);
    console.log(`Stored embedding is array: ${Array.isArray(storedEmb)}`);
    console.log(`Stored embedding length: ${storedEmb.length}`);
    console.log(`Stored first 3: [${storedEmb.slice(0, 3).join(', ')}]`);

    console.log(`\nQuery embedding type: ${typeof roundedEmbedding}`);
    console.log(`Query embedding is array: ${Array.isArray(roundedEmbedding)}`);
    console.log(`Query embedding length: ${roundedEmbedding.length}`);
    console.log(`Query first 3: [${roundedEmbedding.slice(0, 3).join(', ')}]`);

    // Calculate similarity
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 1536; i++) {
      dot += storedEmb[i] * roundedEmbedding[i];
      normA += storedEmb[i] * storedEmb[i];
      normB += roundedEmbedding[i] * roundedEmbedding[i];
    }
    const cosineSim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    const distance = 1 - cosineSim;

    console.log(`\nManual cosine similarity: ${cosineSim.toFixed(8)}`);
    console.log(`Manual distance (1 - sim): ${distance.toFixed(8)}`);
    console.log(`Database should return: ${cosineSim > -1.0 ? 'YES (passes threshold -1.0)' : 'NO'}`);
  }
}

testRawSQL().catch(console.error);
