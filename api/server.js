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
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import multer from 'multer';
import pdfParse from 'pdf-parse';

// Load environment variables
dotenv.config();

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

// JSON body parser
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

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
  return '[' + embedding.join(',') + ']';
}

// ============================================
// ROUTES
// ============================================

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
    version: '0.2.1',
    description: 'Semantic search API for coaching transcripts',
    endpoints: {
      health: 'GET /api/health',
      upload: 'POST /api/transcripts/upload',
      uploadPdf: 'POST /api/transcripts/upload-pdf',
      search: 'POST /api/search',
      openapi: 'GET /openapi.json'
    },
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
    version: '0.1.0',
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
app.post('/api/transcripts/upload', async (req, res) => {
  try {
    const { text, meeting_date, coach_id, client_id, metadata } = req.body;

    // Validation
    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Invalid transcript',
        message: 'Transcript text must be at least 50 characters'
      });
    }

    // Insert transcript
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        raw_text: text,
        meeting_date: meeting_date || new Date().toISOString(),
        coach_id,
        client_id,
        metadata
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Database error:', transcriptError);
      throw new Error('Failed to save transcript');
    }

    // Chunk the text
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks for transcript ${transcript.id}`);

    // Generate embeddings and save chunks
    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        transcript_id: transcript.id,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding)
      });
    }

    // Batch insert chunks
    const { error: chunksError } = await supabase
      .from('transcript_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      throw new Error('Failed to save transcript chunks');
    }

    res.status(201).json({
      transcript_id: transcript.id,
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
app.post('/api/transcripts/upload-pdf', upload.single('file'), async (req, res) => {
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

    // Insert transcript (reuse same logic as text upload)
    const { data: transcript, error: transcriptError } = await supabase
      .from('transcripts')
      .insert({
        raw_text: text,
        meeting_date: req.body.meeting_date || new Date().toISOString(),
        coach_id: req.body.coach_id,
        client_id: req.body.client_id,
        metadata
      })
      .select()
      .single();

    if (transcriptError) {
      console.error('Database error:', transcriptError);
      throw new Error('Failed to save transcript');
    }

    // Chunk and embed
    const chunks = chunkText(text);
    console.log(`Created ${chunks.length} chunks from PDF ${req.file.originalname}`);

    const chunkRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await generateEmbedding(chunks[i]);
      chunkRecords.push({
        transcript_id: transcript.id,
        chunk_index: i,
        content: chunks[i],
        embedding: formatEmbeddingForDB(embedding)
      });
    }

    const { error: chunksError } = await supabase
      .from('transcript_chunks')
      .insert(chunkRecords);

    if (chunksError) {
      console.error('Chunks insert error:', chunksError);
      throw new Error('Failed to save transcript chunks');
    }

    res.status(201).json({
      transcript_id: transcript.id,
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
app.post('/api/search', async (req, res) => {
  try {
    const { query, threshold = 0.3, limit = 5 } = req.body;

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

    // Generate embedding for query
    console.log(`Searching for: "${query}"`);
    const queryEmbedding = await generateEmbedding(query);
    const queryEmbeddingText = formatEmbeddingForDB(queryEmbedding);

    // Call vector search function
    const { data: chunks, error: searchError } = await supabase
      .rpc('match_transcript_chunks', {
        query_embedding_text: queryEmbeddingText,
        match_threshold: threshold,
        match_count: limit
      });

    if (searchError) {
      console.error('Search error:', searchError);
      throw new Error('Search failed');
    }

    // Fetch meeting dates for results
    if (chunks && chunks.length > 0) {
      const transcriptIds = [...new Set(chunks.map(c => c.transcript_id))];
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('id, meeting_date')
        .in('id', transcriptIds);

      // Map meeting dates to results
      const transcriptMap = Object.fromEntries(
        transcripts.map(t => [t.id, t.meeting_date])
      );

      chunks.forEach(chunk => {
        chunk.meeting_date = transcriptMap[chunk.transcript_id];
      });
    }

    console.log(`Found ${chunks?.length || 0} results`);

    res.json({
      results: chunks || [],
      query,
      count: chunks?.length || 0,
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
    openapi: '3.0.0',
    info: {
      title: 'Unified Data Layer API',
      version: '0.1.0',
      description: 'Semantic search API for coaching transcripts. Returns relevant transcript chunks for AI platform synthesis.'
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
          summary: 'Search transcripts semantically',
          operationId: 'searchTranscripts',
          description: 'Search coaching transcripts using semantic similarity. Returns relevant chunks for AI synthesis.',
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
                      example: 'What did the client discuss about career goals?'
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
                      default: 5,
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
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      results: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string', format: 'uuid' },
                            transcript_id: { type: 'string', format: 'uuid' },
                            content: { type: 'string' },
                            similarity: { type: 'number' },
                            meeting_date: { type: 'string', format: 'date-time' }
                          }
                        }
                      },
                      query: { type: 'string' },
                      count: { type: 'number' }
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
      'GET /openapi.json'
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
