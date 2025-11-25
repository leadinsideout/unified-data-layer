/**
 * Unified Data Layer - API Server
 *
 * Provides semantic search over coaching transcripts for AI platform integration.
 *
 * Architecture:
 * - Our API provides DATA (via semantic search)
 * - AI platforms (Custom GPT, Claude) provide SYNTHESIS
 * - No RAG endpoints - keeps it simple and cost-effective
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { DataProcessorFactory } from './processors/index.js';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/auth.js';
import { createAdminRoutes } from './routes/admin.js';
import { createApiKeyRoutes } from './routes/api-keys.js';
import { createAdminAuthRoutes, createAdminSessionMiddleware } from './routes/admin-auth.js';
import { createV2ClientRoutes, createV2SearchRoutes } from './routes/v2/index.js';
import { createMCPRoutes } from './mcp/index.js';

// Load environment variables
dotenv.config();

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize data processor factory
const processorFactory = new DataProcessorFactory(openai);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for development (restrict in production)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON body parser (skip for MCP messages endpoint - it reads raw body)
app.use((req, res, next) => {
  if (req.path === '/api/mcp/messages') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Authentication middleware (created but not applied globally)
// We'll apply it selectively to protected endpoints
const authMiddleware = createAuthMiddleware(supabase);
const optionalAuthMiddleware = createOptionalAuthMiddleware(supabase);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Chunks text into overlapping segments for embedding generation
 *
 * @param {string} text - Full text to chunk
 * @param {number} chunkSize - Words per chunk
 * @param {number} overlap - Overlapping words between chunks
 * @returns {string[]} Array of text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);

    // Move start pointer (accounting for overlap)
    start += chunkSize - overlap;

    // Prevent infinite loop
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

/**
 * Generate embedding for text using OpenAI
 *
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} 1536-dimensional embedding vector
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim()
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Convert embedding array to PostgreSQL vector format
 *
 * @param {number[]} embedding - Array of numbers
 * @returns {string} Formatted as "[0.1,0.2,...]"
 */
function formatEmbeddingForDB(embedding) {
  // PostgreSQL vector type stores floats with ~10 decimal places of precision
  // Round to match this to ensure query embeddings match stored embeddings
  const formatted = embedding.map(val => {
    // Use toPrecision to get ~10 significant figures
    const str = val.toPrecision(10);
    return parseFloat(str);
  });
  return '[' + formatted.join(',') + ']';
}

// ============================================
// ROUTES
// ============================================

// Register admin auth routes (no auth required for login)
const adminAuthRoutes = createAdminAuthRoutes(supabase);
app.use('/api/admin/auth', adminAuthRoutes);

// Create session middleware for admin routes
const adminSessionMiddleware = createAdminSessionMiddleware(supabase);

// Register admin routes (session OR API key auth)
const adminRoutes = createAdminRoutes(supabase, adminSessionMiddleware);
app.use('/api/admin', adminRoutes);

// Register API key routes (session OR API key auth)
const apiKeyRoutes = createApiKeyRoutes(supabase, adminSessionMiddleware);
app.use('/api/admin/api-keys', apiKeyRoutes);

// Register v2 routes (for MCP server and Enhanced Custom GPT)
const v2ClientRoutes = createV2ClientRoutes(supabase, authMiddleware);
const v2SearchRoutes = createV2SearchRoutes(supabase, authMiddleware);
app.use('/api/v2/clients', v2ClientRoutes);
app.use('/api/v2/search', v2SearchRoutes);

// Register MCP routes (Model Context Protocol for AI assistants)
const mcpRoutes = createMCPRoutes(supabase, openai, authMiddleware);
app.get('/api/mcp/sse', ...mcpRoutes.handleSSE);
app.post('/api/mcp/messages', ...mcpRoutes.handleMessages);

