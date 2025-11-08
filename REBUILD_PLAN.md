# Unified Data Layer - Rebuild Plan

## Overview

This document outlines the complete rebuild plan for the Unified Data Layer project. The rebuild creates a fresh codebase with a new Supabase database, following the product roadmap with a **phased approach and checkpoints**.

**Last Updated**: 2025-11-08

---

## North Star Goal

**Test Phase 1 with Custom GPT integration to validate that:**
1. Transcripts can be uploaded and processed
2. Custom GPT can query the data layer via API
3. Fresh data is retrieved automatically without manual context updates
4. The architecture proves viable before investing in Phases 2-4

---

## Project Vision

A unified data layer that ingests, processes, and serves multiple data types (transcripts, assessments, personality profiles, etc.) through AI-powered interfaces, with security and privacy built into the core architecture.

---

## Strategic Approach

### Why AI Platforms First?

1. **Custom GPTs and Claude Projects (via MCP) are the PRIMARY interface** - not custom frontends
2. Coaches interact with data through familiar AI assistants (ChatGPT, Claude)
3. Validates architecture quickly without building custom UI
4. Custom frontends (Phases 7-8) come AFTER validating with AI platforms
5. Reduces time-to-market significantly

### Core Architectural Principle

**Our API provides DATA, AI platforms provide SYNTHESIS**

- Custom GPT and Claude already have powerful LLMs built-in
- They don't need us to synthesize answers - they need relevant data
- We provide semantic search to return the right chunks
- They use their native GPT-4/Claude to synthesize answers
- **Result**: Simpler, faster, cheaper, no redundant API calls

### Critical Path

```
Phase 1 (Now) → Validate Custom GPT works with transcripts
     ↓
Phase 2 → Add more data types if Phase 1 succeeds
     ↓
Phase 3 → Security BEFORE exposing to real coaches (4-5 weeks)
     ↓
Phase 4 → Full AI Platform Integration (MCP + Custom GPT, 3-4 weeks)
     ↓
Phase 5-6 → Production deployment + Fireflies integration
     ↓
Phase 7-8 → Custom frontends (optional - AI platforms may be sufficient)
```

**Total Timeline to Full AI Integration**: 10-13 weeks (per product-roadmap.md)

---

## Phase 1: Transcript Foundation + Custom GPT Proof of Concept

**Duration**: 2-3 weeks
**Status**: In Progress

### Objectives

1. Rebuild MVP from scratch with clean codebase
2. Deploy to Vercel for public HTTPS access
3. Create OpenAPI schema for Custom GPT
4. Test Custom GPT integration with live transcript data
5. Validate fresh data retrieval (north star test)

### Deliverables

- ✅ Working Express API with transcript upload and semantic search
- ✅ Supabase database with pgvector extension for vector similarity
- ✅ Embedding generation pipeline (chunk → embed → store)
- ✅ Deployed to Vercel with HTTPS endpoint
- ✅ OpenAPI schema for Custom GPT integration
- ✅ Custom GPT that searches transcripts with fresh data
- ✅ Documentation of Phase 1 learnings

### What's NOT Included (Deferred or Removed)

- ❌ RAG synthesis endpoint - Custom GPT handles this natively
- ❌ Demo web UI - Custom GPT is the interface
- ❌ CLI search tools - Not needed for north star test
- ❌ Transcript list/retrieve endpoints - Add later if needed

---

## Phase 1 Implementation: Phased with Checkpoints

### **Checkpoint 1: Local MVP Foundation**

Build and test core functionality locally before deploying.

#### Tasks 1-10: Core System

1. **Project Structure & Git**
   - Create directory structure: `api/`, `scripts/`, `public/`
   - Initialize Git repository
   - Create initial README

2. **Supabase Project Setup**
   - Create new Supabase project at supabase.com
   - Choose region, set password
   - Note project URL and service_role key

3. **Database Schema**
   ```sql
   -- Enable pgvector extension
   CREATE EXTENSION IF NOT EXISTS vector;

   -- Transcripts table
   CREATE TABLE transcripts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     raw_text TEXT,
     meeting_date TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW(),
     metadata JSONB,
     coach_id UUID,
     client_id UUID,
     fireflies_meeting_id TEXT
   );

   -- Chunks table with vector embeddings
   CREATE TABLE transcript_chunks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
     chunk_index INTEGER,
     content TEXT,
     embedding vector(1536),
     created_at TIMESTAMP DEFAULT NOW(),
     UNIQUE(transcript_id, chunk_index)
   );

   -- Indexes
   CREATE INDEX idx_transcript_chunks_transcript_id
     ON transcript_chunks(transcript_id);
   CREATE INDEX idx_transcript_chunks_embedding
     ON transcript_chunks
     USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 100);
   ```

