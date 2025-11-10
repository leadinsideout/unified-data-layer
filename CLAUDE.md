# CLAUDE.md - AI Assistant Navigation Guide

**Purpose**: This file helps AI assistants (like Claude) quickly understand and navigate this project.

**Last Updated**: 2025-11-09

---

## 🎯 Project Overview

**Name**: Unified Data Layer
**Current Phase**: Phase 1, Checkpoint 2 In Progress
**Architecture**: API-first data layer for AI platform integration

**Key Principle**: Our API provides DATA (semantic search), AI platforms provide SYNTHESIS (GPT-4/Claude).

---

## 🗺️ Project Status (Quick Reference)

**Current Branch**: `phase-1-checkpoint-2`
**Current Tag**: `v0.1.0-checkpoint-1`
**Latest Commit**: See `docs/checkpoints/checkpoint-2.md`

**What's Working**:
- ✅ Supabase database with pgvector
- ✅ Express API server (5 endpoints)
- ✅ Automatic chunking & embedding pipeline
- ✅ Health check and upload endpoints
- ✅ Vercel deployment (production & preview)
- ✅ Workflow automation (Tier 1 complete)
  - Automated changelog generation (standard-version)
  - Commit message validation (commitlint)
  - Slack notifications (PRs, deployments, checkpoints)

**What's Pending**:
- ⏸️ Full embedding testing (OpenAI quota issue)
- 🔴 Custom GPT integration (Checkpoint 3)
- 🔴 Tier 2 workflow automation (after Checkpoint 3)

**Blockers**:
- None (OpenAI quota not blocking deployment progress)

---

## 📁 Project Structure (Navigation Map)

