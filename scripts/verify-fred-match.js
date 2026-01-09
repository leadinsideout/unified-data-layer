#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyFredMatch() {
  const { data, error } = await supabase
    .from('data_items')
    .select('id, metadata, raw_content')
    .eq('id', '77a96f7e-5c2f-45a7-96ec-6d6263f9e8e2')
    .single();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  const meta = typeof data.metadata === 'string'
    ? JSON.parse(data.metadata)
    : data.metadata;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 VERIFYING FRED MATCH');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Title:', meta?.title);
  console.log('Date:', meta?.date);
  console.log('Duration:', meta?.duration, 'minutes');
  console.log('Participants:', meta?.participants || 'None');
  console.log('Speakers:', meta?.speakers || 'None');
  console.log();

  // Check first 1000 chars of content for context
  const content = data.raw_content?.slice(0, 1000) || '';

  // Look for email addresses
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emailMatch) {
    console.log('📧 Emails found in content:', emailMatch);
    console.log();
  }

  // Check for company/context mentions
  console.log('🔍 Context Analysis:');

  if (content.toLowerCase().includes('80pct') || content.toLowerCase().includes('80 pct')) {
    console.log('✅ Found mention of "80pct" → Fred Stutzman (fred@80pct.com)');
    console.log('\nRECOMMENDATION: Link to Fred Stutzman\n');
    return 'fred-stutzman';
  } else if (content.toLowerCase().includes('empowered') || content.toLowerCase().includes('ventures')) {
    console.log('✅ Found mention of "empowered/ventures" → Chris Fredericks (chris@empowered.ventures)');
    console.log('\nRECOMMENDATION: Link to Chris Fredericks\n');
    return 'chris-fredericks';
  } else {
    console.log('⚠️  No clear context found in first 1000 characters');
    console.log('\nFirst 500 chars of content:');
    console.log('─'.repeat(60));
    console.log(content.slice(0, 500));
    console.log('─'.repeat(60));
    console.log('\nRECOMMENDATION: Manual verification needed\n');
    return 'unknown';
  }
}

verifyFredMatch().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