4. **Vector Search Function**
   ```sql
   CREATE OR REPLACE FUNCTION match_transcript_chunks(
     query_embedding_text TEXT,
     match_threshold FLOAT DEFAULT 0.3,
     match_count INT DEFAULT 5
   )
   RETURNS TABLE (
     id UUID,
     transcript_id UUID,
     content TEXT,
     similarity FLOAT
   )
   LANGUAGE plpgsql
   AS $$
   BEGIN
     RETURN QUERY
     SELECT
       tc.id,
       tc.transcript_id,
       tc.content,
       1 - (tc.embedding <=> query_embedding_text::vector) AS similarity
     FROM transcript_chunks tc
     WHERE 1 - (tc.embedding <=> query_embedding_text::vector) > match_threshold
     ORDER BY tc.embedding <=> query_embedding_text::vector
     LIMIT match_count;
   END;
   $$;
   ```

5. **Node.js Project Initialization**
   ```json
   {
     "name": "unified-data-layer",
     "version": "1.0.0",
     "type": "module",
     "scripts": {
       "start": "node api/server.js",
       "dev": "node --watch api/server.js"
     },
     "dependencies": {
       "@supabase/supabase-js": "^2.75.0",
       "cors": "^2.8.5",
       "dotenv": "^17.2.3",
       "express": "^5.1.0",
       "multer": "^2.0.2",
       "openai": "^6.3.0",
       "pdf-parse": "^1.1.1"
     }
   }
   ```

6. **Environment Configuration**
   - Create `.env` with Supabase URL, service key, OpenAI API key
   - Create `.env.example` template
   - Create `.gitignore` to exclude sensitive files

7. **Express API Server** (`api/server.js`)
   - Health check endpoint: `GET /api/health`
   - CORS configuration
   - JSON body parsing
   - Error handling middleware

8. **Transcript Upload Endpoints**
   - `POST /api/transcripts/upload` - Text upload with automatic embedding
   - `POST /api/transcripts/upload-pdf` - PDF upload with parsing
   - Returns transcript ID and processing confirmation

9. **Embedding Generation Script** (`scripts/embed.js`)
   - Fetch transcript from database
   - Chunk text (500 words, 50-word overlap)
   - Generate embeddings via OpenAI API (`text-embedding-3-small`)
   - Store in `transcript_chunks` table
   - Limit precision to 9 significant figures

10. **Semantic Search Endpoint**
    - `POST /api/search` - Vector similarity search
    - Accepts: query text, optional threshold, optional limit
    - Returns: relevant chunks with similarity scores, transcript metadata
    - Custom GPT will use this to retrieve data for synthesis

#### Checkpoint 1 Validation

**Test Locally:**
```bash
npm run dev
```

**Validation Steps:**
1. Upload a test transcript via POST `/api/transcripts/upload`
2. Run embedding generation: `node scripts/embed.js`
3. Test search: POST `/api/search` with query "career goals"
4. Verify results contain relevant chunks with similarity scores
5. Test health check: GET `/api/health`

**Success Criteria:**
- ✅ All endpoints respond without errors
- ✅ Transcript uploads successfully and triggers embedding generation
- ✅ Embeddings generate correctly (1536-dimensional vectors)
- ✅ Search returns relevant results with similarity scores
- ✅ Results include transcript metadata (meeting_date, ids)

---

### **Checkpoint 2: Deployment & Public Access**

Deploy to Vercel and ensure API is publicly accessible.

#### Tasks 11-13: Deploy & OpenAPI

11. **Deploy to Vercel**
    ```bash
    # Install Vercel CLI
    npm i -g vercel

    # Deploy
    vercel --prod
    ```

    **Configuration:**
    - Set environment variables in Vercel dashboard
    - Configure CORS to allow Custom GPT domain
    - Ensure all endpoints work over HTTPS

12. **Create OpenAPI Schema**
    - Create `api/openapi.json` with API specification
    - Add endpoint: `GET /openapi.json` to serve schema
    - Document endpoints for Custom GPT:
      - `POST /api/search` - Primary endpoint for semantic search
      - `POST /api/transcripts/upload` - For uploading new transcripts
    - **Note**: Custom GPT handles synthesis, we just provide data via search

#### Checkpoint 2 Validation

