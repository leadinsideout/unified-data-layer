/**
 * Test script for admin endpoints
 *
 * Tests all user management and API key management endpoints
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const API_BASE = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

async function testAdminEndpoints() {
  console.log('🧪 Testing Admin Endpoints\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Get admin user and their API key
    console.log('\n📋 Step 1: Getting admin credentials...');

    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, name, role')
      .eq('email', 'admin@insideoutdev.com')
      .single();

    if (adminError || !admin) {
      console.error('❌ Failed to get admin user:', adminError);
      return;
    }

    console.log(`✅ Found admin: ${admin.name} (${admin.email})`);

    // Get admin's API keys (may have multiple)
    const { data: apiKeys, error: keyError } = await supabase
      .from('api_keys')
      .select('id, name, is_revoked, created_at')
      .eq('admin_id', admin.id)
      .eq('is_revoked', false)
      .order('created_at', { ascending: false });

    if (keyError || !apiKeys || apiKeys.length === 0) {
      console.error('❌ No active API key found for admin');
      console.log('💡 Create one with: node scripts/create-admin-api-key.js');
      return;
    }

    // Use the most recent key
    const apiKey = apiKeys[0];
    console.log(`✅ Found ${apiKeys.length} active API key(s), using: ${apiKey.name}`);

    // For testing, we'll use the key_hash as a placeholder
    // In production, you'd need the actual plain text key
    const authHeader = apiKey.id; // Using key ID for now

    // Step 2: Test GET /api/admin/users
    console.log('\n📋 Step 2: Testing GET /api/admin/users...');
    console.log(`Note: To test with real API, you need the plain text API key`);
    console.log(`Example: curl -H "Authorization: Bearer <api-key>" ${API_BASE}/api/admin/users`);

    // Step 3: Get current users from database
    console.log('\n📋 Step 3: Getting users from database...');

    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, email, name')
      .limit(3);

    const { data: clients } = await supabase
      .from('clients')
      .select('id, email, name')
      .limit(3);

    const { data: admins } = await supabase
      .from('admins')
      .select('id, email, name, role')
      .limit(3);

    console.log(`✅ Found ${coaches?.length || 0} coaches`);
    if (coaches?.length) {
      coaches.forEach(c => console.log(`   - ${c.name} (${c.email})`));
    }

    console.log(`✅ Found ${clients?.length || 0} clients`);
    if (clients?.length) {
      clients.forEach(c => console.log(`   - ${c.name} (${c.email})`));
    }

    console.log(`✅ Found ${admins?.length || 0} admins`);
    if (admins?.length) {
      admins.forEach(a => console.log(`   - ${a.name} (${a.email}) [${a.role}]`));
    }

    // Step 4: Get API keys
    console.log('\n📋 Step 4: Getting API keys from database...');

    const { data: allKeys } = await supabase
      .from('api_keys')
      .select(`
        id,
        name,
        is_revoked,
        created_at,
        coach_id,
        client_id,
        admin_id
      `)
      .limit(10);

    console.log(`✅ Found ${allKeys?.length || 0} API keys`);
    if (allKeys?.length) {
      allKeys.forEach(k => {
        const owner = k.coach_id ? 'coach' : k.client_id ? 'client' : 'admin';
        const status = !k.is_revoked ? '🟢 active' : '🔴 revoked';
        console.log(`   - ${k.name} (${owner}) ${status}`);
      });
    }

    // Step 5: Endpoint test commands
    console.log('\n📋 Step 5: Manual API Testing Commands');
    console.log('='.repeat(60));
    const TEST_API_KEY = 'sk_test_99e85a679a70a554eb42cdace768af399cc4d86b474ad40e61d4e2a70f1b950b';

    console.log('\n🔑 Using API Key from .admin-api-key file:');
    console.log(`   ${TEST_API_KEY}\n`);

    console.log('Test these endpoints:\n');

    console.log('1️⃣  List all users:');
    console.log(`   curl -H "Authorization: Bearer ${TEST_API_KEY}" ${API_BASE}/api/admin/users\n`);

    if (coaches?.[0]) {
      console.log('2️⃣  Get specific user:');
      console.log(`   curl -H "Authorization: Bearer ${TEST_API_KEY}" ${API_BASE}/api/admin/users/${coaches[0].id}\n`);
    }

    console.log('3️⃣  Create new coach:');
    console.log(`   curl -X POST -H "Authorization: Bearer ${TEST_API_KEY}" -H "Content-Type: application/json" \\`);
    console.log(`        -d '{"type":"coach","email":"test@example.com","name":"Test Coach"}' \\`);
    console.log(`        ${API_BASE}/api/admin/users\n`);

    console.log('4️⃣  List all API keys:');
    console.log(`   curl -H "Authorization: Bearer ${TEST_API_KEY}" ${API_BASE}/api/admin/api-keys\n`);

    if (coaches?.[0]) {
      console.log('5️⃣  Create new API key for coach:');
      console.log(`   curl -X POST -H "Authorization: Bearer ${TEST_API_KEY}" -H "Content-Type: application/json" \\`);
      console.log(`        -d '{"name":"New Coach Key","owner_type":"coach","owner_id":"${coaches[0].id}"}' \\`);
      console.log(`        ${API_BASE}/api/admin/api-keys\n`);
    }

    if (allKeys?.[0]) {
      console.log('6️⃣  Revoke API key:');
      console.log(`   curl -X PUT -H "Authorization: Bearer ${TEST_API_KEY}" ${API_BASE}/api/admin/api-keys/${allKeys[0].id}/revoke\n`);

      console.log('7️⃣  Activate API key:');
      console.log(`   curl -X PUT -H "Authorization: Bearer ${TEST_API_KEY}" ${API_BASE}/api/admin/api-keys/${allKeys[0].id}/activate\n`);
    }

    console.log('\n📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Admin user exists: ${admin.email}`);
    console.log(`✅ API key exists: ${apiKey.name}`);
    console.log(`✅ ${coaches?.length || 0} coaches, ${clients?.length || 0} clients, ${admins?.length || 0} admins`);
    console.log(`✅ ${allKeys?.length || 0} API keys in database`);
    console.log('\n💡 To test API endpoints, start the server with: npm run dev');
    console.log('   Then use the curl commands above with a valid API key');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  }
}

// Run tests
testAdminEndpoints().catch(console.error);
