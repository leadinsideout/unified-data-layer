# Checkpoint-Phase Mapping

**Purpose**: Reference guide for mapping checkpoint numbers to phases and release versions

**Last Updated**: 2025-11-19

---

## Overview

This document provides the authoritative mapping between checkpoint numbers, phase numbers, and release versions. Use this reference when:
- Configuring GitHub Actions workflows
- Writing Slack notification messages
- Documenting checkpoint completion
- Planning release versions

---

## Mapping Table

| Checkpoint | Phase | Version | Checkpoint Name | Phase Completion |
|------------|-------|---------|-----------------|------------------|
| 1 | 1 | v0.1.0 | Local MVP Foundation | |
| 2 | 1 | v0.2.0 | Vercel Deployment + Workflow Automation | |
| 3 | 1 | v0.3.0 | Custom GPT Integration (North Star) | ✅ Phase 1 Complete |
| 4 | 2 | v0.4.0 | Schema Migration & Core Architecture | |
| 5 | 2 | v0.5.0 | Multi-Type Processing Pipeline | |
| 6 | 2 | v0.6.0 | Type-Aware Search with Multi-Dimensional Filtering | |
| 7 | 2 | v0.7.0 | Custom GPT Integration & Phase 2 Validation | ✅ Phase 2 Complete |
| 8 | 3 | v0.8.0 | PII Scrubbing Pipeline | |
| 9 | 3 | v0.9.0 | Row-Level Security (RLS) | |
| 10 | 3 | v0.10.0 | API Key Management | ✅ Phase 3 Complete |
| 11 | 4 | v0.11.0 | MCP Server Development | |
| 12 | 4 | v0.12.0 | Enhanced Custom GPT | |
| 13 | 4 | v0.13.0 | Multi-Tenant Authentication | ✅ Phase 4 Complete |

---

## Phase Structure

### Phase 1: Transcript Foundation
- **Checkpoints**: 1, 2, 3
- **Versions**: v0.1.0, v0.2.0, v0.3.0
- **Completion Tag**: v0.3.0
- **Goal**: Basic semantic search API with Custom GPT integration

### Phase 2: Multi-Data-Type Architecture
- **Checkpoints**: 4, 5, 6, 7
- **Versions**: v0.4.0, v0.5.0, v0.6.0, v0.7.0
- **Completion Tag**: v0.7.0
- **Goal**: Support multiple data types with advanced filtering

### Phase 3: Security & Privacy
- **Checkpoints**: 8, 9, 10
- **Versions**: v0.8.0, v0.9.0, v0.10.0
- **Completion Tag**: v0.10.0
- **Goal**: Production-grade security and privacy features

### Phase 4: Full AI Platform Integration
- **Checkpoints**: 11, 12, 13
- **Versions**: v0.11.0, v0.12.0, v0.13.0
- **Completion Tag**: v0.13.0
- **Goal**: Complete AI platform integration with MCP and multi-tenant auth

---

## Version Numbering Convention

**Format**: `v0.X.0` where X = checkpoint number

**Rationale**: Checkpoint-Based Versioning (Option A)
- ✅ Version numbers match checkpoint numbers (predictable)
- ✅ Simple to understand and follow
- ✅ Clear progression through phases
- ✅ Consistent with semantic versioning

**Tag Types**:
1. **Checkpoint tags**: `v0.X.0-checkpoint-Y` (e.g., v0.8.0-checkpoint-8)
   - Created when checkpoint work is complete
   - Triggers dev channel notification

2. **Release tags**: `v0.X.0` (e.g., v0.8.0)
   - Created by `npm run release --release-as 0.X.0`
   - Updates CHANGELOG.md and package.json
   - Triggers release notification (for phase completions only)

---

## Slack Notification Routing

### Dev Channel Notifications
**When**: Every checkpoint completion
**Trigger**: All `v*-checkpoint-*` tags
**Workflow**: `.github/workflows/slack-checkpoint.yml`
**Content**: Checkpoint details, recent changes, links to docs

### Team Channel (#team_ai) Notifications
**When**: Phase completions and major releases ONLY
**Trigger**: Specific tags (v0.3.0, v0.7.0, v0.10.0, v0.13.0, v1.0.0+)
**Workflow**: `.github/workflows/slack-release.yml`
**Content**: Phase summary, business impact, links to docs

### Important Rules
- ❌ Checkpoint releases (v0.4.0-v0.6.0, v0.8.0-v0.9.0, v0.11.0-v0.12.0) should NOT notify #team_ai
- ✅ Only phase-ending releases (v0.3.0, v0.7.0, v0.10.0, v0.13.0) notify #team_ai
- ✅ All checkpoints notify dev channel

---

## Usage Examples

### In GitHub Actions (Extract Phase from Checkpoint)

```bash
# Extract checkpoint number from tag
CHECKPOINT_NUM=$(echo $TAG_NAME | grep -oP 'checkpoint-\K\d+')

# Map to phase
case "$CHECKPOINT_NUM" in
  1|2|3)
    PHASE="1"
    ;;
  4|5|6|7)
    PHASE="2"
    ;;
  8|9|10)
    PHASE="3"
    ;;
  11|12|13)
    PHASE="4"
    ;;
  *)
    PHASE="Unknown"
    ;;
esac
```

### In GitHub Actions (Extract Phase from Version)

```bash
# Extract version from tag
VERSION=$(echo $TAG_NAME | sed 's/^v//')
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"

# Map minor version to phase completion
case "$MINOR" in
  3)
    PHASE="1"  # Phase 1 Complete
    ;;
  7)
    PHASE="2"  # Phase 2 Complete
    ;;
  10)
    PHASE="3"  # Phase 3 Complete
    ;;
  13)
    PHASE="4"  # Phase 4 Complete
    ;;
  *)
    PHASE="$MINOR"  # Fallback for mid-phase checkpoints
    ;;
esac
```

### Determining if Tag Should Notify #team_ai

```bash
# Only notify #team_ai for phase completions
if [[ "$TAG_NAME" =~ ^v0\.(3|7|10|13)\.0$ ]] || [[ "$TAG_NAME" =~ ^v[1-9]+\.0\.0$ ]]; then
  # This is a phase completion or major release - notify #team_ai
  NOTIFY_TEAM=true
else
  # This is a mid-phase checkpoint - dev channel only
  NOTIFY_TEAM=false
fi
```

---

## Verification Checklist

When updating workflows or documentation that references checkpoint/phase mapping:

- [ ] Check this document for authoritative mapping
- [ ] Verify version numbers match checkpoint numbers (v0.X.0 = Checkpoint X)
- [ ] Confirm phase-ending checkpoints (3, 7, 10, 13)
- [ ] Ensure mid-phase checkpoints don't trigger #team_ai notifications
- [ ] Test workflow triggers with sample tags
- [ ] Validate Slack message content matches checkpoint/phase

---

## Related Documentation

- [Checkpoint Status Tracker](../checkpoints/README.md) - Current checkpoint status
- [Slack Setup Guide](./slack-setup-guide.md) - Slack integration configuration
- [Workflow Tracker](./workflow-tracker.md) - Automation milestones
- [CLAUDE.md](../../CLAUDE.md) - AI assistant navigation (includes tag naming convention)

---

**Maintenance Notes**:
- Update this document when adding new phases or checkpoints
- Keep mappings synchronized with [docs/checkpoints/README.md](../checkpoints/README.md)
- Verify GitHub Actions workflows reference this mapping
- Test notification routing after any changes
