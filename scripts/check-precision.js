import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkPrecision() {
  const { data: chunks } = await supabase
    .from('transcript_chunks')
    .select('embedding')
    .limit(1);

  if (chunks && chunks.length > 0) {
    const embedding = JSON.parse(chunks[0].embedding);

    // Check precision of first 10 values
    console.log('First 10 stored embedding values:');
    for (let i = 0; i < 10; i++) {
      const value = embedding[i];
      const str = value.toString();
      const decimals = str.includes('.') ? str.split('.')[1].length : 0;
      console.log(`  [${i}]: ${value} (${decimals} decimal places)`);
    }
  }
}

checkPrecision().catch(console.error);
