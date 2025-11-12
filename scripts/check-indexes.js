import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Check what indexes exist
const query = `
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transcript_chunks';
`;

console.log('Checking indexes on transcript_chunks table...\n');

// We can't run raw SQL via RPC, so let's check table structure differently
const { data, error } = await supabase
  .from('transcript_chunks')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Table accessible, sample data:', {
    columns: Object.keys(data[0] || {}),
    hasEmbedding: data[0]?.embedding !== null
  });
}
