# Answers to Ryan's Questions About the Borg

Hey Ryan — here are detailed answers to each of your 6 questions. I've tried to explain everything in plain language, but I've included enough technical detail that your Claude Code can use this as reference material too.

---

## 1. Stack Overview — What's the Borg Actually Built On?

Think of the Borg as a few layers working together, like departments in a company:

### The Database: Supabase (PostgreSQL + pgvector)

**What it is**: Supabase is a managed database service. Under the hood, it runs PostgreSQL — the most widely-used production database in the world. We added an extension called **pgvector** that lets it store and search "embeddings" (more on that below).

**What it does**: Stores everything — coaching transcripts, assessments, client records, API keys, usage logs. It also handles security at the database level (Row-Level Security), so even if someone bypasses the API, the database itself enforces who can see what.

**Analogy**: If the Borg were a building, Supabase is the vault where all the documents are stored, with its own security guards.

**Account**: supabase.com — Project ID: `wzebnjilqolwykmeozna`

### The API Server: Express.js (Node.js)

**What it is**: Express is a web framework that runs on Node.js. It's the part that receives requests from the outside world (your Custom GPT, the Vault app, Claude via MCP) and talks to the database.

**What it does**: Handles authentication (API keys), processes uploads, runs searches, serves the admin dashboard, manages the Fireflies integration. It's one file (`api/server.js`) plus supporting modules for routes, processors, and integrations.

**Analogy**: Express is the receptionist. You walk in, say what you need, and it goes to the vault, gets the right documents, and hands them back.

### The Hosting: Vercel

**What it is**: Vercel is a cloud platform that runs the API server. When code is pushed to GitHub, Vercel automatically deploys it to the internet.

**What it does**: Makes the Borg accessible at `https://unified-data-layer.vercel.app`. Handles scaling, SSL certificates, and deployment previews for testing changes before they go live.

**Analogy**: Vercel is the building itself — the physical space where the receptionist (Express) works.

**Account**: vercel.com — Team: `leadinsideout`

### The Intelligence Layer: OpenAI Embeddings

**What it is**: We use OpenAI's `text-embedding-3-small` model to convert text into numerical representations called "embeddings" — 1,536-dimensional vectors that capture the *meaning* of the text, not just keywords.

**What it does**: When you upload a coaching transcript, the Borg breaks it into chunks, sends each chunk to OpenAI to get its embedding, and stores the embedding alongside the text. When you search "leadership challenges with Brad," OpenAI converts your question into an embedding, and pgvector finds the stored chunks whose meaning is closest to your question. This is why it can find relevant content even when the exact words don't match.

**Analogy**: OpenAI is the translator that converts human language into a format the vault's filing system understands.

**Account**: platform.openai.com
**Cost**: ~$0.00002 per 1,000 tokens (extremely cheap — a full coaching transcript costs about $0.001 to embed)

### The AI Bridge: MCP Server (Model Context Protocol)

**What it is**: MCP is a protocol that lets AI assistants (like Claude) connect directly to external tools and data sources. The Borg has a built-in MCP server.

**What it does**: When you use Claude Code or Claude Desktop, the MCP connection lets Claude search the Borg, upload data, and pull client timelines — all without you needing to copy/paste API calls. It's the same API endpoints, just accessed through a different door that AI tools understand natively.

**Analogy**: If the API is the front door, MCP is a direct internal line that Claude can call.

### The Automation: GitHub Actions + Fireflies.ai

**What it is**: GitHub Actions are automated workflows that run on a schedule or when things happen in the codebase.

**What it does**: Every 10 minutes, a GitHub Action calls the Fireflies.ai API, checks for new coaching transcripts, matches them to the right coach and client by email, and stores them in the Borg automatically. It also sends Slack notifications when transcripts are saved or when a client can't be matched.

**Account**: Fireflies.ai (for transcript API access)

### Architecture Diagram (Simplified)

