# Development Workflows & Standards

**Purpose**: This document defines all development workflows, from minimal viable to full production-grade processes.

**Current Status**: Minimal Viable Workflow (see WORKFLOW_IMPLEMENTATION_TRACKER.md for roadmap)

**Last Updated**: 2025-11-08

---

## Table of Contents

1. [Git Branching Strategy](#git-branching-strategy)
2. [Code Review Process](#code-review-process)
3. [Commit Message Convention](#commit-message-convention)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Workflow](#deployment-workflow)
6. [Database Migration Workflow](#database-migration-workflow)
7. [Documentation Standards](#documentation-standards)
8. [CI/CD Pipeline](#cicd-pipeline)

---

## 1. Git Branching Strategy

### **Strategy: GitHub Flow + Phase Branches**

Simplified Gitflow that aligns with checkpoint-based development.

**Key Principle**: `main` is ALWAYS production-ready and deployed to Vercel production.

### Branch Structure

```
main (production-ready, deployed to Vercel production)
  ├── phase-1-checkpoint-1 (feature branch) → merges to main via PR
  ├── phase-1-checkpoint-2 (feature branch) → merges to main via PR
  ├── phase-1-checkpoint-3 (feature branch) → merges to main via PR
  ├── phase-2-* (future)
  └── hotfix/* (emergency fixes) → merges to main via PR
```

**Workflow**:
1. Create checkpoint/feature branch from `main`
2. Develop and test on branch (gets Vercel preview deployment)
3. When complete, create PR to `main`
4. Merge PR → auto-deploys to production
5. Tag release after merge

### Workflow

```bash
# Starting a new checkpoint/feature
git checkout main
git pull origin main
git checkout -b phase-1-checkpoint-1

# Work on tasks
git add .
git commit -m "feat: add database schema setup"

# Push to GitHub regularly (triggers Vercel preview deployment)
git push -u origin phase-1-checkpoint-1

# When checkpoint is complete and validated
# 1. Create Pull Request: phase-1-checkpoint-1 -> main
# 2. Self-review using PR template
# 3. After approval, merge to main
# 4. Tag the release

git checkout main
git pull origin main
git tag -a v0.1.0-checkpoint-1 -m "Checkpoint 1: Local MVP Foundation"
git push origin v0.1.0-checkpoint-1

# Move to next checkpoint
git checkout -b phase-1-checkpoint-2
```

### Branch Naming Convention

- **Phase Checkpoint**: `phase-X-checkpoint-Y`
- **Feature**: `feature/short-description`
- **Bugfix**: `fix/short-description`
- **Hotfix**: `hotfix/critical-issue`
- **Experimental**: `experiment/idea-name`

**Examples:**
```
phase-1-checkpoint-1
feature/add-pdf-upload
fix/search-empty-query-handling
hotfix/database-connection-leak
experiment/alternative-chunking-strategy
```

### Branch Protection Rules

**Status**: 🔴 Not Yet Implemented (see WORKFLOW_IMPLEMENTATION_TRACKER.md)

Configure on GitHub for `main` branch:

```yaml
Settings → Branches → Add branch protection rule → main

Required settings:
  ✓ Require a pull request before merging
  ✓ Require approvals: 0 (solo dev, self-review via PR)
  ✓ Require conversation resolution before merging
  ✓ Require status checks to pass before merging (add when CI/CD ready)
  ✓ Do not allow bypassing the above settings

Optional (for discipline):
  ✓ Include administrators (prevents accidental direct pushes)
```

**Setup Instructions**: See `docs/setup/github-branch-protection.md`

---

## 2. Code Review Process

### Solo Developer Self-Review via Pull Requests

Even working solo, structured reviews catch bugs and document decisions.

### PR Template

**Location**: `.github/pull_request_template.md`

**Status**: ✅ Implemented (see file)

### Self-Review Process

1. **Create PR** from feature branch to main (triggers Vercel preview)
2. **Review your own code** using GitHub's PR interface
   - Look for: logic errors, security issues, performance problems
   - Check: no secrets, no commented code, proper error handling
3. **Fill out PR template** completely
4. **Test preview deployment** (Vercel auto-creates preview URL)
5. **Wait 30 minutes**, review again with fresh eyes
6. **Run all tests** one more time
7. **Merge** only after all checkboxes checked

### PR Approval Criteria

Before merging, verify:
- ✅ All checklist items completed
- ✅ Vercel preview deployment works
- ✅ Tests pass (manual or automated)
- ✅ No merge conflicts
- ✅ Commit messages follow convention
- ✅ Documentation updated if needed

---

## 3. Commit Message Convention

### **Strategy: Conventional Commits**

Structured commit messages enable auto-changelog generation and semantic versioning.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Adding or updating tests
- **refactor**: Code refactoring (no behavior change)
- **chore**: Build process, dependencies, tooling
- **perf**: Performance improvements
- **style**: Code formatting (not CSS)

### Examples

**Simple:**
```bash
feat(api): add transcript upload endpoint
fix(search): handle empty query string gracefully
docs(readme): add Supabase setup instructions
test(search): add unit tests for vector similarity
chore(deps): upgrade openai package to 6.3.0
```

**With Body:**
```bash
feat(embeddings): implement chunking with overlap

- Split transcripts into 500-word chunks
- Add 50-word overlap between chunks
- Store chunk_index for ordering
- References REBUILD_PLAN.md task 9

Closes #123
```

**Breaking Changes:**
```bash
feat(api)!: change search endpoint response format

BREAKING CHANGE: Search endpoint now returns {results: [], metadata: {}}
instead of flat array. Custom GPT integration must be updated.

Migration guide: docs/migrations/search-response-v2.md
```

### Scope Guidelines

- `api`: API endpoints and server
- `db`: Database schema or queries
- `embeddings`: Embedding generation
- `search`: Search functionality
- `upload`: Upload endpoints
- `deploy`: Deployment configuration
- `test`: Test files
- `docs`: Documentation

### Commitizen Setup (Optional)

**Status**: 🔴 Not Yet Implemented (see WORKFLOW_IMPLEMENTATION_TRACKER.md)

**When to Add**: When commit message quality becomes inconsistent

```bash
npm install --save-dev commitizen cz-conventional-changelog
```

**package.json:**
```json
{
  "scripts": {
    "commit": "cz"
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

**Usage**: `npm run commit` instead of `git commit`

---

## 4. Testing Strategy

### Phase-Based Testing Approach

Testing rigor increases with each phase as risk and complexity grow.

### Phase 1: Manual + Critical Integration Tests

**Philosophy**: Validate core functionality manually, automate critical paths.

#### Test Types for Phase 1

**1. Manual E2E Testing** ✅ (Primary)
- **Status**: Implemented via checklist
- **Location**: `tests/e2e-checklist.md`
- **When**: Before each checkpoint completion
- **Covers**: Full user workflows, Custom GPT integration

**2. Integration Tests** 🟡 (Add after Checkpoint 1)
- **Status**: Not yet implemented
- **When to Add**: After Checkpoint 1 local validation
- **Trigger**: When you have working API endpoints to test
- **Covers**: API endpoints, database interactions

**3. Unit Tests** 🔴 (Add in Phase 2)
- **Status**: Deferred
- **When to Add**: Phase 2 when refactoring for multiple data types
- **Covers**: Pure functions, business logic

#### Manual E2E Test Checklist

**Location**: `tests/e2e-checklist.md`

**When to Run**:
- Before merging checkpoint PRs
- Before production deployments
- After any breaking changes

#### Integration Test Setup

**Status**: 🟡 Add After Checkpoint 1

**Installation**:
```bash
npm install --save-dev jest supertest @types/jest
```

**Configuration** (`package.json`):
```json
{
  "scripts": {
    "test": "NODE_OPTIONS=--experimental-vm-modules jest",
    "test:watch": "NODE_OPTIONS=--experimental-vm-modules jest --watch",
    "test:coverage": "NODE_OPTIONS=--experimental-vm-modules jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testMatch": ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"]
  }
}
```

**Example Test** (`tests/api.integration.test.js`):
```javascript
import request from 'supertest';
import app from '../api/server.js';

describe('POST /api/transcripts/upload', () => {
  test('uploads transcript and returns ID', async () => {
    const response = await request(app)
      .post('/api/transcripts/upload')
      .send({
        text: 'Sample coaching transcript...',
        meeting_date: '2025-11-08',
        coach_id: 'test-coach-id',
        client_id: 'test-client-id'
      })
      .expect(201);

    expect(response.body).toHaveProperty('transcript_id');
    expect(response.body).toHaveProperty('chunks_created');
  });

  test('rejects upload with missing text', async () => {
    await request(app)
      .post('/api/transcripts/upload')
      .send({ meeting_date: '2025-11-08' })
      .expect(400);
  });
});

describe('POST /api/search', () => {
  test('returns relevant chunks for query', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'career goals', limit: 5 })
      .expect(200);

    expect(response.body.results).toBeDefined();
    expect(response.body.results.length).toBeLessThanOrEqual(5);
    expect(response.body.results[0]).toHaveProperty('similarity');
  });

  test('respects similarity threshold', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({ query: 'career goals', threshold: 0.8, limit: 5 })
      .expect(200);

    response.body.results.forEach(result => {
      expect(result.similarity).toBeGreaterThan(0.8);
    });
  });
});
```

### Testing Evolution by Phase

**Phase 1**:
- ✅ Manual E2E checklist
- 🟡 Integration tests for API endpoints
- ❌ Unit tests (minimal)

**Phase 2**:
- ✅ Expand integration tests for new data types
- ✅ Add unit tests for complex business logic
- ✅ Type-specific test scenarios

**Phase 3**:
- ✅ Security testing
- ✅ PII scrubbing validation tests
- ✅ Penetration testing (automated tools)

**Phase 4**:
- ✅ MCP integration tests
- ✅ Custom GPT integration tests (automated)
- ✅ Multi-tenant isolation tests

**Phase 6**:
- ✅ Load testing
- ✅ Performance benchmarks
- ✅ Stress testing

---

## 5. Deployment Workflow

### **Strategy: Vercel Auto-Deploy with Preview Environments**

Every PR gets a preview deployment, every merge to `main` deploys to production.

**Production Branch**: `main` (all checkpoint branches merge here via PR after validation)

### Vercel Configuration

**File**: `vercel.json` ✅ Implemented

### Environment Variables

**Environments**:

1. **Local Development** (`.env` - gitignored)
2. **Vercel Preview** (set in Vercel dashboard per project)
3. **Vercel Production** (set in Vercel dashboard per project)

**Required Variables**:
```bash
SUPABASE_URL
SUPABASE_SERVICE_KEY
OPENAI_API_KEY
NODE_ENV
```

**Setup**:
- Local: Copy `.env.example` to `.env`, fill in values
- Vercel: Dashboard → Project → Settings → Environment Variables

### Deployment Flow

```
Developer pushes to feature branch
              ↓
        PR created on GitHub
              ↓
Vercel auto-creates preview deployment
  URL: https://unified-data-layer-git-<branch>-<team>.vercel.app
              ↓
    Test on preview URL
              ↓
      PR approved & merged
              ↓
Vercel auto-deploys to production
  URL: https://unified-data-layer.vercel.app
              ↓
    Tag release (v0.X.0)
```

### Preview Deployment Testing

Before merging any PR:

1. ✅ Click Vercel preview URL in PR
2. ✅ Test health check: `GET /api/health`
3. ✅ Test primary endpoint (search, upload, etc.)
4. ✅ Verify environment variables loaded
5. ✅ Check Vercel logs for errors

### Production Deployment Checklist

Before merging to main:

- ✅ Preview deployment tested thoroughly
- ✅ Database migrations run (if applicable)
- ✅ Environment variables set in Vercel production
- ✅ Vercel build succeeds without warnings
- ✅ No breaking changes to Custom GPT integration
- ✅ Rollback plan documented

### Rollback Strategy

**If production deployment fails:**

```bash
# Option 1: Vercel rollback (instant)
vercel rollback

# Option 2: Revert commit and push
git revert <commit-hash>
git push origin main

# Option 3: Redeploy previous version
vercel --prod <previous-deployment-url>
```

### Monitoring Post-Deployment

**Immediate** (within 5 minutes):
- ✅ Check Vercel deployment status
- ✅ Test production health endpoint
- ✅ Test one critical flow (e.g., search)
- ✅ Check Vercel logs for errors

**Within 1 hour**:
- ✅ Test Custom GPT integration
- ✅ Monitor error rates
- ✅ Verify database connectivity

---

## 6. Database Migration Workflow

### **Strategy: SQL Migration Files with Local Testing**

**Status**: ✅ Implemented (Checkpoint 9) - See migration-template.md for full details

**Updated**: 2025-11-20 (Post-Checkpoint 9 Retrospective)

### Overview

All database schema changes must:
1. ✅ Be tested locally before production
2. ✅ Follow migration template structure
3. ✅ Include rollback procedures
4. ✅ Pass pre-migration audit
5. ✅ Be documented with test results

### Directory Structure

```
scripts/
  database/
    001_initial_schema.sql
    002_add_vector_embeddings.sql
    003_multi_type_schema.sql
    004_coaching_organizations.sql
    005a_add_visibility_levels.sql
    005b_add_join_tables.sql
    006_row_level_security_final.sql
    XXX_rollback.sql (rollback scripts)
    XXX_test_log.txt (test results)
    current_schema.sql (latest production schema)
```

### Migration Workflow Checklist

#### Before Writing Migration

- [ ] **Run Pre-Migration Audit**
  - Verify current database schema (use `mcp__supabase__list_tables`)
  - Check for missing prerequisites (join tables, helper functions)
  - Identify special cases (admin, system users, null values)
  - Review PostgreSQL requirements (function volatility, constraint rules)
  - Document current state in migration header

- [ ] **Review Requirements**
  - Check design docs for required tables/relationships
  - List all foreign key dependencies
  - Identify edge cases for constraints
  - Plan index strategy

#### Writing Migration

- [ ] **Use Migration Template**
  - Copy from `docs/development/migration-template.md`
  - Follow naming convention: `XXX_descriptive_name.sql`
  - Include pre-migration audit results in header
  - Document all prerequisites

- [ ] **Structure Migration Properly**
  - Step 1: Create tables
  - Step 2: Create functions (with correct volatility)
  - Step 3: Enable features (RLS, triggers, extensions)
  - Step 4: Create policies/rules
  - Step 5: Create indexes (no STABLE functions in predicates)
  - Step 6: Seed test data
  - Step 7: Verification queries

- [ ] **Create Rollback Script**
  - File: `XXX_rollback.sql`
  - Reverse order of migration steps
  - Include data preservation warnings
  - Add verification queries

#### Testing Migration Locally

**Required**: Must test locally before applying to production

- [ ] **Setup Local Environment** (if not already done)
  - Follow `docs/setup/local-development.md`
  - Install PostgreSQL 17.x with pgvector
  - Create local database
  - Restore production schema

- [ ] **Test Migration Execution**
  ```bash
  # Backup current schema
  pg_dump --schema-only unified_data_layer_local > backup_schema.sql

  # Apply migration
  psql-local < scripts/database/XXX_migration.sql

  # Check for errors
  echo $?  # Should be 0

  # Run verification queries
  psql-local -c "SELECT * FROM new_table LIMIT 5;"
  ```

- [ ] **Test Rollback Procedure**
  ```bash
  # Apply rollback
  psql-local < scripts/database/XXX_rollback.sql

  # Verify database restored
  psql-local -c "\dt"
  psql-local -c "\df"
  ```

- [ ] **Document Test Results**
  - Create `scripts/database/XXX_test_log.txt`
  - Record all test outcomes (pass/fail)
  - Note any warnings or issues
  - Confirm ready for production

#### Applying to Production

- [ ] **Create Safety Checkpoint**
  ```bash
  git add scripts/database/XXX_migration.sql
  git add scripts/database/XXX_rollback.sql
  git commit -m "feat(db): add migration XXX - ready for production"
  ```

- [ ] **Document Rollback Plan**
  - Create rollback instructions doc
  - Include emergency procedures
  - Document data preservation steps

- [ ] **Apply via Supabase Dashboard**
  - Copy migration SQL to clipboard
  - Open Supabase SQL Editor
  - Paste and review migration
  - Execute migration
  - Run verification queries
  - Check for errors

- [ ] **Verify Migration Success**
  - Run verification queries from migration
  - Check data integrity (row counts)
  - Test API endpoints with new schema
  - Monitor for errors

#### After Migration

- [ ] **Commit Migration Files**
  ```bash
  git add scripts/database/XXX_migration.sql
  git add scripts/database/XXX_rollback.sql
  git add scripts/database/XXX_test_log.txt
  git commit -m "feat(db): apply migration XXX to production"
  ```

- [ ] **Update Documentation**
  - Update checkpoint docs with migration details
  - Note any issues encountered
  - Document production verification results

- [ ] **Create Integration Tests**
  - Test new tables/columns via API
  - Verify RLS policies (if applicable)
  - Test rollback in staging (if available)

- [ ] **Conduct Retrospective**
  - Review what went well
  - Document issues encountered
  - Update workflows if needed

### Common Pitfalls (Lessons from Checkpoint 9)

#### 1. Function Volatility in Index Predicates

**Problem**: Cannot use STABLE/VOLATILE functions in index WHERE clauses

```sql
-- ❌ FAILS
CREATE INDEX idx_active ON api_keys(key_hash)
  WHERE is_revoked = false AND get_current_user_id() IS NOT NULL;
-- ERROR: functions in index predicate must be marked IMMUTABLE

-- ✅ FIX
CREATE INDEX idx_active ON api_keys(key_hash)
  WHERE is_revoked = false;
-- Remove function from predicate
```

**Rule**: Functions using `current_setting()` or session state CANNOT be IMMUTABLE

#### 2. Missing Prerequisite Tables

**Problem**: Migration references tables that don't exist yet

```sql
-- ❌ FAILS if coach_clients doesn't exist
CREATE POLICY coaches_see_clients ON data_items FOR SELECT
  USING (client_id IN (SELECT client_id FROM coach_clients WHERE coach_id = get_current_coach_id()));
-- ERROR: relation "coach_clients" does not exist

-- ✅ FIX
-- Create prerequisite migration first: 005b_add_join_tables.sql
-- Then run RLS migration: 006_row_level_security.sql
```

**Rule**: Always verify all referenced tables exist before writing policies

#### 3. Overly Restrictive Constraints

**Problem**: Constraints don't allow special cases (admin, system users)

```sql
-- ❌ TOO STRICT
CONSTRAINT key_has_single_owner CHECK (
  (coach_id IS NOT NULL AND client_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NOT NULL)
)
-- Breaks for admin keys (both NULL)

-- ✅ FLEXIBLE
CONSTRAINT key_owner_not_both CHECK (
  NOT (coach_id IS NOT NULL AND client_id IS NOT NULL)
)
-- Allows NULL/NULL for admin
```

**Rule**: Brainstorm edge cases before creating constraints

### Resources

- **Migration Template**: `docs/development/migration-template.md`
- **Local Setup Guide**: `docs/setup/local-development.md`
- **Checkpoint 9 Retrospective**: `docs/checkpoints/checkpoint-9-retrospective.md`
- **PostgreSQL Function Volatility**: https://www.postgresql.org/docs/current/xfunc-volatility.html

### Quick Reference

```bash
# Setup local environment (one-time)
createdb unified_data_layer_local
psql unified_data_layer_local -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Restore production schema
supabase db dump --schema-only > scripts/database/current_schema.sql
psql unified_data_layer_local < scripts/database/current_schema.sql

# Create new migration
touch scripts/database/007_new_feature.sql
touch scripts/database/007_rollback.sql

# Test migration locally
psql unified_data_layer_local < scripts/database/007_new_feature.sql

# Test rollback
psql unified_data_layer_local < scripts/database/007_rollback.sql

# Apply to production (after local testing passes)
# Copy SQL to Supabase dashboard, execute, verify
```

### Migration Runner Script

**File**: `scripts/migrate.js`

```javascript
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration(s)\n`);

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sqlPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Extract UP migration only (ignore DOWN section)
    const upSection = sql.split('-- DOWN MIGRATION')[0];

    try {
      // Execute SQL directly via Supabase client
      const { error } = await supabase.rpc('exec_sql', { sql: upSection });
      if (error) throw error;

      console.log(`✓ ${file} completed\n`);
    } catch (error) {
      console.error(`✗ ${file} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully');
}

runMigrations().catch(console.error);
```

### Migration Workflow

**Creating a Migration**:
```bash
# 1. Create new migration file
touch scripts/migrations/002_add_something.sql

# 2. Write SQL (use template above)

# 3. Test locally
node scripts/migrate.js

# 4. Commit migration file
git add scripts/migrations/002_add_something.sql
git commit -m "db: add something to schema"

# 5. After PR merge, run on production
# Set production env vars, then:
node scripts/migrate.js
```

### Migration Rules

1. **Never modify existing migrations** - Always create new ones
2. **Always include rollback SQL** - Even if commented out
3. **Test locally first** - Always
4. **One migration per logical change** - Don't combine unrelated changes
5. **Idempotent migrations** - Use `IF NOT EXISTS`, `IF EXISTS`
6. **Document dependencies** - Note if migration depends on another

### Schema Change Checklist

Before running migration in production:

- ✅ Migration tested in local Supabase
- ✅ Migration file committed to git
- ✅ DOWN migration documented
- ✅ Backup created (Supabase dashboard)
- ✅ Team notified (if applicable)
- ✅ Rollback plan ready
- ✅ Monitor logs after running

---

## 7. Documentation Standards

### Keep Documentation Close to Code

### File Structure

```
/
  README.md               # Getting started, quick start
  REBUILD_PLAN.md         # Phase-by-phase implementation plan
  product-roadmap.md      # Strategic vision
  WORKFLOWS.md            # This file
  CONTRIBUTING.md         # How to contribute (future)

  docs/
    api/
      endpoints.md        # API documentation
      openapi.json        # OpenAPI schema
    setup/
      local-development.md
      supabase-setup.md
      vercel-deployment.md
      github-branch-protection.md
    architecture/
      database-schema.md
      vector-search.md
    migrations/
      search-response-v2.md  # Breaking change migration guides
```

### Documentation Types

**1. Code Comments** - Inline explanations

```javascript
/**
 * Chunks text into overlapping segments for embedding generation
 *
 * Why overlap? Prevents semantic meaning from being split at chunk boundaries.
 * Example: "...decided to pursue. Career coaching helped..." would split poorly
 * without overlap maintaining context across chunks.
 *
 * @param {string} text - The full transcript text
 * @param {number} chunkSize - Number of words per chunk (default: 500)
 * @param {number} overlap - Number of overlapping words (default: 50)
 * @returns {Array<string>} Array of text chunks
 *
 * @example
 * const chunks = chunkText(transcript, 500, 50);
 * // Returns: ["chunk 1...", "chunk 2...", ...]
 */
export function chunkText(text, chunkSize = 500, overlap = 50) {
  // Implementation
}
```

**2. README Files** - Quick starts and overviews

- Project root README: Getting started
- Directory READMEs: What's in this directory
- Keep them short and actionable

**3. Technical Docs** - Deep dives

- Architecture decisions
- How systems work
- Performance characteristics
- Security considerations

**4. API Documentation** - Endpoint reference

- **Status**: 🟡 Add after Checkpoint 2 (deployment)
- Auto-generate from OpenAPI schema
- Include examples for every endpoint

### Documentation Update Rules

- Update docs in same PR as code changes
- Breaking changes MUST include migration guide
- New endpoints MUST include in OpenAPI schema
- Complex logic MUST include inline comments

### When to Write Docs

**Immediately**:
- New API endpoints
- Breaking changes
- Setup/configuration changes
- Architecture decisions

**Can Defer**:
- Internal implementation details
- Temporary experimental code
- TODO comments (track in issues instead)

---

## 8. CI/CD Pipeline

### **Strategy: GitHub Actions for Automated Testing & Checks**

**Status**: 🔴 Not Yet Implemented (Add in Phase 2)

**When to Add**: When integration tests are in place and stability is critical

### Planned Pipeline

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_TEST_KEY }}

      - name: Check test coverage
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format:check

  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
```

### Status Checks for PRs

When CI/CD is enabled, PRs must pass:

- ✅ All tests passing
- ✅ Linter passing
- ✅ Security audit clean
- ✅ No secrets committed
- ✅ Code coverage threshold met (80%+)

---

## Workflow Implementation Tracker

**See**: `WORKFLOW_IMPLEMENTATION_TRACKER.md` for detailed roadmap of when to implement each workflow component.

---

## Questions & Troubleshooting

### How do I...

**...create a new feature?**
```bash
git checkout main
git pull
git checkout -b feature/my-feature
# Work, commit, push
# Create PR, self-review, merge
```

**...rollback a bad deployment?**
```bash
vercel rollback
# Or revert the commit and push
```

**...run migrations?**
```bash
node scripts/migrate.js
```

**...add a new environment variable?**
1. Add to `.env.example` (no values)
2. Add to local `.env` (with values)
3. Add to Vercel dashboard (Settings → Environment Variables)
4. Redeploy

**...handle a merge conflict?**
```bash
git checkout main
git pull
git checkout your-branch
git merge main
# Resolve conflicts
git commit
git push
```

---

## Evolution of Workflows

This document will evolve as the project grows:

- **Phase 1**: Minimal workflows (current)
- **Phase 2**: Add automated testing, CI/CD
- **Phase 3**: Add security scanning, compliance checks
- **Phase 4**: Add performance monitoring, alerting
- **Phase 6**: Add load testing, chaos engineering

**Track changes**: All workflow changes should be documented in WORKFLOW_IMPLEMENTATION_TRACKER.md with dates and rationale.

---

## Reference

- **Branch Protection**: `docs/setup/github-branch-protection.md`
- **Testing Guide**: `docs/testing/integration-tests.md` (future)
- **Deployment Guide**: `docs/setup/vercel-deployment.md`
- **Migration Guide**: `docs/database/migrations.md` (future)

## 9. Slack Notification Best Practices

### **Pattern: JSON-Safe Payload Construction**

**Status**: ✅ Implemented (Post-Checkpoint 9 Fix)

**When to Use**: Any GitHub Actions workflow that sends Slack notifications with dynamic content

### The Problem

Directly injecting multi-line strings (like changelogs) into JSON payloads breaks parsing:

**Wrong** ❌:
```yaml
"text": "*Recent Changes:*\n${{ steps.changelog.outputs.changelog }}"
```

When changelog contains:
```
- feat: add feature
- fix: fix bug
- docs: update docs
```

The resulting JSON becomes invalid:
```json
{
  "text": "*Recent Changes:*\n- feat: add feature
- fix: fix bug
- docs: update docs"
}
```

**Error**: `invalid JSON payload` - Newlines are literal, not escaped.

### The Solution

**Correct** ✅:

```yaml
- name: Get changelog
  id: changelog
  run: |
    CHANGELOG=$(git log --format="- %s" ${LAST_TAG}..HEAD | head -5)

    # Escape for JSON using jq
    CHANGELOG_JSON=$(echo "$CHANGELOG" | jq -Rs . | sed 's/^"//;s/"$//')

    echo "changelog=$CHANGELOG_JSON" >> $GITHUB_OUTPUT

- name: Validate JSON payload
  run: |
    cat > /tmp/test-payload.json <<'PAYLOAD_EOF'
    {
      "text": "*Changes:*\n${{ steps.changelog.outputs.changelog }}"
    }
    PAYLOAD_EOF

    if ! jq empty /tmp/test-payload.json 2>/dev/null; then
      echo "❌ JSON validation failed!"
      exit 1
    fi

- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "*Recent Changes:*\n${{ steps.changelog.outputs.changelog }}"
      }
```

### Key Points

1. **Always escape with jq**: Use `jq -Rs` to convert raw string to JSON-safe string
2. **Validate before sending**: Add validation step to catch errors early
3. **Test locally**: Use `scripts/test-slack-payload.sh [checkpoint]`
4. **Limit output size**: Use `head -5` to keep messages concise

### Prevention

**Pre-commit hook** (automatically checks workflow files):
```bash
# In .husky/pre-commit
if grep -q '\${{ .*changelog.* }}' "$file"; then
  if ! grep -q 'jq -Rs' "$file"; then
    echo "⚠️  Warning: unsafe changelog injection!"
  fi
fi
```

### Testing

**Local test before push**:
```bash
./scripts/test-slack-payload.sh 9

# Expected output:
✅ JSON is valid!
```

**Create test tag to verify**:
```bash
git tag v0.X.Y-checkpoint-N-test
git push origin v0.X.Y-checkpoint-N-test
gh run watch

# Clean up after verification:
git tag -d v0.X.Y-checkpoint-N-test
git push origin :refs/tags/v0.X.Y-checkpoint-N-test
```

### Resources

- **Analysis**: `docs/development/SLACK_NOTIFICATION_FIX_ANALYSIS.md`
- **Test Script**: `scripts/test-slack-payload.sh`
- **Example Fix**: See `.github/workflows/slack-checkpoint.yml` lines 89-137

### Common Mistakes

**Mistake 1**: Injecting unescaped strings
```yaml
❌ "text": "${{ steps.changelog.outputs.changelog }}"
```

**Mistake 2**: Forgetting to validate
```yaml
❌ No validation step before Notify Slack
```

**Mistake 3**: Not testing locally
```yaml
❌ Pushing without running ./scripts/test-slack-payload.sh
```

### Success Criteria

- ✅ All checkpoint notifications send successfully
- ✅ No "invalid JSON payload" errors
- ✅ Local test script passes
- ✅ Pre-commit hook warns about unsafe patterns

---

**Last Updated**: 2025-11-20 (Post-Checkpoint 9 Fix)
**Reference**: Checkpoint 9 Slack notification failure analysis
