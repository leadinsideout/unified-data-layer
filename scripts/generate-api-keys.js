/**
 * Generate API Keys for Matt and Jason
 *
 * Creates API keys that coaches will use in their Custom GPTs
 * to access their own data via the unified data layer API.
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error (${response.status}): ${data.error} - ${data.message}`);
  }

  return data;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔑 GENERATE API KEYS FOR COACHES');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get coach data
  const users = await apiRequest('GET', '/api/admin/users');
  const matt = users.coaches.find(c => c.email === 'matt@leadinsideout.io');
  const jason = users.coaches.find(c => c.email === 'jason@leadinsideout.io');

  console.log('✅ Found coaches:');
  console.log(`   Matt Thieleman: ${matt.id}`);
  console.log(`   Jason Pliml: ${jason.id}\n`);

  // Generate API key for Matt
  console.log('🔑 Generating API key for Matt Thieleman...');
  const mattKeyResponse = await apiRequest('POST', '/api/admin/api-keys', {
    name: 'Matt\'s Custom GPT - Jan 2026',
    owner_type: 'coach',
    owner_id: matt.id
  });

  console.log(`   ✅ API Key created: ${mattKeyResponse.api_key.substring(0, 20)}...`);
  console.log(`   🔒 Save this key securely - it won't be shown again!\n`);

  // Generate API key for Jason
  console.log('🔑 Generating API key for Jason Pliml...');
  const jasonKeyResponse = await apiRequest('POST', '/api/admin/api-keys', {
    name: 'Jason\'s Custom GPT - Jan 2026',
    owner_type: 'coach',
    owner_id: jason.id
  });

  console.log(`   ✅ API Key created: ${jasonKeyResponse.api_key.substring(0, 20)}...`);
  console.log(`   🔒 Save this key securely - it won't be shown again!\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 API KEYS GENERATED');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('🔐 Matt Thieleman\'s API Key:');
  console.log(`   ${mattKeyResponse.api_key}`);
  console.log('');

  console.log('🔐 Jason Pliml\'s API Key:');
  console.log(`   ${jasonKeyResponse.api_key}`);
  console.log('');

  console.log('⚠️  IMPORTANT: Save these keys immediately!');
  console.log('   - Keys cannot be retrieved later');
  console.log('   - Store in password manager (1Password, LastPass, etc.)');
  console.log('   - Each key provides access only to that coach\'s data');
  console.log('');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Next: Phase 6 - Create Custom GPT Setup Documents');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
