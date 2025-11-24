/**
 * MCP Server for Unified Data Layer
 *
 * Provides Model Context Protocol tools for AI assistants to interact
 * with coaching data. Designed for hosted deployment on Vercel with SSE transport.
 *
 * Tools:
 * - search_data: Semantic search across coaching data with filters
 * - upload_data: Upload new coaching data items
 * - get_client_timeline: Get chronological history for a client
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Create MCP Server instance
 * @param {Object} supabase - Supabase client
 * @param {Object} openai - OpenAI client
 * @returns {Server} MCP Server instance
 */
export function createMCPServer(supabase, openai) {
  const server = new Server(
    {
      name: 'unified-data-layer',
      version: '0.11.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Tool definitions
  const tools = [
    {
      name: 'search_data',
      description: 'Search coaching data semantically across transcripts, assessments, coaching models, and company documents. Returns relevant chunks with similarity scores.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query (e.g., "What leadership patterns emerged?")'
          },
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
            },
            description: 'Filter by data types. Omit to search all types.'
          },
          client_id: {
            type: 'string',
            description: 'Filter results by client ID (UUID)'
          },
          coach_id: {
            type: 'string',
            description: 'Filter results by coach ID (UUID)'
          },
          organization_id: {
            type: 'string',
            description: 'Filter results by client organization ID (UUID)'
          },
          threshold: {
            type: 'number',
            description: 'Similarity threshold (0.0-1.0). Higher = more precise. Default: 0.3'
          },
          limit: {
            type: 'number',
            description: 'Maximum results to return. Default: 10, Max: 50'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'upload_data',
      description: 'Upload new coaching data (transcript, assessment, coaching model, or company document). Automatically chunks and embeds the content.',
      inputSchema: {
        type: 'object',
        properties: {
          data_type: {
            type: 'string',
            enum: ['transcript', 'assessment', 'coaching_model', 'company_doc'],
            description: 'Type of data being uploaded'
          },
          content: {
            type: 'string',
            description: 'The raw content to upload (minimum 50 characters)'
          },
          client_id: {
            type: 'string',
            description: 'Client ID this data belongs to (UUID)'
          },
          coach_id: {
            type: 'string',
            description: 'Coach ID who owns this data (UUID)'
          },
          session_date: {
            type: 'string',
            description: 'Date of the session (ISO format, e.g., 2025-11-24)'
          },
          title: {
            type: 'string',
            description: 'Optional title for the data item'
          },
          metadata: {
            type: 'object',
            description: 'Additional type-specific metadata'
          }
        },
        required: ['data_type', 'content']
      }
    },
    {
      name: 'get_client_timeline',
      description: 'Get chronological history of all data for a specific client. Useful for reviewing coaching journey and progress over time.',
      inputSchema: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'Client ID to get timeline for (UUID)'
          },
          start_date: {
            type: 'string',
            description: 'Filter by start date (ISO format)'
          },
          end_date: {
            type: 'string',
            description: 'Filter by end date (ISO format)'
          },
          types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
            },
            description: 'Filter by data types'
          },
          limit: {
            type: 'number',
            description: 'Maximum results. Default: 50, Max: 100'
          }
        },
        required: ['client_id']
      }
    }
  ];

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_data':
          return await handleSearchData(supabase, openai, args);

        case 'upload_data':
          return await handleUploadData(supabase, openai, args);

        case 'get_client_timeline':
          return await handleGetClientTimeline(supabase, args);

        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true
          };
      }
    } catch (error) {
      console.error(`MCP tool error (${name}):`, error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  });

  return server;
}

/**
 * Handle search_data tool
 */