**Test Deployment:**
```bash
# Test health check
curl https://your-app.vercel.app/api/health

# Test search
curl -X POST https://your-app.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "career goals", "threshold": 0.3, "limit": 5}'
```

**Success Criteria:**
- ✅ API accessible via HTTPS
- ✅ All endpoints work in production
- ✅ Environment variables loaded correctly
- ✅ OpenAPI schema accessible at `/openapi.json`
- ✅ CORS configured properly

---

### **Checkpoint 3: Custom GPT Integration (North Star Test)**

Test Custom GPT integration to validate the entire approach.

#### Tasks 14-16: Custom GPT Setup & Testing

14. **Set Up Custom GPT**

    **Steps:**
    1. Go to ChatGPT → Explore GPTs → Create
    2. Configure GPT:
       - **Name**: "Coaching Transcript Analyst"
       - **Description**: "Search and analyze coaching transcripts"
       - **Instructions**:
         ```
         You are a coaching transcript analyst. You help coaches search
         through their client transcripts and answer questions about
         client progress, patterns, and insights. Use the available
         tools to search transcripts and answer questions based on
         the retrieved data.
         ```
    3. **Actions** → Import OpenAPI schema:
       - Upload `openapi.json` or paste URL: `https://your-app.vercel.app/openapi.json`
    4. **Authentication**:
       - Phase 1: None (testing only) OR API Key (basic)
       - Future: OAuth 2.0 (Phase 3)
    5. **Privacy**: Turn OFF "Use conversation data in your GPT to improve our models"

15. **Test Custom GPT Integration**

    **Test Scenario 1: Basic Search**
    1. Upload a test transcript via API
    2. In Custom GPT, ask: "Search for transcripts about career change"
    3. **Verify**: Custom GPT calls `/search` endpoint and returns relevant chunks

    **Test Scenario 2: Fresh Data Retrieval (NORTH STAR)**
    1. Upload a NEW transcript with specific content:
       - Example: "The client discussed their fear of public speaking and gave a presentation at work this week"
    2. In Custom GPT, immediately ask: "What did the client discuss about public speaking?"
    3. **Verify**: Custom GPT retrieves the fresh data WITHOUT manual context updates
    4. **Verify**: Response includes the new information about the presentation

    **Test Scenario 3: Natural Language Q&A with GPT Synthesis**
    1. Ask Custom GPT: "What progress has the client made on their confidence goals?"
    2. **Verify**: Custom GPT uses `/search` endpoint to retrieve relevant chunks
    3. **Verify**: Custom GPT synthesizes answer using its built-in GPT-4 capabilities
    4. **Verify**: Answer is grounded in actual transcript content
    5. **Verify**: Custom GPT cites which transcript chunks it used

16. **Document Phase 1 Learnings**

    Create `PHASE_1_RESULTS.md`:
    - What worked with Custom GPT integration
    - What challenges were encountered
    - Performance metrics (response times, accuracy)
    - API usage and costs
    - User experience observations
    - Recommendations for Phase 4 (full AI Platform Integration)

#### Checkpoint 3 Validation

**Success Criteria:**
- ✅ Custom GPT successfully calls `/search` endpoint
- ✅ Fresh transcripts are searchable immediately after upload
- ✅ Custom GPT synthesizes answers using retrieved chunks
- ✅ No manual context updates required
- ✅ Response time < 5 seconds for search queries
- ✅ Search accuracy is satisfactory for coaching use cases
- ✅ Custom GPT correctly cites transcript sources in answers

**If Successful**: Proceed to Phase 2 planning
**If Issues Found**: Iterate on Phase 1 before moving forward

---

## Technology Stack

### Core Stack
- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express.js 5.1.0
- **Database**: Supabase (PostgreSQL + pgvector extension)
- **Vector Search**: pgvector with IVFFLAT indexing
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **File Upload**: Multer 2.0.2
- **PDF Parsing**: pdf-parse 1.1.1
- **Deployment**: Vercel

### Minimal API Surface

**Phase 1 includes only 4 endpoints:**
```
POST /api/transcripts/upload       # Upload text transcript
POST /api/transcripts/upload-pdf   # Upload PDF transcript
POST /api/search                   # Semantic search (primary endpoint for Custom GPT)
GET  /api/health                   # Health check
GET  /openapi.json                 # OpenAPI schema for Custom GPT
```

