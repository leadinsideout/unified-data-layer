# API Versioning & Schema Management Strategy

**Purpose**: Define how we handle API versioning, OpenAPI schema changes, and Custom GPT updates to ensure smooth evolution without breaking existing integrations.

**Status**: Phase 1 (Simple Schema) - Versioning strategy ready for Phase 3+ activation

**Last Updated**: 2025-11-10

---

## Table of Contents

1. [Overview](#overview)
2. [Current State (Phase 1)](#current-state-phase-1)
3. [Versioning Strategy](#versioning-strategy)
4. [Schema Change Management](#schema-change-management)
5. [Custom GPT Update Process](#custom-gpt-update-process)
6. [Automated Workflows](#automated-workflows)
7. [Phase-by-Phase Implementation](#phase-by-phase-implementation)

---

## Overview

### The Custom GPT Schema Problem

**Key Issue**: Custom GPT Actions **cache the OpenAPI schema** at import time and do NOT auto-refresh.

**Impact**:
- Schema changes require manual re-import in Custom GPT settings
- Breaking changes cause API call failures until re-import
- Version drift risk when multiple users have their own Custom GPTs

**Our Solution**:
- Phase 1-2: Backwards compatibility + manual re-import (acceptable for single client)
- Phase 3+: API versioning + automated notifications

---

## Current State (Phase 1)

### What We Have

**API Version**: `0.2.1` (matches package.json)

**Endpoints**:
- `POST /api/search` - Semantic search
- `POST /api/transcripts/upload` - Text upload
- `POST /api/transcripts/upload-pdf` - PDF upload
- `GET /openapi.json` - Schema endpoint

**OpenAPI Schema Location**:
- Dynamically generated at `api/server.js:494-625`
- Served at `https://unified-data-layer.vercel.app/openapi.json`

**Schema Stability**:
- ✅ **High** - No breaking changes planned in Phase 1
- ✅ Simple request/response formats
- ✅ Optional parameters only

### Current Client Situation

**Client Type**: Single client (same as GPT creator)
**Integration**: Custom GPT importing OpenAPI schema
**Update Responsibility**: Client re-imports when notified

**Why This Works for Phase 1**:
- Client is aware of system architecture
- Client controls both API and Custom GPT
- Low coordination overhead
- Manual re-import is acceptable

---

## Versioning Strategy

### Phase 1-2: Simple Versioning (Current)

**Version Format**: Semantic versioning (`MAJOR.MINOR.PATCH`)
- Tracked in `package.json`
- Reflected in OpenAPI schema `info.version`
- Git tags: `v0.2.1`, `v0.2.1-checkpoint-2`

**Breaking Change Definition**:
- Removed endpoints
- Removed required fields
- Renamed fields or endpoints
- Changed response data types

**Non-Breaking Change Definition**:
- New optional fields
- New endpoints
- Better descriptions
- Error message improvements

**Approach**: Maintain backwards compatibility
```javascript
// Good: Additive change
POST /api/search
{
  "query": "...",      // Existing field
  "filters": { ... }   // New optional field
}

// Bad: Breaking change
POST /api/search
{
  "search_query": "..."  // Renamed field - breaks existing integrations!
}
```

### Phase 3+: URL-Based Versioning

**When to Activate**: Phase 3 (multi-tenant, authentication, user filtering)

**Implementation**:
```javascript
// api/server.js
const API_VERSION = 'v1';

app.post(`/${API_VERSION}/api/search`, searchHandler);
app.post(`/${API_VERSION}/api/transcripts/upload`, uploadHandler);

// OpenAPI schema
servers: [
  { url: 'https://unified-data-layer.vercel.app/v1' }
]
```

**Version Timeline**:
- `v1` - Phase 1-2 endpoints (stable forever)
- `v2` - Phase 3 with authentication, user filtering
- `v3` - Phase 4+ with additional data types, advanced features

**Support Policy**:
- Maintain N and N-1 versions (current + previous)
- Deprecation warnings 3 months before removal
- Clear migration guides for each version

---

## Schema Change Management

### Change Detection

**What Triggers a Schema Change**:
1. New/removed endpoints
2. New/changed request parameters
3. New/changed response fields
4. Updated descriptions or examples
5. Authentication changes

**How We Track Changes**:
1. OpenAPI schema version in `info.version` matches `package.json`
2. CHANGELOG.md documents all API changes
3. Git commits use conventional commit format with `api` scope
4. Automated notifications when `api/server.js` OpenAPI section changes

### Change Classification

#### Type 1: Non-Breaking (Safe)
**Examples**:
- Add new optional field to request
- Add new field to response
- Improve error messages
- Update descriptions
- Add new endpoint

**Action Required**:
- ✅ Update OpenAPI version (PATCH bump)
- ✅ Document in CHANGELOG
- ⚠️ Optional: Notify users of new features
- ❌ No forced Custom GPT re-import

#### Type 2: Breaking (Dangerous)
**Examples**:
- Remove endpoint
- Remove required field
- Rename field or endpoint
- Change field data type
- Change authentication method

**Action Required**:
- ✅ Update OpenAPI version (MAJOR bump)
- ✅ Document in CHANGELOG with migration guide
- ✅ Create new API version (v2, v3, etc.) in Phase 3+
- 🚨 **CRITICAL**: Notify all Custom GPT users to re-import
- 🚨 **CRITICAL**: Test thoroughly before deployment

### Schema Version Tracking

**In OpenAPI Schema** (`api/server.js`):
```javascript
info: {
  title: 'Unified Data Layer API',
  version: '0.2.1',  // Keep in sync with package.json
  description: '...'
}
```

**Best Practice**:
- Bump version on every schema change
- Use `npm version patch/minor/major` to keep package.json in sync
- Standard-version handles this automatically via `npm run release`

---

## Custom GPT Update Process

### Phase 1-2: Manual Update (Current)

**When Schema Changes**:
1. Developer updates API and OpenAPI schema
2. Developer commits with `feat(api):` or `fix(api):` prefix
3. Automated Slack notification sent
4. Developer notifies client: "Schema updated - please re-import in Custom GPT"
5. Client re-imports: ChatGPT → GPT Settings → Actions → Edit → Re-import from URL
6. Takes ~30 seconds

**Client Instructions** (document in Custom GPT setup guide):
```markdown
### How to Update Your Custom GPT Schema

When you receive a notification that the API schema has been updated:

1. Go to ChatGPT (https://chatgpt.com)
2. Click "Explore GPTs" → Find your Custom GPT
3. Click "⋯" → "Edit GPT"
4. Go to "Configure" tab → "Actions" section
5. Click "Edit" on the existing action
6. Click "Import from URL" again
7. Paste: https://unified-data-layer.vercel.app/openapi.json
8. Click "Import" → "Update" → "Save"

Done! Your Custom GPT now has the latest schema.
```

### Phase 3+: Version-Specific GPTs

**Option A: Multiple Custom GPTs**
- "Coaching Assistant v1" (stable, never changes)
- "Coaching Assistant v2" (latest features)
- Users migrate when ready

**Option B: Single GPT with Version Parameter**
- GPT instructions include current version
- Re-import updates to new version
- Clear changelog visible in GPT description

---

## Automated Workflows

### 1. Schema Change Detection

**Trigger**: When `api/server.js` OpenAPI section is modified

**GitHub Action**: `.github/workflows/schema-change-notification.yml`

```yaml
name: Schema Change Notification

on:
  push:
    branches: [main]
    paths:
      - 'api/server.js'

jobs:
  notify-schema-change:
    runs-on: ubuntu-latest
    steps:
      - name: Check for OpenAPI changes
        id: check
        run: |
          # Check if git diff includes lines 494-625 (OpenAPI schema section)
          if git diff HEAD~1 HEAD -- api/server.js | grep -q "openapi.json"; then
            echo "schema_changed=true" >> $GITHUB_OUTPUT
          fi

      - name: Notify Slack
        if: steps.check.outputs.schema_changed == 'true'
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: ${{ secrets.SLACK_CHANNEL_ID }}
          payload: |
            {
              "text": "⚠️ API Schema Updated",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*API Schema Updated*\n\nThe OpenAPI schema has been modified. Custom GPT users should re-import the schema.\n\n*Schema URL:* https://unified-data-layer.vercel.app/openapi.json\n*Commit:* ${{ github.event.head_commit.message }}\n*Author:* ${{ github.event.head_commit.author.name }}"
                  }
                },
                {
                  "type": "actions",
                  "elements": [
                    {
                      "type": "button",
                      "text": {
                        "type": "plain_text",
                        "text": "View Changes"
                      },
                      "url": "${{ github.event.head_commit.url }}"
                    },
                    {
                      "type": "button",
                      "text": {
                        "type": "plain_text",
                        "text": "View Schema"
                      },
                      "url": "https://unified-data-layer.vercel.app/openapi.json"
                    }
                  ]
                }
              ]
            }
```

### 2. Version Mismatch Detection (Phase 3+)

**API Health Check Enhancement**:
```javascript
// api/server.js
app.get('/api/health', async (req, res) => {
  // ... existing health checks ...

  // Add schema version info
  const currentVersion = '0.2.1';  // Or read from package.json

  res.json({
    status: 'healthy',
    version: currentVersion,
    openapi_schema_url: '/openapi.json',
    // ... rest of health check data
  });
});
```

**Custom GPT can check version** and warn users if outdated.

### 3. CHANGELOG Integration

**Automatic API Section**:

When running `npm run release`, CHANGELOG.md should have API changes prominently marked:

```markdown
### [0.3.0] - 2025-11-15

#### 🚨 API Changes (Breaking)

- **BREAKING**: Renamed `query` parameter to `search_query` in `/api/search`
- **Action Required**: Custom GPT users must re-import schema
- **Migration Guide**: See docs/api/migration-v0.2-to-v0.3.md

#### API Changes (Non-Breaking)

- Added optional `filters` parameter to `/api/search`
- Added `metadata` field to search response
- Improved error messages for invalid requests
```

---

## Phase-by-Phase Implementation

### Phase 1 (Current): Simple & Stable

**Status**: ✅ Active

**Schema Complexity**: Low (3 endpoints, simple parameters)

**Versioning**:
- Semantic versioning in package.json
- Version reflected in OpenAPI schema
- No URL-based versioning yet

**Change Process**:
1. Make API changes with backwards compatibility
2. Update version via `npm run release`
3. Automated Slack notification on API changes
4. Manual notification to client
5. Client re-imports schema (~30 seconds)

**Acceptable Because**:
- Single client who understands the system
- Client controls both API and Custom GPT
- Low change frequency
- Stable schema

### Phase 2: Multi-Data-Type (Future)

**Timeline**: After Checkpoint 3

**Schema Changes Expected**:
- New data type fields (assessments, personality profiles)
- Type-aware search parameters
- Metadata enrichment

**Versioning Approach**:
- ✅ Continue backwards compatibility
- ✅ Add optional fields only
- ✅ No URL versioning yet
- ⚠️ Activate schema change notification workflow

**Reason**: Still single client, changes are additive

### Phase 3: Security & Multi-Tenant (Future)

**Timeline**: After Phase 2 complete

**Schema Changes Expected**:
- 🚨 Authentication headers (breaking!)
- User-specific filtering
- RLS enforcement
- Privacy controls

**Versioning Approach**:
- 🚨 **Activate URL-based versioning**
- `/v1/api/*` - Phase 1-2 endpoints (no auth, testing only)
- `/v2/api/*` - Phase 3+ endpoints (with auth, production)
- Maintain v1 for backwards compatibility (mark as deprecated)
- Full schema change notification workflow

**Why Now**: Breaking changes + multiple users = need versioning

### Phase 4: Full AI Platform Integration (Future)

**Timeline**: After Phase 3 complete

**Schema Changes Expected**:
- Advanced search features
- Multiple data types in single query
- Real-time updates (webhooks?)
- MCP server (different protocol)

**Versioning Approach**:
- `/v2/api/*` - Stable, maintained
- `/v3/api/*` - New features
- Deprecate v1 with 3-month notice
- Automated migration tools

**Support Policy**: Maintain N and N-1 versions

---

## Quick Reference

### When to Bump Version

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| New optional field | PATCH | 0.2.1 → 0.2.2 |
| New endpoint | MINOR | 0.2.1 → 0.3.0 |
| Better descriptions | PATCH | 0.2.1 → 0.2.2 |
| Renamed field | MAJOR | 0.2.1 → 1.0.0 |
| Removed endpoint | MAJOR | 0.2.1 → 1.0.0 |
| Changed auth | MAJOR | 0.2.1 → 1.0.0 |

### When to Activate URL Versioning

**Not Yet (Phase 1-2)**:
- ✅ Simple schema
- ✅ Single client
- ✅ Backwards compatibility maintained
- ✅ Manual re-import acceptable

**Activate at Phase 3**:
- 🚨 Breaking changes required (auth)
- 🚨 Multiple clients
- 🚨 Need stable production version
- 🚨 Can't force everyone to update simultaneously

### Custom GPT Re-Import Checklist

When schema changes:

**Developer Actions**:
- [ ] Update OpenAPI schema in `api/server.js`
- [ ] Bump version via `npm run release`
- [ ] Update CHANGELOG.md
- [ ] Commit with `feat(api):` or `fix(api):` prefix
- [ ] Push to main (triggers Slack notification)
- [ ] Manually notify client with re-import instructions

**Client Actions**:
- [ ] Review CHANGELOG for breaking changes
- [ ] Go to ChatGPT → GPT Settings → Actions → Edit
- [ ] Re-import from URL: `https://unified-data-layer.vercel.app/openapi.json`
- [ ] Test Custom GPT with sample query
- [ ] Report any issues

**Time Required**: ~2 minutes total

---

## Troubleshooting

### Problem: Custom GPT Returns "Invalid Request"

**Likely Cause**: Schema mismatch - Custom GPT using old cached schema

**Solution**:
1. Check current API version: `curl https://unified-data-layer.vercel.app/api/health`
2. Check CHANGELOG for recent breaking changes
3. Re-import schema in Custom GPT
4. Test with simple query

### Problem: Schema Change Not Detected by Workflow

**Likely Cause**: Change outside OpenAPI section or on non-main branch

**Solution**:
1. Verify change is in `api/server.js` lines 494-625
2. Verify pushed to `main` branch
3. Check GitHub Actions log for workflow execution
4. Manually trigger Slack notification if needed

### Problem: Multiple Custom GPTs with Different Versions

**Likely Cause**: Users haven't re-imported after schema change (Phase 4 issue)

**Solution** (Phase 4+):
1. Implement URL-based versioning (`/v1`, `/v2`)
2. Users on old schema continue using `/v1`
3. New users start with `/v2`
4. Provide migration guide when ready
5. Eventually deprecate `/v1` with advance notice

---

## Questions?

**Q: Why not auto-refresh schemas in Custom GPT?**
A: Platform limitation - OpenAI doesn't support this. Only Claude Code (MCP) has dynamic schemas.

**Q: Should we build an MCP server instead?**
A: Consider for Phase 4 if Claude becomes primary integration. Custom GPT still needed for ChatGPT users.

**Q: How often will schema change?**
A: Phase 1-2: Rarely (stable). Phase 3: Once (auth). Phase 4+: Occasionally (new features).

**Q: What if client doesn't re-import?**
A: Phase 1-2: Backwards compatibility ensures it keeps working. Phase 3+: Versioning prevents breakage.

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-10 | Initial creation | Document API versioning and Custom GPT schema management strategy |
