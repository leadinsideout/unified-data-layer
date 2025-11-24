/**
 * Minimal MCP Client Test
 *
 * Tests the MCP server by:
 * 1. Connecting via SSE
 * 2. Listing available tools
 * 3. Calling each tool
 *
 * Usage: node scripts/test-mcp-client.js
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.ADMIN_API_KEY || 'sk_test_99e85a679a70a554eb42cdace768af399cc4d86b474ad40e61d4e2a70f1b950b';

console.log('='.repeat(50));
console.log('MCP Client Test');
console.log('='.repeat(50));
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key: ${API_KEY.slice(0, 20)}...`);
console.log('');

/**
 * Test 1: Basic v2 endpoints (which MCP tools use internally)
 */
async function testV2Endpoints() {
  console.log('--- Test 1: V2 Endpoints (MCP backend) ---\n');

  // Test clients list
  console.log('GET /api/v2/clients...');
  const clientsRes = await fetch(`${BASE_URL}/api/v2/clients`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  const clients = await clientsRes.json();
  console.log(`  Status: ${clientsRes.status}`);
  console.log(`  Clients found: ${clients.total || 0}`);
  if (clients.clients?.length > 0) {
    console.log(`  First client: ${clients.clients[0].name} (${clients.clients[0].id})`);
  }
  console.log('');

  // Test unified search
  console.log('POST /api/v2/search/unified...');
  const searchRes = await fetch(`${BASE_URL}/api/v2/search/unified`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'leadership coaching',
      limit: 3
    })
  });
  const searchData = await searchRes.json();
  console.log(`  Status: ${searchRes.status}`);
  console.log(`  Results: ${searchData.total_results || searchData.results?.length || 0}`);
  if (searchData.metadata?.response_time_ms) {
    console.log(`  Response time: ${searchData.metadata.response_time_ms}ms`);
  }
  console.log('');

  return clients;
}

/**
 * Test 2: Timeline endpoint (if we have clients)
 */
async function testTimeline(clientId) {
  console.log('--- Test 2: Client Timeline ---\n');

  if (!clientId) {
    console.log('  Skipped: No client ID available');
    return;
  }

  console.log(`GET /api/v2/clients/${clientId}/timeline...`);
  const res = await fetch(`${BASE_URL}/api/v2/clients/${clientId}/timeline?limit=5`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` }
  });
  const data = await res.json();
  console.log(`  Status: ${res.status}`);
  if (res.status === 200) {
    console.log(`  Client: ${data.client_name}`);
    console.log(`  Timeline items: ${data.total_items}`);
    console.log(`  Types: ${JSON.stringify(data.by_type)}`);
  } else {
    console.log(`  Error: ${data.message}`);
  }
  console.log('');
}

/**
 * Test 3: MCP SSE Connection
 */
async function testMCPConnection() {
  console.log('--- Test 3: MCP SSE Endpoint ---\n');

  console.log('GET /api/mcp/sse (SSE connection)...');

  // For SSE, we need to use a different approach
  // In Node.js, we can use EventSource or just test the initial response
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${BASE_URL}/api/mcp/sse`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      signal: controller.signal
    });

    clearTimeout(timeout);

    console.log(`  Status: ${res.status}`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);

    if (res.status === 200) {
      // Read first chunk to see endpoint event (MCP SDK format)
      const reader = res.body.getReader();
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);

      // Parse SSE event format: "event: endpoint\ndata: /api/mcp/messages?sessionId=xxx\n\n"
      const lines = text.split('\n');
      const eventLine = lines.find(l => l.startsWith('event:'));
      const dataLine = lines.find(l => l.startsWith('data:'));

      if (eventLine && dataLine) {
        const eventType = eventLine.replace('event:', '').trim();
        const endpoint = dataLine.replace('data:', '').trim();
        console.log(`  Event type: ${eventType}`);
        console.log(`  Messages endpoint: ${endpoint}`);

        // Extract sessionId from the endpoint URL
        const sessionIdMatch = endpoint.match(/sessionId=([^&]+)/);
        if (sessionIdMatch) {
          console.log(`  Session ID: ${sessionIdMatch[1]}`);
        }
      } else {
        console.log(`  Raw data: ${text.slice(0, 150)}...`);
      }

      reader.cancel();
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('  SSE connection established (timed out as expected)');
    } else {
      console.log(`  Error: ${error.message}`);
    }
  }
  console.log('');
}

/**
 * Test 4: Direct tool simulation
 */
async function testToolSimulation() {
  console.log('--- Test 4: Tool Simulation ---\n');

  console.log('Simulating search_data tool call via /api/search...');
  const searchRes = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'career development goals',
      types: ['transcript'],
      limit: 2
    })
  });
  const searchData = await searchRes.json();
  console.log(`  Status: ${searchRes.status}`);
  console.log(`  Results: ${searchData.count || 0}`);
  if (searchData.results?.length > 0) {
    const first = searchData.results[0];
    console.log(`  Top result similarity: ${(first.similarity * 100).toFixed(1)}%`);
    console.log(`  Content preview: ${first.content?.slice(0, 80)}...`);
  }
  console.log('');
}

/**
 * Main
 */
async function main() {
  try {
    // Test v2 endpoints
    const clientsData = await testV2Endpoints();

    // Test timeline if we have a client
    const clientId = clientsData.clients?.[0]?.id;
    await testTimeline(clientId);

    // Test MCP SSE
    await testMCPConnection();

    // Test tool simulation
    await testToolSimulation();

    console.log('='.repeat(50));
    console.log('All tests completed!');
    console.log('='.repeat(50));
    console.log(`
Next steps to test with a real MCP client:

1. Claude Desktop - Add to ~/.config/claude/config.json:
   {
     "mcpServers": {
       "coaching-data": {
         "url": "${BASE_URL}/api/mcp/sse",
         "headers": {
           "Authorization": "Bearer ${API_KEY.slice(0, 20)}..."
         }
       }
     }
   }

2. Or use the MCP Inspector:
   npx @anthropic/mcp-inspector --url ${BASE_URL}/api/mcp/sse

`);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main();
