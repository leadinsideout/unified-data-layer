/**
 * Test if PostgreSQL can cast our embedding text to vector
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testVectorCast() {
  // Generate embedding
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'test'
  });

  const embedding = response.data[0].embedding;
  const roundedEmbedding = embedding.map(val => parseFloat(val.toFixed(8)));
  const embeddingText = '[' + roundedEmbedding.join(',') + ']';

  console.log('Embedding text length:', embeddingText.length);
  console.log('First 100 chars:', embeddingText.substring(0, 100));
  console.log('Last 100 chars:', embeddingText.substring(embeddingText.length - 100));

  // Try to cast it directly in a query
  console.log('\nAttempting to cast to vector type via SQL...');

  const { data, error } = await supabase.rpc('match_transcript_chunks', {
    query_embedding_text: embeddingText,
    match_threshold: -10.0,
    match_count: 1
  });

  console.log('\nRPC Result:');
  console.log('  Error:', error);
  console.log('  Data length:', data ? data.length : 0);

  if (error) {
    console.log('\n❌ Vector cast failed!');
    console.log('Error details:', JSON.stringify(error, null, 2));
  }
}

testVectorCast().catch(console.error);
