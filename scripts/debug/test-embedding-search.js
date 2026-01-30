/**
 * Test embedding generation and search
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testEmbeddingSearch() {
  const testQuery = "imposter syndrome executive presence";

  console.log(`Generating embedding for: "${testQuery}"\n`);

  // Generate embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: testQuery.trim()
  });

  const embedding = response.data[0].embedding;
  console.log(`✅ Generated embedding: ${embedding.length} dimensions`);
  console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

  // Format for database (with rounding to match server.js)
  const roundedEmbedding = embedding.map(val => parseFloat(val.toFixed(8)));
  const embeddingText = '[' + roundedEmbedding.join(',') + ']';
  console.log(`   Formatted length: ${embeddingText.length} chars\n`);

  // Search with it
  console.log('Searching database...');
  const { data: results, error } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: embeddingText,
      match_threshold: 0.0,
      match_count: 10
    });

  if (error) {
    console.error('❌ Search error:', error);
    return;
  }

  console.log(`\n✅ Found ${results.length} results:\n`);
  results.forEach((result, i) => {
    console.log(`${i + 1}. Similarity: ${result.similarity.toFixed(4)}`);
    console.log(`   ${result.content.substring(0, 100)}...\n`);
  });

  // Also get the stored chunk's embedding to compare
  console.log('\n📊 Comparing with stored embeddings...');
  const { data: chunks } = await supabase
    .from('transcript_chunks')
    .select('id, content, embedding')
    .eq('transcript_id', '8570747c-33e2-4be0-8051-9d355be251a1');

  if (chunks && chunks.length > 0) {
    const storedEmbedding = JSON.parse(chunks[0].embedding);
    console.log(`\nStored embedding: ${storedEmbedding.length} dimensions`);
    console.log(`   First 5 values: [${storedEmbedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    // Calculate manual cosine similarity
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < embedding.length; i++) {
      dotProduct += embedding[i] * storedEmbedding[i];
      normA += embedding[i] * embedding[i];
      normB += storedEmbedding[i] * storedEmbedding[i];
    }
    const cosineSimilarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    console.log(`\n   Manual cosine similarity: ${cosineSimilarity.toFixed(4)}`);
  }
}

testEmbeddingSearch().catch(console.error);