**What we're NOT building in Phase 1:**
- ❌ RAG/synthesis endpoints (Custom GPT handles this)
- ❌ List/retrieve transcript endpoints (add if needed later)
- ❌ Demo web UI (Custom GPT is the interface)
- ❌ CLI tools (not needed for north star test)

### Key Configuration

**Text Chunking:**
- 500 words per chunk
- 50-word overlap between chunks
- Word-based (not token-based)

**Search Parameters:**
- Default similarity threshold: 0.3
- Default result limit: 5
- Range: 0.0 (different) to 1.0 (identical)

**OpenAI API Usage:**
- Embeddings: `text-embedding-3-small` (for chunk vectorization)
- Custom GPT uses GPT-4 (provided by OpenAI, not our API calls)

---

## Future Phases (Reference Only)

### Phase 2: Multi-Data-Type Architecture (3-4 weeks)
- Refactor to support multiple data types
- Add assessments, personality profiles, session notes
- Unified processing pipeline
- Type-aware search and retrieval

### Phase 3: Security & Privacy (4-5 weeks) - CRITICAL
- PII scrubbing pipeline (LLM-based)
- Row-level security (RLS) in Supabase
- API key management for multi-tenant access
- Compliance audit (HIPAA, GDPR, CCPA)

### Phase 4: Full AI Platform Integration (3-4 weeks)
- MCP server for Claude Projects
- Enhanced Custom GPT with full features
- API v2 optimizations
- Multi-tenant authentication
- Documentation for coaches

### Phase 5: Data Source Integrations
- Fireflies.ai automatic transcript sync
- Google Calendar integration
- Zoom, Microsoft Teams transcripts

### Phase 6: Production Optimization
- Infrastructure hardening
- Performance monitoring
- Cost tracking
- Error tracking (Sentry)

### Phase 7-8: Custom Frontends (Long-term)
- Coach dashboard
- Client portal
- Mobile applications

**Note**: Custom frontends are low priority since AI platforms provide the primary interface.

---

## Success Metrics

### Phase 1 Success (Current)
- ✅ Upload and search transcripts via API
- ✅ Semantic search returns relevant chunks with similarity scores
- ✅ Custom GPT integration validated (north star test)
- ✅ Fresh data retrieval without manual updates
- ✅ Custom GPT successfully synthesizes answers from search results

### Phase 2-3 Success (Future)
- Support 3+ data types
- PII scrubbing >95% accuracy
- Sub-second search across all data types
- Zero data leakage between clients

### Phase 4 Success (Future)
- 5+ coaches using AI platform integration
- Sub-2-second response time for AI queries
- Zero security incidents
- Custom GPT and Claude Projects both working

### Long-term Success
- 50+ coaches using the platform
- 1000+ data items across all types
- <1% error rate on PII scrubbing
- 99.9% uptime
- Positive ROI on AI platform approach

---

## Key Decisions & Rationale

### Why Phased with Checkpoints?
- Validates each component before moving forward
- Reduces risk of building on faulty foundation
- Allows for iteration and learning
- Easier to debug and troubleshoot

### Why Vercel?
- Free tier available
- Automatic HTTPS
- Fast deployment
- Environment variable support
- Good for serverless Node.js APIs

### Why Custom GPT Testing in Phase 1?
- Validates the entire architecture early
- Proves the "north star" concept before heavy investment
- Tests real-world usage pattern
- Identifies issues before Phases 2-4

### Why Security in Phase 3, Not Phase 1?
- Phase 1 is proof of concept with test data
- Security requires 4-5 weeks (cannot rush)
- Must be done before exposing to real coaches
- Better to validate architecture first, then secure it

### Why No RAG/Synthesis Endpoints?
- Custom GPT already has GPT-4 built-in for synthesis
- We'd be calling GPT to answer questions... for a Custom GPT running on GPT
- This creates redundant API calls and doubles costs
- AI platforms (Custom GPT, Claude) handle synthesis better than we can
- Our value is in semantic search, not synthesis
- Simpler codebase = faster to build and maintain

---

## Reference Documents

- **Product Roadmap**: `/product-roadmap.md` - Strategic vision and phase details
- **Old MVP**: `/udlmvp-deprecated/` - Reference implementation (do not use directly)
- **Phase 1 Results**: `/PHASE_1_RESULTS.md` - Created after Checkpoint 3

---

## Current Status

**Phase**: 1
**Checkpoint**: Pre-Checkpoint 1 (Setup)
**Last Updated**: 2025-11-08

**Next Steps**:
1. Initialize project structure
2. Set up Supabase database
3. Build core API endpoints
4. Test locally (Checkpoint 1)
