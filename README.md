# Unified Data Layer

Semantic search API for coaching transcripts, designed for AI platform integration (Custom GPT, Claude Projects via MCP).

**Architecture Principle**: Our API provides DATA (via semantic search), AI platforms provide SYNTHESIS (using their native GPT-4/Claude).

## Status

**Phase 1 - Checkpoint 1**: ✅ Local MVP Foundation (Tasks 1-10 Complete)

- ✅ Express API server with semantic search
- ✅ Automatic transcript upload & embedding generation
- ✅ Supabase (PostgreSQL + pgvector) integration
- ✅ OpenAI embeddings (text-embedding-3-small)
- 🟡 Awaiting OpenAI API key for full testing

**Next**: Checkpoint 1 Validation → Deploy to Vercel → Custom GPT integration

---

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free tier)
- OpenAI API key

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

   Required variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_KEY` - Supabase service role key
   - `OPENAI_API_KEY` - OpenAI API key

3. **Set up Supabase database**:
   - Follow `docs/setup/supabase-setup.md`
   - Run SQL files in Supabase SQL Editor:
     - `scripts/database/001_initial_schema.sql`
     - `scripts/database/002_vector_search_function.sql`

4. **Test connection**:
   ```bash
   node scripts/test-connection.js
   ```

5. **Start server**:
   ```bash
   npm run dev
   ```

   Server runs on `http://localhost:3000`

---

## API Endpoints

### Health Check
```bash
GET /api/health
```

### Upload Text Transcript
```bash
POST /api/transcripts/upload
Content-Type: application/json

{
  "text": "Coaching session transcript...",
  "meeting_date": "2025-11-08T10:00:00Z",
  "coach_id": "uuid",
  "client_id": "uuid"
}
```

### Upload PDF Transcript
```bash
POST /api/transcripts/upload-pdf
Content-Type: multipart/form-data

file: transcript.pdf
meeting_date: 2025-11-08T10:00:00Z
```

### Semantic Search
```bash
POST /api/search
Content-Type: application/json

{
  "query": "What did the client discuss about career goals?",
  "threshold": 0.3,
  "limit": 5
}
```

### OpenAPI Schema
```bash
GET /openapi.json
```

For detailed API documentation, see `docs/api/endpoints.md` (coming soon).

---

## Testing

### Manual E2E Testing

Follow the checklist in `tests/e2e-checklist.md` before completing checkpoints.

### Quick Test

```bash
# 1. Health check
curl http://localhost:3000/api/health

# 2. Upload sample transcript
curl -X POST http://localhost:3000/api/transcripts/upload \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The client discussed their career transition goals. They want to move from marketing to product management. We explored their transferable skills and created an action plan.",
    "meeting_date": "2025-11-08"
  }'

# 3. Search (use transcript_id from step 2)
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "career goals",
    "limit": 5
  }'
```

---

## Project Structure

```
unified-data-layer/
├── api/
│   └── server.js           # Express API server
├── scripts/
│   ├── database/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_vector_search_function.sql
│   ├── embed.js            # Embedding generation script
│   └── test-connection.js  # Supabase connection test
├── docs/
│   └── setup/
│       ├── supabase-setup.md
│       └── github-branch-protection.md
├── tests/
│   └── e2e-checklist.md
├── .env.example            # Environment template
├── package.json
├── vercel.json             # Vercel deployment config
├── REBUILD_PLAN.md         # Implementation plan
├── WORKFLOWS.md            # Development workflows
└── README.md               # This file
```

---

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js 5.1.0
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: OpenAI text-embedding-3-small (1536d)
- **Vector Search**: pgvector with IVFFLAT indexing
- **File Upload**: Multer + pdf-parse
- **Deployment**: Vercel

---

## How It Works

1. **Upload**: Transcript uploaded via API
2. **Chunk**: Text split into 500-word chunks (50-word overlap)
3. **Embed**: Each chunk converted to 1536-d vector via OpenAI
4. **Store**: Chunks + embeddings saved to Supabase
5. **Search**: Query converted to embedding, vector similarity search finds relevant chunks
6. **Synthesize**: Custom GPT/Claude use retrieved chunks to answer questions

---

## Development Workflow

See `WORKFLOWS.md` for complete development standards.

**Quick workflow**:
1. Create feature branch: `git checkout -b phase-1-checkpoint-1`
2. Make changes and commit: `git commit -m "feat: add something"`
3. Push and create PR: `git push -u origin phase-1-checkpoint-1`
4. Review using PR template
5. Merge to main

---

## Roadmap

**Phase 1** (Current): Transcript foundation + Custom GPT POC
- ✅ Checkpoint 1: Local MVP (Tasks 1-10)
- 🟡 Checkpoint 2: Deploy to Vercel
- 🔴 Checkpoint 3: Custom GPT integration (North Star Test)

**Phase 2**: Multi-data-type architecture (assessments, profiles)

**Phase 3**: Security & privacy (PII scrubbing, RLS)

**Phase 4**: Full AI platform integration (MCP + Custom GPT)

**Phase 5**: Data source integrations (Fireflies.ai)

**Phase 6**: Production optimization

See `product-roadmap.md` for full roadmap.

---

## Documentation

- **Setup**: `docs/setup/supabase-setup.md`
- **Workflows**: `WORKFLOWS.md`
- **Implementation Plan**: `REBUILD_PLAN.md`
- **Product Roadmap**: `product-roadmap.md`
- **Testing**: `tests/e2e-checklist.md`

---

## Troubleshooting

### "Missing environment variables" error

- Ensure `.env` file exists (copy from `.env.example`)
- Verify all required variables are set
- Check for typos in variable names

### "Failed to generate embedding" error

- Verify `OPENAI_API_KEY` is correct
- Check OpenAI API quota/billing
- Ensure API key has access to embeddings

### "Search returns no results"

- Verify embeddings were generated (check database)
- Lower similarity threshold (try 0.1)
- Check that chunks exist in transcript_chunks table

### Connection test fails

- Verify Supabase credentials are correct
- Ensure pgvector extension is enabled
- Check that SQL migration files were run

For more help, see `docs/troubleshooting.md` (coming soon).

---

## License

MIT

---

## Contributing

See `WORKFLOWS.md` for contribution guidelines and development standards.

---

**Questions?** Check the documentation in `/docs` or create an issue.