```
unified-data-layer/
│
├── CLAUDE.md                    ← YOU ARE HERE (AI navigation guide)
├── README.md                    ← Start here for project overview
│
├── api/server.js                ← Main API server (521 lines)
├── scripts/                     ← Utility scripts
│   ├── database/                ← SQL migrations
│   ├── embed.js                 ← Embedding generation
│   └── test-connection.js       ← DB connection test
│
├── docs/                        ← ALL DOCUMENTATION
│   ├── README.md                ← Documentation index
│   ├── project/                 ← Strategic docs
│   │   ├── roadmap.md           ← Product vision (8 phases)
│   │   └── rebuild-plan.md      ← Implementation plan (checkpoints)
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

**Step 3**: Read rebuild plan
```
File: docs/project/rebuild-plan.md
Purpose: Understand overall implementation plan
```

**Step 4**: Continue from there

### When User Says: "What's the project structure?"

**Answer from**:
- This file (CLAUDE.md) - Quick overview
- README.md - User-facing overview
- docs/README.md - Documentation index

### When User Says: "How do I deploy?"

**Read**:
- docs/project/rebuild-plan.md → Checkpoint 2 section
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
- docs/project/roadmap.md → 8-phase product vision
- docs/project/rebuild-plan.md → Implementation details

### When Debugging Issues:

**Check in order**:
1. `docs/checkpoints/checkpoint-X.md` → Known issues
2. `README.md` → Troubleshooting section
3. `docs/setup/` → Setup guides
4. `api/server.js` → Implementation

---

## 🎯 Key Files by Purpose

### Strategic Planning
- `docs/project/roadmap.md` - Product vision, 8 phases
- `docs/project/rebuild-plan.md` - Implementation plan

### Current Status
- `docs/checkpoints/checkpoint-1.md` - Latest checkpoint
- `docs/checkpoints/README.md` - Checkpoint index

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
- `scripts/database/*.sql` - Database migrations

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
GET  /api/health                  # Server status
POST /api/transcripts/upload      # Upload text transcript
POST /api/transcripts/upload-pdf  # Upload PDF transcript
POST /api/search                  # Semantic search
GET  /openapi.json                # OpenAPI schema for Custom GPT
```

### Database Schema
```sql
transcripts (
  id, raw_text, meeting_date, created_at, metadata,
  coach_id, client_id, fireflies_meeting_id
)

transcript_chunks (
  id, transcript_id, chunk_index, content,
  embedding vector(1536), created_at
)

RPC: match_transcript_chunks(query_embedding, threshold, limit)
```

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
1. docs/checkpoints/checkpoint-1.md (latest status)
2. README.md (project overview)
3. git log --oneline -10 (recent commits)
```

### Task: Continue to next checkpoint
```
Files to read:
1. docs/checkpoints/checkpoint-X.md (understand current state)
2. docs/project/rebuild-plan.md (find next checkpoint tasks)
3. docs/development/workflow-tracker.md (check workflow milestones)
```

### Task: Deploy to Vercel
```
Files to read:
1. docs/project/rebuild-plan.md → Checkpoint 2
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
- **Notifications**: Slack updates for PRs, deployments, checkpoints
- **Releases**: AI reminds, user approves, then AI runs `npm run release`
- **MCP Tools**: Default to using MCP tools for platform operations (see MCP Tool Usage below)

### Current Blockers
- OpenAI quota exceeded (waiting for client billing approval)
- Can continue to Checkpoint 2 (deployment) without full testing
- Will return to test embeddings when quota resolved

### Project Philosophy
- **Phased approach**: Checkpoint validation before proceeding
- **Documentation-first**: Document as you build
- **AI platform integration**: Primary interface (not custom UI)
- **Data not synthesis**: API returns data, GPT/Claude synthesize

---

## 🔄 Workflow Reminders for AI

### Before Starting Any Task
1. ✅ Read latest checkpoint status
2. ✅ Check git status and current branch
3. ✅ Understand what's working vs pending
4. ✅ Ask about blockers if relevant

### When Completing a Checkpoint
1. ✅ Create feature branch
2. ✅ Commit work with detailed message
3. ✅ **AUTOMATICALLY REMIND** user to run release (`npm run release`)
   - Wait for user approval before running
   - Explain what the release will do (bump version, create CHANGELOG, create tag)
   - Run release commands once approved
4. ✅ Create checkpoint-specific tag (vX.Y.Z-checkpoint-N)
5. ✅ Create checkpoint status doc
6. ✅ Update checkpoint index

### When User Returns After Break
1. ✅ Check if OpenAI quota resolved (if relevant)
2. ✅ Read checkpoint docs to understand state
3. ✅ Review git log for recent changes
4. ✅ Confirm next steps with user

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
- Docs Link (link to checkpoint-X.md or rebuild-plan.md)
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
- Current status: [docs/checkpoints/checkpoint-1.md](docs/checkpoints/checkpoint-1.md)
- Implementation plan: [docs/project/rebuild-plan.md](docs/project/rebuild-plan.md)
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
2. Read `docs/project/rebuild-plan.md` for what's next
3. Ask user for clarification

---

## 🔖 Version History

- **Checkpoint 2 (In Progress)** (2025-11-09): Vercel Deployment + Tier 1 Automation
  - See: docs/checkpoints/checkpoint-2.md
  - Vercel deployment: ✅ Complete
  - Workflow automation (Tier 1): ✅ Complete
  - Slack notifications: ✅ Complete and tested
  - Status: Ready for release and checkpoint tag

- **v0.1.0-checkpoint-1** (2025-11-08): Local MVP Foundation complete
  - See: docs/checkpoints/checkpoint-1.md
  - Status: Code complete, pending OpenAI quota for full testing

---

## 📝 Notes for Future AI Sessions

### If User Says "Continue"
1. Check if still on `phase-1-checkpoint-1` branch
2. Read `docs/checkpoints/checkpoint-1.md`
3. Proceed to Checkpoint 2 (Vercel deployment) per `docs/project/rebuild-plan.md`

### If User Reports OpenAI Quota Fixed
1. Run full E2E tests from `tests/e2e-checklist.md`
2. Test upload → embed → search flow
3. Update `docs/checkpoints/checkpoint-1.md` with results
4. Mark Checkpoint 1 as fully validated

### If User Wants to Deploy
1. Follow Checkpoint 2 from `docs/project/rebuild-plan.md`
2. Use `vercel.json` config
3. Set environment variables in Vercel dashboard
4. Test health endpoint
5. Document in `docs/checkpoints/checkpoint-2.md`

---

**Remember**: This is a living document. Update it as the project evolves!
