# Pre-Checkpoint Audit Checklist

**Purpose**: Systematic validation to prevent documentation drift and version inconsistencies

**When to Run**: At the START of every checkpoint, before any new work begins

**Time Required**: 5-10 minutes

**Last Updated**: 2025-11-22

---

## Why This Audit Matters

### The Problem
Documentation drift is insidious:
- Version numbers become stale (docs say v0.7.0, reality is v0.9.0)
- Status markers lie (Phase 3 shows "Not Started" when 67% complete)
- Broken links erode trust (checkpoint-5-results.md doesn't exist)
- Security risks hide in forgotten folders (.env files with credentials)

### The Cost
- **Confusion**: Future sessions waste time reconciling conflicting information
- **Errors**: Wrong version numbers propagate to new code
- **Security**: Stray credentials in deprecated folders
- **Credibility**: Outdated docs suggest abandoned project

### The Solution
**Mandatory pre-checkpoint audit** - catch drift BEFORE it compounds

---

## Audit Checklist

### 1. Version Consistency (CRITICAL)

**Goal**: All version numbers must match across the codebase

**Check these files** (ALL must show same version):

- [ ] `package.json` → `"version": "0.X.0"`
- [ ] `README.md` → Version badge or status line
- [ ] `CLAUDE.md` → "Current Version" section (line ~23)
- [ ] `CLAUDE.md` → "Latest Tags" section (line ~24)
- [ ] `CLAUDE.md` → "Latest Documentation" link (line ~25)
- [ ] `api/server.js` → Health endpoint (`/api/health`) version string
- [ ] `api/server.js` → Root endpoint (`/`) version string
- [ ] `api/server.js` → OpenAPI schema version (in `/openapi.json` endpoint)

**How to Check**:
```bash
# Quick version audit
grep -n '"version"' package.json
grep -n 'Version.*v0\.' README.md
grep -n 'Current Version' CLAUDE.md
grep -n "version: '" api/server.js
```

**What Success Looks Like**:
```
package.json:3:  "version": "0.9.0"
README.md:9:**Phase 3 In Progress** ⏳ (67% Complete) | **Version**: v0.9.0
CLAUDE.md:23:**Current Version**: `v0.9.0` (Phase 3 - Checkpoint 9 Complete)
api/server.js:169:    version: '0.9.0',
api/server.js:201:      version: '0.9.0',
api/server.js:866:    version: '0.9.0',
```

**If ANY mismatch found**:
1. STOP - do not proceed with checkpoint work
2. Document all mismatches
3. Present to user for approval to fix
4. Fix in single commit: `docs: pre-checkpoint version sync`
5. Re-run this audit

---

### 2. Status Consistency (HIGH PRIORITY)

**Goal**: Project status accurately reflects current reality

**Check these indicators**:

- [ ] `README.md` → Phase X status line
  - Shows correct phase (1, 2, 3, etc.)
  - Shows correct completion percentage
  - Lists correct checkpoints as complete/pending

- [ ] `README.md` → Checkpoint status table
  - All completed checkpoints marked with ✅
  - All pending checkpoints marked with 🔴
  - Dates accurate for completed work

- [ ] `CLAUDE.md` → "What's Working" section
  - Lists all completed checkpoint features
  - No features listed that aren't actually built
  - No completed features missing from list

- [ ] `CLAUDE.md` → "What's Next" section
  - Points to correct next checkpoint
  - Doesn't list completed work as "next"

- [ ] `docs/checkpoints/README.md` → Checkpoint index
  - Latest checkpoint listed at top
  - All checkpoint links resolve correctly
  - Status markers accurate

- [ ] Phase implementation plan (e.g., `docs/project/phase-3-implementation-plan.md`)
  - Shows correct checkpoint progress
  - Completion dates accurate
  - No "In Progress" markers on completed work

**How to Check**:
```bash
# Check README status
head -30 README.md | grep -A 5 "Phase 3"

# Check CLAUDE.md current status
grep -A 10 "What's Working" CLAUDE.md | head -20

# Check checkpoint index
head -50 docs/checkpoints/README.md
```

**Common Issues**:
- Phase percentage not updated (says 0% when 67% complete)
- Checkpoint completion dates missing
- Old "In Progress" markers on completed work
- "What's Next" still pointing to completed checkpoint

---

### 3. Link Validation (MEDIUM PRIORITY)

**Goal**: All documentation links resolve correctly

**Check these files**:

- [ ] `README.md` → All relative links to docs/ files
- [ ] `CLAUDE.md` → All links to checkpoint docs
- [ ] `docs/checkpoints/README.md` → All checkpoint file links
- [ ] Latest checkpoint results doc → All internal links

**How to Check**:
```bash
# Find all markdown links in key files
grep -n '\[.*\](.*\.md)' README.md
grep -n '\[.*\](.*\.md)' CLAUDE.md
grep -n '\[.*\](.*\.md)' docs/checkpoints/README.md

# Verify each linked file exists
ls docs/checkpoints/checkpoint-9-results.md
ls docs/project/roadmap.md
# etc.
```

**Common Broken Links**:
- `checkpoint-5-results.md` → Should be `PHASE_2_RESULTS.md`
- Links to checkpoints that haven't been written yet
- Old paths after file reorganization

---

### 4. Security & Cleanup (HIGH PRIORITY)

**Goal**: No stray credentials or deprecated code with security risks

**Check for**:

- [ ] No `.env` files outside of root directory
  ```bash
  find . -name ".env" -not -path "./node_modules/*"
  ```

- [ ] No credentials in deprecated folders
  ```bash
  find . -type d -name "*deprecated*" -o -name "*old*" -o -name "*backup*"
  ```

- [ ] No commented-out API keys in code
  ```bash
  grep -r "API_KEY\|SECRET\|PASSWORD" --include="*.js" --include="*.md"
  ```

- [ ] All deprecated folders in `.gitignore`
  ```bash
  cat .gitignore | grep -i deprecated
  ```

**Red Flags**:
- `udlmvp-deprecated/` folder with .env file (SECURITY RISK - DELETE)
- Old .env files in backup folders
- Credentials in commented code or example files

**Action if Found**:
1. STOP immediately
2. Document the security risk
3. Get user approval to delete
4. Delete entire folder (don't just move to gitignore)
5. Commit: `security: remove deprecated folder with credentials`

---

### 5. Git Status Check (MEDIUM PRIORITY)

**Goal**: Clean working tree before starting checkpoint

**Check**:

- [ ] Current branch is `main`
  ```bash
  git branch --show-current
  ```

- [ ] Working tree is clean (no uncommitted changes)
  ```bash
  git status
  ```

- [ ] No untracked files that should be committed
  ```bash
  git status -u
  ```

- [ ] Latest commit represents completed checkpoint
  ```bash
  git log --oneline -5
  ```

**What Success Looks Like**:
```
$ git branch --show-current
main

$ git status
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

**If Working Tree Not Clean**:
1. Review uncommitted changes
2. Either commit them (if related to previous checkpoint) or stash them
3. DO NOT start new checkpoint with uncommitted work

---

## Automated Validation

**Script**: `scripts/audit-consistency.js` (to be created)

**Usage**:
```bash
node scripts/audit-consistency.js
```

**What It Checks**:
1. Version consistency across all files
2. Status markers in README and CLAUDE.md
3. Broken markdown links
4. Security risks (.env files, credentials)
5. Git working tree status

**Output**:
```
✅ Version Consistency: PASS
   - package.json: 0.9.0
   - README.md: v0.9.0
   - CLAUDE.md: v0.9.0
   - api/server.js: 0.9.0 (3 locations)

✅ Status Consistency: PASS
   - Phase 3: 67% complete
   - Latest checkpoint: 9

⚠️  Link Validation: WARNINGS
   - checkpoint-5-results.md not found (referenced in docs/checkpoints/README.md:42)
   - Suggested fix: Use PHASE_2_RESULTS.md instead

✅ Security Check: PASS
   - No stray .env files
   - No deprecated folders with credentials

✅ Git Status: PASS
   - Branch: main
   - Working tree: clean

OVERALL: 4/5 PASS, 1 WARNING
Action Required: Fix broken link before proceeding
```

**Integration**:
- Run manually at start of each checkpoint
- (Future) Add to pre-commit hook
- (Future) Add to GitHub Actions CI

---

## Audit Report Template

**When**: After running audit, if issues found

**Format**:
```markdown
# Pre-Checkpoint Audit Report

**Checkpoint**: X
**Date**: YYYY-MM-DD
**Auditor**: Claude Code / [Your Name]

## Summary
- ❌ Version Consistency: FAILED (3 mismatches)
- ❌ Status Consistency: FAILED (Phase progress outdated)
- ⚠️  Link Validation: WARNINGS (1 broken link)
- ✅ Security Check: PASS
- ✅ Git Status: PASS

## Issues Found

### 1. Version Mismatches
- `README.md` shows v0.7.0 (STALE - should be v0.9.0)
- `CLAUDE.md` shows v0.7.0 (STALE - should be v0.9.0)
- `api/server.js` health endpoint shows 0.8.0 (STALE - should be 0.9.0)

### 2. Status Inconsistencies
- `README.md` Phase 3 shows "Not Started" (WRONG - actual: 67% complete)
- `CLAUDE.md` "What's Working" missing Checkpoint 9 (INCOMPLETE)

### 3. Broken Links
- `docs/checkpoints/README.md:42` → checkpoint-5-results.md (DOES NOT EXIST)
  - Suggested fix: Link to PHASE_2_RESULTS.md instead

## Recommended Fixes

### Priority 1 (Security/Critical) - NONE

### Priority 2 (Documentation Sync)
1. Update all version references to v0.9.0
2. Update README Phase 3 status to 67% complete
3. Fix broken checkpoint-5 link
4. Add Checkpoint 9 to CLAUDE.md

### Action Plan
1. Get user approval for fixes
2. Fix all Priority 2 issues in single commit
3. Re-run audit to verify
4. Proceed to checkpoint work

**Estimated Fix Time**: 10-15 minutes
```

---

## When to Skip This Audit

**Never skip for production-bound checkpoints.**

**May skip** (at your own risk) for:
- Experimental branches that won't merge to main
- Quick bug fixes that don't touch version numbers
- Documentation-only changes with no code impact

**But honestly**: Just run it. It takes 5-10 minutes and prevents hours of cleanup later.

---

## Integration with Checkpoint Workflow

This audit is **Step 0** in the checkpoint workflow:

```
0. ✅ Run Pre-Checkpoint Audit (THIS DOCUMENT)
   - If PASS → Proceed to step 1
   - If FAIL → Fix issues, re-audit, then proceed

1. ✅ Read latest checkpoint status
2. ✅ Check git status and current branch
3. ✅ Understand what's working vs pending
4. ✅ Ask about blockers if relevant
5. ✅ Begin checkpoint work...
```

---

## Case Study: The Cleanup That Inspired This

**Date**: 2025-11-22
**Trigger**: User requested basic codebase care before Checkpoint 10

**Issues Found**:
1. **Version drift**: v0.7.0 in docs, actual state v0.9.0 (2 checkpoints behind)
2. **Phase status**: Phase 3 showed "Not Started" when actually 67% complete
3. **Broken links**: checkpoint-5-results.md referenced but doesn't exist
4. **Security risk**: `udlmvp-deprecated/` folder contained .env with actual credentials
5. **Missing checkpoint**: Checkpoint 9 not added to index

**Impact**:
- 216 KB of code with security risk
- 5 locations with wrong version numbers
- Multiple broken documentation references
- Confusion about project status

**Time to Fix**: 30 minutes of careful work

**Lesson**:
> "If we had run this audit at the start of Checkpoint 10, we would have caught all these issues proactively instead of reactively."

**Result**: This checklist was created to prevent future debt

---

## Related Documentation

- [CLAUDE.md](../../CLAUDE.md) - AI assistant navigation (includes checkpoint workflow)
- [workflows.md](workflows.md) - Development workflows
- [UNIFIED_DEVELOPMENT_METHODOLOGY.md](../methodology/UNIFIED_DEVELOPMENT_METHODOLOGY.md) - Complete methodology

---

## Revision History

- **v1.0** (2025-11-22): Initial checklist based on Checkpoint 9 cleanup learnings