```
Your Custom GPT ──┐
                   │
The Vault App ─────┤──→ Express API ──→ Supabase (PostgreSQL + pgvector)
                   │      ↑                    ↑
Claude (via MCP) ──┘      │                    │
                     OpenAI Embeddings    Row-Level Security
                     (meaning extraction)  (data isolation)
                           
Fireflies.ai ──→ GitHub Actions (every 10 min) ──→ Express API ──→ Supabase
```

---

## 2. Write Access — Can We Push Content Into the Borg?

**Short answer**: Yes, absolutely. Write/ingest is fully built and has been working in production since Phase 2.

The API key you have right now (in BORG-INTEGRATION.md) is intentionally **read-only** — that was a safety choice so your Vault app couldn't accidentally modify coaching data. But the system has full write capabilities.

### How Data Gets Into the Borg Today

There are **6 ways** to ingest content:

| Method | Best For | How It Works |
|--------|----------|--------------|
| **Admin Dashboard** | Manual uploads | Web UI at `/admin` — upload files (PDF, Word, text), pick the coach/client/type |
| **Fireflies Auto-Sync** | Coaching transcripts | Runs every 10 minutes, pulls new transcripts from Fireflies, matches coach/client by email |
| **MCP Tool** | Claude-powered uploads | Tell Claude "upload this to the Borg" and it uses the `upload_data` MCP tool |
| **REST API** | App integrations | `POST /api/data/upload` — programmatic upload from any app |
| **Bulk Upload API** | Large batches | `POST /api/transcripts/bulk-upload` — up to 100 items at once |
| **CLI Tool** | Developer batch imports | `node scripts/upload-transcripts.js data/my-file.json` |

### For the Vault Specifically

Your Vault content (articles, book summaries, frameworks) would go in as:

- **Articles/newsletters**: Data type = `blog_post`
- **Books/frameworks**: Data type = `company_doc` or `coaching_model`
- **Curated content**: Data type = `company_doc`

To push Vault content into the Borg, you'd either:
1. **Use Claude Code** with MCP — tell Claude "upload this article to the Borg as a blog_post" and it handles the API call
2. **Build an integration** in the Vault app — call the upload API endpoint with a write-scoped API key
3. **Use the admin dashboard** — manually upload files through the web UI

To enable write access from an app, we'd generate a new API key with `write` scope (takes 30 seconds in the admin dashboard).

### What Happens on Upload

