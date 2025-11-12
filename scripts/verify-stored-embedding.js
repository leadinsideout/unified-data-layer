/**
 * Verify that stored embedding matches stored text
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function verifyStoredEmbedding() {
  // Get the stored chunk text
  const { data: chunk } = await supabase
    .from('transcript_chunks')
    .select('content, embedding')
    .eq('transcript_id', '8570747c-33e2-4be0-8051-9d355be251a1')
    .single();

  console.log('Stored chunk text:');
  console.log(chunk.content);
  console.log('\n' + '='.repeat(80) + '\n');

  const storedEmbedding = JSON.parse(chunk.embedding);
  console.log('Stored embedding first 5: [' + storedEmbedding.slice(0, 5).join(', ') + ']');

  // Generate embedding for the EXACT same text
  console.log('\nGenerating embedding for the EXACT same text...\n');
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunk.content
  });

  const newEmbedding = response.data[0].embedding;
  console.log('New embedding first 5: [' + newEmbedding.slice(0, 5).join(', ') + ']');

  // Compare
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 1536; i++) {
    dotProduct += storedEmbedding[i] * newEmbedding[i];
    normA += storedEmbedding[i] * storedEmbedding[i];
    normB += newEmbedding[i] * newEmbedding[i];
  }
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  console.log('\nCosine similarity: ' + similarity.toFixed(8));

  if (similarity < 0.99) {
    console.log('\n⚠️  WARNING: Embeddings are VERY DIFFERENT!');
    console.log('This suggests the stored embedding was NOT generated from the stored text.');
  } else if (similarity > 0.9999) {
    console.log('\n✅ Embeddings match! The stored embedding was generated from the stored text.');
  }
}

verifyStoredEmbedding().catch(console.error);