async function handleSearchData(supabase, openai, args) {
  const {
    query,
    types = null,
    client_id = null,
    coach_id = null,
    organization_id = null,
    threshold = 0.3,
    limit = 10
  } = args;

  if (!query || query.trim().length === 0) {
    return {
      content: [{ type: 'text', text: 'Error: query is required' }],
      isError: true
    };
  }

  // Generate embedding for query
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query.trim()
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  const queryEmbeddingText = '[' + queryEmbedding.map(v => parseFloat(v.toPrecision(10))).join(',') + ']';

  // Call vector search function
  const { data: chunks, error } = await supabase
    .rpc('match_data_chunks', {
      query_embedding_text: queryEmbeddingText,
      filter_types: types,
      filter_coach_id: coach_id,
      filter_client_id: client_id,
      filter_org_id: organization_id,
      match_threshold: threshold,
      match_count: Math.min(limit, 50)
    });

  if (error) {
    return {
      content: [{ type: 'text', text: `Search error: ${error.message}` }],
      isError: true
    };
  }

  // Enrich results with additional context
  if (chunks && chunks.length > 0) {
    const dataItemIds = [...new Set(chunks.map(c => c.data_item_id))];
    const { data: dataItems } = await supabase
      .from('data_items')
      .select('id, session_date, metadata, visibility_level')
      .in('id', dataItemIds);

    const dataItemMap = Object.fromEntries(
      (dataItems || []).map(d => [d.id, d])
    );

    chunks.forEach(chunk => {
      const item = dataItemMap[chunk.data_item_id];
      if (item) {
        chunk.session_date = item.session_date;
        chunk.title = item.metadata?.title || null;
      }
    });
  }

  // Format response
  const resultText = chunks && chunks.length > 0
    ? `Found ${chunks.length} results:\n\n${chunks.map((c, i) =>
        `[${i + 1}] (${c.data_type}, similarity: ${(c.similarity * 100).toFixed(1)}%)\n` +
        (c.title ? `Title: ${c.title}\n` : '') +
        (c.session_date ? `Date: ${c.session_date}\n` : '') +
        `Content: ${c.content.substring(0, 500)}${c.content.length > 500 ? '...' : ''}`
      ).join('\n\n')}`
    : 'No results found matching your query.';

  return {
    content: [{ type: 'text', text: resultText }]
  };
}

/**
 * Handle upload_data tool
 */
async function handleUploadData(supabase, openai, args) {
  const {
    data_type,
    content,
    client_id,
    coach_id,
    session_date,
    title,
    metadata = {}
  } = args;

  // Validation
  if (!data_type) {
    return {
      content: [{ type: 'text', text: 'Error: data_type is required' }],
      isError: true
    };
  }

  const validTypes = ['transcript', 'assessment', 'coaching_model', 'company_doc'];
  if (!validTypes.includes(data_type)) {
    return {
      content: [{ type: 'text', text: `Error: data_type must be one of: ${validTypes.join(', ')}` }],
      isError: true
    };
  }

  if (!content || content.trim().length < 50) {
    return {
      content: [{ type: 'text', text: 'Error: content must be at least 50 characters' }],
      isError: true
    };
  }

  // Create data item
  const dataItemRecord = {
    data_type,
    raw_content: content,
    title: title || null,
    session_date: session_date || new Date().toISOString(),
    client_id: client_id || null,
    coach_id: coach_id || null,
    metadata,
    visibility_level: 'coach_only'
  };

  const { data: dataItem, error: dataItemError } = await supabase
    .from('data_items')
    .insert(dataItemRecord)
    .select()
    .single();

  if (dataItemError) {
    return {
      content: [{ type: 'text', text: `Database error: ${dataItemError.message}` }],
      isError: true
    };
  }

  // Chunk and embed content
  const chunks = chunkText(content);
  const chunkRecords = [];

  for (let i = 0; i < chunks.length; i++) {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks[i].trim()
    });
    const embedding = embeddingResponse.data[0].embedding;
    const embeddingText = '[' + embedding.map(v => parseFloat(v.toPrecision(10))).join(',') + ']';

    chunkRecords.push({
      data_item_id: dataItem.id,
      chunk_index: i,
      content: chunks[i],
      embedding: embeddingText
    });
  }

  const { error: chunksError } = await supabase
    .from('data_chunks')
    .insert(chunkRecords);

  if (chunksError) {
    return {
      content: [{ type: 'text', text: `Error saving chunks: ${chunksError.message}` }],
      isError: true
    };
  }

  return {
    content: [{
      type: 'text',
      text: `Successfully uploaded ${data_type}!\n` +
        `Data Item ID: ${dataItem.id}\n` +
        `Chunks created: ${chunks.length}\n` +
        (title ? `Title: ${title}` : '')
    }]
  };
}