Every piece of content goes through this pipeline:
1. **Validation** — Is the content long enough? Is the file type supported?
2. **Chunking** — Break into ~1,000-character pieces with overlap (so context isn't lost at chunk boundaries)
3. **PII Scrubbing** (optional) — Detect and redact personal information
4. **Embedding** — Send each chunk to OpenAI to get its vector representation
5. **Storage** — Save the original content + all chunks + embeddings in Supabase

---

## 3. Multi-Coach in Practice

**Short answer**: Built AND actively used. Multiple IOL coaches are in the system with real data.

### How It Works

Every piece of data in the Borg is owned by a specific coach (via `coach_id`). When Ryan's API key hits the search endpoint, the database automatically filters to only show Ryan's data. Another coach with their own API key would only see their data. This isn't enforced at the application level — it's enforced at the **database level** through 42 Row-Level Security (RLS) policies, meaning even a bug in the code can't leak data across coaches.

### What Onboarding a New Coach Looks Like

Here's the actual process (can be done entirely through the admin dashboard or Claude Code):

1. **Create the coach record** — Name, email, company association (~1 minute)
2. **Generate an API key** — Scoped to the new coach (~30 seconds)
3. **Create a Custom GPT** — Import the OpenAPI schema, add the API key (~5 minutes)
4. **Set up Fireflies** (optional) — If the coach uses Fireflies, their email gets auto-matched to their transcripts
5. **Upload initial data** (optional) — Any existing transcripts, assessments, or frameworks

Total time: ~10-15 minutes per coach.

### Verification

This was rigorously tested in Phase 4 (Checkpoint 13): 42 integration tests with 3 coach personas, 44 coaching transcripts with unique isolation markers, 100% data isolation confirmed. No coach could see another coach's data under any test scenario.

---

## 4. Public vs. Private Scoping

**Short answer**: Already built. The Borg has a 4-level visibility system.

### The 4 Visibility Levels

| Level | Who Can See It | Use Case |
|-------|---------------|----------|
| `private` | Only the client (+ admin) | Sensitive client data, personal notes |
| `coach_only` | The coach + their assigned clients | Coaching transcripts, session notes, assessments |
| `org_visible` | Everyone in the client's organization | Shared team documents, org-wide assessments |
| `public` | Anyone with a valid API key | Published articles, frameworks, Vault content |

### How This Maps to the Vault

This is actually a great fit for your vision:

- **Vault articles** (public knowledge base) → visibility = `public`, type = `blog_post`
- **Coaching transcripts** (private) → visibility = `coach_only`, type = `transcript`
- **Client assessments** (private) → visibility = `coach_only` or `private`, type = `assessment`
- **IOL frameworks** (shared) → visibility = `public`, type = `coaching_model`

When the Vault app searches the Borg, it would only return `public` content — no coaching transcripts, no client data. The same database, the same search engine, but the visibility filter ensures complete separation.

### Enforcement

This is enforced at the database level via RLS policies, not application code. Even if someone builds a buggy frontend, the database won't return data the user shouldn't see.

---

## 5. PII Scrubbing

**Short answer**: Built and operational. Collective intelligence layer is architecturally possible but not yet implemented as a standalone feature.

### What's Built Today

The Borg has a hybrid PII detection pipeline (built in Phase 3, Checkpoint 8):

**Layer 1 — Regex Detection** (fast, high-confidence patterns):
- Email addresses, phone numbers, SSNs, credit card numbers, URLs, IP addresses

**Layer 2 — GPT Detection** (context-aware, catches what regex misses):
- Names in context ("Brad mentioned his wife Sarah...")
- Addresses, medical information, financial details
- Uses GPT-4o-mini for detection (~$0.0005 per document)

**Performance**: 96% accuracy, processes a 50K+ character document in ~37 seconds, costs about half a cent per document.

**How it works**: When enabled (`PII_SCRUBBING_ENABLED=true`), every document that enters the Borg goes through the pipeline before storage. Detected PII is replaced with placeholders like `[NAME]`, `[EMAIL]`, `[PHONE]`. An audit trail records what was redacted and where.

### The Collective Intelligence Vision

Your idea — querying patterns across all coaches' sessions without exposing client identities — is architecturally possible because:

1. PII scrubbing can strip identifiers before storage
2. The `public` visibility level allows cross-coach queries
3. The search engine doesn't care about ownership when visibility = `public`

What would need to be built:
- A "scrub and publish" workflow that takes coach-specific data, runs it through PII scrubbing, and stores a sanitized copy with `public` visibility
- A "collective" data type or tag to distinguish anonymized research data from regular public content
- A search interface (or Custom GPT) specifically for querying the collective layer

This is a meaningful but manageable feature — probably a few days of Claude Code work once the requirements are clear.

---

## 6. The Handoff — What You Need to Take Ownership

### Accounts You'll Need Access To

| Service | What It Does | URL | Cost |
|---------|-------------|-----|------|
| **GitHub** | Source code repository | github.com/leadinsideout/unified-data-layer | Free (public/private repos) |
| **Supabase** | Database + vector store | supabase.com (project: `wzebnjilqolwykmeozna`) | Free tier → ~$25/mo Pro |
| **Vercel** | Hosting + deployments | vercel.com (team: `leadinsideout`) | Free tier → ~$20/mo Pro |
| **OpenAI** | Embeddings + PII detection | platform.openai.com | ~$1-5/mo at current usage |
| **Fireflies.ai** | Transcript auto-sync | app.fireflies.ai | Depends on plan (you may already have this) |

### Environment Variables You'll Need

These are the "keys" that connect the Borg to its services. They live in a `.env` file that never gets committed to GitHub:

| Variable | What It Connects To | Where to Find It |
|----------|-------------------|-----------------|
| `SUPABASE_URL` | Your Supabase database | Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_KEY` | Admin access to database | Supabase dashboard → Settings → API (service_role key) |
| `OPENAI_API_KEY` | Embedding generation | platform.openai.com → API keys |
| `FIREFLIES_API_KEY` | Transcript sync | app.fireflies.ai → Integrations → Custom |
| `FIREFLIES_WEBHOOK_SECRET` | Webhook verification | Same Fireflies settings page |
| `FIREFLIES_SYNC_SECRET` | GitHub Actions auth | You create this — any random string |
| `SLACK_ADMIN_WEBHOOK_URL` | Admin notifications | Slack app settings → Incoming Webhooks |
| `SLACK_TRANSCRIPT_WEBHOOK_URL` | Transcript notifications | Same Slack app |
| `SENTRY_DSN` | Error tracking | sentry.io → Project → Settings → Client Keys |

### DNS

No separate DNS management needed. The Borg runs at `unified-data-layer.vercel.app`, which is managed by Vercel automatically. If you ever want a custom domain (like `borg.insideoutleadership.com`), that's a 5-minute Vercel settings change.

### Ongoing Cost Estimate

Based on the pricing built into the system and typical usage patterns:

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Supabase** | $0 (free tier) → $25 (Pro) | Free tier handles current load. Pro tier if you need more storage/connections. |
| **Vercel** | $0 (Hobby) → $20 (Pro) | Free tier works for current traffic. Pro for team features + analytics. |
| **OpenAI** | ~$1-5 | Embeddings are extremely cheap. 1,000 transcripts ≈ $1. PII scrubbing adds ~$0.50/100 docs. |
| **Fireflies** | Varies | Depends on your existing plan |
| **GitHub** | $0 | Free for private repos |
| **Total estimate** | **$1-50/month** | Depends on tier choices. Could run for ~$2/mo on free tiers. |

The biggest cost driver would be upgrading Supabase or Vercel to paid tiers, which is only needed if usage grows significantly. The AI/API costs (OpenAI) are negligible at current scale.

### What JJ Will Transfer

1. **GitHub**: Add you as owner/admin to the `leadinsideout` organization
2. **Supabase**: Transfer project ownership or add you as admin
3. **Vercel**: Transfer team ownership or add you as admin
4. **OpenAI**: You'll use your own API key (or JJ transfers the existing one)
5. **Environment Variables**: JJ will share the current `.env` securely, then you rotate any secrets

---

## Bonus: The Vault + Borg Vision

Your instinct is right — building a second data layer for the Vault would duplicate work the Borg already does. Here's how I'd see it working:

**The Borg becomes the single data layer for all IOL data:**

```
The Vault (public)          Custom GPTs (private)         Claude (via MCP)
     │                            │                            │
     │ searches public            │ searches coach-scoped      │ searches all
     │ blog_post, company_doc     │ transcript, assessment     │ (scoped by API key)
     │                            │                            │
     └────────────────────────────┴────────────────────────────┘
                                  │
                          Borg API (Express)
                                  │
                    Supabase (PostgreSQL + pgvector)
                    ┌─────────────┬──────────────┐
                    │ Public data │ Private data  │
                    │ (Vault)     │ (Coaching)    │
                    │ visibility: │ visibility:   │
                    │ public      │ coach_only    │
                    └─────────────┴──────────────┘
```

**What you'd need to do:**
1. Generate a read-only API key scoped to `public` visibility for the Vault app
2. Point the Vault's search to the Borg API instead of Pinecone
3. Ingest your Vault content into the Borg as `blog_post` or `company_doc` with `public` visibility
4. Drop Pinecone (the Borg's pgvector replaces it)

**What you'd save:**
- No Pinecone subscription
- No duplicate embedding pipeline
- One search engine for everything
- Same content available to both the Vault and your coaching GPTs

---

## Questions? Bring Them to Our Session

This should give you a solid foundation. During our training session, we can dig into any of these areas — especially the hands-on stuff like using Claude Code to make changes, understanding the git workflow, and planning the Vault migration.

The more you play with the Borg between now and then (via your Custom GPT and Claude Code), the better questions you'll have. Don't worry about breaking anything — your current access is read-only, and once you have full access, we'll set up guardrails so you always have a "save point" to revert to.
