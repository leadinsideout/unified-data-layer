/**
 * Multi-Tenant Access Control Verification Script
 *
 * Tests that v2 endpoints correctly enforce data isolation:
 * - Coaches can only see their assigned clients
 * - Clients can only see their own data
 * - Admins can see all clients in their company
 *
 * Usage: node scripts/test-multi-tenant.js
 *
 * Prerequisites:
 * - Server running on localhost:3000
 * - Valid API keys for different roles
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test configuration - replace with actual IDs from your database
const TEST_CONFIG = {
  // Admin API key (should see all clients in company)
  adminApiKey: process.env.ADMIN_API_KEY || null,

  // Coach API key (should see assigned clients only)
  coachApiKey: process.env.COACH_API_KEY || null,

  // Client API key (should see only own data)
  clientApiKey: process.env.CLIENT_API_KEY || null,

  // Test client IDs
  ownClientId: process.env.TEST_OWN_CLIENT_ID || null, // Client that API key owner should access
  otherClientId: process.env.TEST_OTHER_CLIENT_ID || null // Client that should be inaccessible
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

/**
 * Make authenticated API request
 */
async function apiRequest(method, path, apiKey, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

/**
 * Run a test and record result
 */
function test(name, condition, details = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.tests.push({ name, status, details });

  if (condition) {
    results.passed++;
    console.log(`  ✅ ${name}`);
  } else {
    results.failed++;
    console.log(`  ❌ ${name}${details ? ` - ${details}` : ''}`);
  }
}

/**
 * Skip a test
 */
function skip(name, reason) {
  results.tests.push({ name, status: 'SKIP', details: reason });
  results.skipped++;
  console.log(`  ⏭️  ${name} - SKIPPED: ${reason}`);
}

/**
 * Test Suite: v2/clients endpoint
 */
async function testClientsEndpoint() {
  console.log('\n📋 Testing GET /api/v2/clients\n');

  // Test: Unauthenticated request should fail
  const noAuth = await apiRequest('GET', '/api/v2/clients', '');
  test('Unauthenticated request returns 401', noAuth.status === 401);

  // Test: Invalid API key should fail
  const invalidAuth = await apiRequest('GET', '/api/v2/clients', 'invalid_key');
  test('Invalid API key returns 401', invalidAuth.status === 401);

  // Test: Admin can list clients
  if (TEST_CONFIG.adminApiKey) {
    const adminClients = await apiRequest('GET', '/api/v2/clients', TEST_CONFIG.adminApiKey);
    test('Admin can list clients', adminClients.status === 200 && Array.isArray(adminClients.data.clients));
    if (adminClients.status === 200) {
      console.log(`     → Found ${adminClients.data.total} clients`);
    }
  } else {
    skip('Admin can list clients', 'No admin API key configured');
  }

  // Test: Coach can list assigned clients
  if (TEST_CONFIG.coachApiKey) {
    const coachClients = await apiRequest('GET', '/api/v2/clients', TEST_CONFIG.coachApiKey);
    test('Coach can list assigned clients', coachClients.status === 200);
    if (coachClients.status === 200) {
      console.log(`     → Found ${coachClients.data.total} clients`);
    }
  } else {
    skip('Coach can list assigned clients', 'No coach API key configured');
  }

  // Test: Client can list (only sees self)
  if (TEST_CONFIG.clientApiKey) {
    const clientList = await apiRequest('GET', '/api/v2/clients', TEST_CONFIG.clientApiKey);
    test('Client can list (sees only self)', clientList.status === 200 && clientList.data.total === 1);
  } else {
    skip('Client can list (sees only self)', 'No client API key configured');
  }
}

/**
 * Test Suite: v2/clients/:id/timeline endpoint
 */
async function testTimelineEndpoint() {
  console.log('\n📅 Testing GET /api/v2/clients/:id/timeline\n');

  // Test: Coach can access assigned client timeline
  if (TEST_CONFIG.coachApiKey && TEST_CONFIG.ownClientId) {
    const timeline = await apiRequest(
      'GET',
      `/api/v2/clients/${TEST_CONFIG.ownClientId}/timeline`,
      TEST_CONFIG.coachApiKey
    );
    test('Coach can access assigned client timeline', timeline.status === 200);
    if (timeline.status === 200) {
      console.log(`     → Found ${timeline.data.total_items} items`);
    }
  } else {
    skip('Coach can access assigned client timeline', 'Missing coach API key or client ID');
  }

  // Test: Coach cannot access unassigned client
  if (TEST_CONFIG.coachApiKey && TEST_CONFIG.otherClientId) {
    const forbidden = await apiRequest(
      'GET',
      `/api/v2/clients/${TEST_CONFIG.otherClientId}/timeline`,
      TEST_CONFIG.coachApiKey
    );
    test('Coach cannot access unassigned client (returns 403)', forbidden.status === 403);
  } else {
    skip('Coach cannot access unassigned client', 'Missing coach API key or other client ID');
  }

  // Test: Client can access own timeline
  if (TEST_CONFIG.clientApiKey && TEST_CONFIG.ownClientId) {
    const ownTimeline = await apiRequest(
      'GET',
      `/api/v2/clients/${TEST_CONFIG.ownClientId}/timeline`,
      TEST_CONFIG.clientApiKey
    );
    test('Client can access own timeline', ownTimeline.status === 200);
  } else {
    skip('Client can access own timeline', 'Missing client API key or client ID');
  }

  // Test: Client cannot access other client's timeline
  if (TEST_CONFIG.clientApiKey && TEST_CONFIG.otherClientId) {
    const otherTimeline = await apiRequest(
      'GET',
      `/api/v2/clients/${TEST_CONFIG.otherClientId}/timeline`,
      TEST_CONFIG.clientApiKey
    );
    test('Client cannot access other timeline (returns 403)', otherTimeline.status === 403);
  } else {
    skip('Client cannot access other timeline', 'Missing client API key or other client ID');
  }
}

/**
 * Test Suite: v2/search/unified endpoint
 */
async function testSearchEndpoint() {
  console.log('\n🔍 Testing POST /api/v2/search/unified\n');

  // Test: Unauthenticated search fails
  const noAuthSearch = await apiRequest('POST', '/api/v2/search/unified', '', { query: 'test' });
  test('Unauthenticated search returns 401', noAuthSearch.status === 401);

  // Test: Authenticated search works
  if (TEST_CONFIG.adminApiKey) {
    const authSearch = await apiRequest(
      'POST',
      '/api/v2/search/unified',
      TEST_CONFIG.adminApiKey,
      { query: 'coaching leadership', limit: 5 }
    );
    test('Authenticated search returns results', authSearch.status === 200);
    if (authSearch.status === 200 && authSearch.data.total_results) {
      console.log(`     → Found ${authSearch.data.total_results} results`);
    }
  } else {
    skip('Authenticated search returns results', 'No admin API key configured');
  }
}

/**
 * Test Suite: MCP endpoints
 */
async function testMCPEndpoints() {
  console.log('\n🤖 Testing MCP Endpoints\n');

  // Test: MCP SSE requires auth
  const mcpSSE = await apiRequest('GET', '/api/mcp/sse', '');
  test('MCP SSE requires authentication', mcpSSE.status === 401);

  // Test: MCP messages requires auth
  const mcpMessages = await apiRequest('POST', '/api/mcp/messages', '');
  test('MCP messages requires authentication', mcpMessages.status === 401);
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`  ✅ Passed:  ${results.passed}`);
  console.log(`  ❌ Failed:  ${results.failed}`);
  console.log(`  ⏭️  Skipped: ${results.skipped}`);
  console.log(`  📝 Total:   ${results.tests.length}`);
  console.log('='.repeat(50));

  if (results.failed > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above for details.\n');
    process.exit(1);
  } else if (results.skipped > 0) {
    console.log('\n💡 Some tests were skipped due to missing configuration.');
    console.log('   Configure API keys in .env or environment variables.\n');
  } else {
    console.log('\n✨ All tests passed!\n');
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log('='.repeat(50));
  console.log('🔐 Multi-Tenant Access Control Tests');
  console.log('='.repeat(50));
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Admin API Key: ${TEST_CONFIG.adminApiKey ? '✓ configured' : '✗ not set'}`);
  console.log(`Coach API Key: ${TEST_CONFIG.coachApiKey ? '✓ configured' : '✗ not set'}`);
  console.log(`Client API Key: ${TEST_CONFIG.clientApiKey ? '✓ configured' : '✗ not set'}`);

  await testClientsEndpoint();
  await testTimelineEndpoint();
  await testSearchEndpoint();
  await testMCPEndpoints();

  printSummary();
}

main().catch(console.error);