/**
 * Root Endpoint
 *
 * GET /
 *
 * Returns API information and available endpoints
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Unified Data Layer API',
    version: '0.12.0',
    description: 'Multi-type semantic search API with MCP server for AI assistants',
    endpoints: {
      health: 'GET /api/health',
      // Legacy endpoints (backward compatible)
      upload: 'POST /api/transcripts/upload',
      uploadPdf: 'POST /api/transcripts/upload-pdf',
      bulkUpload: 'POST /api/transcripts/bulk-upload',
      // New multi-type endpoint
      dataUpload: 'POST /api/data/upload',
      search: 'POST /api/search (supports types, coach_id, client_id, organization_id filters)',
      openapi: 'GET /openapi.json',
      // V2 endpoints (for MCP server and Enhanced Custom GPT)
      v2Clients: 'GET /api/v2/clients (list accessible clients)',
      v2ClientTimeline: 'GET /api/v2/clients/:id/timeline (chronological history)',
      v2ClientData: 'GET /api/v2/clients/:id/data (full data items)',
      v2SearchUnified: 'POST /api/v2/search/unified (enhanced search with metadata)',
      v2SearchFiltered: 'POST /api/v2/search/filtered (explicit filter structure)',
      // MCP endpoints (Model Context Protocol for AI assistants)
      mcpSSE: 'GET /api/mcp/sse (SSE connection for MCP clients)',
      mcpMessages: 'POST /api/mcp/messages (MCP message handler)',
      // Admin endpoints (require authentication)
      adminUsers: 'GET /api/admin/users',
      adminUserDetails: 'GET /api/admin/users/:id',
      adminCreateUser: 'POST /api/admin/users',
      adminUpdateUser: 'PUT /api/admin/users/:id',
      adminDeleteUser: 'DELETE /api/admin/users/:id',
      // API Key management (require authentication)
      apiKeys: 'GET /api/admin/api-keys',
      apiKeyDetails: 'GET /api/admin/api-keys/:id',
      createApiKey: 'POST /api/admin/api-keys',
      revokeApiKey: 'PUT /api/admin/api-keys/:id/revoke',
      activateApiKey: 'PUT /api/admin/api-keys/:id/activate',
      deleteApiKey: 'DELETE /api/admin/api-keys/:id'
    },
    supported_data_types: processorFactory.getSupportedTypes(),
    search_filters: ['types', 'coach_id', 'client_id', 'organization_id', 'threshold', 'limit'],
    documentation: 'https://github.com/leadinsideout/unified-data-layer',
    status: 'operational'
  });
});

/**
 * Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns server status and configuration info
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '0.12.0',
    services: {
      supabase: !!process.env.SUPABASE_URL,
      openai: !!process.env.OPENAI_API_KEY
    }
  });
});

/**
 * Upload Text Transcript
 *
 * POST /api/transcripts/upload
 *
 * Body:
 *   {
 *     "text": "Transcript content...",
 *     "meeting_date": "2025-11-08T10:00:00Z",  // optional
 *     "coach_id": "uuid",                        // optional
 *     "client_id": "uuid",                       // optional
 *     "metadata": {}                             // optional
 *   }
 *
 * Returns:
 *   {
 *     "transcript_id": "uuid",
 *     "chunks_created": 5,
 *     "message": "Transcript uploaded and processed successfully"
 *   }
 */
