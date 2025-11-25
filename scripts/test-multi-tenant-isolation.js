#!/usr/bin/env node

/**
 * Checkpoint 13: Multi-Tenant Isolation Test Suite
 *
 * Tests RLS policies and data isolation between coaches and clients.
 * This is the CRITICAL test suite for verifying multi-tenant security.
 *
 * Test Categories:
 * 1. Positive Tests - Coach can access their own clients' data
 * 2. Negative Tests - Coach CANNOT access other coaches' clients' data
 * 3. Client Isolation - Client can ONLY see their own data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Load API keys
const keysFile = path.join(__dirname, '..', '.checkpoint13-api-keys.json');
if (!fs.existsSync(keysFile)) {
  console.error('Error: API keys file not found. Run create-checkpoint13-api-keys.js first.');
  process.exit(1);
}

const apiKeys = JSON.parse(fs.readFileSync(keysFile, 'utf-8'));
const API_URL = process.env.API_URL || 'https://unified-data-layer.vercel.app';

// Get keys by persona
const ALEX_KEY = apiKeys.find(k => k.name === 'Alex Rivera Coach Key').rawKey;
const JORDAN_KEY = apiKeys.find(k => k.name === 'Jordan Taylor Coach Key').rawKey;
const SAM_KEY = apiKeys.find(k => k.name === 'Sam Chen Coach Key').rawKey;
const SARAH_KEY = apiKeys.find(k => k.name === 'Sarah Williams Client Key').rawKey;

// Unique markers for isolation testing
const MARKERS = {
  // Alex's clients
  sarah: 'SARAH_ACME_UNIQUE_MARKER_7X9K',
  emily: 'EMILY_TECHCORP_UNIQUE_MARKER_3M2P',
  priya: 'PRIYA_GROWTHLABS_UNIQUE_MARKER_8T4V',
  marcus: 'MARCUS_SCALEUP_UNIQUE_MARKER_2R6Y',
  // Jordan's clients
  david: 'DAVID_TECHCORP_UNIQUE_MARKER_5N1Q',
  lisa: 'LISA_GROWTHLABS_UNIQUE_MARKER_9W3Z',
  james: 'JAMES_INNOVATE_UNIQUE_MARKER_4H8B',
  // Sam's clients
  michael: 'MICHAEL_ACME_UNIQUE_MARKER_6L2D',
  amanda: 'AMANDA_SCALEUP_UNIQUE_MARKER_1F7J',
  kevin: 'KEVIN_INNOVATE_UNIQUE_MARKER_0G5K',
  rachel: 'RACHEL_GROWTHLABS_UNIQUE_MARKER_3C9M'
};

// Test results
const results = {
  positive: { passed: 0, failed: 0, tests: [] },
  negative: { passed: 0, failed: 0, tests: [] },
  client: { passed: 0, failed: 0, tests: [] }
};

// Helper function to make API requests
async function apiRequest(endpoint, method, body, apiKey) {
  const url = `${API_URL}${endpoint}`;
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
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

// Search for a unique marker
// IMPORTANT: We check if the actual marker text appears in the results,
// not just if we get any results back. This is because semantic search
// may return similar content from authorized clients even when searching
// for another client's marker.
async function searchForMarker(marker, apiKey, description) {
  const result = await apiRequest('/api/search', 'POST', {
    query: marker,
    threshold: 0.1,
    limit: 10
  }, apiKey);

  // Check if the actual marker string appears in any result content
  const results = result.data?.results || [];
  const markerFound = results.some(r =>
    r.content?.includes(marker) ||
    r.metadata?.unique_marker === marker
  );

  return {
    found: markerFound,
    count: results.length,
    resultsReturned: results.length > 0,
    status: result.status,
    description
  };
}

// Get clients list
async function getClients(apiKey) {
  const result = await apiRequest('/api/v2/clients', 'GET', null, apiKey);
  return {
    clients: result.data?.clients || [],
    count: result.data?.clients?.length || 0,
    status: result.status
  };
}

// Run positive tests - coach should see their own clients' data
async function runPositiveTests() {
  console.log('\n' + '='.repeat(60));
  console.log('POSITIVE TESTS: Coach Access to Own Clients');
  console.log('='.repeat(60));

  // Alex's clients (should find all 4)
  const alexTests = [
    { marker: MARKERS.sarah, client: 'Sarah Williams' },
    { marker: MARKERS.emily, client: 'Emily Zhang' },
    { marker: MARKERS.priya, client: 'Priya Sharma' },
    { marker: MARKERS.marcus, client: 'Marcus Johnson' }
  ];

  console.log('\n📋 Alex Rivera (4 clients expected):');
  for (const test of alexTests) {
    const result = await searchForMarker(test.marker, ALEX_KEY, `Alex → ${test.client}`);
    const passed = result.found;
    results.positive.tests.push({ ...result, passed });
    if (passed) {
      results.positive.passed++;
      console.log(`  ✓ Found ${test.client}'s data`);
    } else {
      results.positive.failed++;
      console.log(`  ✗ FAILED to find ${test.client}'s data`);
    }
  }

  // Jordan's clients (should find all 3)
  const jordanTests = [
    { marker: MARKERS.david, client: 'David Kim' },
    { marker: MARKERS.lisa, client: 'Lisa Park' },
    { marker: MARKERS.james, client: 'James Wilson' }
  ];

  console.log('\n📋 Jordan Taylor (3 clients expected):');
  for (const test of jordanTests) {
    const result = await searchForMarker(test.marker, JORDAN_KEY, `Jordan → ${test.client}`);
    const passed = result.found;
    results.positive.tests.push({ ...result, passed });
    if (passed) {
      results.positive.passed++;
      console.log(`  ✓ Found ${test.client}'s data`);
    } else {
      results.positive.failed++;
      console.log(`  ✗ FAILED to find ${test.client}'s data`);
    }
  }

  // Sam's clients (should find all 4)
  const samTests = [
    { marker: MARKERS.michael, client: 'Michael Torres' },
    { marker: MARKERS.amanda, client: 'Amanda Foster' },
    { marker: MARKERS.kevin, client: 'Kevin Chen' },
    { marker: MARKERS.rachel, client: 'Rachel Adams' }
  ];

  console.log('\n📋 Sam Chen (4 clients expected):');
  for (const test of samTests) {
    const result = await searchForMarker(test.marker, SAM_KEY, `Sam → ${test.client}`);
    const passed = result.found;
    results.positive.tests.push({ ...result, passed });
    if (passed) {
      results.positive.passed++;
      console.log(`  ✓ Found ${test.client}'s data`);
    } else {
      results.positive.failed++;
      console.log(`  ✗ FAILED to find ${test.client}'s data`);
    }
  }
}

// Run negative tests - coach should NOT see other coaches' clients
async function runNegativeTests() {
  console.log('\n' + '='.repeat(60));
  console.log('NEGATIVE TESTS: Cross-Coach Isolation (CRITICAL)');
  console.log('='.repeat(60));

  // Alex should NOT see Jordan's or Sam's clients
  console.log('\n🔒 Alex Rivera should NOT see:');

  const alexNegative = [
    { marker: MARKERS.david, client: 'David Kim (Jordan)', coach: 'Jordan' },
    { marker: MARKERS.lisa, client: 'Lisa Park (Jordan)', coach: 'Jordan' },
    { marker: MARKERS.james, client: 'James Wilson (Jordan)', coach: 'Jordan' },
    { marker: MARKERS.michael, client: 'Michael Torres (Sam)', coach: 'Sam' },
    { marker: MARKERS.amanda, client: 'Amanda Foster (Sam)', coach: 'Sam' },
    { marker: MARKERS.kevin, client: 'Kevin Chen (Sam)', coach: 'Sam' },
    { marker: MARKERS.rachel, client: 'Rachel Adams (Sam)', coach: 'Sam' }
  ];

  for (const test of alexNegative) {
    const result = await searchForMarker(test.marker, ALEX_KEY, `Alex ✗→ ${test.client}`);
    const passed = !result.found; // Negative test: NOT finding is success
    results.negative.tests.push({ ...result, passed, expectedNotFound: true });
    if (passed) {
      results.negative.passed++;
      console.log(`  ✓ Correctly blocked: ${test.client}`);
    } else {
      results.negative.failed++;
      console.log(`  ✗ SECURITY VIOLATION: Alex found ${test.client}'s data!`);
    }
  }

  // Jordan should NOT see Alex's or Sam's clients
  console.log('\n🔒 Jordan Taylor should NOT see:');

  const jordanNegative = [
    { marker: MARKERS.sarah, client: 'Sarah Williams (Alex)', coach: 'Alex' },
    { marker: MARKERS.emily, client: 'Emily Zhang (Alex)', coach: 'Alex' },
    { marker: MARKERS.priya, client: 'Priya Sharma (Alex)', coach: 'Alex' },
    { marker: MARKERS.marcus, client: 'Marcus Johnson (Alex)', coach: 'Alex' },
    { marker: MARKERS.michael, client: 'Michael Torres (Sam)', coach: 'Sam' },
    { marker: MARKERS.amanda, client: 'Amanda Foster (Sam)', coach: 'Sam' },
    { marker: MARKERS.kevin, client: 'Kevin Chen (Sam)', coach: 'Sam' },
    { marker: MARKERS.rachel, client: 'Rachel Adams (Sam)', coach: 'Sam' }
  ];

  for (const test of jordanNegative) {
    const result = await searchForMarker(test.marker, JORDAN_KEY, `Jordan ✗→ ${test.client}`);
    const passed = !result.found;
    results.negative.tests.push({ ...result, passed, expectedNotFound: true });
    if (passed) {
      results.negative.passed++;
      console.log(`  ✓ Correctly blocked: ${test.client}`);
    } else {
      results.negative.failed++;
      console.log(`  ✗ SECURITY VIOLATION: Jordan found ${test.client}'s data!`);
    }
  }

  // Sam should NOT see Alex's or Jordan's clients
  console.log('\n🔒 Sam Chen should NOT see:');

  const samNegative = [
    { marker: MARKERS.sarah, client: 'Sarah Williams (Alex)', coach: 'Alex' },
    { marker: MARKERS.emily, client: 'Emily Zhang (Alex)', coach: 'Alex' },
    { marker: MARKERS.priya, client: 'Priya Sharma (Alex)', coach: 'Alex' },
    { marker: MARKERS.marcus, client: 'Marcus Johnson (Alex)', coach: 'Alex' },
    { marker: MARKERS.david, client: 'David Kim (Jordan)', coach: 'Jordan' },
    { marker: MARKERS.lisa, client: 'Lisa Park (Jordan)', coach: 'Jordan' },
    { marker: MARKERS.james, client: 'James Wilson (Jordan)', coach: 'Jordan' }
  ];

  for (const test of samNegative) {
    const result = await searchForMarker(test.marker, SAM_KEY, `Sam ✗→ ${test.client}`);
    const passed = !result.found;
    results.negative.tests.push({ ...result, passed, expectedNotFound: true });
    if (passed) {
      results.negative.passed++;
      console.log(`  ✓ Correctly blocked: ${test.client}`);
    } else {
      results.negative.failed++;
      console.log(`  ✗ SECURITY VIOLATION: Sam found ${test.client}'s data!`);
    }
  }
}

// Run client isolation tests - client should only see own data
async function runClientTests() {
  console.log('\n' + '='.repeat(60));
  console.log('CLIENT ISOLATION TESTS: Sarah Williams');
  console.log('='.repeat(60));

  // Sarah should see her own data
  console.log('\n✓ Sarah should see her own data:');
  const sarahOwn = await searchForMarker(MARKERS.sarah, SARAH_KEY, 'Sarah → own data');
  const ownPassed = sarahOwn.found;
  results.client.tests.push({ ...sarahOwn, passed: ownPassed });
  if (ownPassed) {
    results.client.passed++;
    console.log(`  ✓ Found own data (marker: ${MARKERS.sarah})`);
  } else {
    results.client.failed++;
    console.log(`  ✗ FAILED to find own data`);
  }

  // Sarah should NOT see other clients' data (even Alex's other clients)
  console.log('\n🔒 Sarah should NOT see other clients:');

  const sarahNegative = [
    { marker: MARKERS.emily, client: 'Emily Zhang (same coach)' },
    { marker: MARKERS.priya, client: 'Priya Sharma (same coach)' },
    { marker: MARKERS.marcus, client: 'Marcus Johnson (same coach)' },
    { marker: MARKERS.david, client: 'David Kim (different coach)' },
    { marker: MARKERS.michael, client: 'Michael Torres (same org, different coach)' }
  ];

  for (const test of sarahNegative) {
    const result = await searchForMarker(test.marker, SARAH_KEY, `Sarah ✗→ ${test.client}`);
    const passed = !result.found;
    results.client.tests.push({ ...result, passed, expectedNotFound: true });
    if (passed) {
      results.client.passed++;
      console.log(`  ✓ Correctly blocked: ${test.client}`);
    } else {
      results.client.failed++;
      console.log(`  ✗ SECURITY VIOLATION: Sarah found ${test.client}'s data!`);
    }
  }
}

// Test listClients endpoint
async function testClientLists() {
  console.log('\n' + '='.repeat(60));
  console.log('CLIENT LIST TESTS: /api/v2/clients');
  console.log('='.repeat(60));

  // Alex should see 4 clients
  console.log('\n📋 Alex Rivera client list:');
  const alexClients = await getClients(ALEX_KEY);
  console.log(`  Found ${alexClients.count} clients (expected: 4)`);
  const alexPassed = alexClients.count === 4;
  results.positive.tests.push({ description: 'Alex client count', passed: alexPassed, count: alexClients.count });
  if (alexPassed) {
    results.positive.passed++;
    console.log(`  ✓ Correct client count`);
  } else {
    results.positive.failed++;
    console.log(`  ✗ Wrong client count`);
  }

  // Jordan should see 3 clients
  console.log('\n📋 Jordan Taylor client list:');
  const jordanClients = await getClients(JORDAN_KEY);
  console.log(`  Found ${jordanClients.count} clients (expected: 3)`);
  const jordanPassed = jordanClients.count === 3;
  results.positive.tests.push({ description: 'Jordan client count', passed: jordanPassed, count: jordanClients.count });
  if (jordanPassed) {
    results.positive.passed++;
    console.log(`  ✓ Correct client count`);
  } else {
    results.positive.failed++;
    console.log(`  ✗ Wrong client count`);
  }

  // Sam should see 4 clients
  console.log('\n📋 Sam Chen client list:');
  const samClients = await getClients(SAM_KEY);
  console.log(`  Found ${samClients.count} clients (expected: 4)`);
  const samPassed = samClients.count === 4;
  results.positive.tests.push({ description: 'Sam client count', passed: samPassed, count: samClients.count });
  if (samPassed) {
    results.positive.passed++;
    console.log(`  ✓ Correct client count`);
  } else {
    results.positive.failed++;
    console.log(`  ✗ Wrong client count`);
  }
}

// Print final summary
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('FINAL RESULTS');
  console.log('='.repeat(60));

  const totalPassed = results.positive.passed + results.negative.passed + results.client.passed;
  const totalFailed = results.positive.failed + results.negative.failed + results.client.failed;
  const total = totalPassed + totalFailed;

  console.log(`\n📊 POSITIVE TESTS (Coach → Own Clients):`);
  console.log(`   Passed: ${results.positive.passed}`);
  console.log(`   Failed: ${results.positive.failed}`);

  console.log(`\n🔒 NEGATIVE TESTS (Cross-Coach Isolation):`);
  console.log(`   Passed: ${results.negative.passed}`);
  console.log(`   Failed: ${results.negative.failed}`);
  if (results.negative.failed > 0) {
    console.log(`   ⚠️  SECURITY VIOLATIONS DETECTED!`);
  }

  console.log(`\n👤 CLIENT ISOLATION TESTS:`);
  console.log(`   Passed: ${results.client.passed}`);
  console.log(`   Failed: ${results.client.failed}`);

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTAL: ${totalPassed}/${total} tests passed (${Math.round(100 * totalPassed / total)}%)`);

  if (totalFailed === 0) {
    console.log('\n✅ ALL TESTS PASSED - Multi-tenant isolation verified!');
  } else {
    console.log(`\n❌ ${totalFailed} TEST(S) FAILED - Review security policies!`);
    process.exit(1);
  }
}

// Main
async function main() {
  console.log('='.repeat(60));
  console.log('Checkpoint 13: Multi-Tenant Isolation Test Suite');
  console.log('='.repeat(60));
  console.log(`\nAPI URL: ${API_URL}`);
  console.log('Testing with 4 API keys (3 coaches + 1 client)');

  await runPositiveTests();
  await runNegativeTests();
  await runClientTests();
  await testClientLists();
  printSummary();
}

main().catch(console.error);
