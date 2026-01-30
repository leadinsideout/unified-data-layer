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
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { DataProcessorFactory } from './processors/index.js';
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/auth.js';
import { VERSION } from './version.js';
import { createAdminRoutes } from './routes/admin.js';
import { createApiKeyRoutes } from './routes/api-keys.js';
import { createAdminAuthRoutes, createAdminSessionMiddleware } from './routes/admin-auth.js';
import { createV2ClientRoutes, createV2SearchRoutes, createV2TranscriptRoutes } from './routes/v2/index.js';
import { createMCPRoutes } from './mcp/index.js';
import { createFirefliesRoutes } from './integrations/fireflies.js';
import { createAnalyticsMiddleware, logCostEvent, calculateEmbeddingCost } from './middleware/analytics.js';

// Load environment variables
dotenv.config();

// Initialize Sentry for error tracking (if configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  });
  console.log('✅ Sentry error tracking initialized');
}

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

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For admin.html inline scripts
      scriptSrcAttr: ["'unsafe-inline'"], // For onclick handlers in admin.html
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://*.supabase.co"],
    }
  },
  crossOriginEmbedderPolicy: false, // Allow Custom GPT to call API
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin requests
}));

// Rate limiting - general API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  message: { error: 'Too many requests', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - stricter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 min per IP
  message: { error: 'Too many login attempts', message: 'Please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/admin/auth', authLimiter);

// CORS configuration - hardened for production
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' && allowedOrigins
    ? allowedOrigins
    : '*', // Allow all in development or if CORS_ORIGINS not set
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-sync-secret']
}));

// JSON body parser (skip endpoints that need raw body for signature verification)
app.use((req, res, next) => {
  // Skip JSON parsing for endpoints that need raw body
  if (req.path === '/api/mcp/messages' || req.path === '/api/integrations/fireflies/webhook') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Explicit route for admin dashboard (needed for Vercel serverless)
app.get('/admin', (req, res) => {
  const adminPath = path.join(__dirname, '..', 'public', 'admin.html');
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).json({ error: 'Admin dashboard not found' });
  }
});

