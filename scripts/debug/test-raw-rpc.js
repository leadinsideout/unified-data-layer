/**
 * Test the RPC function directly with minimal overhead
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testRawRPC() {
  // Get a stored chunk
  const { data: chunk } = await supabase
    .from('transcript_chunks')
    .select('*')
    .limit(1)
    .single();

  console.log('Testing RPC with stored embedding as query...\n');
  console.log(`Chunk ID: ${chunk.id}`);
  console.log(`Embedding text length: ${chunk.embedding.length} chars\n`);

  // Test 1: Use the exact stored embedding (should return itself with 1.0 similarity)
  console.log('Test 1: Using exact stored embedding...');
  const { data: results1, error: error1 } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: chunk.embedding,
      match_threshold: -1.0,
      match_count: 10
    });

  if (error1) {
    console.log(`  ERROR: ${error1.message}`);
  } else {
    console.log(`  Results: ${results1.length}`);
    if (results1.length > 0) {
      console.log(`  Best similarity: ${results1[0].similarity.toFixed(4)}`);
      console.log(`  Matches self: ${results1[0].id === chunk.id}`);
    }
  }

  // Test 2: Parse and re-format the embedding (test if parsing changes it)
  console.log('\nTest 2: Parse and re-format the embedding...');
  const parsed = JSON.parse(chunk.embedding);
  const reformatted = '[' + parsed.join(',') + ']';
  console.log(`  Original length: ${chunk.embedding.length}`);
  console.log(`  Reformatted length: ${reformatted.length}`);
  console.log(`  Are they equal: ${chunk.embedding === reformatted}`);

  const { data: results2, error: error2 } = await supabase
    .rpc('match_transcript_chunks', {
      query_embedding_text: reformatted,
      match_threshold: -1.0,
      match_count: 10
    });

  if (error2) {
    console.log(`  ERROR: ${error2.message}`);
  } else {
    console.log(`  Results: ${results2.length}`);
    if (results2.length > 0) {
      console.log(`  Best similarity: ${results2[0].similarity.toFixed(4)}`);
    }
  }

  // Test 3: Check if there's a vector cast issue
  console.log('\nTest 3: Direct SQL query to test vector casting...');
  const { data: sqlResults, error: sqlError } = await supabase
    .from('transcript_chunks')
    .select('id, (1 - (embedding <=> $1::vector)) as similarity', {
      count: 'exact'
    })
    .limit(5);

  if (sqlError) {
    console.log(`  ERROR: ${sqlError.message}`);
  } else {
    console.log(`  Query executed, but parameter substitution may not work this way`);
  }
}

testRawRPC().catch(console.error);
