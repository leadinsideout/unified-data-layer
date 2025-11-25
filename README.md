# Unified Data Layer

Semantic search API for coaching data (transcripts, assessments, coaching models, company docs), designed for AI platform integration (Custom GPT, Claude Desktop via MCP).

**Architecture Principle**: Our API provides DATA (via semantic search), AI platforms provide SYNTHESIS (using their native GPT-4/Claude).

## Status

**Phase 4 In Progress** ⏳ (67% Complete) | **Version**: v0.12.0

### Phase 1: Transcript Foundation ✅ (Nov 1-11, 2025)
- ✅ Express API server with semantic search
- ✅ Automatic transcript upload & embedding generation
- ✅ Supabase (PostgreSQL + pgvector) integration
- ✅ OpenAI embeddings (text-embedding-3-small)
- ✅ Vercel deployment (production & preview)
- ✅ Custom GPT integration validated
- ✅ Tier 1 workflow automation (changelog, commitlint, Slack)

### Phase 2: Multi-Data-Type Architecture ✅ (Nov 12, 2025)
- ✅ Multi-type schema (transcript, assessment, model, company_doc)
- ✅ User/organization tables (companies, coaches, clients, organizations)
- ✅ Type-aware search with multi-dimensional filtering
- ✅ 16 transcripts migrated with zero data loss
- ✅ Performance: 1.6-2.1s queries (exceeds <3s target)
- ✅ Backward compatible API

### Phase 3: Security & Privacy ✅ (Nov 19-24, 2025)
- ✅ PII scrubbing pipeline (hybrid regex + GPT detection, 96% accuracy)
- ✅ Row-level security (42 RLS policies across 12 tables)
- ✅ API key authentication with bcrypt hashing
- ✅ Admin dashboard for user & API key management

### Phase 4: AI Platform Integration ⏳ (Nov 25, 2025 - In Progress)
- ✅ **Checkpoint 11**: MCP Server with SSE transport (Claude Desktop compatible)
- ✅ 3 MCP tools: `search_data`, `upload_data`, `get_client_timeline`
- ✅ V2 REST API endpoints for enhanced client/search operations
- ✅ **Checkpoint 12**: Enhanced Custom GPT with v2 endpoints and auth docs
- 🔴 Checkpoint 13: Multi-Tenant Verification (Next)

**Production URL**: https://unified-data-layer.vercel.app

**Next**: Checkpoint 13 - Multi-Tenant Verification

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

### Core Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/search` | POST | Semantic search with type/coach/client filters |
| `/api/transcripts/upload` | POST | Upload text transcript |
| `/api/transcripts/upload-pdf` | POST | Upload PDF transcript |
| `/api/data/upload` | POST | Upload any data type |
| `/openapi.json` | GET | OpenAPI schema for Custom GPT |

### V2 Endpoints (Enhanced for AI Platforms)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/clients` | GET | List accessible clients (role-based) |
| `/api/v2/clients/:id/timeline` | GET | Client coaching timeline |
| `/api/v2/clients/:id/data` | GET | Full data items with content |
| `/api/v2/search/unified` | POST | Enhanced search with timing metadata |
| `/api/v2/search/filtered` | POST | Search with complex filters (dates, types) |

### MCP Endpoints (Model Context Protocol)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mcp/sse` | GET | SSE connection for MCP clients |
| `/api/mcp/messages` | POST | MCP message handler |

**MCP Tools Available**:
- `search_data` - Semantic search with multi-dimensional filtering
- `upload_data` - Upload new coaching data
- `get_client_timeline` - Chronological history for a client

### Example: Semantic Search
```bash
POST /api/search
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "query": "What did the client discuss about career goals?",
  "types": ["transcript"],
  "threshold": 0.3,
  "limit": 5
}
```

### OpenAPI Schema
```bash
GET /openapi.json
```

For detailed API documentation, see the OpenAPI schema or [docs/checkpoints/checkpoint-11-results.md](docs/checkpoints/checkpoint-11-results.md).

---

## Deployment

### Production

**Live URL**: https://unified-data-layer.vercel.app

