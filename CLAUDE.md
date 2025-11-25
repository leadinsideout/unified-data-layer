# CLAUDE.md - AI Assistant Navigation Guide

**Purpose**: This file helps AI assistants (like Claude) quickly understand and navigate this project.

**Last Updated**: 2025-11-25

---

## 🎯 Project Overview

**Name**: Unified Data Layer
**Current Phase**: Phase 4 COMPLETE - AI Platform Integration (Checkpoint 13 Complete)
**Architecture**: API-first multi-type semantic search data layer

**Key Principle**: Our API provides DATA (semantic search), AI platforms provide SYNTHESIS (GPT-4/Claude).

### 🔑 Project IDs (Critical Reference)

**Supabase Project ID**: `wzebnjilqolwykmeozna`
- Project Name: Unified Data Layer
- Region: us-east-2
- Status: Active/Healthy
- Database Version: PostgreSQL 17.6.1
- **IMPORTANT**: Always use this project ID for Supabase MCP operations

**Vercel Project**:
- Production URL: https://unified-data-layer.vercel.app
- Team: leadinsideout

**GitHub Repository**:
- Owner: leadinsideout
- Repo: unified-data-layer
- Main Branch: `main`

---

## 🗺️ Project Status (Quick Reference)

**Current Branch**: `main`
**Current Version**: `v0.13.0` (Phase 4 COMPLETE - Checkpoint 13)
**Latest Tags**: `v0.13.0` (release), `v0.13.0-checkpoint-13` (checkpoint)
**Latest Documentation**: See `docs/checkpoints/checkpoint-13-results.md`

**What's Working (Phase 1 Complete ✅)**:
- ✅ Supabase database with pgvector
- ✅ Express API server (6 endpoints)
- ✅ Automatic chunking & embedding pipeline
- ✅ Semantic search with vector similarity (FIXED - subquery approach)
- ✅ Health check and upload endpoints
- ✅ Bulk upload API and CLI tool
- ✅ Sample coaching data (16 transcripts in production)
- ✅ Vercel deployment (production & preview)
- ✅ Custom GPT integration validated
- ✅ Workflow automation (Tier 1 complete)
  - Automated changelog generation (standard-version)
  - Commit message validation (commitlint)
  - Slack notifications (PRs, deployments, checkpoints)

**What's Working (Phase 2 COMPLETE ✅)**:
- ✅ **Checkpoint 4**: Schema migration & core architecture (10 tables, zero data loss)
- ✅ **Checkpoint 5**: Multi-type processors (4 types: transcript, assessment, model, doc)
- ✅ **Checkpoint 5b**: User/org seeding (1 company, 3 coaches, 2 orgs, 4 clients)
- ✅ **Checkpoint 6**: Type-aware search with multi-dimensional filtering
- ✅ **Checkpoint 7**: Custom GPT integration validation & Phase 2 completion
- ✅ Multi-type database schema with slug + JSONB pattern
- ✅ Migration: 16 transcripts → data_items with embeddings preserved (100% success)
- ✅ RPC function: `match_data_chunks` with type/coach/client/org filters
- ✅ API: Backward compatible, unified upload, type-aware search
- ✅ Performance: 1.6-2.1s queries (exceeds <3s target by 35%)
- ✅ JSONB GIN indexes for query performance
- ✅ Comprehensive documentation (500+ pages)

**Phase 2 Duration**: 1 day | **Status**: Production Ready

**What's Working (Phase 3 COMPLETE ✅)**:
- ✅ **Checkpoint 8**: PII scrubbing pipeline (hybrid regex + GPT detection)
  - 96% accuracy (24/25 tests passed)
  - 37s avg processing for 50K+ char documents
  - $0.005 per document (10x under budget)
  - 0% timeout rate, graceful degradation
- ✅ **Checkpoint 9**: Row-level security (RLS)
  - 42 RLS policies across 12 tables
  - API key authentication with bcrypt hashing
  - Multi-tenant data isolation at database level
- ✅ **Checkpoint 10**: Admin user & API key management
  - Admin users table with role hierarchy
  - 11 RESTful API endpoints
  - Web-based admin dashboard

**What's Working (Phase 4 COMPLETE ✅)**:
- ✅ **Checkpoint 11**: MCP Server Development
  - MCP server with SSE transport using `@modelcontextprotocol/sdk`
  - 3 MCP tools: `search_data`, `upload_data`, `get_client_timeline`
  - V2 REST API endpoints for enhanced client/search operations
  - OpenAPI schema updates for v2 endpoints
  - Production deployed and tested with MCP Inspector
- ✅ **Checkpoint 12**: Enhanced Custom GPT
  - Added `/api/v2/search/filtered` to OpenAPI schema
  - Updated Custom GPT setup guide with authentication instructions
  - Comprehensive v2-aware GPT instructions with workflow patterns
- ✅ **Checkpoint 13**: Multi-Tenant Verification
  - 42-test isolation suite (14 positive, 22 negative, 6 client)
  - 3 coach personas with API keys (Alex, Jordan, Sam)
  - 44 coaching transcripts with unique isolation markers
  - Bug fix: req.apiKey → req.auth property reference
  - 100% multi-tenant isolation verified

**Phase 4 Duration**: 1 day | **Status**: Production Ready

**What's Next (Phase 5)**:
- 🔴 Production monitoring and alerting
- 🔴 Performance optimization at scale
- 🔴 Advanced analytics and reporting

**Blockers**:
- None

---

## 📁 Project Structure (Navigation Map)