/**
 * Handle get_client_timeline tool
 */
async function handleGetClientTimeline(supabase, args) {
  const {
    client_id,
    start_date,
    end_date,
    types,
    limit = 50
  } = args;

  if (!client_id) {
    return {
      content: [{ type: 'text', text: 'Error: client_id is required' }],
      isError: true
    };
  }

  // Get client info
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('id', client_id)
    .single();

  if (clientError || !client) {
    return {
      content: [{ type: 'text', text: `Client not found: ${client_id}` }],
      isError: true
    };
  }

  // Build query
  let query = supabase
    .from('data_items')
    .select(`
      id,
      data_type,
      session_date,
      raw_content,
      metadata,
      created_at,
      coaches(id, name)
    `)
    .eq('client_id', client_id)
    .order('session_date', { ascending: true, nullsFirst: false })
    .limit(Math.min(limit, 100));

  if (start_date) {
    query = query.gte('session_date', start_date);
  }
  if (end_date) {
    query = query.lte('session_date', end_date);
  }
  if (types && types.length > 0) {
    query = query.in('data_type', types);
  }

  const { data: items, error: itemsError } = await query;

  if (itemsError) {
    return {
      content: [{ type: 'text', text: `Error fetching timeline: ${itemsError.message}` }],
      isError: true
    };
  }

  // Format timeline
  const timeline = (items || []).map(item => ({
    date: item.session_date,
    type: item.data_type,
    title: item.metadata?.title || `${item.data_type} - ${item.session_date || 'No date'}`,
    summary: item.raw_content?.substring(0, 300) + (item.raw_content?.length > 300 ? '...' : ''),
    coach: item.coaches ? item.coaches.name : null
  }));

  // Type breakdown
  const typeStats = {};
  (items || []).forEach(item => {
    typeStats[item.data_type] = (typeStats[item.data_type] || 0) + 1;
  });

  const resultText = timeline.length > 0
    ? `Timeline for ${client.name} (${timeline.length} items):\n\n` +
      `Type breakdown: ${Object.entries(typeStats).map(([t, c]) => `${t}: ${c}`).join(', ')}\n\n` +
      timeline.map((t, i) =>
        `[${i + 1}] ${t.date || 'No date'} - ${t.type}\n` +
        `${t.title}\n` +
        (t.coach ? `Coach: ${t.coach}\n` : '') +
        `${t.summary}`
      ).join('\n\n')
    : `No data found for client ${client.name}`;

  return {
    content: [{ type: 'text', text: resultText }]
  };
}

/**
 * Chunk text into overlapping segments
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);
    start += chunkSize - overlap;
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

/**
 * Create Express routes for MCP SSE transport
 * @param {Object} supabase - Supabase client
 * @param {Object} openai - OpenAI client
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {Object} Express router and transport handler
 */
export function createMCPRoutes(supabase, openai, authMiddleware) {
  const server = createMCPServer(supabase, openai);
  const transports = new Map();

  return {
    server,

    /**
     * SSE endpoint handler
     * GET /api/mcp/sse
     */
    handleSSE: [authMiddleware, async (req, res) => {
      console.log('MCP SSE connection initiated');

      // Create transport - the SDK's start() method will set headers and send endpoint event
      const transport = new SSEServerTransport('/api/mcp/messages', res);

      // Store transport using the SDK's internal session ID (accessible after start())
      // The SDK sends session ID via 'endpoint' event automatically

      // Connect server to transport - this calls transport.start() internally
      await server.connect(transport);

      // Store transport by session ID after start() (session ID is in transport._sessionId)
      const sessionId = transport._sessionId;
      transports.set(sessionId, transport);

      // Handle client disconnect
      req.on('close', () => {
        console.log('MCP SSE connection closed');
        transports.delete(sessionId);
      });
    }],

    /**
     * Messages endpoint handler
     * POST /api/mcp/messages
     */
    handleMessages: [authMiddleware, async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = transports.get(sessionId);

      if (!transport) {
        return res.status(400).json({
          error: 'Invalid session',
          message: 'No active SSE connection found for this session'
        });
      }

      // Handle the message
      await transport.handlePostMessage(req, res);
    }]
  };
}