The `main` branch is automatically deployed to Vercel production on every merge.

**Environment Variables** (set in Vercel dashboard):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NODE_ENV=production`

### Preview Deployments

Every pull request automatically gets a preview deployment:
- URL format: `https://unified-data-layer-git-{branch}-{team}.vercel.app`
- Test changes before merging to production
- Isolated environment per PR

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

See [docs/development/workflows.md](docs/development/workflows.md) for full deployment workflow.

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

See [docs/development/workflows.md](docs/development/workflows.md) for complete development standards.

**Automated Workflow** (Tier 1 Active):
- ✅ **Commit Validation**: Conventional commits enforced via commitlint
- ✅ **Pre-commit Hooks**: Automated checks before every commit
- ✅ **Changelog**: Auto-generated with `npm run release`
- ✅ **Slack Notifications**: PRs, deployments, checkpoints
- ✅ **Auto-deploy**: `main` → production, PRs → preview

**Quick workflow**:
1. Create feature branch from `main`: `git checkout -b phase-1-checkpoint-3`
2. Make changes and commit: `git commit -m "feat: add something"` (hooks validate)
3. Push for preview: `git push -u origin phase-1-checkpoint-3` (gets Vercel preview)
4. Create PR to `main` (Slack notification sent)
5. Merge PR → auto-deploys to production (Slack notification sent)

---

## Roadmap

**Phase 1** ✅ COMPLETE (Nov 1-11, 2025)
- ✅ Checkpoint 1: Local MVP Foundation
- ✅ Checkpoint 2: Vercel Deployment + Tier 1 Automation
- ✅ Checkpoint 3: Custom GPT Integration

**Phase 2** ✅ COMPLETE (Nov 12, 2025)
- ✅ Checkpoint 4: Schema Migration & Core Architecture
- ✅ Checkpoint 5: Multi-Type Processing Pipeline
- ✅ Checkpoint 6: Type-Aware Search & Filtering
- ✅ Checkpoint 7: Custom GPT Integration Validation

**Phase 3** ✅ COMPLETE (Nov 19-24, 2025) - Security & Privacy
- ✅ Checkpoint 8: PII Scrubbing Pipeline (v0.8.0, Nov 19)
- ✅ Checkpoint 9: Row-Level Security (v0.9.0, Nov 20)
- ✅ Checkpoint 10: Admin User & API Key Management (v0.10.0, Nov 24)

**Phase 4** ⏳ IN PROGRESS (67% Complete) - AI Platform Integration
- ✅ Checkpoint 11: MCP Server Development (v0.11.0, Nov 25)
- ✅ Checkpoint 12: Enhanced Custom GPT (v0.12.0, Nov 25)
- 🔴 Checkpoint 13: Multi-Tenant Verification (NEXT)

**Phase 5**: Data source integrations (Fireflies.ai)

**Phase 6**: Production optimization

**Target**: Phases 4-6 complete by December 15, 2025

See [docs/project/roadmap.md](docs/project/roadmap.md) for full roadmap with velocity tracking.

---

## Documentation

**For AI Assistants**: See [CLAUDE.md](CLAUDE.md) for project navigation guide

**Full Documentation**: [docs/](docs/) - All documentation organized by purpose

**Quick Links**:
- **Setup Guides**: [docs/setup/](docs/setup/) - Supabase, GitHub, deployment
- **Current Status**: [docs/checkpoints/checkpoint-12-results.md](docs/checkpoints/checkpoint-12-results.md) - Latest checkpoint
- **Checkpoint Index**: [docs/checkpoints/](docs/checkpoints/) - All checkpoint progress
- **Roadmap & Implementation**: [docs/project/roadmap.md](docs/project/roadmap.md) - Product vision with checkpoint plan
- **Workflows**: [docs/development/workflows.md](docs/development/workflows.md) - Git, testing, deployment
- **MCP Server**: [docs/checkpoints/checkpoint-11-results.md](docs/checkpoints/checkpoint-11-results.md) - MCP integration details
- **Testing**: [tests/e2e-checklist.md](tests/e2e-checklist.md) - Manual test checklist

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
