# Borg Developer Onboarding — Full System Ownership

## What This File Is

This document is designed to be consumed by Claude Code. It contains everything needed to set up a new developer (Ryan Vaughn) as the full owner of the Borg — the Unified Data Layer that powers Inside-Out Leadership's coaching data infrastructure.

**Ryan**: Drop this file into a Claude Code conversation and say:

> "Walk me through setting up full developer access to the Borg. Here's the onboarding guide: DEVELOPER-ONBOARDING.md. Go step by step and wait for me to confirm each section before moving on."

**Claude Code**: Read this entire document before starting. Guide the user through each section sequentially. Do not skip steps. Wait for confirmation before proceeding to the next section. If any step fails, troubleshoot before moving on.

---

## Table of Contents

1. [Prerequisites — Accounts You Need](#1-prerequisites--accounts-you-need)
2. [Clone the Repository](#2-clone-the-repository)
3. [Install Dependencies](#3-install-dependencies)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Run the Server Locally](#5-run-the-server-locally)
6. [Connect Claude Code to the Borg via MCP](#6-connect-claude-code-to-the-borg-via-mcp)
7. [Verify Production Deployment](#7-verify-production-deployment)
8. [Key Workflows](#8-key-workflows)
9. [Safety Guardrails — How to Stay Safe](#9-safety-guardrails--how-to-stay-safe)
10. [Project Structure — Where Things Live](#10-project-structure--where-things-live)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites — Accounts You Need

All login credentials are in the **Development Accounts** database on Notion:
👉 https://www.notion.so/2a4681325a74800cad91f051c0ec4b29?v=2a4681325a7480ffbb1a000c062fe70b

**Claude Code**: Ask Ryan to open the Notion link above and confirm he can see the credentials table before proceeding. If he can't access it, tell him to contact JJ.

Ryan needs to be able to log into each of these services:

| # | Service | What It Does | Login Method | Notes |
|---|---------|-------------|-------------|-------|
| 1 | **Google** | Master account for other services | dev@leadinsideout.io | Password in Notion |
| 2 | **GitHub** | Source code repository | `leadinsideout` username | Password in Notion. Has 2FA — open the page for recovery codes. |
| 3 | **Supabase** | Database (PostgreSQL + vector search) | GitHub auth (single sign-on) | Once logged in, select project `wzebnjilqolwykmeozna` |
| 4 | **Vercel** | Hosts the API on the internet | GitHub auth (single sign-on) | Team: `leadinsideout` |
| 5 | **OpenAI** | Generates embeddings for search | Gmail auth (dev@leadinsideout.io) | API keys at platform.openai.com → API keys |
| 6 | **Claude.ai** | AI platform + Claude Code org | Gmail auth (dev@leadinsideout.io) | Org ID in Notion |
| 7 | **Fireflies.ai** | Auto-syncs coaching transcripts | Ryan is already the admin | Go to Integrations → Custom settings to find the API key |

**Claude Code**: Walk Ryan through logging into each service one at a time. Start with Google (the master account), then GitHub (needed for Supabase and Vercel SSO), then the rest. Verify each login works before moving on.

**Also needed on this machine**:
- **Node.js 18+** — Check with `node --version` in terminal
- **Git** — Check with `git --version` in terminal
- **Claude Code** — Already installed if you're reading this

**Claude Code**: Run `node --version` and `git --version` to verify both are installed. If Node.js is not 18+, guide Ryan through installing it via `brew install node` (macOS) or nvm.

---

## 2. Clone the Repository

**Claude Code**: Run these commands and verify the output.

```bash
# Clone the repository
git clone https://github.com/leadinsideout/unified-data-layer.git

# Move into the project directory
cd unified-data-layer

# Verify you're on the main branch
git status
```

**Expected output**: `On branch main` with a clean working tree.

If Ryan already has the repo cloned, just `cd` into it and run `git pull origin main` to get the latest code.

---

## 3. Install Dependencies

```bash
# Install all Node.js packages
npm install
```

**Expected output**: No errors. Warnings are OK. This installs ~30 packages including Express (API server), Supabase client, OpenAI client, and the MCP SDK.

**Claude Code**: If `npm install` fails, check that Node.js is version 18+ and try again.

---

## 4. Configure Environment Variables

This is the most important step. The `.env` file contains all the "keys" that connect the Borg to its services.

**Claude Code**: Follow these steps exactly.

### Step 1: Create the .env file

```bash
cp .env.example .env
```

### Step 2: Fill in each variable

Open the `.env` file and update these values one at a time. Credentials are in the **Development Accounts** Notion database:
👉 https://www.notion.so/2a4681325a74800cad91f051c0ec4b29?v=2a4681325a7480ffbb1a000c062fe70b

**Claude Code**: Walk Ryan through each variable below. For each one, explain what it does, tell him where to find the value, and wait for him to paste it in. Do NOT display key values on screen — just confirm each is set.

**REQUIRED — the server won't work without these:**

| Variable | What It Does | Where to Find the Value |
|----------|-------------|------------------------|
| `SUPABASE_URL` | Connects to the database | Already correct in .env.example: `https://wzebnjilqolwykmeozna.supabase.co` — no change needed |
| `SUPABASE_SERVICE_KEY` | Admin access to the database | Log into Supabase (via GitHub SSO) → Select the UDL project → Settings → API → scroll to `service_role` key → copy it |
| `OPENAI_API_KEY` | Generates embeddings for search | Log into platform.openai.com (via Gmail) → API keys → Create new secret key. Starts with `sk-proj-`. Billing must be enabled on the account. |

**RECOMMENDED — needed for Fireflies transcript auto-sync:**

| Variable | What It Does | Where to Find the Value |
|----------|-------------|------------------------|
| `FIREFLIES_API_KEY` | Pulls transcripts from Fireflies | Ryan is already the Fireflies admin. Go to app.fireflies.ai → Integrations → Custom → copy the API Key |
| `FIREFLIES_ADMIN_API_KEY` | Accesses private "Only Me" transcripts | Same page, Super Admin key. Format: `{"coach-uuid":"admin-api-key"}`. Ask JJ for the coach UUID mapping. |
| `FIREFLIES_WEBHOOK_SECRET` | Verifies incoming Fireflies webhooks | Same Fireflies integrations settings page |
| `FIREFLIES_SYNC_SECRET` | Authenticates the GitHub Actions sync job | Generate a new one: run `openssl rand -hex 32` in terminal and paste the output. Then set this same value in GitHub repo Settings → Secrets → `FIREFLIES_SYNC_SECRET`. |

**OPTIONAL — can add later if needed:**

| Variable | What It Does | Default |
|----------|-------------|---------|
| `PII_SCRUBBING_ENABLED` | Auto-scrub personal info from uploads | `false` |
| `CORS_ORIGINS` | Allowed frontend origins | Only needed if adding new frontends beyond Custom GPT |

**Claude Code**: After Ryan fills in at least the 3 required variables, read the `.env` file to verify they're set (but do NOT display the actual key values to the screen — just confirm each variable has a non-empty value). Then move to the next step.

### Step 3: Verify .env is gitignored

```bash
grep ".env" .gitignore
```

**Expected output**: A line containing `.env`. This prevents secrets from being committed to GitHub. If it's not there, add it:

```bash
echo ".env" >> .gitignore
```

---

## 5. Run the Server Locally

```bash
npm run dev
```

**Expected output**: Something like:
```
Server running on port 3000
Connected to Supabase: wzebnjilqolwykmeozna
```

**Claude Code**: Once the server is running, open a **new terminal tab** and test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

**Expected response**: JSON with `"status": "healthy"` and version information.

Then test a search:

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <RYANS_API_KEY>" \
  -d '{"query": "leadership", "limit": 3}'
```

Replace `<RYANS_API_KEY>` with Ryan's API key (the `sk_live_...` key from BORG-INTEGRATION.md).

**Expected response**: JSON with search results containing coaching content.

**Claude Code**: If the health check works but the search returns a 401, the API key may not be in the database yet. If both fail, check the `.env` variables and server logs.

Press `Ctrl+C` in the server terminal to stop the local server when done testing.

---

## 6. Connect Claude Code to the Borg via MCP

The Borg has a built-in MCP server that lets Claude search coaching data, pull client timelines, and upload content — all directly from Claude Code conversations.

### For the Borg project itself

The project already has an `.mcp.json` file with Supabase, Notion, and Vercel MCP servers. The Borg's own MCP endpoint is accessed via the production API, not locally.

### For Ryan's other projects (like the Vault)

To connect any project to the Borg, create or edit `.mcp.json` in that project's root:

```json
{
  "mcpServers": {
    "borg": {
      "type": "http",
      "url": "https://unified-data-layer.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ${BORG_API_KEY}"
      }
    }
  }
}
```

Then set the `BORG_API_KEY` environment variable in your shell:

```bash
# Add to ~/.zshrc (or ~/.bashrc)
export BORG_API_KEY="<your-api-key>"
```

Restart your terminal, then test in Claude Code:

> "Use the Borg's search_data tool to search for 'leadership challenges'. Show me the results."

See `docs/ryan-borg-integration/MCP-SETUP-GUIDE.md` for the full MCP reference including all available tools and example agent patterns.

---

## 7. Verify Production Deployment

The Borg is deployed to Vercel at `https://unified-data-layer.vercel.app`. Every push to `main` on GitHub automatically deploys to production.

**Claude Code**: Run these checks to verify production is healthy:

```bash
# Check production health
curl https://unified-data-layer.vercel.app/api/health

# Check the OpenAPI schema is accessible (this is what Custom GPTs use)
curl https://unified-data-layer.vercel.app/openapi.json | head -20
```

**Expected**: Both return valid JSON. The health endpoint shows `"status": "healthy"`.

### How Deployment Works

1. You make changes locally and commit them with git
2. You push to GitHub: `git push origin main`
3. Vercel detects the push and automatically deploys (~30 seconds)
4. Production is updated at `https://unified-data-layer.vercel.app`

Pull requests also get **preview deployments** — a temporary URL where you can test changes before merging to main.

---

## 8. Key Workflows

### Adding a New Coach

1. Go to the admin dashboard: `https://unified-data-layer.vercel.app/admin`
2. Log in with admin credentials
3. Navigate to "Users" → "Add Coach"
4. Fill in: name, email, coaching company
5. Go to "API Keys" → "Create Key"
6. Select the new coach, set scopes to `read, write`
7. Save the generated key — it's shown once and cannot be retrieved later
8. Create a Custom GPT for the coach (see `docs/setup/custom-gpt-setup.md`)

### Creating a Custom GPT

1. Go to chatgpt.com → Explore GPTs → Create
2. In the Configure tab:
   - **Name**: "[Coach Name]'s Coaching Assistant" (or similar)
   - **Instructions**: See `docs/setup/gpt-instructions-copy-paste.md` for ready-to-use instructions
3. Under "Actions" → "Create new action":
   - Import from URL: `https://unified-data-layer.vercel.app/openapi.json`
   - Authentication: API Key (Bearer), use the coach's `sk_live_...` key
4. Save and test: ask "Show me my recent coaching sessions"

See `docs/setup/custom-gpt-setup.md` for the full step-by-step guide.

### How Fireflies Auto-Sync Works

Every 10 minutes, a GitHub Action:
1. Calls the Fireflies.ai API for recent transcripts
2. Matches each transcript to a coach by the Fireflies account email
3. Matches clients by attendee email addresses
4. Processes the transcript (chunks + embeds)
5. Stores it in the Borg
6. Sends a Slack notification if configured

**If a client can't be matched** (new client, unknown email), the transcript goes into a pending queue. View pending transcripts in the admin dashboard under "Fireflies" → "Pending Queue", then manually assign the client.

### Uploading Content Manually

**Via admin dashboard**: Go to `/admin` → "Upload Data" → choose file, coach, client, data type → upload.

**Via Claude Code (MCP)**: Tell Claude "Upload this content to the Borg as a blog_post" and it will use the `upload_data` tool.

**Via API**: `POST /api/data/upload` with the content and metadata.

---

## 9. Safety Guardrails — How to Stay Safe

This section is critical. It covers how to make changes without risk of breaking the live system.

### The Golden Rule: Always Have a Save Point

Git keeps a complete history of every change ever made. You can always go back. Here's how:

### Before Making Any Changes

```bash
# Check what branch you're on (should be main)
git status

# See recent history (your save points)
git log --oneline -10
```

### Making Changes Safely

```bash
# STEP 1: Create a new branch (a safe copy to work on)
git checkout -b feature/my-change-name

# STEP 2: Make your changes (edit files, use Claude Code, etc.)

# STEP 3: Save your changes
git add <files-you-changed>
git commit -m "feat: description of what you changed"

# STEP 4: Push to GitHub (creates a preview deployment for testing)
git push origin feature/my-change-name

# STEP 5: Test on the preview URL that Vercel generates

# STEP 6: If everything works, merge to main via GitHub Pull Request
# STEP 7: If something went wrong, just delete the branch — main is untouched
```

### If Something Goes Wrong in Production

```bash
# See what changed recently
git log --oneline -10

# Go back to a specific save point (creates a new commit that undoes the change)
git revert <commit-hash>
git push origin main
```

This creates a **new** commit that undoes the bad change — it doesn't erase history.

### Things to NEVER Do Without Double-Checking

| Action | Why It's Dangerous | What to Do Instead |
|--------|-------------------|-------------------|
| `git push --force` | Overwrites history on GitHub | Use `git push` (no force) |
| Editing `.env` on Vercel directly | Could break production | Edit locally, test, then update Vercel env vars |
| Running SQL `DELETE` or `DROP` on Supabase | Deletes data permanently | Ask Claude Code to help write the query, review it, test on a small set first |
| Merging to `main` without testing | Deploys to production immediately | Always use a branch + preview deployment first |

### Commit Message Format

This project uses conventional commits. The format is:

```
type: short description

Types:
  feat:  — New feature
  fix:   — Bug fix  
  docs:  — Documentation only
  chore: — Maintenance (dependencies, config)
  mcp:   — MCP server changes
```

Examples:
- `feat: add email search for client matching`
- `fix: correct date formatting on timeline endpoint`
- `docs: update onboarding guide with new steps`

**Claude Code**: When making commits for Ryan, always use this format. The project has a commit linter that will reject non-conforming messages.

---

## 10. Project Structure — Where Things Live

```
unified-data-layer/
│
├── api/
│   ├── server.js                ← Main API server (all endpoints defined here)
│   ├── middleware/
│   │   ├── auth.js              ← API key authentication
│   │   └── analytics.js         ← Usage tracking
│   ├── routes/
│   │   ├── admin.js             ← Admin dashboard backend (58KB)
│   │   ├── admin-auth.js        ← Admin login/session
│   │   ├── api-keys.js          ← API key management
│   │   └── v2/                  ← V2 endpoints (clients, search, transcripts)
│   ├── integrations/
│   │   └── fireflies.js         ← Fireflies.ai sync (1900+ lines)
│   ├── processors/              ← Data type processors (chunking logic)
│   │   ├── base-processor.js    ← Base class all processors extend
│   │   ├── transcript-processor.js
│   │   ├── assessment-processor.js
│   │   └── ...                  ← One per data type
│   ├── pii/                     ← PII scrubbing pipeline
│   │   ├── pii-scrubber.js      ← Main orchestrator
│   │   ├── regex-detector.js    ← Pattern matching
│   │   └── gpt-detector.js      ← AI-powered detection
│   ├── mcp/
│   │   ├── server.js            ← MCP tool definitions
│   │   └── index.js             ← MCP transport setup
│   └── utils/                   ← Shared utilities
│
├── public/
│   └── admin.html               ← Admin dashboard UI (2,591 lines)
│
├── scripts/
│   ├── database/                ← SQL migration files (numbered)
│   │   ├── 001_initial_schema.sql
│   │   ├── 003_multi_type_schema.sql
│   │   ├── 006_row_level_security_final.sql
│   │   └── ...
│   ├── upload-transcripts.js    ← CLI bulk upload tool
│   └── seed-sample-data.js      ← Sample data generator
│
├── docs/                        ← All documentation
│   ├── ryan-borg-integration/   ← YOUR DOCS (this file lives here)
│   ├── setup/                   ← Setup guides (GPTs, Supabase, local dev)
│   ├── checkpoints/             ← Build history and milestone reports
│   └── project/                 ← Roadmap and strategic docs
│
├── .github/workflows/           ← Automated tasks
│   ├── fireflies-sync.yml       ← 10-min transcript sync
│   ├── slack-*.yml              ← Notification workflows
│   └── weekly-missing-client-report.yml
│
├── .mcp.json                    ← MCP server connections (Supabase, Notion, Vercel)
├── .env                         ← Secrets (NEVER committed to git)
├── .env.example                 ← Template for .env
├── vercel.json                  ← Deployment configuration
├── package.json                 ← Dependencies and scripts
├── CLAUDE.md                    ← AI assistant navigation guide (read this for deep context)
└── README.md                    ← Project overview
```

### Key Files to Know

- **`api/server.js`** — The heart of the Borg. All API endpoints, OpenAPI schema, and core routing. ~2,800 lines.
- **`api/integrations/fireflies.js`** — The Fireflies auto-sync integration. Coach/client matching, transcript processing.
- **`api/routes/admin.js`** — Admin dashboard backend. User management, data browser, analytics.
- **`public/admin.html`** — Admin dashboard frontend. Single HTML file with embedded JS/CSS.
- **`CLAUDE.md`** — Comprehensive navigation guide for AI assistants. Contains project history, workflows, conventions. Read this file when you need deep context on any aspect of the project.
- **`scripts/database/`** — SQL migrations in numbered order. These define the database schema.

---

## 11. Troubleshooting

### Server won't start locally

**Check 1**: Are the required `.env` variables set?
```bash
grep -c "SUPABASE_URL\|SUPABASE_SERVICE_KEY\|OPENAI_API_KEY" .env
```
Should output `3` (all three present).

**Check 2**: Are dependencies installed?
```bash
npm install
```

**Check 3**: Is something else using port 3000?
```bash
lsof -i :3000
```
If yes, either kill that process or set `PORT=3001` in `.env`.

### Search returns no results

- Try a broader query with lower threshold: `{"query": "coaching", "threshold": 0.2, "limit": 20}`
- Check that data exists: `curl http://localhost:3000/api/health` — the response includes data counts
- Verify the API key is valid and has the right coach scope

### Vercel deployment fails

1. Check the Vercel dashboard for build logs
2. Most common cause: missing environment variables on Vercel (they're separate from your local `.env`)
3. Go to Vercel → Project → Settings → Environment Variables → make sure all required vars are set

### Git errors

**"Your branch is behind"**: `git pull origin main` before pushing.

**"Merge conflict"**: Claude Code can help resolve these. Say "I have a merge conflict in [file]. Help me resolve it."

**"Pre-commit hook failed"**: The project has commit validation. Make sure your commit message follows the format: `type: description` (e.g., `feat: add new endpoint`).

### Fireflies sync not working

1. Check the GitHub Actions tab: github.com/leadinsideout/unified-data-layer/actions
2. Look for the "Fireflies Sync" workflow — is it running every 10 minutes?
3. If failing, check that `FIREFLIES_SYNC_SECRET` matches between `.env` and GitHub Secrets
4. Check `FIREFLIES_API_KEY` is valid at app.fireflies.ai

### Admin dashboard won't load

- URL: `https://unified-data-layer.vercel.app/admin`
- Need admin credentials — the UDL Admin API Key is in the Development Accounts Notion database
- If login fails, check the `admin_users` table in Supabase

---

## GitHub Secrets Reference

Some automated workflows (GitHub Actions) need their own secrets, separate from your `.env` file. These are set in the GitHub repository: **Settings → Secrets and variables → Actions**.

Log into GitHub with the credentials from Notion, navigate to the repo settings, and you'll see what's currently configured. The key one for Fireflies sync:

| Secret | Used By | What It Is |
|--------|---------|-----------|
| `API_URL` | fireflies-sync | The production URL: `https://unified-data-layer.vercel.app` |
| `FIREFLIES_SYNC_SECRET` | fireflies-sync | Must match the `FIREFLIES_SYNC_SECRET` you set in your `.env` and in Vercel's environment variables |

Other secrets (Slack webhooks, etc.) are already configured. You can view and update them as needed.

---

## What's Next

Once you're set up:

1. **Explore your data** — Use your Custom GPT or Claude Code (via MCP) to search your coaching transcripts
2. **Check the admin dashboard** — Browse your clients, see recent uploads, review analytics
3. **Read CLAUDE.md** — The comprehensive project guide. It contains all the conventions, workflows, and history
4. **Bring questions to the training session** — The more you explore, the better questions you'll have

Welcome to the Borg. You own it now.
