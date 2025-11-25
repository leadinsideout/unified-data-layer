#!/usr/bin/env node

/**
 * Checkpoint 13: Create API Keys for Multi-Tenant Testing
 *
 * Creates API keys for:
 * - Alex Rivera (coach) - 4 clients
 * - Jordan Taylor (coach) - 3 clients
 * - Sam Chen (coach) - 4 clients
 * - Sarah Williams (client) - see only own data
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Personas to create keys for
const personas = [
  {
    name: 'Alex Rivera Coach Key',
    keyName: 'alex_coach_checkpoint13',
    type: 'coach',
    coachId: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Alex Rivera - 4 clients (Sarah, Emily, Priya, Marcus)'
  },
  {
    name: 'Jordan Taylor Coach Key',
    keyName: 'jordan_coach_checkpoint13',
    type: 'coach',
    coachId: '550e8400-e29b-41d4-a716-446655440012',
    description: 'Jordan Taylor - 3 clients (David, Lisa, James)'
  },
  {
    name: 'Sam Chen Coach Key',
    keyName: 'sam_coach_checkpoint13',
    type: 'coach',
    coachId: '550e8400-e29b-41d4-a716-446655440011',
    description: 'Sam Chen - 4 clients (Michael, Amanda, Kevin, Rachel)'
  },
  {
    name: 'Sarah Williams Client Key',
    keyName: 'sarah_client_checkpoint13',
    type: 'client',
    clientId: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Sarah Williams - client, can only see own data'
  }
];

async function createApiKey(persona) {
  // Generate random key
  const rawKey = 'sk_test_' + crypto.randomBytes(32).toString('hex');
  const keyPrefix = rawKey.substring(0, 15);

  // Hash the key
  const saltRounds = 10;
  const keyHash = await bcrypt.hash(rawKey, saltRounds);

  // Prepare insert data
  const insertData = {
    name: persona.keyName,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    scopes: ['read', 'write'],
    metadata: {
      checkpoint: 'checkpoint-13',
      purpose: 'multi-tenant-verification',
      persona_type: persona.type,
      description: persona.description
    }
  };

  // Add coach_id or client_id based on type
  if (persona.type === 'coach') {
    insertData.coach_id = persona.coachId;
  } else if (persona.type === 'client') {
    insertData.client_id = persona.clientId;
  }

  // Insert into database
  const { data, error } = await supabase
    .from('api_keys')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create key for ${persona.name}: ${error.message}`);
  }

  return {
    id: data.id,
    name: persona.name,
    rawKey: rawKey,
    prefix: keyPrefix,
    type: persona.type
  };
}

async function main() {
  console.log('='.repeat(60));
  console.log('Checkpoint 13: Creating API Keys for Multi-Tenant Testing');
  console.log('='.repeat(60));

  const results = [];

  for (const persona of personas) {
    console.log(`\nCreating key for ${persona.name}...`);
    try {
      const result = await createApiKey(persona);
      results.push(result);
      console.log(`  ✓ Created: ${result.prefix}...`);
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
  }

  // Output summary
  console.log('\n' + '='.repeat(60));
  console.log('API Keys Created Successfully!');
  console.log('='.repeat(60));

  console.log('\n⚠️  SAVE THESE KEYS - They cannot be retrieved later!\n');

  for (const result of results) {
    console.log(`${result.name} (${result.type}):`);
    console.log(`  Key: ${result.rawKey}`);
    console.log('');
  }

  // Save to file for reference (gitignored)
  const keysFile = path.join(__dirname, '..', '.checkpoint13-api-keys.json');
  fs.writeFileSync(keysFile, JSON.stringify(results, null, 2));
  console.log(`\n📁 Keys saved to: ${keysFile} (gitignored)`);

  console.log('\n📋 Custom GPT Configuration:');
  console.log('For each GPT, set Authentication to "API Key" with "Bearer" type');
  console.log('and paste the corresponding key above.');
}

main().catch(console.error);
