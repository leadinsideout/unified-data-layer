/**
 * Full MCP Client Test
 *
 * Tests the MCP server by establishing a real SSE connection
 * and sending tool calls via the messages endpoint.
 *
 * Usage: node scripts/test-mcp-full.js
 */

import 'dotenv/config';

const BASE_URL = process.env.API_URL || 'https://unified-data-layer.vercel.app';
const API_KEY = process.env.ADMIN_API_KEY || 'sk_test_99e85a679a70a554eb42cdace768af399cc4d86b474ad40e61d4e2a70f1b950b';

console.log('='.repeat(60));
console.log('MCP Full Client Test');
console.log('='.repeat(60));
console.log(`Base URL: ${BASE_URL}`);
console.log(`API Key: ${API_KEY.slice(0, 20)}...`);
console.log('');

/**
 * Connect to SSE and get session ID
 */
async function connectSSE() {
  console.log('1. Connecting to SSE endpoint...');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BASE_URL}/api/mcp/sse`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'text/event-stream'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (res.status !== 200) {
      console.log(`   ❌ Failed: Status ${res.status}`);
      const body = await res.text();
      console.log(`   Response: ${body}`);
      return null;
    }

    console.log(`   ✅ Connected: Status ${res.status}`);

    // Read the endpoint event
    const reader = res.body.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);

    // Parse SSE event
    const lines = text.split('\n');
    const dataLine = lines.find(l => l.startsWith('data:'));

    if (dataLine) {
      const endpoint = dataLine.replace('data:', '').trim();
      const sessionIdMatch = endpoint.match(/sessionId=([^&]+)/);

      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        console.log(`   Session ID: ${sessionId}`);

        // Keep connection alive for a bit
        // Don't cancel the reader yet - need to keep SSE open
        return { sessionId, reader, controller: new AbortController() };
      }
    }

    console.log(`   ❌ Could not parse session ID from: ${text.slice(0, 100)}`);
    reader.cancel();
    return null;
  } catch (error) {
    clearTimeout(timeout);
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Send MCP request via messages endpoint
 */
async function sendMCPRequest(sessionId, method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params
  };

  console.log(`\n   Sending: ${method}`);

  const res = await fetch(`${BASE_URL}/api/mcp/messages?sessionId=${sessionId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (res.status !== 200 && res.status !== 202) {
    const text = await res.text();
    console.log(`   ❌ Error ${res.status}: ${text}`);
    return null;
  }

  // Response might come via SSE or directly
  const responseText = await res.text();
  if (responseText) {
    try {
      return JSON.parse(responseText);
    } catch {
      console.log(`   Response (raw): ${responseText.slice(0, 200)}`);
      return { raw: responseText };
    }
  }

  return { status: 'accepted' };
}

/**
 * List available tools
 */
async function listTools(sessionId) {
  console.log('\n2. Listing available tools...');
  const response = await sendMCPRequest(sessionId, 'tools/list');

  if (response?.result?.tools) {
    console.log(`   ✅ Found ${response.result.tools.length} tools:`);
    response.result.tools.forEach(tool => {
      console.log(`      - ${tool.name}: ${tool.description?.slice(0, 60)}...`);
    });
    return response.result.tools;
  } else if (response) {
    console.log(`   Response:`, JSON.stringify(response).slice(0, 200));
  }

  return [];
}

/**
 * Call search_data tool
 */
async function testSearchTool(sessionId) {
  console.log('\n3. Testing search_data tool...');

  const response = await sendMCPRequest(sessionId, 'tools/call', {
    name: 'search_data',
    arguments: {
      query: 'leadership coaching',
      limit: 3
    }
  });

  if (response?.result?.content) {
    console.log('   ✅ Search successful!');
    const text = response.result.content[0]?.text || '';
    console.log(`   ${text.slice(0, 300)}...`);
    return true;
  } else if (response) {
    console.log(`   Response:`, JSON.stringify(response).slice(0, 300));
  }

  return false;
}

/**
 * Main
 */
async function main() {
  try {
    // Connect to SSE
    const connection = await connectSSE();

    if (!connection) {
      console.log('\n❌ Failed to establish SSE connection');
      process.exit(1);
    }

    const { sessionId, reader } = connection;

    // List tools
    await listTools(sessionId);

    // Test search
    await testSearchTool(sessionId);

    // Cleanup
    console.log('\n4. Cleaning up...');
    if (reader) {
      await reader.cancel();
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MCP Test Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