```
unified-data-layer/
│
├── CLAUDE.md                    ← YOU ARE HERE (AI navigation guide)
├── README.md                    ← Start here for project overview
│
├── api/server.js                ← Main API server (6 endpoints)
├── scripts/                     ← Utility scripts
│   ├── database/                ← SQL migrations
│   ├── embed.js                 ← Embedding generation
│   ├── upload-transcripts.js    ← CLI tool for bulk uploads
│   ├── seed-sample-data.js      ← Generate sample coaching data
│   └── test-connection.js       ← DB connection test
├── data/                        ← Data files
│   ├── example-upload.json      ← Template for bulk uploads
│   └── production-seed.json     ← Sample coaching transcripts
│
├── docs/                        ← ALL DOCUMENTATION
│   ├── README.md                ← Documentation index
│   ├── project/                 ← Strategic docs
│   │   ├── roadmap.md           ← Product vision & implementation plan (checkpoints)
│   │   └── phase-2-implementation-plan.md  ← Phase 2 detailed plan
│   ├── development/             ← Developer workflows
│   │   ├── workflows.md         ← Git, testing, deployment standards
│   │   ├── workflow-tracker.md  ← When to add workflows
│   │   ├── workflow-enhancement-proposal.md  ← 3-tier automation plan
│   │   ├── slack-setup-guide.md ← Slack integration setup
│   │   └── WORKFLOW_AUTOMATION_README.md     ← Automation quick start
│   ├── checkpoints/             ← Checkpoint status reports
│   │   ├── README.md            ← Checkpoint index
│   │   ├── checkpoint-1.md      ← Checkpoint 1 status
│   │   └── checkpoint-2.md      ← Latest checkpoint status
│   ├── setup/                   ← Setup guides
│   │   ├── supabase-setup.md    ← Database setup
│   │   └── github-branch-protection.md
│   └── (api/, architecture/)    ← Future docs
│
├── .github/workflows/           ← GitHub Actions
│   ├── slack-deployment.yml     ← Deployment notifications
│   ├── slack-pr.yml             ← Pull request notifications
│   └── slack-checkpoint.yml     ← Checkpoint notifications
│
├── .husky/                      ← Git hooks
│   ├── pre-commit               ← Pre-commit validation
│   └── commit-msg               ← Commit message validation
│
├── tests/e2e-checklist.md       ← Manual testing checklist
├── package.json                 ← Dependencies + npm scripts
├── .versionrc.json              ← Changelog generation config
├── .commitlintrc.json           ← Commit message rules
├── vercel.json                  ← Deployment config
└── .env.example                 ← Environment template
```

---

## 🧭 How to Navigate This Project (AI Guide)

### When User Says: "Resume from Checkpoint X"

**Step 1**: Read checkpoint status
```
File: docs/checkpoints/checkpoint-X.md
Purpose: Shows what's done, what's pending, blockers
```

**Step 2**: Check current branch/tag
```bash
git status
git log --oneline -5
git tag -l
```

**Step 3**: Read roadmap
```
File: docs/project/roadmap.md
Purpose: Understand overall implementation plan and checkpoints
```

**Step 4**: Continue from there

### When User Says: "What's the project structure?"

**Answer from**:
- This file (CLAUDE.md) - Quick overview
- README.md - User-facing overview
- docs/README.md - Documentation index

### When User Says: "How do I deploy?"

**Read**:
- docs/project/roadmap.md → Checkpoint 2 section
- vercel.json → Deployment config
- docs/development/workflows.md → Deployment workflow section

### When User Says: "What workflows should we use?"

**Read**:
- docs/development/workflows.md → Standards for git, testing, etc.
- docs/development/workflow-tracker.md → When to add workflows
- docs/development/api-versioning-strategy.md → API versioning and schema management
- .github/pull_request_template.md → PR checklist

### When User Asks: "What's in the roadmap?"

**Read**:
- docs/project/roadmap.md → 8-phase product vision with checkpoint implementation details
- docs/project/phase-2-implementation-plan.md → Detailed Phase 2 plan

### When Debugging Issues:

**Check in order**:
1. `docs/checkpoints/checkpoint-X.md` → Known issues
2. `README.md` → Troubleshooting section
3. `docs/setup/` → Setup guides
4. `api/server.js` → Implementation

---

## 🎯 Key Files by Purpose

### Strategic Planning
- `docs/project/roadmap.md` - Product vision, 8 phases, checkpoint implementation plan
- `docs/project/phase-2-implementation-plan.md` - Phase 2 detailed implementation

### Current Status
- `docs/checkpoints/checkpoint-9-results.md` - Latest checkpoint (Phase 3 - RLS Complete)
- `docs/checkpoints/README.md` - Checkpoint index
- `docs/project/PHASE_2_RESULTS.md` - Phase 2 completion summary

### Development
- `docs/development/workflows.md` - Git, testing, deployment
- `docs/development/workflow-tracker.md` - Workflow milestones
- `docs/development/api-versioning-strategy.md` - API versioning, schema management
- `.github/pull_request_template.md` - PR template

### Setup & Configuration
- `docs/setup/supabase-setup.md` - Database setup
- `.env.example` - Environment variables
- `vercel.json` - Deployment config

### Code
- `api/server.js` - Express API server
- `scripts/embed.js` - Embedding generation
- `scripts/upload-transcripts.js` - CLI tool for bulk uploads
- `scripts/seed-sample-data.js` - Generate sample coaching data
- `scripts/database/*.sql` - Database migrations

### Data Management
- `data/example-upload.json` - Template for bulk uploads
- `data/production-seed.json` - Sample coaching transcripts
- `docs/data-management.md` - Complete data management guide

### Testing
- `tests/e2e-checklist.md` - Manual test checklist

---

## 🏗️ Architecture Quick Reference

### Tech Stack
- **Runtime**: Node.js (ES Modules)
- **API**: Express.js 5.1.0
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: OpenAI text-embedding-3-small (1536d)
- **Deployment**: Vercel

### API Endpoints
```
GET  /api/health                      # Server status
POST /api/transcripts/upload          # Upload single text transcript
POST /api/transcripts/upload-pdf      # Upload single PDF transcript
POST /api/transcripts/bulk-upload     # Upload multiple transcripts (max 50)
POST /api/search                      # Semantic search
GET  /openapi.json                    # OpenAPI schema for Custom GPT
```

### Database Schema (Phase 2)
```sql
-- User/Organization Tables (8 tables)
companies, coaches, clients, organizations, client_organizations,
coach_clients, coach_organizations, audit_logs

-- Core Data Tables
data_items (
  id, data_type, slug, title, raw_content, metadata JSONB,
  company_id, coach_id, client_id, organization_id,
  session_date, created_at
)

data_chunks (
  id, data_item_id, chunk_index, content,
  embedding vector(1536), metadata JSONB, created_at
)

RPC: match_data_chunks(query_embedding, threshold, limit, filter_types, filter_coach_id, filter_client_id, filter_organization_id)
```