app.post('/api/transcripts/upload', optionalAuthMiddleware, async (req, res) => {
  try {
    const { text, meeting_date, coach_id, client_id, metadata } = req.body;

    // Validation
    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Invalid transcript',
        message: 'Transcript text must be at least 50 characters'
      });
    }

    // Insert data item (transcript type)
    const { data: dataItem, error: dataItemError } = await supabase
      .from('data_items')
      .insert({
        data_type: 'transcript',
        raw_content: text,
        session_date: meeting_date || new Date().toISOString(),
        coach_id,
        client_id,
        metadata,
        visibility_level: 'coach_only'
      })
      .select()
      .single();

    if (dataItemError) {
      console.error('Database error:', dataItemError);
      throw new Error('Failed to save transcript');
    }

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks for data item ${dataItem.id}`);

    // Generate embeddings and save chunks
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        data_item_id: dataItem.id,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding)
      });
    }

    // Batch insert chunks
    const { error: chunksError } = await supabase
      .from('data_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      throw new Error('Failed to save transcript chunks');
    }

    res.status(201).json({
      transcript_id: dataItem.id, // Keep old field name for backward compatibility
      data_item_id: dataItem.id,  // New field name
      chunks_created: chunks.length,
      message: 'Transcript uploaded and processed successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * Upload PDF Transcript
 *
 * POST /api/transcripts/upload-pdf
 *
 * Form Data:
 *   file: PDF file (max 10MB)
 *   meeting_date: ISO date string (optional)
 *   coach_id: UUID (optional)
 *   client_id: UUID (optional)
 *   metadata: JSON string (optional)
 *
 * Returns: Same as /api/transcripts/upload
 */
app.post('/api/transcripts/upload-pdf', optionalAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a PDF file'
      });
    }

    // Verify it's a PDF
    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF files are accepted'
      });
    }

    // Parse PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'PDF parsing failed',
        message: 'Could not extract sufficient text from PDF'
      });
    }

    // Parse optional metadata
    let metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    metadata.original_filename = req.file.originalname;
    metadata.pdf_pages = pdfData.numpages;

    // Insert data item (reuse same logic as text upload)
    const { data: dataItem, error: dataItemError } = await supabase
      .from('data_items')
      .insert({
        data_type: 'transcript',
        raw_content: text,
        session_date: req.body.meeting_date || new Date().toISOString(),
        coach_id: req.body.coach_id,
        client_id: req.body.client_id,
        metadata,
        visibility_level: 'coach_only'
      })
      .select()
      .single();

    if (dataItemError) {
      console.error('Database error:', dataItemError);
      throw new Error('Failed to save transcript');
    }

    // Chunk and embed
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks from PDF ${req.file.originalname}`);

    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        data_item_id: dataItem.id,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding)
      });
    }

    const { error: chunksError } = await supabase
      .from('data_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      throw new Error('Failed to save transcript chunks');
    }

    res.status(201).json({
      transcript_id: dataItem.id, // Keep old field name for backward compatibility
      data_item_id: dataItem.id,  // New field name
      chunks_created: chunks.length,
      message: 'PDF transcript uploaded and processed successfully',
      pdf_info: {
        filename: req.file.originalname,
        pages: pdfData.numpages
      }
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({
      error: 'PDF upload failed',
      message: error.message
    });
  }
});

/**
 * Bulk Upload Transcripts
 *
 * POST /api/transcripts/bulk-upload
 *
 * Body: {
 *   transcripts: [
 *     {
 *       text: string,
 *       meeting_date: ISO date string (optional),
 *       metadata: object (optional)
 *     },
 *     ...
 *   ]
 * }
 *
 * Processes multiple transcripts in parallel for efficiency.
 * Returns: Array of created transcript IDs and processing status
 */
