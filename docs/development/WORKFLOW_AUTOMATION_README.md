# Workflow Automation - Quick Start

**Status**: ✅ Tier 1 Implementation Complete
**Date**: 2025-11-09

---

## What's Been Automated

### 1. ✅ Automated Changelog Generation
- Generates `CHANGELOG.md` from conventional commits
- Semantic versioning (major/minor/patch)
- Grouped by type (Features, Fixes, Docs, etc.)

**Usage**:
```bash
npm run release          # Auto-detect version bump
npm run release:minor    # Force minor version (0.X.0)
npm run release:major    # Force major version (X.0.0)
npm run release:patch    # Force patch version (0.0.X)
```

### 2. ✅ Commit Message Validation
- Enforces conventional commits format
- Pre-commit hooks block invalid messages
- Prevents commits without type/scope

**Format**: `type(scope): subject`

**Valid Examples**:
```bash
feat(api): add search endpoint
fix(db): resolve connection timeout
docs(readme): update setup instructions
```

**Invalid** (will be blocked):
```bash
updated api
fixed bug
WIP
```

### 3. ✅ Pre-Commit Hooks
- Validates commit messages automatically
- Runs on every `git commit`
- Can bypass with `git commit --no-verify` if needed

### 4. ✅ Slack Notifications
- **Deployments**: Success/failure alerts
- **Pull Requests**: Opened/merged notifications
- **Checkpoints**: Completion announcements

**Setup Required**: See [slack-setup-guide.md](slack-setup-guide.md)

---

## Quick Commands

### Committing Code

**Option 1: Manual (must follow format)**
```bash
git add .
git commit -m "feat(api): add new endpoint"
```

**Option 2: Interactive (guided)**
```bash
npm run commit
# Commitizen will guide you through the format
```

### Creating Releases

**After completing a checkpoint**:
```bash
# 1. Ensure all changes are committed
git status

# 2. Generate changelog and bump version
npm run release:minor

# 3. Push with tags
git push --follow-tags
```

This automatically:
- ✅ Analyzes all commits since last release
- ✅ Generates/updates CHANGELOG.md
- ✅ Bumps version in package.json
- ✅ Creates git tag (e.g., v0.3.0)
- ✅ Commits the changes

### Bypassing Hooks (Emergency Only)

```bash
git commit --no-verify -m "hotfix: critical bug"
```

---

## File Structure

```
.
├── .commitlintrc.json          # Commit message rules
├── .versionrc.json             # Changelog generation config
├── .husky/
│   ├── pre-commit              # Runs lint-staged
│   └── commit-msg              # Validates commit message
├── .github/workflows/
│   ├── slack-deployment.yml    # Deployment notifications
│   ├── slack-pr.yml            # PR notifications
│   └── slack-checkpoint.yml    # Checkpoint notifications
├── CHANGELOG.md                # Auto-generated (after first release)
└── package.json                # New scripts added
```

---

## Conventional Commit Types

| Type | Description | Changelog Section | Example |
|------|-------------|-------------------|---------|
| `feat` | New feature | Features | `feat(api): add search` |
| `fix` | Bug fix | Bug Fixes | `fix(db): resolve timeout` |
| `docs` | Documentation | Documentation | `docs(readme): update setup` |
| `test` | Tests | Tests | `test(api): add unit tests` |
| `refactor` | Code refactor | Code Refactoring | `refactor(api): simplify logic` |
| `perf` | Performance | Performance | `perf(search): optimize query` |
| `chore` | Maintenance | (hidden) | `chore(deps): update packages` |
| `style` | Formatting | (hidden) | `style: fix indentation` |

### Valid Scopes

| Scope | Usage |
|-------|-------|
| `api` | API endpoints, server |
| `db` | Database, schema, migrations |
| `embeddings` | Embedding generation |
| `search` | Search functionality |
| `upload` | Upload endpoints |
| `deploy` | Deployment config |
| `test` | Test files |
| `docs` | Documentation |
| `security` | Security fixes |
| `custom-gpt` | Custom GPT integration |
| `workflow` | Workflow automation |

---

## Troubleshooting

### "Commit message doesn't follow format"

**Error**:
```
✖   type may not be empty [type-empty]
✖   subject may not be empty [subject-empty]
```

**Fix**: Use conventional commits format:
```bash
git commit -m "feat(scope): description"
```

Or use interactive mode:
```bash
npm run commit
```

### "Hook failed: husky"

**Error**: Pre-commit hook blocked your commit

**Fix**:
1. Check what failed (commitlint, lint-staged)
2. Fix the issue
3. Try committing again

**Emergency bypass**:
```bash
git commit --no-verify -m "your message"
```

### "npm run release failed"

**Error**: standard-version can't determine version

**Fix**:
1. Ensure you have at least one commit
2. Force a specific version:
```bash
npm run release:minor -- --first-release
```

---

## What Happens on Commit

```
┌─────────────────────┐
│ git commit -m "..." │
└──────────┬──────────┘
           │
           ▼
    ┌─────────────┐
    │  Pre-Commit │ ← Runs lint-staged
    │     Hook    │   (format checks)
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │ Commit-Msg  │ ← Validates message
    │     Hook    │   (conventional commits)
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Commit    │ ✅ Success!
    │  Created    │
    └─────────────┘
```

---

## Benefits

### Before Automation
- ❌ Manual CHANGELOG updates
- ❌ Inconsistent commit messages
- ❌ No automated stakeholder notifications
- ❌ Easy to commit secrets accidentally

### After Automation
- ✅ **Auto-generated CHANGELOG** from commits
- ✅ **Enforced** commit message standards
- ✅ **Real-time** Slack notifications
- ✅ **Prevented** invalid commits
- ✅ **Saved** ~2 hours/week on manual tasks

---

## Next Steps

### Immediate
1. ✅ Set up Slack webhook (see [slack-setup-guide.md](slack-setup-guide.md))
2. ✅ Test commit validation (try making a commit)
3. ✅ Generate first changelog (when ready for release)

### After Checkpoint 3
- Breaking change detection
- Deployment tracking log
- Secrets scanning in CI

---

## Documentation

- **Full Proposal**: [workflow-enhancement-proposal.md](workflow-enhancement-proposal.md)
- **Slack Setup**: [slack-setup-guide.md](slack-setup-guide.md)
- **Main Workflows**: [workflows.md](workflows.md)

---

**Questions?** See the full proposal or create an issue.

**Last Updated**: 2025-11-09