**Data Types Supported**: transcript, assessment, model, company_doc

### Data Flow
```
Upload → Chunk (500 words, 50 overlap) → Embed (OpenAI) →
Store (Supabase) → Search (vector similarity) → Return chunks
```

---

## 📋 Common Tasks Reference

### Task: Review current status
```
Files to read:
1. docs/checkpoints/checkpoint-9-results.md (latest status)
2. README.md (project overview)
3. git log --oneline -10 (recent commits)
```

### Task: Continue to next checkpoint
```
Files to read:
1. docs/checkpoints/checkpoint-X.md (understand current state)
2. docs/project/roadmap.md (find next checkpoint tasks)
3. docs/development/workflow-tracker.md (check workflow milestones)
```

### Task: Deploy to Vercel
```
Files to read:
1. docs/project/roadmap.md → Checkpoint 2
2. vercel.json (deployment config)
3. docs/development/workflows.md → Deployment section
4. .env.example (environment variables needed)
```

### Task: Add new feature
```
Process:
1. Create branch: git checkout -b feature/name
2. Follow docs/development/workflows.md
3. Use .github/pull_request_template.md for PR
4. Update docs/checkpoints/ if completing a checkpoint
```

### Task: Fix a bug
```
Process:
1. Check docs/checkpoints/checkpoint-X.md for known issues
2. Create branch: git checkout -b fix/description
3. Follow docs/development/workflows.md
4. Update relevant docs if fixing documented issue
```

### Task: Add data to production
```
Process:
1. Create JSON file with transcripts (see data/example-upload.json)
2. Upload via CLI: node scripts/upload-transcripts.js data/my-data.json
3. Or use bulk API: POST /api/transcripts/bulk-upload
4. Verify via search: POST /api/search with relevant query
See: docs/data-management.md for complete guide
```

---

## 🏷️ Tag Naming Convention

**Decision Date**: 2025-11-12
**Convention**: Option A - Checkpoint-Based Versioning

### Checkpoint Tags
Format: `v0.X.0-checkpoint-Y`
- X = Minor version (matches checkpoint number)
- Y = Checkpoint number (sequential)

Examples:
- Checkpoint 4 → `v0.4.0-checkpoint-4`
- Checkpoint 5 → `v0.5.0-checkpoint-5`
- Checkpoint 6 → `v0.6.0-checkpoint-6`
- Checkpoint 7 → `v0.7.0-checkpoint-7`

### Release Tags
Format: `v0.X.0`
- X = Minor version (matches checkpoint number)
- Created by `npm run release --release-as 0.X.0`

Examples:
- Checkpoint 4 complete → `v0.4.0`
- Checkpoint 7 complete (Phase 2 end) → `v0.7.0`

### Phase Complete Tags
Format: `v0.X.0` where X is the last checkpoint of the phase
- Phase 1 complete: `v0.3.0` (Checkpoint 3)
- Phase 2 complete: `v0.7.0` (Checkpoint 7)
- Phase 3 complete: `v0.10.0` (estimated, Checkpoint 10)

### Why This Convention?
- ✅ Version numbers match checkpoint numbers (predictable)
- ✅ Simple to understand and follow
- ✅ Clear progression through phases
- ✅ Consistent with semantic versioning

### GitHub Actions Triggers
- Checkpoint tags (`v*-checkpoint-*`) → Slack dev channel
- Release tags (`v0.X.0`) → Slack #team_ai channel
- Both should be created for every checkpoint completion

---

## 🎓 Understanding the User's Intent

### "Resume from..." = Continue Development
- User returning after break
- Read checkpoint status
- Check git status
- Ask about blockers (e.g., OpenAI quota)
- Continue next checkpoint tasks

### "Deploy to..." = Deployment Task
- Follow deployment workflow
- Read Checkpoint 2 from rebuild-plan.md
- Update environment variables
- Test deployment
- Document results

### "Test..." = Validation Task
- Use tests/e2e-checklist.md
- Follow checkpoint validation criteria
- Document results in checkpoint status

### "Fix..." = Debugging Task
- Check known issues in checkpoint docs
- Review relevant code in api/ or scripts/
- Follow git workflow for fixes
- Update docs if needed

---

## 🚨 Important Context

### User Preferences
- **Workflow**: Tier 1 automation active (changelog, validation, notifications)
- **Testing**: Manual E2E checklists (automated tests in Phase 2)
- **Branching**: GitHub Flow + Phase Branches
  - `main` is ALWAYS production-ready (deployed to Vercel production)
  - Checkpoint/feature branches created from `main`
  - All work merges to `main` via approved PR
  - Format: `phase-X-checkpoint-Y`, `feature/*`, `fix/*`, `hotfix/*`