app.post('/api/transcripts/bulk-upload', optionalAuthMiddleware, async (req, res) => {
  try {
    const { transcripts } = req.body;

    if (!transcripts || !Array.isArray(transcripts)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transcripts must be an array'
      });
    }

    if (transcripts.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'transcripts array cannot be empty'
      });
    }

    if (transcripts.length > 50) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Maximum 50 transcripts per bulk upload'
      });
    }

    console.log(`Processing bulk upload of ${transcripts.length} transcripts...`);

    const results = [];
    const errors = [];

    // Process each transcript
    for (let i = 0; i < transcripts.length; i++) {
      const { text, meeting_date, metadata } = transcripts[i];

      try {
        if (!text || typeof text !== 'string') {
          throw new Error('text is required and must be a string');
        }

        // Insert data item
        const { data: dataItem, error: dataItemError } = await supabase
          .from('data_items')
          .insert({
            data_type: 'transcript',
            raw_content: text,
            session_date: meeting_date || new Date().toISOString(),
            metadata: metadata || {},
            visibility_level: 'coach_only'
          })
          .select()
          .single();

        if (dataItemError) throw dataItemError;

        // Chunk and embed
        const chunks = chunkText(text);
        const chunkRecords = [];

        for (let j = 0; j < chunks.length; j++) {
          const embedding = await generateEmbedding(chunks[j]);
          chunkRecords.push({
            data_item_id: dataItem.id,
            chunk_index: j,
            content: chunks[j],
            embedding: formatEmbeddingForDB(embedding)
          });
        }

        // Insert chunks
        const { error: chunksError } = await supabase
          .from('data_chunks')
          .insert(chunkRecords);

        if (chunksError) throw chunksError;

        results.push({
          index: i,
          transcript_id: dataItem.id,  // Keep old field for compatibility
          data_item_id: dataItem.id,   // New field
          chunks_created: chunks.length,
          status: 'success'
        });

        console.log(`[${i + 1}/${transcripts.length}] Processed data item ${dataItem.id}`);

      } catch (error) {
        console.error(`[${i + 1}/${transcripts.length}] Failed:`, error.message);
        errors.push({
          index: i,
          error: error.message,
          status: 'failed'
        });
      }
    }

    const successCount = results.length;
    const failureCount = errors.length;

    res.status(successCount > 0 ? 201 : 500).json({
      total: transcripts.length,
      successful: successCount,
      failed: failureCount,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      error: 'Bulk upload failed',
      message: error.message
    });
  }
});

/**
 * Unified Data Upload (Multi-Type)
 *
 * POST /api/data/upload
 *
 * Body:
 *   {
 *     "data_type": "transcript" | "assessment" | "coaching_model" | "company_doc",
 *     "content": "Raw content text...",
 *     "metadata": {
 *       // Type-specific metadata fields
 *       // See processor documentation for required fields per type
 *     }
 *   }
 *
 * Returns:
 *   {
 *     "data_item_id": "uuid",
 *     "data_type": "transcript",
 *     "chunks_created": 5,
 *     "message": "Data uploaded and processed successfully"
 *   }
 */