// Request logging middleware with debug support
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  req.debugId = `req-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
  req.startTime = Date.now();

  console.log(`[${timestamp}] ${req.method} ${req.path}`);

  // Debug mode logging
  if (req.query.debug === 'true') {
    debugLog(req, 'request_received', {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).filter(k => k !== 'debug').reduce((o, k) => { o[k] = req.query[k]; return o; }, {})
    });
  }

  next();
});

/**
 * Debug logging helper for request tracing
 * Only logs when ?debug=true is passed
 */
function debugLog(req, step, data = {}) {
  if (req.query.debug === 'true') {
    const reqId = req.debugId || 'unknown';
    const elapsed = req.startTime ? Date.now() - req.startTime : 0;
    console.log(JSON.stringify({
      debug: true,
      reqId,
      step,
      elapsed_ms: elapsed,
      timestamp: Date.now(),
      ...data
    }));
  }
}

// Analytics middleware - logs API usage to database
const analyticsMiddleware = createAnalyticsMiddleware(supabase);
app.use(analyticsMiddleware);

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

// Admin data upload endpoint (needs multer from server.js)
app.post('/api/admin/data/upload', adminSessionMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { auth } = req;

    // Verify user is an admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('coaching_company_id')
      .eq('id', auth.userId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'No file provided'
      });
    }

    const { data_type, coach_id, client_id, session_date, title } = req.body;

    if (!data_type || !coach_id) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'data_type and coach_id are required'
      });
    }

    // Verify coach belongs to company
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', coach_id)
      .eq('coaching_company_id', admin.coaching_company_id)
      .single();

    if (coachError || !coach) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid coach_id'
      });
    }

    // Get file content
    let content = req.file.buffer.toString('utf-8');

    // Handle PDF files
    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      content = pdfData.text;
    }

    // Handle JSON files - extract text content
    if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content);
        content = JSON.stringify(jsonData, null, 2);
      } catch (e) {
        // Keep as-is if not valid JSON
      }
    }

    // Prepare metadata for processor
    const metadata = {
      dataType: data_type,
      coachId: coach_id,
      clientId: client_id || null,
      sessionDate: session_date || null,
      title: title || req.file.originalname,
      companyId: admin.coaching_company_id
    };

    // For assessments, add required assessment_type field
    if (data_type === 'assessment') {
      metadata.assessment_type = req.body.assessment_type || '360'; // Default to 360 review
      metadata.client_id = metadata.clientId; // AssessmentProcessor expects client_id not clientId
      metadata.coach_id = metadata.coachId; // Also pass coach_id
    }

    // Get processor and process the data
    const processor = processorFactory.getProcessor(data_type);
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

    console.log(`[Admin Upload] Saved ${data_type} with ID ${insertedItem.id}, creating ${chunks.length} chunks...`);

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
      message: 'File uploaded and processed successfully',
      dataItemId: insertedItem.id,
      chunksCreated: chunks.length
    });

  } catch (error) {
    console.error('Error uploading data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Register API key routes (session OR API key auth)
const apiKeyRoutes = createApiKeyRoutes(supabase, adminSessionMiddleware);
app.use('/api/admin/api-keys', apiKeyRoutes);

// Register v2 routes (for MCP server and Enhanced Custom GPT)
const v2ClientRoutes = createV2ClientRoutes(supabase, authMiddleware);
const v2SearchRoutes = createV2SearchRoutes(supabase, authMiddleware);
const v2TranscriptRoutes = createV2TranscriptRoutes(supabase, authMiddleware);
app.use('/api/v2/clients', v2ClientRoutes);
app.use('/api/v2/search', v2SearchRoutes);
app.use('/api/v2/transcripts', v2TranscriptRoutes);

// Register MCP routes (Model Context Protocol for AI assistants)
const mcpRoutes = createMCPRoutes(supabase, openai, authMiddleware);
app.get('/api/mcp/sse', ...mcpRoutes.handleSSE);
app.post('/api/mcp/messages', ...mcpRoutes.handleMessages);

// Register Fireflies.ai integration routes (Phase 5)
const firefliesRoutes = createFirefliesRoutes(supabase, openai);
app.use('/api/integrations/fireflies', firefliesRoutes);

/**
 * Submit Tester Feedback
 *
 * POST /api/feedback
 *
 * Allows GPT testers to submit feedback directly to the database.
 * Requires authentication (API key).
 *
 * Body:
 *   {
 *     "session_id": "unique-session-identifier",
 *     "errors": "What errors were encountered",
 *     "friction": "What felt off or clunky",
 *     "successes": "What went well",
 *     "additional_notes": "Any other comments"
 *   }
 */
app.post('/api/feedback', authMiddleware, async (req, res) => {
  try {
    const { session_id, errors, friction, successes, additional_notes, chat_summary } = req.body;

    // Debug logging
    debugLog(req, 'feedback_received', { session_id });

    // Validation
    if (!session_id || typeof session_id !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'session_id is required'
      });
    }

    // Determine tester type and persona from auth context
    let tester_type = 'unknown';
    let persona_name = 'Unknown';

    if (req.auth.coachId) {
      tester_type = 'coach';
      // Look up coach name
      const { data: coach } = await supabase
        .from('coaches')
        .select('name')
        .eq('id', req.auth.coachId)
        .single();
      if (coach) persona_name = coach.name;
    } else if (req.auth.clientId) {
      tester_type = 'client';
      // Look up client name
      const { data: client } = await supabase
        .from('clients')
        .select('name')
        .eq('id', req.auth.clientId)
        .single();
      if (client) persona_name = client.name;
    }

    debugLog(req, 'feedback_persona_resolved', { tester_type, persona_name });

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('tester_feedback')
      .insert({
        session_id,
        tester_type,
        persona_name,
        errors: errors || null,
        friction: friction || null,
        successes: successes || null,
        additional_notes: additional_notes || null,
        chat_summary: chat_summary || null,
        api_key_id: req.auth.apiKeyId
      })
      .select()
      .single();

    if (insertError) {
      console.error('Feedback insert error:', insertError);
      debugLog(req, 'feedback_error', { error: insertError.message });
      throw new Error('Failed to save feedback');
    }

    debugLog(req, 'feedback_saved', { feedback_id: feedback.id });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: feedback.id
    });

  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Feedback submission failed',
      message: error.message
    });
  }
});

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
    version: VERSION,
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
      // Feedback endpoint (for GPT testers)
      feedback: 'POST /api/feedback (submit tester feedback)',
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
    version: VERSION,
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
      coach_id: body_coach_id = null,
      client_id: body_client_id = null,
      organization_id = null,
      threshold = 0.3,
      limit = 10
    } = req.body;

    // SECURITY: Use authenticated user's coach_id/client_id if available
    // This ensures multi-tenant isolation - users can only see their own data
    let coach_id = body_coach_id;
    let client_id = body_client_id;
    let auth_client_ids = null; // For coaches: list of their client IDs

    if (req.auth) {
      if (req.auth.coachId) {
        // Authenticated as a coach - ALWAYS use their coach_id and get their client list
        coach_id = req.auth.coachId;

        // Get list of clients this coach can access
        const { data: coachClients, error: clientsError } = await supabase
          .from('coach_clients')
          .select('client_id')
          .eq('coach_id', coach_id);

        if (!clientsError && coachClients) {
          auth_client_ids = coachClients.map(c => c.client_id);
          console.log(`Coach ${coach_id} has access to ${auth_client_ids.length} clients`);
        }

        // If body_client_id was provided, verify coach has access to that client
        if (body_client_id && auth_client_ids && !auth_client_ids.includes(body_client_id)) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have access to this client'
          });
        }
        // If specific client requested and authorized, use it
        if (body_client_id && auth_client_ids && auth_client_ids.includes(body_client_id)) {
          client_id = body_client_id;
        }
      } else if (req.auth.clientId) {
        // Authenticated as a client - can ONLY see their own data
        client_id = req.auth.clientId;
        coach_id = null; // Client shouldn't filter by coach
        console.log(`Client ${client_id} searching their own data`);
      }
    }

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
        // Normalize the search term more aggressively
        const normalizedSearch = organization_id
          .replace(/[-_]/g, ' ')                              // Replace hyphens/underscores with spaces
          .replace(/\s+/g, ' ')                               // Collapse multiple spaces
          .replace(/inc\.?|llc\.?|corp\.?|company/gi, '')     // Remove common suffixes
          .trim()
          .toLowerCase();

        // Try multiple search strategies for flexibility
        const searchStrategies = [
          normalizedSearch,                                   // Full normalized: "acme media"
          normalizedSearch.split(' ')[0],                     // First word only: "acme"
          normalizedSearch.replace(/\s/g, ''),                // No spaces: "acmemedia"
        ].filter(s => s.length > 0);

        let foundOrg = null;
        let allMatches = [];

        // Try client_organizations with each strategy
        for (const searchTerm of searchStrategies) {
          const { data: orgs, error: orgError } = await supabase
            .from('client_organizations')
            .select('id, name')
            .ilike('name', `%${searchTerm}%`)
            .limit(5);

          if (orgError) {
            console.error('Organization lookup error:', orgError);
            continue;
          }

          if (orgs && orgs.length === 1) {
            // Exact single match found
            foundOrg = orgs[0];
            break;
          } else if (orgs && orgs.length > 1) {
            // Multiple matches - collect for disambiguation
            allMatches = [...new Map([...allMatches, ...orgs].map(o => [o.id, o])).values()];
          }
        }

        if (foundOrg) {
          resolved_organization_id = foundOrg.id;
          console.log(`Resolved organization "${organization_id}" to ID: ${resolved_organization_id} (${foundOrg.name})`);
        } else if (allMatches.length > 1) {
          // Multiple matches found - return helpful disambiguation error
          return res.status(400).json({
            error: 'Ambiguous organization',
            message: `Multiple organizations match "${organization_id}". Did you mean: ${allMatches.map(o => o.name).join(', ')}?`
          });
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
      auth_client_ids: auth_client_ids ? auth_client_ids.length : 'none',
      organization_id: resolved_organization_id
    });
    const queryEmbedding = await generateEmbedding(query);
    const queryEmbeddingText = formatEmbeddingForDB(queryEmbedding);

    // Call vector search function with filters
    let chunks;
    let searchError;

    // For authenticated coaches with a client list, we need to filter post-query
    // since the RPC doesn't support client_ids array filtering
    if (auth_client_ids && auth_client_ids.length > 0 && !client_id) {
      // Get more results and filter by client_ids
      const { data: rawChunks, error: rawError } = await supabase
        .rpc('match_data_chunks', {
          query_embedding_text: queryEmbeddingText,
          filter_types: types,
          filter_coach_id: coach_id, // Still filter by coach_id if available in data
          filter_client_id: null, // Don't filter single client
          filter_org_id: resolved_organization_id,
          match_threshold: threshold,
          match_count: limit * 5 // Get more to account for filtering
        });

      if (rawError) {
        searchError = rawError;
      } else {
        // Filter by authorized client_ids OR coach-owned data (client_id is null)
        chunks = (rawChunks || []).filter(chunk =>
          auth_client_ids.includes(chunk.client_id) ||
          (chunk.client_id === null && chunk.coach_id === coach_id)
        ).slice(0, limit);
        console.log(`Filtered ${rawChunks?.length || 0} results to ${chunks.length} for authorized clients/coach-owned`);
      }
    } else {
      // Standard query (single client or no auth)
      const { data: rawChunks, error: rawError } = await supabase
        .rpc('match_data_chunks', {
          query_embedding_text: queryEmbeddingText,
          filter_types: types,
          filter_coach_id: coach_id,
          filter_client_id: client_id,
          filter_org_id: resolved_organization_id,
          match_threshold: threshold,
          match_count: limit
        });
      chunks = rawChunks;
      searchError = rawError;
    }

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
      version: VERSION,
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
          description: 'Semantic search across transcripts, assessments, coach_assessment (MBTI/strengths), coaching_model (CLG), company_doc. Filter by type, coach, client, org.',
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
                        enum: ['transcript', 'assessment', 'coach_assessment', 'coaching_model', 'company_doc']
                      },
                      description: 'Filter by data types. Types: transcript (sessions), assessment (client intake), coach_assessment (coach\'s own MBTI/strengths/etc), coaching_model (frameworks), company_doc. Omit to search all.',
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
                              enum: ['transcript', 'assessment', 'coach_assessment', 'coaching_model', 'company_doc'],
                              description: 'Type of data (coach_assessment = coach\'s own MBTI/strengths assessments)'
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
      '/api/v2/transcripts/recent': {
        get: {
          summary: 'List recent transcripts',
          operationId: 'getRecentTranscripts',
          description: 'List recent transcripts by date. Returns CLIENT COACHING sessions by default. Use session_type=all to include internal meetings.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'session_type',
              in: 'query',
              schema: {
                type: 'string',
                default: 'client_coaching',
                enum: ['client_coaching', 'internal_meeting', 'networking', 'sales_call', 'staff_1on1', 'training', '360_interview', 'other', 'all']
              },
              description: 'Filter by session type. Default is "client_coaching" (only client sessions). Use "all" to include internal meetings, networking, etc.'
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20, maximum: 50 },
              description: 'Maximum results (default 20, max 50)'
            },
            {
              name: 'start_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter by start date (ISO format, e.g., 2025-12-01)'
            },
            {
              name: 'end_date',
              in: 'query',
              schema: { type: 'string', format: 'date' },
              description: 'Filter by end date (ISO format, e.g., 2025-12-31)'
            },
            {
              name: 'client_id',
              in: 'query',
              schema: { type: 'string', format: 'uuid' },
              description: 'Filter by specific client ID'
            }
          ],
          responses: {
            '200': {
              description: 'List of recent transcripts',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      transcripts: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            title: { type: 'string' },
                            session_date: { type: 'string', format: 'date-time' },
                            session_type: { type: 'string', description: 'Type of session (client_coaching, internal_meeting, etc.)' },
                            client_name: { type: 'string', nullable: true },
                            client_id: { type: 'string', format: 'uuid', nullable: true },
                            created_at: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      total: { type: 'integer' },
                      filters_applied: {
                        type: 'object',
                        properties: {
                          coach_id: { type: 'string', format: 'uuid' },
                          session_type: { type: 'string', description: 'Session type filter applied (default: client_coaching)' },
                          start_date: { type: 'string', nullable: true },
                          end_date: { type: 'string', nullable: true },
                          client_id: { type: 'string', format: 'uuid', nullable: true },
                          limit: { type: 'integer' }
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
                            enum: ['transcript', 'assessment', 'coach_assessment', 'coaching_model', 'company_doc']
                          },
                          description: 'Filter by data types. coach_assessment = coach\'s own MBTI/strengths assessments (not client assessments)',
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
                        },
                        session_type: {
                          type: 'string',
                          enum: ['client_coaching', 'internal_meeting', 'networking', 'sales_call', 'staff_1on1', 'training', '360_interview', 'other', 'all'],
                          description: 'Filter by session type. Use "all" to include all types. Only applies to transcripts.'
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
                          description: 'Include content in results. Set to false for listing queries to avoid size limits.'
                        },
                        max_content_length: {
                          type: 'integer',
                          default: 2000,
                          minimum: 100,
                          maximum: 10000,
                          description: 'Maximum characters per content field. Content exceeding this is truncated. Use lower values (e.g., 1000) for broad searches.'
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
                        description: 'Search results with citation information for source tracking',
                        items: {
                          type: 'object',
                          properties: {
                            content: { type: 'string', description: 'The matching content chunk' },
                            similarity: { type: 'number', description: 'Relevance score 0-1' },
                            data_type: { type: 'string', description: 'Type of data (transcript, assessment, etc.)' },
                            data_item_id: { type: 'string', format: 'uuid', description: 'ID of the parent data item' },
                            session_date: { type: 'string', description: 'Date of the session' },
                            client_name: { type: 'string', description: 'Name of the client (if applicable)' },
                            citation: {
                              type: 'object',
                              description: 'Citation information for source tracking. ALWAYS include this in your responses to cite sources.',
                              properties: {
                                title: { type: 'string', description: 'Document/session title' },
                                date: { type: 'string', description: 'Session date (ISO format)' },
                                date_formatted: { type: 'string', description: 'Human-readable date (e.g., "Dec 15, 2025")' },
                                type: { type: 'string', description: 'Data type (transcript, assessment, etc.)' },
                                client_name: { type: 'string', description: 'Client name if applicable' },
                                source_url: { type: 'string', description: 'Direct link to source (e.g., Fireflies URL) if available' },
                                formatted: { type: 'string', description: 'Pre-formatted citation string like "[Brad & Ryan Session, Dec 15, 2025]"' }
                              }
                            }
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
      },
      '/api/feedback': {
        post: {
          summary: 'Submit tester feedback',
          operationId: 'submitFeedback',
          description: 'Submit feedback about the GPT experience directly to the database. Used for internal testing feedback collection. The feedback is automatically associated with the authenticated persona.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['session_id'],
                  properties: {
                    session_id: {
                      type: 'string',
                      description: 'Unique identifier for this feedback session (generate using timestamp + random string)',
                      example: '2025-11-28T10-30-abc123'
                    },
                    errors: {
                      type: 'string',
                      description: 'What errors were encountered during the chat?',
                      example: 'The timeline endpoint returned a 500 error once'
                    },
                    friction: {
                      type: 'string',
                      description: 'What felt off, clunky, or could be improved?',
                      example: 'Had to ask twice for the client list'
                    },
                    successes: {
                      type: 'string',
                      description: 'What went well?',
                      example: 'Search was fast and accurate, loved the pattern recognition'
                    },
                    additional_notes: {
                      type: 'string',
                      description: 'Any other feedback or observations?',
                      example: 'Overall very promising, would use this daily'
                    },
                    chat_summary: {
                      type: 'string',
                      description: 'A brief summary of the conversation topics discussed in this chat session',
                      example: 'User asked about client timeline, searched for leadership patterns, and reviewed assessment data'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Feedback submitted successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Feedback submitted successfully' },
                      feedback_id: { type: 'string', format: 'uuid' }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request (missing session_id)'
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
      },
      schemas: {
        SearchRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: {
              type: 'string',
              description: 'The search query text'
            },
            limit: {
              type: 'integer',
              default: 5,
              description: 'Maximum number of results to return'
            },
            threshold: {
              type: 'number',
              default: 0.3,
              description: 'Minimum similarity threshold (0-1)'
            },
            filter_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by data types (transcript, assessment, model, company_doc)'
            }
          }
        },
        SearchResult: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            similarity: { type: 'number' },
            metadata: { type: 'object' },
            data_item: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                data_type: { type: 'string' },
                session_date: { type: 'string' }
              }
            }
          }
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            version: { type: 'string' },
            environment: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
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

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Report to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        path: req.path,
        method: req.method,
        query: req.query,
      }
    });
  }

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
