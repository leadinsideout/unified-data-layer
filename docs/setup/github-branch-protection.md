# GitHub Branch Protection Setup

**Purpose**: Configure GitHub branch protection rules to prevent accidental direct pushes to `main` and enforce PR-based workflow.

**When to Set Up**: After Checkpoint 1 (Local MVP validated)

**Status**: 🔴 Not yet implemented (see WORKFLOW_IMPLEMENTATION_TRACKER.md Milestone 1)

---

## Why Branch Protection?

**Benefits**:
- Prevents accidental direct pushes to main
- Forces all changes through PRs (enables Vercel preview deployments)
- Enables self-review via PR template
- Creates audit trail of all changes
- Allows rollback to any previous state

**Builds discipline** even for solo development.

---

## Setup Instructions

### Step 1: Navigate to Branch Protection Settings

1. Go to your GitHub repository: `https://github.com/leadinsideout/unified-data-layer`
2. Click **Settings** tab
3. Click **Branches** in left sidebar
4. Click **Add branch protection rule**

### Step 2: Configure Protection Rule

**Branch name pattern**: `main`

**Settings to Enable**:

#### Required Settings

- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `0` (solo dev, but forces PR creation)
  - ❌ Dismiss stale pull request approvals (not needed for solo)
  - ✅ Require review from Code Owners (skip - no CODEOWNERS file)
  - ❌ Restrict who can dismiss (not needed)
  - ✅ Require approval of the most recent reviewable push

- ✅ **Require status checks to pass before merging** (enable after CI/CD setup)
  - Search for status checks: (none yet, add after Milestone 6)
  - ✅ Require branches to be up to date before merging

- ✅ **Require conversation resolution before merging**
  - Forces you to resolve any comments you leave during self-review

- ✅ **Require signed commits** (optional, recommended for security)
  - See: https://docs.github.com/en/authentication/managing-commit-signature-verification

- ❌ **Require linear history** (optional, makes git history cleaner)
  - Skip for now, can enable later

- ❌ **Require deployments to succeed** (skip - Vercel handles this separately)

#### Advanced Settings

- ✅ **Do not allow bypassing the above settings**
  - ✅ Include administrators (prevents even you from bypassing rules)
  - Builds discipline, prevents shortcuts

- ❌ **Allow force pushes** (KEEP DISABLED - dangerous)
- ❌ **Allow deletions** (KEEP DISABLED - prevents accidental branch deletion)

### Step 3: Save Protection Rule

- Click **Create** or **Save changes**
- Verify: Go to repository, try to push directly to main
- Expected: Push rejected with message about branch protection

---

## What Happens After Enabling

### ❌ This Will No Longer Work

```bash
# Direct push to main - BLOCKED
git checkout main
git commit -m "quick fix"
git push origin main
# ERROR: Protected branch push restrictions
```

### ✅ This is the New Workflow

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feature/my-change

# Make changes
git add .
git commit -m "feat: add my change"
git push -u origin feature/my-change

# Create PR on GitHub
# Review using PR template
# Merge PR on GitHub UI
```

---

## Testing Branch Protection

After setup, test that it works:

```bash
# 1. Try to push directly to main (should fail)
git checkout main
echo "test" >> README.md
git add .
git commit -m "test: testing branch protection"
git push origin main
# Expected: ERROR - protected branch

# 2. Undo test commit
git reset --hard HEAD~1

# 3. Verify PR workflow works
git checkout -b test/branch-protection
echo "test" >> README.md
git add .
git commit -m "test: verify PR workflow"
git push -u origin test/branch-protection
# Create PR on GitHub
# Verify: Can merge PR
# Merge PR
# Delete test branch
```

---

## Status Checks (Future)

When you add CI/CD (Milestone 6), come back and add these status checks:

**Required status checks**:
- `test` - Automated tests must pass
- `lint` - Linting must pass
- `build` - Build must succeed
- `security-audit` - Security checks must pass

**How to add**:
1. After GitHub Actions workflow is set up
2. Go back to branch protection settings
3. Under "Require status checks to pass"
4. Search for and select: `test`, `lint`, `build`, `security-audit`
5. Save changes

---

## Troubleshooting

**Problem**: I need to bypass branch protection for emergency hotfix

**Solution**:
```bash
# DON'T disable branch protection
# Instead:
1. Create hotfix branch: git checkout -b hotfix/critical-issue
2. Fix issue
3. Push and create PR
4. Merge PR immediately (no need to wait)
5. This maintains audit trail
```

**Problem**: I accidentally pushed to main before enabling protection

**Solution**:
```bash
# No problem, enable protection now
# Future pushes will be blocked
# Past commits remain in history
```

**Problem**: GitHub says I can't enable "Include administrators"

**Solution**:
- You need to be repository owner or have admin permissions
- Check repository settings → Manage access
- Ensure you have admin role

---

## When to Disable (Never, but...)

**Valid reasons** (rare):
- Repository migration/restructuring
- Bulk history rewriting (git rebase on main)
- Emergency rollback of critical bug

**How to temporarily disable**:
1. Go to Settings → Branches
2. Click Edit on main branch rule
3. Scroll to bottom
4. Click **Delete rule**
5. Perform emergency action
6. **IMMEDIATELY re-enable protection** using same settings

**Better approach**: Don't disable, use proper git workflow instead.

---

## Benefits You'll See

After using branch protection for a few checkpoints:

1. **Better code review** - Even self-review catches more bugs via PR interface
2. **Vercel previews** - Every PR gets preview deployment automatically
3. **Cleaner history** - All changes documented in PRs
4. **Easy rollback** - Can revert any merged PR with one click
5. **Audit trail** - Know exactly when/why every change was made

---

## Next Steps

After enabling branch protection:

1. Test the workflow with a small change
2. Practice creating PRs, filling template, merging
3. After Milestone 6 (CI/CD), add status checks
4. Document any team-specific rules (if team grows)

---

## References

- [GitHub Docs: Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Pull Requests](https://docs.github.com/en/pull-requests)
- [Signed Commits](https://docs.github.com/en/authentication/managing-commit-signature-verification)
