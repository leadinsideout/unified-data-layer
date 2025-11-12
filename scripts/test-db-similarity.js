/**
 * Test what similarity the database actually calculates
 */
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testDBSimilarity() {
  // Generate query embedding
  const query = "imposter syndrome";
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  const embedding = response.data[0].embedding;

  // Format with rounding
  const roundedEmbedding = embedding.map(val => parseFloat(val.toFixed(8)));
  const embeddingText = '[' + roundedEmbedding.join(',') + ']';

  console.log(`Query: "${query}"`);
  console.log(`Embedding formatted length: ${embeddingText.length} chars\n`);

  // Call the database function WITHOUT the WHERE clause filter
  // We'll use a raw SQL query to see ALL results with their similarity scores
  const { data, error } = await supabase.rpc('sql', {
    query: `
      SELECT
        tc.id,
        tc.content::text as content_preview,
        1 - (tc.embedding <=> $1::vector) AS similarity,
        tc.embedding <=> $1::vector AS distance
      FROM transcript_chunks tc
      WHERE tc.transcript_id = '8570747c-33e2-4be0-8051-9d355be251a1'
      LIMIT 5
    `,
    params: [embeddingText]
  });

  if (error) {
    console.error('Error:', error);

    // Try alternative approach - direct query
    console.log('\nTrying direct approach with match function...\n');

    const { data: results, error: err2 } = await supabase
      .rpc('match_transcript_chunks', {
        query_embedding_text: embeddingText,
        match_threshold: -2.0,  // Very low to get any results
        match_count: 10
      });

    if (err2) {
      console.error('Match error:', err2);
    } else {
      console.log(`Results with threshold -2.0: ${results.length}`);
      results.forEach(r => {
        console.log(`  Similarity: ${r.similarity.toFixed(6)}`);
        console.log(`  Content: ${r.content.substring(0, 60)}...\n`);
      });
    }
  } else {
    console.log('Results:');
    data.forEach((row, i) => {
      console.log(`${i + 1}. Similarity: ${row.similarity}, Distance: ${row.distance}`);
      console.log(`   ${row.content_preview.substring(0, 60)}...\n`);
    });
  }
}

testDBSimilarity().catch(console.error);
