/**
 * Compare stored vs fresh embeddings to find the mismatch
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function compareEmbeddings() {
  // Get stored chunk
  const { data: chunk } = await supabase
    .from('transcript_chunks')
    .select('*')
    .limit(1)
    .single();

  const storedEmbedding = JSON.parse(chunk.embedding);
  console.log('Stored embedding from database:');
  console.log(`  Dimensions: ${storedEmbedding.length}`);
  console.log(`  First 5: [${storedEmbedding.slice(0, 5).join(', ')}]`);
  console.log(`  Text length: ${chunk.embedding.length} chars\n`);

  // Generate fresh embedding for the same content
  console.log('Generating fresh embedding for same content...');
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunk.content.trim()
  });

  const freshEmbedding = response.data[0].embedding;
  console.log(`  Dimensions: ${freshEmbedding.length}`);
  console.log(`  First 5: [${freshEmbedding.slice(0, 5).join(', ')}]\n`);

  // Round the fresh embedding
  const roundedFresh = freshEmbedding.map(val => parseFloat(val.toFixed(8)));
  console.log('Rounded fresh embedding:');
  console.log(`  First 5: [${roundedFresh.slice(0, 5).join(', ')}]\n`);

  // Calculate similarity between stored and fresh (rounded)
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 1536; i++) {
    dotProduct += storedEmbedding[i] * roundedFresh[i];
    normA += storedEmbedding[i] * storedEmbedding[i];
    normB += roundedFresh[i] * roundedFresh[i];
  }
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  console.log(`Cosine similarity: ${similarity.toFixed(6)}`);
  console.log(`Should be ~1.0 since it's the same content\n`);

  // Test searching with the fresh rounded embedding
  const embeddingText = '[' + roundedFresh.join(',') + ']';
  console.log(`Testing search with fresh embedding...`);
  console.log(`  Formatted text length: ${embeddingText.length} chars`);

  const { data: results, error } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: embeddingText,
      match_threshold: 0.9,
      match_count: 5
    });

  if (error) {
    console.log(`  ERROR: ${error.message}`);
  } else {
    console.log(`  Results: ${results.length}`);
    if (results.length > 0) {
      console.log(`  Best similarity: ${results[0].similarity.toFixed(4)}`);
      console.log(`  Found the same chunk: ${results[0].id === chunk.id}`);
    }
  }
}

compareEmbeddings().catch(console.error);
