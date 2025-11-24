/**
 * Create an API key for the admin user
 *
 * This generates a plain text API key and stores its bcrypt hash in the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createAdminApiKey() {
  console.log('🔑 Creating Admin API Key\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get admin user
    console.log('\n📋 Step 1: Getting admin user...');

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name, role, coaching_company_id')
      .eq('email', 'admin@insideoutdev.com')
      .single();

    if (adminError || !admin) {
      console.error('❌ Failed to get admin user:', adminError);
      return;
    }

    console.log(`✅ Found admin: ${admin.name} (${admin.email})`);

    // Step 2: Check if admin already has an active API key
    console.log('\n📋 Step 2: Checking for existing API keys...');

    const { data: existingKeys } = await supabase
      .from('api_keys')
      .select('id, name, is_revoked')
      .eq('admin_id', admin.id);

    if (existingKeys?.length) {
      console.log(`⚠️  Found ${existingKeys.length} existing key(s):`);
      existingKeys.forEach(k => {
        const status = !k.is_revoked ? '🟢 active' : '🔴 revoked';
        console.log(`   - ${k.name} ${status}`);
      });
    }

    // Step 3: Generate new API key
    console.log('\n📋 Step 3: Generating new API key...');

    // Generate key with sk_test_ or sk_live_ prefix to match constraint
    const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const apiKey = `sk_${environment}_` + crypto.randomBytes(32).toString('hex');
    console.log('✅ Generated API key (save this - it will only be shown once!)');
    console.log(`\n🔑 API Key: ${apiKey}\n`);

    // Step 4: Hash the key
    console.log('📋 Step 4: Hashing API key...');

    const saltRounds = 10;
    const keyHash = await bcrypt.hash(apiKey, saltRounds);
    console.log('✅ API key hashed');

    // Step 5: Insert into database
    console.log('\n📋 Step 5: Storing API key in database...');

    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        name: 'Admin Master Key',
        key_hash: keyHash,
        key_prefix: apiKey.substring(0, apiKey.indexOf('_', 3) + 1), // Store sk_test_ or sk_live_
        is_revoked: false,
        admin_id: admin.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert API key:', insertError);
      return;
    }

    console.log('✅ API key stored in database');
    console.log(`   ID: ${newKey.id}`);
    console.log(`   Name: ${newKey.name}`);

    // Step 6: Summary
    console.log('\n📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Admin: ${admin.name}`);
    console.log(`✅ Email: ${admin.email}`);
    console.log(`✅ Role: ${admin.role}`);
    console.log(`✅ Key Name: ${newKey.name}`);
    console.log(`✅ Key ID: ${newKey.id}`);
    console.log(`\n🔑 API Key (save this!):`);
    console.log(`   ${apiKey}`);
    console.log('\n⚠️  WARNING: This key will NOT be shown again!');
    console.log('   Store it securely for testing the admin endpoints.\n');

  } catch (error) {
    console.error('\n❌ Failed to create API key:', error);
    console.error(error.stack);
  }
}

// Run
createAdminApiKey().catch(console.error);
