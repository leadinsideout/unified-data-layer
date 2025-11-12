/**
 * Check if specific transcript and its chunks exist in database
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const TRANSCRIPT_ID = '8570747c-33e2-4be0-8051-9d355be251a1';

async function checkTranscript() {
  console.log(`Checking transcript ${TRANSCRIPT_ID}...\n`);

  // Check if transcript exists
  const { data: transcript, error: tError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', TRANSCRIPT_ID)
    .single();

  if (tError) {
    console.error('❌ Transcript not found:', tError.message);
    return;
  }

  console.log('✅ Transcript found:');
  console.log({
    id: transcript.id,
    created_at: transcript.created_at,
    text_length: transcript.raw_text?.length,
    metadata: transcript.metadata
  });

  // Check if chunks exist
  const { data: chunks, error: cError } = await supabase
    .from('transcript_chunks')
    .select('id, chunk_index, content, embedding')
    .eq('transcript_id', TRANSCRIPT_ID);

  if (cError) {
    console.error('\n❌ Error fetching chunks:', cError.message);
    return;
  }

  console.log(`\n✅ Chunks found: ${chunks.length}`);
  chunks.forEach(chunk => {
    const embeddingArray = chunk.embedding ? JSON.parse(chunk.embedding) : null;
    console.log(`\n  Chunk ${chunk.chunk_index}:`);
    console.log(`    ID: ${chunk.id}`);
    console.log(`    Content length: ${chunk.content?.length} chars`);
    console.log(`    Has embedding: ${chunk.embedding !== null}`);
    console.log(`    Embedding dimensions: ${embeddingArray ? embeddingArray.length : 0}`);
    console.log(`    Content preview: ${chunk.content?.substring(0, 100)}...`);
  });

  // If embedding exists, try a test search
  if (chunks.length > 0 && chunks[0].embedding) {
    console.log('\n📊 Testing vector search with first chunk embedding...');

    const { data: searchResults, error: searchError } = await supabase
      .rpc('match_transcript_chunks', {
        query_embedding_text: chunks[0].embedding,
        match_threshold: 0.0,
        match_count: 5
      });

    if (searchError) {
      console.error('❌ Search error:', searchError.message);
    } else {
      console.log(`✅ Search returned ${searchResults.length} results`);
      searchResults.forEach((result, i) => {
        console.log(`  ${i + 1}. Similarity: ${result.similarity.toFixed(4)} - ${result.content.substring(0, 60)}...`);
      });
    }
  }
}

checkTranscript();
