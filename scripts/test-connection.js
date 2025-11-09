/**
 * Test Supabase Connection
 *
 * Verifies that the Supabase client can connect successfully
 * and that the database schema is set up correctly.
 *
 * Usage: node scripts/test-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic connection...');
    const { data, error } = await supabase
      .from('transcripts')
      .select('count');

    if (error) throw error;
    console.log('✓ Connected to Supabase successfully');

    // Test 2: Verify tables exist
    console.log('\nTest 2: Verifying tables...');
    const { data: transcriptsData, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('*')
      .limit(1);

    if (transcriptsError) throw new Error(`Transcripts table error: ${transcriptsError.message}`);
    console.log('✓ Transcripts table exists');

    const { data: chunksData, error: chunksError } = await supabase
      .from('transcript_chunks')
      .select('*')
      .limit(1);

    if (chunksError) throw new Error(`Transcript chunks table error: ${chunksError.message}`);
    console.log('✓ Transcript chunks table exists');

    // Test 3: Verify vector search function
    console.log('\nTest 3: Verifying vector search function...');

    // Create a dummy embedding (all zeros) for testing
    const dummyEmbedding = '[' + Array(1536).fill(0).join(',') + ']';

    const { data: searchData, error: searchError } = await supabase
      .rpc('match_transcript_chunks', {
        query_embedding_text: dummyEmbedding,
        match_threshold: 0.0,
        match_count: 1
      });

    if (searchError) throw new Error(`Vector search function error: ${searchError.message}`);
    console.log('✓ Vector search function exists and works');

    // Success summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!');
    console.log('='.repeat(50));
    console.log('\nYour Supabase database is ready to use.');
    console.log('\nNext steps:');
    console.log('  1. Get an OpenAI API key (if you don\'t have one)');
    console.log('  2. Add OPENAI_API_KEY to your .env file');
    console.log('  3. Start building the API: npm run dev');

  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ Connection test failed');
    console.error('='.repeat(50));
    console.error('\nError:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    console.error('  2. Ensure you ran both database migration SQL files:');
    console.error('     - scripts/database/001_initial_schema.sql');
    console.error('     - scripts/database/002_vector_search_function.sql');
    console.error('  3. Check that pgvector extension is enabled');
    console.error('  4. See docs/setup/supabase-setup.md for detailed setup guide');
    process.exit(1);
  }
}

// Run the test
testConnection();