- **Commits**: Conventional commits enforced via commitlint (feat, fix, docs, chore, mcp)
- **Deployment**: Vercel auto-deploy (main → production, PRs → preview)
- **Notifications**: Slack updates for PRs, deployments, checkpoints, phase completions
  - Dev notifications (#dev or project channel): PRs, deployments, checkpoints
  - Team notifications (#team_ai): Phase completions only (major releases: v1.0.0, v2.0.0)
- **Releases**:
  - Checkpoint releases: AI runs `npm run release --release-as 0.X.0` (minor versions)
  - Phase completions: AI runs `npm run release --release-as X.0.0` (major versions, notifies #team_ai)
- **MCP Tools**: Default to using MCP tools for platform operations (see MCP Tool Usage below)

### Current Blockers
- None

### Project Philosophy
- **Phased approach**: Checkpoint validation before proceeding
- **Documentation-first**: Document as you build
- **AI platform integration**: Primary interface (not custom UI)
- **Data not synthesis**: API returns data, GPT/Claude synthesize

---

## 🔄 Workflow Reminders for AI

### Session Startup Validation (Run at Start of Every Session)
**CRITICAL**: Always validate project IDs at the start of each session to avoid MCP tool errors.

```javascript
// Step 1: Validate Supabase Project ID
const SUPABASE_PROJECT_ID = 'wzebnjilqolwykmeozna';

// Step 2: Test MCP connection with correct ID
await mcp__supabase__list_projects();
// Should return: "Unified Data Layer" project

// Step 3: If MCP fails, check CLAUDE.md for current project IDs
// See: "🔑 Project IDs (Critical Reference)" section
```

**What to Validate**:
1. ✅ Supabase Project ID: `wzebnjilqolwykmeozna` (stored in CLAUDE.md)
2. ✅ Vercel deployment URL: https://unified-data-layer.vercel.app
3. ✅ GitHub repo: leadinsideout/unified-data-layer
4. ✅ MCP tools responding (test with `list_projects` first)

### Before Starting Any Task
1. ✅ **Run session startup validation** (see above)
2. ✅ Read latest checkpoint status
3. ✅ Check git status and current branch
4. ✅ Understand what's working vs pending
5. ✅ Ask about blockers if relevant

### Before Starting ANY Checkpoint (Pre-Checkpoint Cleanup Audit)
**CRITICAL**: Run this audit at the START of each checkpoint to prevent documentation drift.

1. ✅ **Check for outdated version numbers**
   - `package.json` version matches current release
   - `api/server.js` health endpoint version matches package.json
   - `api/server.js` OpenAPI schema version matches package.json
   - `api/server.js` root endpoint version matches package.json

2. ✅ **Check for status inconsistencies**
   - README.md reflects current phase/checkpoint status
   - CLAUDE.md "Latest checkpoint" points to actual latest
   - Checkpoint index (docs/checkpoints/README.md) numbering is correct
   - Phase X implementation plan status updated

3. ✅ **Check for missing documentation**
   - All completed checkpoints have results docs
   - Version history in CLAUDE.md is current
   - Git tags match documented tags

4. ✅ **Fix any issues BEFORE starting new work**
   - Present list of issues to user
   - Get approval to fix
   - Commit fixes with `docs: pre-checkpoint cleanup audit`

**Why This Matters**: Prevents documentation debt from piling up, ensures consistent project state, reduces confusion in future sessions.

### When Completing a Checkpoint
1. ✅ Create comprehensive checkpoint status doc (docs/checkpoints/checkpoint-X-results.md)
2. ✅ Update checkpoint index (docs/checkpoints/README.md)
3. ✅ **Conduct Checkpoint Retrospective** (New: Post-Checkpoint 9)
   - Create retrospective doc: `docs/checkpoints/checkpoint-X-retrospective.md`
   - Document what went well vs what went wrong
   - List all errors/blockers encountered with root causes
   - Identify lessons learned and patterns
   - Propose workflow improvements based on learnings
   - Update workflows.md if process changes needed
   - **Deliverable**: Retrospective document with actionable improvements

4. ✅ **🛑 BLOCKING: Update Methodology** (New: Post-Checkpoint 10)

   **Why This is BLOCKING**: Methodology updates capture learnings while fresh.
   Deferring creates documentation debt and lost knowledge.

   **Purpose**: Incremental methodology improvement from each checkpoint

   **Time**: 5 minutes (vs 30-45 minutes with old approach)

   **Token Cost**: ~3,400 tokens (85% savings vs 23,000 with old approach)

   **Process**:

   1. **AI analyzes retrospective** (~30 seconds)
      - Reads `docs/checkpoints/checkpoint-X-retrospective.md`
      - Identifies update categories:
        - Pitfall: Common mistake to document
        - Case study: Significant scenario with lessons
        - Workflow: New or improved process
        - Pattern: Reusable solution to recurring problem

   2. **AI selects targets** (~30 seconds)
      - Pitfall → `docs/methodology/learnings/checkpoint-X-[topic].md`
      - Case study → `docs/methodology/learnings/checkpoint-X-[topic].md`
      - Workflow → `docs/methodology/learnings/checkpoint-X-[topic].md`
      - Pattern → `docs/methodology/learnings/checkpoint-X-[topic].md`

   3. **AI fills template** (~1 minute)
      - Uses appropriate template:
        - `docs/methodology/templates/pitfall-template.md`
        - `docs/methodology/templates/case-study-template.md`
        - `docs/methodology/templates/workflow-template.md`
        - `docs/methodology/templates/pattern-template.md`
      - Fills with checkpoint-specific data
      - Generates 50-150 line addition (not 3,500 words)

   4. **AI creates learning document** (~1 minute)
      - Creates `docs/methodology/learnings/checkpoint-X-[topic].md`
      - Uses template structure
      - Populates with retrospective insights

   5. **AI updates indexes** (~1 minute)
      - Updates `docs/methodology/learnings/README.md` (add checkpoint entry)
      - Updates `docs/methodology/learnings/patterns-index.md` (cross-reference)

   6. **AI shows diff** (~30 seconds)
      - User reviews new learning document
      - Clear before/after view

   7. **User approval** (~1 minute)
      - Approve: AI commits update
      - Modify: User requests changes, AI revises
      - Defer: User provides justification, documents in retrospective

   **Deferral Allowed When**:
   - No significant new learnings this checkpoint
   - Learning already documented elsewhere
   - Checkpoint was bug fix only (no new patterns)
   - **Requirement**: Document deferral reason in retrospective

   **If User Approves**:
   - AI commits with: `docs(methodology): add Checkpoint X learnings - [topic]`
   - Methodology now current, learnings captured

   **Benefits**:
   - ✅ 85% token reduction (3,400 vs 23,000 tokens)
   - ✅ 83% time reduction (5 min vs 30-45 min)
   - ✅ Knowledge captured while fresh
   - ✅ Template ensures consistency
   - ✅ Patterns indexed for future reference

   **See Also**:
   - [Learnings Library README](docs/methodology/learnings/README.md)
   - [Patterns Index](docs/methodology/learnings/patterns-index.md)
   - [Templates](docs/methodology/templates/)

5. ✅ Commit all documentation changes
6. ✅ **🛑 MANDATORY DOCUMENTATION SYNC AUDIT** (BLOCKING - must pass before proceeding)
   - **Purpose**: Prevent version drift and documentation inconsistencies
   - **When**: After checkpoint docs created, BEFORE creating git tags
   - **How**: Run systematic audit of all version-sensitive files

   **Version Consistency Checks** (ALL must match):
   - [ ] `package.json` version = current checkpoint version (e.g., 0.X.0)
   - [ ] `README.md` version references = package.json version
   - [ ] `CLAUDE.md` "Current Version" = package.json version
   - [ ] `CLAUDE.md` "Latest Tags" = current checkpoint tags
   - [ ] `CLAUDE.md` "Latest Documentation" link = checkpoint-X-results.md
   - [ ] `api/server.js` health endpoint version = package.json version
   - [ ] `api/server.js` root endpoint version = package.json version
   - [ ] `api/server.js` OpenAPI schema version = package.json version

   **Status Consistency Checks**:
   - [ ] `README.md` Phase X status = actual phase progress
   - [ ] `README.md` Roadmap section = current checkpoint completions
   - [ ] `README.md` API Endpoints section = current endpoints (v2, MCP if added)
   - [ ] `README.md` Documentation links = latest checkpoint docs
   - [ ] `CLAUDE.md` "What's Working" section = actual completed work
   - [ ] `docs/checkpoints/README.md` latest checkpoint = current checkpoint
   - [ ] Phase implementation plan status = current reality

   **Link Validation**:
   - [ ] All markdown links in checkpoint docs resolve correctly
   - [ ] Documentation references in CLAUDE.md point to existing files
   - [ ] No broken links in README.md

   **Security & Cleanup**:
   - [ ] No `.env` files in deprecated folders
   - [ ] No stray credentials in old code
   - [ ] All deprecated code folders removed if no longer needed

   **If ANY check fails**:
   1. STOP immediately - do not proceed to tagging
   2. Present list of inconsistencies to user
   3. Get approval to fix
   4. Fix all issues in single commit: `docs: pre-release documentation sync`
   5. Re-run this audit until ALL checks pass
   6. Only then proceed to step 7

   **Automation**: See `scripts/audit-consistency.js` for automated validation

7. ✅ Create checkpoint-specific tag (vX.Y.Z-checkpoint-N)
8. ✅ **🛑 STOP - DO NOT PUSH YET**
9. ✅ **CRITICAL: AUTOMATICALLY REMIND user to run release**
   - **This step is MANDATORY and must not be skipped**
   - Ask user: "Should I run the release command now to create v0.X.0?"
   - Explain: "This will bump package.json to 0.X.0, update CHANGELOG.md, and create the v0.X.0 release tag"
   - Wait for user approval before proceeding
10. ✅ Run release command: `npm run release --release-as X.Y.0`
   - Version number should match checkpoint number (Option A: Checkpoint-Based Versioning)
   - Example: Checkpoint 7 → v0.7.0
11. ✅ Verify release artifacts created:
   - package.json version updated to 0.X.0
   - CHANGELOG.md updated with new entry
   - git tag v0.X.0 created
12. ✅ Push all tags to remote: `git push --follow-tags origin main`
13. ✅ **CRITICAL: Draft Slack Message for User Approval** (New: Post-Checkpoint 9)
   - Draft Slack notification message with checkpoint details
   - Include: Phase/Checkpoint title, achievements, lessons learned, impact, docs
   - Format: "Phase X, Checkpoint Y Complete: [Feature Name]"
   - Channel: Dev/project channel (NOT #team_ai unless phase-ending checkpoint)
   - **Show complete message to user and wait for explicit approval**
   - User can: (A) Approve as-is, (B) Request modifications, (C) Skip notification
   - **This step is MANDATORY - never send team communications without user approval**
14. ✅ Verify GitHub Actions workflows triggered:
   - Checkpoint notification workflow (triggered by v0.X.0-checkpoint-Y tag)
   - Release notification workflow (triggered by v0.X.0 tag → sends to #team_ai)
15. ✅ Check Slack for notifications (after user approval):
   - Dev channel: Checkpoint completion
   - #team_ai: Phase/release completion (ONLY for phase-ending checkpoints)
16. ✅ **VERIFY Slack notification accuracy**:
   - **Phase numbering**: Check that phase number is correct (see [checkpoint-phase-mapping.md](docs/development/checkpoint-phase-mapping.md))
   - **Checkpoint name**: Verify checkpoint name matches actual feature delivered
   - **Message content**: Confirm content is specific (not generic "platform improvements")
   - **Channel routing**: Verify #team_ai only received phase completions (v0.3.0, v0.7.0, v0.10.0, v0.13.0)
   - **Links**: Test that all documentation links work correctly
   - **If errors found**: Use [slack-correction-template.md](docs/development/slack-correction-template.md) to post correction
17. ✅ **DEPRECATED: Update Methodology with Retrospective Learnings**
   - **Note**: This step is now automated by step 4 (BLOCKING: Update Methodology)
   - If step 4 was deferred with justification, revisit learnings here
   - Otherwise, skip (methodology already current)
18. ✅ Update CLAUDE.md with new checkpoint status

### When User Returns After Break
1. ✅ Check if OpenAI quota resolved (if relevant)
2. ✅ Read checkpoint docs to understand state
3. ✅ Review git log for recent changes
4. ✅ Confirm next steps with user

### 🛑 When Resuming from Session Summary (CRITICAL - Added Checkpoint 13)
**Purpose**: Prevent workflow compliance failures when resuming interrupted sessions.

**Problem**: Session summaries lack explicit step tracking. AI may assume "tests passing" = "checkpoint complete" and skip remaining steps.

**Protocol**:
1. ✅ **Re-read this ENTIRE "When Completing a Checkpoint" section** (not just the summary)
2. ✅ **Create explicit numbered checklist** of all 18 steps
3. ✅ **Mark each step as DONE or PENDING** based on evidence:
   - Check git log for commits/tags
   - Check if checkpoint docs exist
   - Check if CHANGELOG was updated
   - Check if retrospective exists
4. ✅ **Present checklist to user**: "Steps 1-5 are DONE. Confirm I should resume from step 6?"
5. ✅ **Wait for explicit confirmation** before proceeding
6. ✅ **Never trust summary alone** for workflow state

**Example Output**:
```
═══════════════════════════════════════════════════════════
📋 SESSION RESUMPTION - WORKFLOW STATE CHECK
═══════════════════════════════════════════════════════════

Based on git log and file evidence:

DONE:
  ✅ Step 1: Checkpoint results doc exists
  ✅ Step 2: Checkpoint index updated
  ✅ Step 5: Changes committed
  ✅ Step 7: Checkpoint tag created

PENDING:
  ⏳ Step 3: Retrospective NOT created
  ⏳ Step 4: Methodology NOT updated
  ⏳ Step 6: Documentation sync audit NOT run
  ⏳ Steps 8-18: Not yet started

═══════════════════════════════════════════════════════════
🛑 CONFIRM: Should I resume from Step 3 (Create Retrospective)?
═══════════════════════════════════════════════════════════
```

**Why This Matters**: Checkpoint 13 revealed that skipping this protocol led to:
- 13/18 steps skipped
- Release without user approval
- Empty CHANGELOG published
- 45+ minutes of remediation

See: [docs/methodology/learnings/checkpoint-13-release-workflow.md](docs/methodology/learnings/checkpoint-13-release-workflow.md)

### Progressive Workflow Implementation
```
After Checkpoint 1: Branch protection + integration tests
After Checkpoint 2: Database migrations + API docs
After Checkpoint 3: Performance baselines + schema change notifications
See: docs/development/workflow-tracker.md for full schedule
```

### API Schema Change Management
When modifying the OpenAPI schema in `api/server.js`:
1. ✅ Schema changes automatically trigger Slack notification (.github/workflows/slack-schema-change.yml)
2. ✅ Notification includes re-import instructions for Custom GPT users
3. ✅ Version number in schema should match package.json
4. ✅ Document breaking vs non-breaking changes in CHANGELOG
5. ✅ See docs/development/api-versioning-strategy.md for full process

### MCP Tool Usage
**Always prefer MCP tools over manual methods for these platforms:**

**Supabase Operations** (use `mcp__supabase__*` tools):
- ✅ List tables: Use `mcp__supabase__list_tables` instead of manual SQL queries
- ✅ Execute SQL: Use `mcp__supabase__execute_sql` for database queries
- ✅ Apply migrations: Use `mcp__supabase__apply_migration` for schema changes
- ✅ List extensions: Use `mcp__supabase__list_extensions`
- ✅ Get advisors: Use `mcp__supabase__get_advisors` for security/performance checks

**Notion Operations** (use `mcp__notion__*` tools):
- ✅ Search workspace: Use `mcp__notion__notion-search` to find project tracker and docs
- ✅ Fetch pages: Use `mcp__notion__notion-fetch` to read page content
- ✅ Update pages: Use `mcp__notion__notion-update-page` to update project status
- ✅ Create pages: Use `mcp__notion__notion-create-pages` for documentation
- ✅ List users: Use `mcp__notion__notion-get-users` for team information

**Vercel Operations** (use `mcp__vercel__*` tools):
- ✅ List deployments: Use `mcp__vercel__list_deployments` to check deployment status
- ✅ Get deployment: Use `mcp__vercel__get_deployment` for deployment details
- ✅ Get logs: Use `mcp__vercel__get_deployment_build_logs` for debugging
- ✅ Search docs: Use `mcp__vercel__search_vercel_documentation` for Vercel questions
- ✅ List projects: Use `mcp__vercel__list_projects` to discover project IDs

**When to use MCP tools:**
- When checking database schema or data (Supabase)
- When updating project tracker or documentation (Notion)
- When monitoring deployments or debugging production issues (Vercel)
- When you need real-time status of any connected platform
- Before suggesting manual alternatives, check if an MCP tool exists

### Notion Project Management Workflow
**Automatically sync Notion project tracker with git/docs state:**

**Database Structure:**
- Main board: "Project Progress" (Kanban view)
- Properties: Name, Status, Assign, Due Date, Priority Level, Checkpoint, Git Tag, Deployment URL, Docs Link
- Status groups: Not started → In progress → Done

**Task Naming Convention:**
```
Phase X - Checkpoint Y: [Checkpoint Name]

Examples:
- Phase 1 - Checkpoint 1: Local MVP Foundation
- Phase 1 - Checkpoint 2: Vercel Deployment + Workflow Automation
- Phase 1 - Checkpoint 3: Custom GPT Integration
```

**Automatic Update Triggers:**

1. **On Checkpoint Completion:**
   - WHEN: Git tag created matching `v*-checkpoint-*`
   - THEN:
     - Update matching Notion task Status → "Done"
     - Set Git Tag property
     - Set Deployment URL (if applicable)
     - Set Docs Link to checkpoint-X.md
     - Update completion date

2. **On Checkpoint Start:**
   - WHEN: Checkpoint doc created/updated with "In Progress"
   - THEN:
     - Find or create Notion task
     - Update Status → "In progress"
     - Set Assign → JJ Vega
     - Set target Due Date
     - Set Docs Link

3. **On Deployment:**
   - WHEN: Vercel deployment succeeds from main branch
   - THEN:
     - Update relevant checkpoint task
     - Set Deployment URL property
     - Add deployment timestamp to task notes

4. **On Phase Completion:**
   - WHEN: All checkpoints in a phase are Done
   - THEN:
     - Update parent Phase task Status → "Done"
     - Add summary of all checkpoint links

**What Gets Updated:**
- Task Status (Not started / In progress / Done)
- Checkpoint property (e.g., "Checkpoint 1")
- Git Tag property (e.g., "v0.1.0-checkpoint-1")
- Deployment URL (production URL when applicable)
- Docs Link (link to checkpoint-X.md or roadmap.md)
- Task content (detailed status, links, deliverables)

**When to Update Notion:**
- ✅ After creating/updating checkpoint docs
- ✅ After git tagging releases (automatically)
- ✅ After successful Vercel deployments
- ✅ At checkpoint milestones
- ✅ When user says "update the project tracker"
- ✅ At end of significant work sessions

**Notion Update Process:**
1. Check current checkpoint status from docs/checkpoints/
2. Use `mcp__notion__notion-search` to find relevant tasks
3. Use `mcp__notion__notion-update-page` to update properties and content
4. Use `mcp__notion__notion-create-pages` for new checkpoint tasks
5. Verify updates with `mcp__notion__notion-fetch`

### When Workflow Changes (Self-Updating CLAUDE.md)
Automatically check if CLAUDE.md needs updating after:
1. ✅ Adding new workflows, automation, or tools
2. ✅ Changing project structure or file organization
3. ✅ Completing checkpoints (update status, version history)
4. ✅ Adding new documentation files or sections
5. ✅ Changing user preferences or project philosophy

**Process**:
1. Proactively suggest: "Should I update CLAUDE.md to reflect these changes?"
2. Wait for user approval
3. Update relevant sections (status, structure, workflows, version history)
4. Commit with descriptive message
5. Push to remote

**Sections to check**:
- Project Status (lines 19-42): Current checkpoint, what's working/pending
- Project Structure (lines 46-95): New files, directories, configs
- User Preferences (lines 310-317): New tools, workflows, automation
- Workflow Reminders (lines 332-363): New processes to follow
- Version History (lines 416-427): Checkpoint progress updates

---

## 📚 Quick Reference Links

**For User**:
- Getting started: [README.md](README.md)
- Full roadmap: [docs/project/roadmap.md](docs/project/roadmap.md)
- Setup guides: [docs/setup/](docs/setup/)

**For AI Assistant**:
- Current status: [docs/checkpoints/checkpoint-13-results.md](docs/checkpoints/checkpoint-13-results.md)
- Checkpoint index: [docs/checkpoints/README.md](docs/checkpoints/README.md)
- Implementation plan: [docs/project/roadmap.md](docs/project/roadmap.md)
- Workflows: [docs/development/workflows.md](docs/development/workflows.md)

---

## 🎯 What Makes This Project Unique

1. **AI-First Architecture**: Designed for Custom GPT/MCP, not traditional web UI
2. **Data Layer Only**: No synthesis - AI platforms handle that
3. **Checkpoint-Based**: Clear milestones with validation
4. **Phase Approach**: Each phase builds on previous
5. **Documentation-Heavy**: Everything documented as we build
6. **Workflow Evolution**: Workflows added just-in-time, not upfront

---

## 💡 Tips for AI Assistants

### DO:
- ✅ Read checkpoint status before suggesting next steps
- ✅ Follow conventional commit format
- ✅ Update docs when completing tasks
- ✅ Use TodoWrite tool for multi-step tasks
- ✅ Ask about blockers (e.g., OpenAI quota)
- ✅ Reference file paths clearly (e.g., api/server.js:124)
- ✅ **AUTOMATICALLY CHECK** if CLAUDE.md needs updating when workflow changes
  - After adding new workflows, tools, or automation
  - After changing project structure or documentation organization
  - After completing checkpoints (update status, version history)
  - Proactively suggest: "Should I update CLAUDE.md to reflect these changes?"
  - Wait for user approval, then update and commit

### DON'T:
- ❌ Assume what's tested - check checkpoint docs
- ❌ Skip reading current status
- ❌ Forget to update checkpoint docs when finishing milestones
- ❌ Ignore workflow-tracker.md reminders
- ❌ Make assumptions about external dependencies (OpenAI, Supabase)

### When in Doubt:
1. Read `docs/checkpoints/checkpoint-X.md` for current state
2. Read `docs/project/roadmap.md` for what's next
3. Ask user for clarification

---

## 🔖 Version History

- **v0.13.0 / v0.13.0-checkpoint-13** (2025-11-25): Phase 4 COMPLETE - Multi-Tenant Verification ✅
  - See: [docs/checkpoints/checkpoint-13-results.md](docs/checkpoints/checkpoint-13-results.md)
  - 42-test isolation suite (14 positive, 22 negative, 6 client)
  - 3 coach personas with API keys (Alex, Jordan, Sam)
  - 44 coaching transcripts with unique isolation markers
  - Bug fix: req.apiKey → req.auth property reference
  - 100% multi-tenant isolation verified
  - **Phase 4 Complete**: All AI Platform Integration checkpoints finished
  - Status: Production ready

- **v0.12.0 / v0.12.0-checkpoint-12** (2025-11-25): Phase 4 - Enhanced Custom GPT ✅
  - See: [docs/checkpoints/checkpoint-12-results.md](docs/checkpoints/checkpoint-12-results.md)
  - Added `/api/v2/search/filtered` to OpenAPI schema
  - Updated Custom GPT setup guide with authentication instructions
  - Comprehensive v2-aware GPT instructions with workflow patterns
  - Status: Production ready

- **v0.11.0 / v0.11.0-checkpoint-11** (2025-11-25): Phase 4 - MCP Server Development ✅
  - See: [docs/checkpoints/checkpoint-11-results.md](docs/checkpoints/checkpoint-11-results.md)
  - MCP server with SSE transport using `@modelcontextprotocol/sdk`
  - 3 MCP tools: `search_data`, `upload_data`, `get_client_timeline`
  - V2 REST API endpoints for enhanced client/search operations
  - OpenAPI schema updates for v2 endpoints
  - MCP Inspector testing verified
  - Status: Production ready

- **v0.10.0 / v0.10.0-checkpoint-10** (2025-11-24): Phase 3 - Admin User & API Key Management ✅
  - See: [docs/checkpoints/checkpoint-10-results.md](docs/checkpoints/checkpoint-10-results.md)
  - Admin users table with role hierarchy (super_admin, admin, support)
  - 11 RESTful API endpoints for user and API key management
  - Web-based admin dashboard
  - API key authentication for admin access
  - Status: Production ready

- **v0.9.0 / v0.9.0-checkpoint-9** (2025-11-20): Phase 3 - Row-Level Security (RLS) ✅
  - See: [docs/checkpoints/checkpoint-9-results.md](docs/checkpoints/checkpoint-9-results.md)
  - RLS: 42 policies across 12 tables for multi-tenant data isolation
  - Authentication: API key system with bcrypt hashing
  - Performance: <10% overhead (acceptable)
  - Migration: Zero data loss, 100% test pass rate
  - Audit trail: All data access logged with user attribution
  - Status: Production ready

- **v0.8.0 / v0.8.0-checkpoint-8** (2025-11-19): Phase 3 - PII Scrubbing Pipeline ✅
  - See: [docs/checkpoints/checkpoint-8-results.md](docs/checkpoints/checkpoint-8-results.md)
  - Hybrid Detection: Regex + GPT (context-aware)
  - Performance: 37s avg for 50K+ char documents (14x improvement)
  - Accuracy: 96% detection rate (24/25 tests passed)
  - Cost: $0.005 per document (10x under budget)
  - Reliability: 0% timeout rate, graceful degradation
  - Status: Production ready

- **v0.7.0 / v0.7.0-checkpoint-7** (2025-11-12): Phase 2 Complete - Custom GPT Validation ✅
  - See: [docs/checkpoints/checkpoint-7-results.md](docs/checkpoints/checkpoint-7-results.md)
  - Custom GPT: Multi-type queries validated
  - Performance: 1.6-2.1s queries (exceeds <3s target)
  - Documentation: 500+ pages comprehensive docs
  - Phase 2: Complete in 1 day vs 3-4 week estimate (21-28x faster)
  - Status: Production ready, Phase 3 next

- **v0.6.0 / v0.6.0-checkpoint-6** (2025-11-12): Type-Aware Search & Filtering ✅
  - See: [docs/checkpoints/checkpoint-6-results.md](docs/checkpoints/checkpoint-6-results.md)
  - Search: Multi-dimensional filtering (type, coach, client, org)
  - RPC: `match_data_chunks` with all filter support
  - Backward compatibility: No filters = all types
  - Status: Complete

- **v0.5.0 / v0.5.0-checkpoint-5** (2025-11-12): Multi-Type Processing Pipeline ✅
  - See: [docs/project/PHASE_2_RESULTS.md](docs/project/PHASE_2_RESULTS.md)
  - Processors: 4 types (transcript, assessment, model, company_doc)
  - Strategy pattern: Adaptive chunking per type
  - User seeding: 1 company, 3 coaches, 2 orgs, 4 clients
  - Status: Complete

- **v0.4.0 / v0.4.0-checkpoint-4** (2025-11-12): Schema Migration & Core Architecture ✅
  - See: [docs/checkpoints/checkpoint-4.md](docs/checkpoints/checkpoint-4.md)
  - Database: Multi-type schema (8 user/org tables + 2 data tables)
  - Migration: 16 transcripts migrated with zero data loss (100%)
  - API: Updated to use new schema with backward compatibility
  - Testing: 10/10 tests passed (100%)
  - Notifications: Added release announcements to #team_ai
  - Status: Complete and deployed to production

- **v0.3.0 / v0.3.0-checkpoint-3** (2025-11-11): Custom GPT Integration ✅
  - See: [docs/checkpoints/checkpoint-3.md](docs/checkpoints/checkpoint-3.md)
  - North Star: Fresh data retrieval without manual updates
  - Bulk upload: API endpoint + CLI tool
  - Sample data: 16 coaching transcripts in production
  - Vector search: Fixed and validated (0.4-0.7 similarity)
  - Status: Complete

- **v0.2.0 / v0.2.0-checkpoint-2** (2025-11-09): Vercel Deployment + Tier 1 Automation ✅
  - See: [docs/checkpoints/checkpoint-2.md](docs/checkpoints/checkpoint-2.md)
  - Vercel deployment: Production + preview environments
  - Workflow automation: Changelog, validation, Slack notifications
  - Status: Complete

- **v0.1.0 / v0.1.0-checkpoint-1** (2025-11-08): Local MVP Foundation ✅
  - See: [docs/checkpoints/checkpoint-1.md](docs/checkpoints/checkpoint-1.md)
  - Express API: 6 endpoints
  - Database: Supabase + pgvector
  - Pipeline: Chunking + embeddings
  - Status: Complete

---

## 📝 Notes for Future AI Sessions

### Current Status (As of 2025-11-25)
- ✅ **Phase 4 COMPLETE**: All 3 checkpoints (11, 12, 13) finished
- ✅ **Phase 3 COMPLETE**: All 3 checkpoints (8, 9, 10) finished
- ✅ **Phase 2 COMPLETE**: All 5 checkpoints (4, 5, 5b, 6, 7) finished in 1 day
- ✅ Multi-type architecture production-ready
- ✅ Type-aware search validated and deployed
- ✅ Comprehensive documentation complete (500+ pages)
- ✅ Multi-tenant isolation verified (42/42 tests passing)
- ✅ MCP server operational with Claude Desktop
- 🎯 **Next**: Phase 5 - Production monitoring, performance at scale

### If User Says "Continue"
1. Check current branch (should be `main`)
2. Read `docs/project/PHASE_2_RESULTS.md` for Phase 2 summary
3. Read `docs/checkpoints/checkpoint-7-results.md` for latest status
4. Proceed to Phase 3 per `docs/project/roadmap.md`

### If Starting Phase 3
1. Review Phase 3 checkpoints in roadmap
2. Plan PII scrubbing pipeline (Checkpoint 8)
3. Design row-level security policies (Checkpoint 9)
4. Plan API key management system (Checkpoint 10)

### Phase 2 Workflow Fixes (2025-11-12)
**Issue**: Phase 2 completed without proper release workflow execution
**Root Cause**: AI assistant skipped step 6 in checkpoint completion workflow
**Fixes Applied**:
1. ✅ Created v0.7.0 release tag retroactively
2. ✅ Updated CHANGELOG.md with Phase 2 entry
3. ✅ Bumped package.json to v0.7.0
4. ✅ Fixed checkpoint notification workflow (doc link issue)
5. ✅ Updated CLAUDE.md with explicit "STOP" step and tag naming convention
6. ✅ Documented checkpoint-based versioning (Option A)
7. ✅ Verified Slack notifications sent to #team_ai

**Lessons Learned**:
- Step 6 in checkpoint workflow is CRITICAL and MANDATORY
- Must remind user about release BEFORE pushing tags
- Both checkpoint and release tags needed for complete workflow
- See: `docs/development/WORKFLOW_GAP_ANALYSIS.md` for full analysis

**Status**: Phase 2 now properly complete with all workflow steps executed

---

**Remember**: This is a living document. Update it as the project evolves!