app.post('/api/data/upload', optionalAuthMiddleware, async (req, res) => {
  try {
    const { data_type, content, metadata = {} } = req.body;

    // Validation
    if (!data_type || typeof data_type !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'data_type is required and must be a string'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'content is required and must be a string'
      });
    }

    // Check if data type is supported
    if (!processorFactory.isTypeSupported(data_type)) {
      return res.status(400).json({
        error: 'Unsupported data type',
        message: `data_type "${data_type}" is not supported. Supported types: ${processorFactory.getSupportedTypes().join(', ')}`
      });
    }

    console.log(`Processing ${data_type} upload...`);

    // Get appropriate processor
    const processor = processorFactory.getProcessor(data_type);

    // Process data (validates, processes, chunks, embeds)
    const { dataItem, chunks } = await processor.process(content, metadata);

    // Insert data item
    const { data: insertedItem, error: dataItemError } = await supabase
      .from('data_items')
      .insert(dataItem)
      .select()
      .single();

    if (dataItemError) {
      console.error('Database error:', dataItemError);
      throw new Error(`Failed to save ${data_type}: ${dataItemError.message}`);
    }

    console.log(`Saved ${data_type} with ID ${insertedItem.id}, creating ${chunks.length} chunks...`);

    // Prepare chunk records for database
    const chunkRecords = chunks.map((chunk, index) => ({
      data_item_id: insertedItem.id,
      chunk_index: index,
      content: chunk.content,
      embedding: processor.formatEmbeddingForDB(chunk.embedding)
    }));

    // Batch insert chunks
    const { error: chunksError } = await supabase
      .from('data_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      throw new Error(`Failed to save ${data_type} chunks: ${chunksError.message}`);
    }

    res.status(201).json({
      data_item_id: insertedItem.id,
      data_type: data_type,
      chunks_created: chunks.length,
      message: `${data_type.charAt(0).toUpperCase() + data_type.slice(1)} uploaded and processed successfully`
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Check if it's a validation error from processor
    const statusCode = error.message.includes('required') || error.message.includes('must be') ? 400 : 500;

    res.status(statusCode).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

/**
 * Semantic Search
 *
 * POST /api/search
 *
 * Body:
 *   {
 *     "query": "What did the client discuss about career goals?",
 *     "threshold": 0.3,  // optional, default 0.3
 *     "limit": 5         // optional, default 5
 *   }
 *
 * Returns:
 *   {
 *     "results": [
 *       {
 *         "id": "uuid",
 *         "transcript_id": "uuid",
 *         "content": "Chunk text...",
 *         "similarity": 0.85,
 *         "meeting_date": "2025-11-08"
 *       }
 *     ],
 *     "query": "career goals",
 *     "count": 5
 *   }
 */
app.post('/api/search', optionalAuthMiddleware, async (req, res) => {
  try {
    const {
      query,
      types = null,  // null = all types, or array like ['transcript', 'assessment']
      coach_id = null,
      client_id = null,
      organization_id = null,
      threshold = 0.3,
      limit = 10
    } = req.body;

    // Validation
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid query',
        message: 'Query text is required'
      });
    }

    if (threshold < 0 || threshold > 1) {
      return res.status(400).json({
        error: 'Invalid threshold',
        message: 'Threshold must be between 0.0 and 1.0'
      });
    }

    // Handle organization_id - accept UUID or company name
    let resolved_organization_id = organization_id;
    if (organization_id && typeof organization_id === 'string') {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(organization_id)) {
        // Not a UUID - treat as company name and look up the ID
        // Normalize the search term: remove hyphens, collapse spaces
        const normalizedSearch = organization_id.replace(/-/g, '').replace(/\s+/g, ' ').trim();

        // Try client_organizations first
        const { data: orgs, error: orgError } = await supabase
          .from('client_organizations')
          .select('id, name')
          .ilike('name', `%${normalizedSearch}%`)
          .limit(1);

        if (orgError) {
          console.error('Organization lookup error:', orgError);
          return res.status(400).json({
            error: 'Invalid organization',
            message: `Could not find organization: "${organization_id}"`
          });
        }

        if (orgs && orgs.length > 0) {
          resolved_organization_id = orgs[0].id;
          console.log(`Resolved organization "${organization_id}" to ID: ${resolved_organization_id}`);
        } else {
          // If not found in client_organizations, try coaching_companies
          const { data: companies, error: compError } = await supabase
            .from('coaching_companies')
            .select('id, name')
            .ilike('name', `%${normalizedSearch}%`)
            .limit(1);

          if (compError) {
            console.error('Coaching company lookup error:', compError);
            return res.status(400).json({
              error: 'Invalid organization',
              message: `Could not find organization: "${organization_id}"`
            });
          }

          if (companies && companies.length > 0) {
            // Found in coaching_companies - but organization_id filter is for client orgs
            // Return helpful error message
            return res.status(400).json({
              error: 'Invalid filter',
              message: `"${organization_id}" is a coaching company, not a client organization. Try removing the organization_id filter to search all data, or use a client organization name like "Acme Media" or "TechCorp Inc".`
            });
          } else {
            return res.status(400).json({
              error: 'Organization not found',
              message: `No organization found with name: "${organization_id}". Available client organizations: check /api/organizations endpoint.`
            });
          }
        }
      }
    }

    // Generate embedding for query
    console.log(`Searching for: "${query}" with filters:`, {
      types: types || 'all',
      coach_id,
      client_id,
      organization_id: resolved_organization_id
    });
    const queryEmbedding = await generateEmbedding(query);
    const queryEmbeddingText = formatEmbeddingForDB(queryEmbedding);

    // Call vector search function with filters
    const { data: chunks, error: searchError } = await supabase
      .rpc('match_data_chunks', {
        query_embedding_text: queryEmbeddingText,
        filter_types: types,
        filter_coach_id: coach_id,
        filter_client_id: client_id,
        filter_org_id: resolved_organization_id,
        match_threshold: threshold,
        match_count: limit
      });

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error('Search failed');
    }

    // Fetch additional context for results
    if (chunks && chunks.length > 0) {
      const dataItemIds = [...new Set(chunks.map(c => c.data_item_id))];
      const { data: dataItems } = await supabase
        .from('data_items')
        .select('id, session_date, visibility_level, client_organization_id, created_at')
        .in('id', dataItemIds);

      // Map additional fields to results
      const dataItemMap = Object.fromEntries(
        dataItems.map(d => [d.id, d])
      );

      chunks.forEach(chunk => {
        const item = dataItemMap[chunk.data_item_id];
        if (item) {
          chunk.session_date = item.session_date;
          chunk.visibility_level = item.visibility_level;
          chunk.client_organization_id = item.client_organization_id;
          chunk.created_at = item.created_at;

          // Backward compatibility fields
          chunk.meeting_date = item.session_date;
          chunk.transcript_id = chunk.data_item_id;
        }
      });
    }

    console.log(`Found ${chunks?.length || 0} results`);

    res.json({
      query,
      results: chunks || [],
      count: chunks?.length || 0,
      filters_applied: {
        types,
        coach_id,
        client_id,
        organization_id
      },
      threshold,
      limit
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * OpenAPI Schema
 *
 * GET /openapi.json
 *
 * Returns OpenAPI 3.0 schema for Custom GPT integration
 */
app.get('/openapi.json', (req, res) => {
  const schema = {
    openapi: '3.1.0',
    info: {
      title: 'Unified Data Layer API',
      version: '0.12.0',
      description: 'Multi-type semantic search API for coaching data (transcripts, assessments, models, org docs). Returns relevant chunks for AI platform synthesis with type-aware filtering.'
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://unified-data-layer.vercel.app'
          : `http://localhost:${PORT}`
      }
    ],
    paths: {
      '/api/search': {
        post: {
          summary: 'Search coaching data semantically with filters',
          operationId: 'searchCoachingData',
          description: 'Search across multiple data types (transcripts, assessments, coaching models, company docs) using semantic similarity. Supports filtering by type, coach, client, and organization.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Natural language search query',
                      example: 'What leadership development patterns emerged?'
                    },
                    types: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
                      },
                      description: 'Filter by data types. Omit to search all types.',
                      example: ['transcript', 'assessment']
                    },
                    coach_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Filter results by coach ID'
                    },
                    client_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Filter results by client ID'
                    },
                    organization_id: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Filter results by client organization ID'
                    },
                    threshold: {
                      type: 'number',
                      description: 'Similarity threshold (0.0-1.0). Higher = more precise.',
                      default: 0.3,
                      minimum: 0,
                      maximum: 1
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of results to return',
                      default: 10,
                      minimum: 1,
                      maximum: 50
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results with type-aware filtering',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid', description: 'Chunk ID' },
                            data_item_id: { type: 'string', format: 'uuid', description: 'Parent data item ID' },
                            data_type: {
                              type: 'string',
                              enum: ['transcript', 'assessment', 'coaching_model', 'company_doc'],
                              description: 'Type of data'
                            },
                            content: { type: 'string', description: 'Matching text chunk' },
                            similarity: { type: 'number', description: 'Similarity score (0-1)' },
                            coach_id: { type: 'string', format: 'uuid' },
                            client_id: { type: 'string', format: 'uuid' },
                            client_organization_id: { type: 'string', format: 'uuid' },
                            session_date: { type: 'string', format: 'date-time' },
                            visibility_level: { type: 'string' },
                            metadata: { type: 'object', description: 'Type-specific metadata' },
                            transcript_id: { type: 'string', format: 'uuid', description: 'Legacy field (=data_item_id)' },
                            meeting_date: { type: 'string', format: 'date-time', description: 'Legacy field (=session_date)' }
                          }
                        }
                      },
                      count: { type: 'number' },
                      filters_applied: {
                        type: 'object',
                        properties: {
                          types: { type: 'array', items: { type: 'string' } },
                          coach_id: { type: 'string' },
                          client_id: { type: 'string' },
                          organization_id: { type: 'string' }
                        }
                      },
                      threshold: { type: 'number' },
                      limit: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/transcripts/upload': {
        post: {
          summary: 'Upload a text transcript',
          operationId: 'uploadTranscript',
          description: 'Upload coaching transcript text. Automatically chunks and embeds.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: {
                      type: 'string',
                      description: 'Transcript text (minimum 50 characters)',
                      minLength: 50
                    },
                    meeting_date: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Meeting date (defaults to now)'
                    },
                    coach_id: {
                      type: 'string',
                      format: 'uuid'
                    },
                    client_id: {
                      type: 'string',
                      format: 'uuid'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Transcript uploaded successfully'
            }
          }
        }
      },
      '/api/v2/clients': {
        get: {
          summary: 'List accessible clients',
          operationId: 'listClients',
          description: 'List clients accessible to the authenticated user. Coaches see their assigned clients, clients see only themselves, admins see all clients in their company.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 },
              description: 'Maximum number of results'
            }
          ],
          responses: {
            '200': {
              description: 'List of accessible clients',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      clients: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            name: { type: 'string' },
                            email: { type: 'string' },
                            created_at: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      total: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v2/clients/{clientId}/timeline': {
        get: {
          summary: 'Get client timeline',
          operationId: 'getClientTimeline',
          description: 'Returns chronological history of all data for a specific client. Useful for reviewing coaching journey.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'clientId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Client ID'
            },
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter by start date (ISO format)'
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter by end date (ISO format)'
            },
            {
              name: 'types',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated data types to filter'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 },
              description: 'Maximum results'
            }
          ],
          responses: {
            '200': {
              description: 'Client timeline with data items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      client_id: { type: 'string', format: 'uuid' },
                      client_name: { type: 'string' },
                      timeline: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            date: { type: 'string', format: 'date' },
                            data_type: { type: 'string' },
                            title: { type: 'string' },
                            summary: { type: 'string' },
                            data_item_id: { type: 'string', format: 'uuid' },
                            coach: {
                              type: 'object',
                              properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' }
                              }
                            }
                          }
                        }
                      },
                      total_items: { type: 'integer' },
                      by_type: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v2/clients/{clientId}/data': {
        get: {
          summary: 'Get client data items',
          operationId: 'getClientData',
          description: 'Returns all data items for a specific client with full content. More detailed than timeline.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'clientId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
              description: 'Client ID'
            },
            {
              name: 'types',
              in: 'query',
              schema: { type: 'string' },
              description: 'Comma-separated data types to filter'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 100 },
              description: 'Maximum results'
            },
            {
              name: 'include_chunks',
              in: 'query',
              schema: { type: 'boolean', default: false },
              description: 'Include chunk data'
            }
          ],
          responses: {
            '200': {
              description: 'Client data items with full content',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      client_id: { type: 'string', format: 'uuid' },
                      client_name: { type: 'string' },
                      items: { type: 'array' },
                      total: { type: 'integer' },
                      by_type: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v2/search/unified': {
        post: {
          summary: 'Enhanced unified search',
          operationId: 'unifiedSearch',
          description: 'Enhanced search with timing metadata and results grouped by type.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'Search query' },
                    types: { type: 'array', items: { type: 'string' } },
                    threshold: { type: 'number', default: 0.3 },
                    limit: { type: 'integer', default: 10, maximum: 50 }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Search results with metadata',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results_by_type: { type: 'object' },
                      type_counts: { type: 'object' },
                      total_results: { type: 'integer' },
                      metadata: {
                        type: 'object',
                        properties: {
                          response_time_ms: { type: 'integer' },
                          query: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v2/search/filtered': {
        post: {
          summary: 'Search with explicit filter structure',
          operationId: 'filteredSearch',
          description: 'Search with structured filters for complex queries. Supports date ranges, multiple filter dimensions, and output options. Best for advanced filtering needs like "Find all transcripts from Q1 2025 about leadership".',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: {
                      type: 'string',
                      description: 'Natural language search query',
                      example: 'leadership challenges and growth'
                    },
                    filters: {
                      type: 'object',
                      description: 'Structured filter object for complex queries',
                      properties: {
                        types: {
                          type: 'array',
                          items: {
                            type: 'string',
                            enum: ['transcript', 'assessment', 'coaching_model', 'company_doc']
                          },
                          description: 'Filter by data types',
                          example: ['transcript', 'assessment']
                        },
                        date_range: {
                          type: 'object',
                          description: 'Filter by date range',
                          properties: {
                            start: {
                              type: 'string',
                              format: 'date',
                              description: 'Start date (ISO format)',
                              example: '2025-01-01'
                            },
                            end: {
                              type: 'string',
                              format: 'date',
                              description: 'End date (ISO format)',
                              example: '2025-12-31'
                            }
                          }
                        },
                        clients: {
                          type: 'array',
                          items: { type: 'string', format: 'uuid' },
                          description: 'Filter by client IDs'
                        },
                        coaches: {
                          type: 'array',
                          items: { type: 'string', format: 'uuid' },
                          description: 'Filter by coach IDs'
                        },
                        organizations: {
                          type: 'array',
                          items: { type: 'string', format: 'uuid' },
                          description: 'Filter by organization IDs'
                        }
                      }
                    },
                    options: {
                      type: 'object',
                      description: 'Search options',
                      properties: {
                        threshold: {
                          type: 'number',
                          default: 0.3,
                          minimum: 0,
                          maximum: 1,
                          description: 'Similarity threshold (lower = broader results)'
                        },
                        limit: {
                          type: 'integer',
                          default: 10,
                          maximum: 50,
                          description: 'Maximum results to return'
                        },
                        include_metadata: {
                          type: 'boolean',
                          default: true,
                          description: 'Include metadata in results'
                        },
                        include_content: {
                          type: 'boolean',
                          default: true,
                          description: 'Include content in results'
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Filtered search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      query: { type: 'string' },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            content: { type: 'string' },
                            similarity: { type: 'number' },
                            data_type: { type: 'string' },
                            title: { type: 'string' },
                            session_date: { type: 'string' }
                          }
                        }
                      },
                      count: { type: 'integer' },
                      filters_applied: { type: 'object' },
                      options_applied: { type: 'object' },
                      metadata: {
                        type: 'object',
                        properties: {
                          response_time_ms: { type: 'integer' },
                          user_role: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': {
              description: 'Authentication required'
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key authentication. Get your API key from the admin dashboard.'
        }
      }
    }
  };

  res.json(schema);
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
    available_routes: [
      'GET /api/health',
      'POST /api/search',
      'POST /api/transcripts/upload',
      'POST /api/transcripts/upload-pdf',
      'POST /api/data/upload',
      'GET /openapi.json',
      // V2 endpoints
      'GET /api/v2/clients (requires auth)',
      'GET /api/v2/clients/:id/timeline (requires auth)',
      'GET /api/v2/clients/:id/data (requires auth)',
      'POST /api/v2/search/unified (requires auth)',
      'POST /api/v2/search/filtered (requires auth)',
      // MCP endpoints
      'GET /api/mcp/sse (requires auth, SSE)',
      'POST /api/mcp/messages (requires auth)',
      // Admin endpoints
      'GET /api/admin/users (requires auth)',
      'POST /api/admin/users (requires auth)',
      'GET /api/admin/users/:id (requires auth)',
      'PUT /api/admin/users/:id (requires auth)',
      'DELETE /api/admin/users/:id (requires auth)',
      'GET /api/admin/api-keys (requires auth)',
      'POST /api/admin/api-keys (requires auth)',
      'GET /api/admin/api-keys/:id (requires auth)',
      'PUT /api/admin/api-keys/:id/revoke (requires auth)',
      'PUT /api/admin/api-keys/:id/activate (requires auth)',
      'DELETE /api/admin/api-keys/:id (requires auth)'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ============================================
// SERVER START
// ============================================

// Only start server if running locally (not in Vercel serverless)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 Unified Data Layer API Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📖 OpenAPI schema: http://localhost:${PORT}/openapi.json`);
    console.log('='.repeat(50) + '\n');
  });
}

// Export for Vercel serverless
export default app;
