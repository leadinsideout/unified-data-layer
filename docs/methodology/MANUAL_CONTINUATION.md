# Part 5: Planning & Execution

## Overview

This section covers the planning and execution methodology:

1. **Phase-Based Development**: Breaking vision into 8 phases
2. **Checkpoint Validation System**: Defining and meeting success criteria
3. **Pre-Checkpoint Cleanup Audit**: Documentation consistency checks
4. **Velocity Tracking**: Measuring and revising estimates

## Phase-Based Development Approach

### The 8-Phase Structure

Break your multi-month project into 8 distinct phases:

**Phase 1: Foundation** (3-4 checkpoints)
- Goal: Validate core architecture
- Deliverables: Local MVP, basic features
- Validation: Can we build the core?

**Phase 2: Extension** (3-4 checkpoints)
- Goal: Add complexity to proven foundation
- Deliverables: Multi-type support, advanced features
- Validation: Does the architecture scale?

**Phase 3: Security & Privacy** (3 checkpoints)
- Goal: Production-ready security
- Deliverables: Authentication, PII scrubbing, RLS
- Validation: Can we protect user data?

**Phase 4: Integration** (3 checkpoints)
- Goal: AI platform integration
- Deliverables: Custom GPT, MCP servers, APIs
- Validation: Can AI platforms use our data?

**Phase 5: Automation** (planned)
- Goal: Automated data ingestion
- Deliverables: Webhooks, scheduled jobs, pipelines

**Phase 6: Production** (planned)
- Goal: Production-grade reliability
- Deliverables: Monitoring, error tracking, performance

**Phase 7-8: Custom UIs** (optional)
- Goal: Custom interfaces if AI platforms insufficient
- Deliverables: Dashboards, admin panels

### Phase Definition Template

```markdown
## Phase X: [Name]

**Status**: Planned/In Progress/Complete
**Original Estimate**: X weeks
**Actual Duration**: Y days
**Velocity**: Zx faster/slower
**Start**: YYYY-MM-DD
**Complete**: YYYY-MM-DD

### Goal
[Business objective in 1-2 sentences]

### Business Context
[Why this matters to users/stakeholders]

### Implementation: X Checkpoints

<details>
<summary><b>Checkpoint X: [Name]</b> [Status]</summary>

**Original Estimate**: X weeks
**Actual**: Y hours

**Goal**: [Technical objective]

**Deliverables**:
1. Deliverable 1
   - Subtask A
   - Subtask B
2. Deliverable 2

**Validation**:
- [ ] Test scenario 1
- [ ] Test scenario 2
- [ ] Performance metric (< Xs)

**Tagged**: vX.Y.Z-checkpoint-N
**Completed**: YYYY-MM-DD

</details>

### Deliverables
- ✅ Deliverable 1 (if complete)
- 🔄 Deliverable 2 (if in progress)
- ⏸️ Deliverable 3 (if pending)

### What's NOT Included
- ❌ Out of scope item 1
- ❌ Deferred item 2

### Dependencies
- Depends on: Phase X-1 completion
- Blocks: Phase X+1

### Success Metrics
- Metric 1: Target value
- Metric 2: Target value
```

### Critical Path Concept

Not all phases are equally critical:

**Critical Path** (must complete for MVP):
```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

**Optional/Enhancement**:
```
Phase 5 → Phase 6 (optimization)
Phase 7 → Phase 8 (custom UI, may not be needed)
```

### Strategic Decisions

Document key decisions in phase descriptions:

**Phase 2 Example**:
```markdown
### Strategic Decision: Multi-Type Support Now vs Later

**Decision**: Implement in Phase 2 (not Phase 5)
**Rationale**:
- Architectural changes easier now than after users
- AI platform integration (Phase 4) needs all data types
- Delaying would require Phase 5 refactoring

**Impact**: Phase 2 takes longer, but Phase 4-5 become trivial
```

## Checkpoint Validation System

### Purpose

Every checkpoint has specific, measurable success criteria defined **before work begins**.

This prevents:
- Scope creep
- Ambiguous "done"
- Building wrong thing
- Moving on from broken checkpoints

### Validation Criteria Types

**1. Functional Validation**:
```markdown
**Checkpoint 4 Validation**:
- ✅ Existing transcripts migrated with data_type = 'transcript'
- ✅ All chunks migrated with embeddings intact
- ✅ Search queries return same results as Phase 1
- ✅ No data loss or corruption (verified: 16/16 migrated)
```

**2. Performance Validation**:
```markdown
**Checkpoint 6 Validation**:
- ✅ Search response time < 3 seconds (actual: 1.8s)
- ✅ Vector similarity threshold 0.4-0.7 (actual: 0.45-0.68)
- ✅ Results include correct metadata per type
```

**3. Integration Validation**:
```markdown
**Checkpoint 7 Validation**:
- ✅ Custom GPT queries multiple data types in one search
- ✅ Type filtering works as expected
- ✅ Coach models included when evaluating sessions
- ✅ Search performance acceptable (< 3s)
```

**4. Quantitative Metrics**:
```markdown
**Checkpoint 8 Validation**:
- ✅ Accuracy >95% on test dataset (actual: 96%)
- ✅ Average processing time <60s (actual: 37s)
- ✅ Cost <$0.05 per document (actual: $0.005)
- ✅ Zero timeout failures (actual: 0/50 tests)
```

**5. Security Validation** (Phase 3):
```markdown
**Checkpoint 9 Validation**:
- ✅ PII scrubbing >95% accuracy
- ✅ Zero data leakage between organizations
- ✅ RLS policies enforced in database
- ✅ API keys scoped per organization
- ✅ Compliance audit passed
```

### Validation Process

**Before Checkpoint Starts**:
1. Define success criteria in roadmap
2. Identify test scenarios
3. Set quantitative targets (if applicable)
4. Get stakeholder agreement on criteria

**During Checkpoint**:
1. Build to meet criteria
2. Test continuously
3. Document results as you go
4. Adjust if criteria were wrong (document why)

**Checkpoint Completion**:
1. Run all E2E tests
2. Measure all metrics
3. Document actual vs. target
4. Create checkpoint results doc with validation section
5. Only tag if ALL criteria met

### Example: Comprehensive Validation

From Checkpoint 8 (PII Scrubbing):

```markdown
## Validation Results

### Test Scenario 1: PII Detection Accuracy ✅
**Goal**: Detect all PII categories with >95% accuracy
**Test Dataset**: 10 coaching transcripts with known PII instances

**Results**:
- Names: 100% detected (15/15)
- Emails: 100% detected (8/8)
- Phone numbers: 90% detected (9/10) - 1 non-standard format missed
- Organizations: 95% detected (19/20)
- Locations: 100% detected (12/12)
- **Overall: 96% accuracy** ✅ EXCEEDS TARGET

### Test Scenario 2: Processing Performance ✅
**Goal**: Average processing time <60s per document

**Results**:
- Minimum: 18s (short transcript, low PII density)
- Maximum: 52s (long transcript, high PII density)
- **Average: 37s** ✅ 38% UNDER TARGET
- P95: 48s
- P99: 51s

### Test Scenario 3: Cost Efficiency ✅
**Goal**: Cost <$0.05 per document

**Results**:
- Input tokens: ~1,500 avg per document
- Output tokens: ~200 avg per document
- API cost: $0.005 per document
- **Result**: ✅ 10x UNDER BUDGET

### Test Scenario 4: Reliability ✅
**Goal**: Zero timeout failures

**Results**:
- Documents processed: 50
- Timeouts: 0
- Success rate: 100%
- **Result**: ✅ TARGET MET
```

### When Validation Fails

**Don't**:
- Tag checkpoint anyway
- Lower the bar retroactively
- Move on to next checkpoint

**Do**:
1. Document what failed and why
2. Decide: Fix now or defer?
3. If fixing: Continue current checkpoint
4. If deferring: Document in "Known Issues"
5. Adjust criteria if they were unrealistic (document decision)

## Pre-Checkpoint Cleanup Audit

### Purpose

Prevent documentation drift by auditing consistency **before** starting each new checkpoint.

### The Problem

Over time, documentation gets out of sync:
- Version numbers in multiple files don't match
- Status descriptions become outdated
- Checkpoint index numbering off
- Dead links accumulate

**Solution**: 2-day audit before each checkpoint catches issues early.

### Audit Checklist

Run before starting **any** new checkpoint:

```markdown
## Pre-Checkpoint Cleanup Audit

### 1. Version Numbers ✅
Check all files match current release:
- [ ] package.json version
- [ ] api/server.js health endpoint version
- [ ] api/server.js OpenAPI schema version
- [ ] api/server.js root endpoint version
- [ ] CLAUDE.md "Current Status" section

**Found**: package.json shows v0.7.0 but api/server.js shows v0.6.0
**Fix**: Update api/server.js to v0.7.0

### 2. Status Consistency ✅
Check status descriptions accurate:
- [ ] README.md reflects current phase/checkpoint
- [ ] CLAUDE.md "Latest checkpoint" points to actual latest
- [ ] docs/checkpoints/README.md numbering correct
- [ ] Phase implementation plan status updated

**Found**: README still says "Phase 2 In Progress" but Phase 2 complete
**Fix**: Update README to "Phase 2 Complete ✅ | Ready for Phase 3"

### 3. Missing Documentation ✅
Check all expected docs exist:
- [ ] All completed checkpoints have results docs
- [ ] Version history in CLAUDE.md is current
- [ ] Git tags match documented tags
- [ ] All links in docs work

**Found**: checkpoint-7-results.md not linked in checkpoint index
**Fix**: Add entry to docs/checkpoints/README.md

### 4. Fix Issues ✅
- [ ] Present list of issues to user
- [ ] Get approval to fix
- [ ] Commit fixes: `docs: pre-checkpoint cleanup audit`
- [ ] Verify all issues resolved
```

### Example Audit Finding

**Before Checkpoint 9**:
```markdown
## Pre-Checkpoint 9 Audit Results

**Issues Found**: 4

1. **Version Mismatch**
   - package.json: v0.8.0
   - api/server.js health: v0.7.0
   - Fix: Update health endpoint

2. **Outdated Status**
   - README.md: "Phase 2 Complete"
   - Should be: "Phase 3 - Checkpoint 8 Complete"
   - Fix: Update README status section

3. **Missing Link**
   - checkpoint-8-results.md not in index
   - Fix: Add to docs/checkpoints/README.md

4. **Broken Link**
   - CLAUDE.md links to old roadmap.md location
   - Fix: Update link path

**Proposed Commit**:
```
docs: pre-checkpoint 9 cleanup audit

- Update API health endpoint version to v0.8.0
- Update README status to Phase 3
- Add checkpoint-8-results.md to index
- Fix roadmap link in CLAUDE.md
```

**Time**: 15 minutes

User approval received, executing fixes...
```

### When to Run

**Mandatory**:
- Before starting any checkpoint
- After major refactoring
- When returning to project after break

**Optional**:
- Weekly during active development
- Before creating PRs

### Why This Matters

**Prevents**:
- Confusion about project state
- AI assistants getting wrong information
- Compounding documentation debt
- Time wasted hunting for current truth

**Enables**:
- Consistent project state
- Accurate AI assistant responses
- Faster onboarding
- Trust in documentation

## Velocity Tracking

### Purpose

Systematically compare actual vs. estimated completion times to refine future predictions.

### The Problem

Initial estimates are often wrong:
- No historical data
- Optimism bias
- Learning curve unknown
- AI velocity unpredictable

**Solution**: Track actual performance, calculate velocity multiplier, revise estimates.

### Velocity Tracking Table

After each phase, update:

```markdown
## Velocity Tracking & Timeline Analysis

### Actual vs. Estimated Performance

| Phase | Original Estimate | Actual Duration | Velocity Multiplier | Key Factors |
|-------|------------------|-----------------|---------------------|-------------|
| Phase 1 | 2-3 weeks | 11 days | **1.5x faster** | Learning curve, establishing patterns |
| Phase 2 | 3-4 weeks | **1 DAY** (~8 hours) | **21-28x faster** | AI + clean architecture compounding |
| Combined | 5-7 weeks | 12 days | **3-4x faster** | Acceleration compounds over time |

### Why Our Velocity

**Factors Contributing to Speed**:
1. AI-Assisted Development (primary factor)
   - Zero context switching overhead
   - Instant code generation for boilerplate
   - Pattern recognition across codebase
   - Documentation generated alongside code

2. Clean Architecture Compounding
   - Phase 1 patterns made Phase 2 trivial
   - JSONB flexibility eliminated migration friction
   - Good early decisions multiplied over time

3. Checkpoint Discipline
   - Small increments prevented wrong turns
   - Continuous validation caught issues early
   - No "big bang" integration phase

4. Single Developer + AI
   - Zero coordination overhead
   - No merge conflicts or code reviews
   - Immediate decision-making

**Factors That Could Slow Us**:
1. External dependencies (API availability, quota limits)
2. New technology learning curves
3. Security/compliance requirements
4. Production incident response

### Revised Phase Estimates (Based on Demonstrated Velocity)

| Phase | Original | Revised | Confidence | Key Risk Factors |
|-------|----------|---------|------------|------------------|
| Phase 3 | 4-5 weeks | **5-7 days** | 85% | PII accuracy testing may require iteration |
| Phase 4 | 3-4 weeks | **6-7 days** | 90% | MCP protocol learning curve |
| Phase 5 | 2-3 weeks | **5-7 days** | 75% | External API dependencies (Fireflies, etc.) |
| Phase 6 | 2-3 weeks | **3-4 days** | 90% | Multiple integrations well-understood |
| **Total P3-P6** | **11-15 weeks** | **19-25 days** | 85% | **~2.5-3.5 weeks** |

### Feasibility Analysis

**Available Time**: 28 days (Nov 17 - Dec 15)
**Estimated Need**: 19-25 days
**Buffer**: +3 to +9 days

**Verdict**: ✅ HIGHLY FEASIBLE
- 95% confident for Phases 3-4
- 85% confident for Phases 3-6
```

### Risk Factors to Monitor

Document what could slow velocity:

```markdown
### Risk Factors to Monitor

**High Impact, Medium Probability**:
1. **PII Scrubbing Accuracy** (Phase 3)
   - Risk: May require multiple iterations to reach 95%
   - Mitigation: Allocate extra 2 days for testing
   - Monitor: Test accuracy with each implementation

2. **Coach Beta Testing Availability** (Phase 4)
   - Risk: Coaches may not be available Dec 1-15
   - Mitigation: Line up 2-3 coaches in advance
   - Monitor: Confirm availability by Nov 25

**Medium Impact, Low Probability**:
3. **External API Dependencies** (Phase 5)
   - Risk: Fireflies API availability or changes
   - Mitigation: Build abstraction layer
   - Monitor: Test API in Phase 4

4. **MCP Protocol Learning Curve** (Phase 4)
   - Risk: New technology may take longer
   - Mitigation: Study docs in Phase 3
   - Monitor: Allocate 1 extra day for learning
```

### When to Revise Estimates

**After each checkpoint**:
- Update actual vs estimated
- Calculate velocity for that checkpoint
- Note any anomalies

**After each phase**:
- Calculate phase velocity
- Revise future phase estimates
- Update feasibility analysis
- Document lessons learned

**When encountering blockers**:
- Document impact on velocity
- Revise remaining estimates
- Communicate new timeline

### Key Insight

**AI-assisted development creates compounding acceleration, not linear improvement.**

Traditional development: 10-20% faster with experience
This methodology: 28x improvement possible because:
- AI eliminates ALL boilerplate (not just some)
- Good architecture makes extensions trivial (not just easier)
- Checkpoints prevent ANY wrong turns (not just fewer)

**Your results will vary**, but expect 2-5x for most projects.

---

# Part 8: AI Assistant Integration

## Overview

This methodology is designed for **human + AI collaboration**. This section covers:

1. **CLAUDE.md as Operating Manual**: Complete guide for AI assistants
2. **Session Startup Validation**: Mandatory checks each session
3. **Workflow Reminders**: AI checklists for key moments
4. **MCP Tool Usage Patterns**: When to use which tools
5. **Intent Recognition**: Teaching AI to understand user requests

## CLAUDE.md as Operating Manual

### Beyond Documentation

CLAUDE.md is not just documentation—it's an **operating manual** that teaches AI assistants:
- Where everything is (navigation)
- What state the project is in (status)
- What to do when user says X (intent recognition)
- What processes to follow (workflows)
- When to update itself (self-maintenance)

### Complete Template Structure

See [Part 10, Appendix A1](#appendix-a1-claudemd-template) for full template.

**Essential sections for AI effectiveness**:

```markdown
# CLAUDE.md - AI Assistant Navigation Guide

## 🎯 Project Overview
**Purpose**: What is this project and what's its core architecture principle?
**For AI**: Understand project purpose before suggesting changes

## 🔑 Project IDs (Critical Reference)
**Purpose**: MCP tool identifiers (Supabase, Vercel, GitHub, etc.)
**For AI**: Prevent MCP tool errors from wrong project IDs

## 🗺️ Project Status (Quick Reference)
**Purpose**: Current phase, checkpoint, what's working, what's pending
**For AI**: Understand current state before resuming work

## 📁 Project Structure (Navigation Map)
**Purpose**: ASCII directory tree with annotations
**For AI**: Know where to find files without searching

## 🧭 How to Navigate This Project (AI Guide)
**Purpose**: Intent recognition patterns
**For AI**: Know what to do when user says "deploy" or "resume from checkpoint X"

## 🔄 Workflow Reminders for AI
**Purpose**: Checklists for key workflow moments
**For AI**: Follow consistent processes without user reminding

## 💡 Tips for AI Assistants
**Purpose**: DO / DON'T / When in Doubt guidance
**For AI**: Avoid common mistakes
```

### Intent Recognition Patterns

The most powerful AI integration feature:

```markdown
## 🧭 How to Navigate This Project

### When User Says: "Resume from Checkpoint X"

**What user wants**: Continue work from previous session

**AI should do**:
1. Read `docs/checkpoints/checkpoint-X.md` to understand what's done/pending
2. Run `git status` and `git log --oneline -5` to see current state
3. Check for blockers in checkpoint doc
4. Ask user about any blockers (e.g., "Is the OpenAI quota resolved?")
5. Read roadmap for Checkpoint X+1 to understand next steps
6. Proceed with next checkpoint

**Files to read**:
- docs/checkpoints/checkpoint-X.md (status)
- docs/project/roadmap.md (next steps)
- CLAUDE.md (current project IDs)

### When User Says: "Deploy to production"

**What user wants**: Deploy current code to Vercel

**AI should do**:
1. Read `vercel.json` to understand deployment config
2. Read `docs/development/workflows.md` → Deployment section
3. Verify all tests pass (check E2E checklist)
4. Verify environment variables documented
5. Run deployment command or guide user
6. Monitor deployment success
7. Update deployment status in checkpoint doc

**Files to read**:
- vercel.json (config)
- docs/development/workflows.md (process)
- tests/e2e-checklist.md (validation)

### When User Says: "What's in the roadmap?"

**What user wants**: Understand product vision and upcoming work

**AI should do**:
1. Read `docs/project/roadmap.md`
2. Identify current phase and checkpoint
3. Summarize what's complete (✅)
4. Highlight current checkpoint deliverables
5. Preview next 2-3 checkpoints
6. Note any dependencies or blockers

**Files to read**:
- docs/project/roadmap.md (vision)
- docs/checkpoints/README.md (progress)

### When User Says: "Create a new checkpoint"

**What user wants**: Complete current checkpoint and start next

**AI should do**:
1. Verify all validation criteria met (from roadmap)
2. Run E2E checklist if not already done
3. Create checkpoint doc (use template)
4. Update checkpoint index
5. Commit documentation changes
6. Create checkpoint tag: `v0.X.0-checkpoint-Y`
7. **STOP - Remind user about release command**
8. After user approves: Run `npm run release --release-as 0.X.0`
9. Verify release artifacts created
10. Push tags: `git push --follow-tags origin main`
11. Verify Slack notifications sent
12. Update CLAUDE.md status

**Files to use**:
- docs/checkpoints/checkpoint-X-template.md (template)
- docs/project/roadmap.md (validation criteria)
- CLAUDE.md (update status)
```

These patterns eliminate the "where do I even start?" problem for AI.

## Session Startup Validation

### Mandatory Checklist

**Every AI session must begin with**:

```markdown
### Session Startup Validation (Run at Start of EVERY Session)

**CRITICAL**: Always validate project IDs at start to avoid MCP tool errors.

**What to Validate**:
1. ✅ Database Project ID: [YOUR_DB_ID] (from CLAUDE.md)
2. ✅ Deployment URL: [YOUR_VERCEL_URL]
3. ✅ GitHub Repository: [YOUR_ORG/YOUR_REPO]
4. ✅ MCP tools responding (test with `list_projects` first)

**Process**:
```javascript
// Step 1: Load project IDs from CLAUDE.md
const DB_PROJECT_ID = '[FROM_CLAUDEMD]';
const DEPLOYMENT_URL = '[FROM_CLAUDEMD]';

// Step 2: Test MCP connection
await mcp__supabase__list_projects();
// Should return: "[Project Name]" project

// Step 3: If MCP fails, check CLAUDE.md
// See: "🔑 Project IDs (Critical Reference)" section
```

**If Validation Fails**:
- ❌ MCP tool error → Check CLAUDE.md for correct IDs
- ❌ Project not found → Verify environment variables
- ❌ Network error → Check service status
```

### Why This Matters

**Prevents**:
- Wasting 15-30 minutes on wrong project ID
- MCP tool errors mid-session
- Confusion about which project is active
- Environment mismatch issues

**Enables**:
- Immediate productivity
- Correct MCP tool usage
- Confidence in project state

### User Experience

**Successful validation**:
```
AI: Starting session for unified-data-layer...
AI: ✅ Validated Database Project ID: wzebnjilqolwykmeozna
AI: ✅ Confirmed Deployment: https://unified-data-layer.vercel.app
AI: ✅ GitHub repo accessible: leadinsideout/unified-data-layer
AI: ✅ MCP tools responding
AI: Ready to work! What would you like to do?
```

**Failed validation**:
```
AI: Starting session validation...
AI: ❌ Database MCP tool failed to connect
AI: Checking CLAUDE.md for correct project ID...
AI: Found: Project ID should be 'wzebnjilqolwykmeozna'
AI: Please verify environment variables:
AI:   SUPABASE_PROJECT_ID=wzebnjilqolwykmeozna
AI:   SUPABASE_ACCESS_TOKEN=[your_token]
```

## Workflow Reminders

### Checkpoint Completion Workflow

The most critical workflow for AI to follow:

```markdown
### When Completing a Checkpoint

1. ✅ Create comprehensive checkpoint status doc
   - Use template: docs/checkpoints/checkpoint-X-template.md
   - Include all validation results
   - Document actual vs expected metrics

2. ✅ Update checkpoint index
   - Add entry to docs/checkpoints/README.md
   - Update status indicators

3. ✅ Commit all documentation changes
   - Commit message: "docs: complete checkpoint X - [name]"

4. ✅ Create checkpoint-specific tag
   - Tag: `v0.X.0-checkpoint-N`
   - Message: "Checkpoint N: [Name]"

5. ✅ **🛑 STOP - DO NOT PUSH YET**

6. ✅ **CRITICAL: AUTOMATICALLY REMIND user to run release**
   - **This step is MANDATORY and must not be skipped**
   - Ask: "Should I run the release command now to create v0.X.0?"
   - Explain: "This will bump package.json to 0.X.0, update CHANGELOG.md, create v0.X.0 tag"
   - Wait for user approval before proceeding

7. ✅ Run release command (after approval)
   - Command: `npm run release --release-as X.Y.0`
   - Version: Match checkpoint number (e.g., Checkpoint 8 → v0.8.0)

8. ✅ Verify release artifacts created
   - package.json version updated to 0.X.0
   - CHANGELOG.md updated with new entry
   - git tag v0.X.0 created

9. ✅ Push all tags to remote
   - Command: `git push --follow-tags origin main`

10. ✅ Verify GitHub Actions workflows triggered
    - Checkpoint notification (v0.X.0-checkpoint-Y tag)
    - Release notification (v0.X.0 tag)

11. ✅ Check Slack for notifications
    - Dev channel: Checkpoint completion
    - Team channel: Phase completion (only if phase-ending checkpoint)

12. ✅ **VERIFY Slack notification accuracy**
    - Phase numbering correct?
    - Checkpoint name matches feature?
    - Content specific (not generic)?
    - Channel routing correct?
    - Links work?
    - **If errors**: Use docs/development/slack-correction-template.md

13. ✅ Update CLAUDE.md with new checkpoint status
    - Update "Project Status" section
    - Update "Version History" section
    - Update "What's Working" section
```

### Pre-Checkpoint Audit

```markdown
### Before Starting ANY Checkpoint

Run Pre-Checkpoint Cleanup Audit:

1. ✅ Check for outdated version numbers
   - package.json
   - api/server.js health endpoint
   - api/server.js OpenAPI schema
   - All should match current release

2. ✅ Check for status inconsistencies
   - README.md phase/checkpoint status
   - CLAUDE.md latest checkpoint pointer
   - Checkpoint index numbering

3. ✅ Check for missing documentation
   - All completed checkpoints have result docs
   - Version history current
   - Git tags match docs

4. ✅ Fix issues BEFORE starting new work
   - Present list to user
   - Get approval
   - Commit: "docs: pre-checkpoint cleanup audit"
```

### MCP Tool Usage

```markdown
### MCP Tool Usage Patterns

**Always prefer MCP tools over manual operations**:

**Supabase Operations**:
- ✅ Use `mcp__supabase__list_tables` instead of manual SQL
- ✅ Use `mcp__supabase__execute_sql` for queries
- ✅ Use `mcp__supabase__apply_migration` for schema changes
- ✅ Use `mcp__supabase__get_advisors` for security checks

**Notion Operations**:
- ✅ Use `mcp__notion__notion-search` to find tasks
- ✅ Use `mcp__notion__notion-update-page` to update status
- ✅ Use `mcp__notion__notion-create-pages` for new docs

**Vercel Operations**:
- ✅ Use `mcp__vercel__list_deployments` to check status
- ✅ Use `mcp__vercel__get_deployment_build_logs` for debugging
- ✅ Use `mcp__vercel__search_vercel_documentation` for questions

**When to use MCP tools**:
- Checking database schema or data
- Updating project tracker or documentation
- Monitoring deployments or debugging production
- Before suggesting manual alternatives
```

## Tips for AI Assistants

### DO

✅ **Read CLAUDE.md first** in every session
- It contains critical context about project state
- Has navigation patterns to follow
- Lists current blockers

✅ **Follow checkpoint workflow exactly**
- Every step matters
- Step 6 (stop before pushing) is CRITICAL
- Verify Slack notifications

✅ **Use workflow reminders**
- Pre-checkpoint audit before each checkpoint
- Session startup validation every session
- MCP tools when available

✅ **Update CLAUDE.md proactively**
- After completing checkpoints
- When project structure changes
- When workflows are added
- Suggest: "Should I update CLAUDE.md?"

✅ **Reference file paths clearly**
- Use format: `path/to/file.ext:line_number`
- Example: `api/server.js:124`
- Helps user navigate quickly

### DON'T

❌ **Don't** assume what's tested
- Check checkpoint docs for validation results
- Run tests if uncertain

❌ **Don't** skip reading current status
- Always read latest checkpoint doc
- Check git status and current branch

❌ **Don't** forget to update docs
- Update checkpoint docs when finishing milestones
- Update CLAUDE.md when structure changes

❌ **Don't** ignore workflow-tracker reminders
- Follow progressive workflow implementation
- Add workflows when triggers met

❌ **Don't** make assumptions about external dependencies
- OpenAI quota may be limited
- Supabase connection may fail
- Vercel may be down

### When in Doubt

**Ask these questions**:
1. What checkpoint are we on? (Check CLAUDE.md)
2. What's the validation criteria? (Check roadmap.md)
3. Has this been tested? (Check checkpoint doc)
4. Are there blockers? (Check checkpoint doc)
5. Should I update CLAUDE.md? (After changes)

**Read these files**:
1. CLAUDE.md (project overview and status)
2. docs/checkpoints/checkpoint-X.md (current state)
3. docs/project/roadmap.md (what's next)
4. docs/development/workflows.md (how to proceed)

---

# Part 10: Appendices - Templates & Examples

## Overview

This section contains **copy-paste ready templates** and **real examples** from the reference project.

**How to use this section**:
- AI assistants: Copy templates when creating new project
- Humans: Adapt templates to your specific project
- Both: Learn from real examples

## Appendix A: Core Templates

### Appendix A1: CLAUDE.md Template

**File**: `CLAUDE.md` (root level)
**Purpose**: AI assistant navigation guide
**When to create**: Day 1 of project
**Time to complete**: 2-4 hours

```markdown
# CLAUDE.md - AI Assistant Navigation Guide

**Purpose**: This file helps AI assistants (like Claude) quickly understand and navigate this project.

**Last Updated**: YYYY-MM-DD

---

## 🎯 Project Overview

**Name**: [Your Project Name]
**Current Phase**: Phase X - Checkpoint Y
**Architecture**: [Your core architecture principle]

**Key Principle**: [One sentence describing your approach]

### 🔑 Project IDs (Critical Reference)

**Database Project ID**: `YOUR_DB_PROJECT_ID`
- Project Name: [Name]
- Provider: [Supabase/PostgreSQL/etc.]
- Region: [Region]
- Status: Active/Healthy

**Deployment**:
- Production URL: https://your-app.vercel.app
- Platform: Vercel/AWS/Heroku
- Auto-deploy: Yes/No

**GitHub Repository**:
- Owner: your-org
- Repo: your-repo
- Main Branch: `main`

---

## 🗺️ Project Status (Quick Reference)

**Current Branch**: `main`
**Current Version**: `vX.Y.Z`
**Latest Tags**: `vX.Y.Z-checkpoint-N` (checkpoint), `vX.Y.Z` (release)
**Latest Documentation**: [docs/checkpoints/checkpoint-N-results.md]

**What's Working (Phase X Complete ✅)**:
- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

**What's Working (Phase Y In Progress 🔄)**:
- ✅ Checkpoint 1: [Name]
- ✅ Checkpoint 2: [Name]
- 🔄 Checkpoint 3: [Name] (current)

**What's Next (Phase Y)**:
- 🔴 Checkpoint 4: [Name]
- 🔴 Checkpoint 5: [Name]

**Blockers**:
- None / [Specific blocker]

---

## 📁 Project Structure (Navigation Map)

```
your-project/
│
├── CLAUDE.md                      ← YOU ARE HERE (AI navigation guide)
├── README.md                      ← Start here for project overview
│
├── api/server.js                  ← Main API server
├── scripts/                       ← Utility scripts
│   ├── database/                  ← SQL migrations
│   └── [other scripts]
├── data/                         ← Data files
│
├── docs/                         ← ALL DOCUMENTATION
│   ├── README.md                 ← Documentation index
│   ├── project/                  ← Strategic docs
│   │   └── roadmap.md           ← Product vision & checkpoints
│   ├── development/              ← Developer workflows
│   │   └── workflows.md         ← Git, testing, deployment
│   ├── checkpoints/              ← Status reports
│   │   └── README.md            ← Checkpoint index
│   └── setup/                    ← Setup guides
│
├── .github/workflows/            ← GitHub Actions
├── tests/                        ← Test files
├── package.json                  ← Dependencies
└── vercel.json                   ← Deployment config
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
Purpose: Understand overall plan and next steps
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
- docs/development/workflows.md → Deployment workflow

### When User Says: "What workflows should we use?"

**Read**:
- docs/development/workflows.md → Standards
- docs/development/workflow-tracker.md → When to add workflows
- .github/pull_request_template.md → PR checklist

### When User Asks: "What's in the roadmap?"

**Read**:
- docs/project/roadmap.md → 8-phase vision with checkpoints

### When Debugging Issues:

**Check in order**:
1. `docs/checkpoints/checkpoint-X.md` → Known issues
2. `README.md` → Troubleshooting section
3. `docs/setup/` → Setup guides
4. Implementation files

---

## 🎯 Key Files by Purpose

### Strategic Planning
- `docs/project/roadmap.md` - Product vision, 8 phases, checkpoints
- `docs/project/phase-X-implementation-plan.md` - Detailed phase plan

### Current Status
- `docs/checkpoints/checkpoint-N-results.md` - Latest checkpoint
- `docs/checkpoints/README.md` - Checkpoint index

### Development
- `docs/development/workflows.md` - Git, testing, deployment
- `docs/development/workflow-tracker.md` - Workflow milestones

### Setup & Configuration
- `docs/setup/[service]-setup.md` - Service setup guides
- `.env.example` - Environment variables

### Code
- `api/server.js` - Main API server
- `scripts/` - Utility scripts

### Testing
- `tests/e2e-checklist.md` - Manual test checklist

---

## 🏗️ Architecture Quick Reference

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express/Next.js/etc.
- **Database**: Supabase/PostgreSQL
- **Deployment**: Vercel/AWS

### API Endpoints
```
GET  /api/health                # Server status
POST /api/[resource]            # Create resource
GET  /api/[resource]/:id        # Get resource
[Add your endpoints]
```

### Database Schema
```sql
-- Key tables
[Describe your main tables]
```

---

## 📋 Common Tasks Reference

### Task: Review current status
```
Files to read:
1. docs/checkpoints/checkpoint-N-results.md (latest status)
2. README.md (project overview)
3. git log --oneline -10 (recent commits)
```

### Task: Continue to next checkpoint
```
Files to read:
1. docs/checkpoints/checkpoint-X.md (current state)
2. docs/project/roadmap.md (next checkpoint tasks)
3. docs/development/workflow-tracker.md (check workflow milestones)
```

### Task: Deploy to production
```
Files to read:
1. docs/development/workflows.md → Deployment section
2. vercel.json (deployment config)
3. .env.example (environment variables needed)
```

---

## 🏷️ Tag Naming Convention

**Checkpoint Tags**: `v0.X.0-checkpoint-Y`
- X = Minor version (matches checkpoint number)
- Y = Checkpoint number
- Example: `v0.8.0-checkpoint-8`

**Release Tags**: `v0.X.0`
- X = Minor version (matches checkpoint number)
- Created by `npm run release --release-as 0.X.0`
- Example: `v0.8.0`

**Phase Completion Tags**: Specific versions
- Phase 1 complete: `v0.3.0` (last checkpoint of phase)
- Phase 2 complete: `v0.7.0`
- [Add your phases]

---

## 🚨 Important Context

### User Preferences
- **Workflow**: [Your workflow automation level]
- **Testing**: [Manual/Automated]
- **Branching**: GitHub Flow + Phase Branches
- **Commits**: Conventional commits enforced
- **Deployment**: [Your deployment strategy]

### Current Blockers
- None / [List blockers]

### Project Philosophy
- [Your key principles]

---

## 🔄 Workflow Reminders for AI

### Session Startup Validation (Run at Start of Every Session)
**CRITICAL**: Always validate project IDs at start.

1. ✅ Database Project ID: `YOUR_DB_PROJECT_ID`
2. ✅ Deployment URL: https://your-app.vercel.app
3. ✅ GitHub repo: your-org/your-repo
4. ✅ MCP tools responding

### Before Starting Any Checkpoint (Pre-Checkpoint Cleanup Audit)
1. ✅ Check version numbers match
2. ✅ Check status consistency
3. ✅ Check missing documentation
4. ✅ Fix issues BEFORE starting new work

### When Completing a Checkpoint
1. ✅ Create comprehensive checkpoint status doc
2. ✅ Update checkpoint index
3. ✅ Commit documentation
4. ✅ Create checkpoint tag: `v0.X.0-checkpoint-Y`
5. ✅ **🛑 STOP - DO NOT PUSH YET**
6. ✅ **CRITICAL: AUTOMATICALLY REMIND user to run release**
7. ✅ Run: `npm run release --release-as 0.X.0`
8. ✅ Verify artifacts created
9. ✅ Push: `git push --follow-tags origin main`
10. ✅ Verify GitHub Actions triggered
11. ✅ Check Slack notifications
12. ✅ Verify notification accuracy
13. ✅ Update CLAUDE.md status

### MCP Tool Usage
**Always prefer MCP tools**:
- Supabase: `mcp__supabase__*` for database operations
- Notion: `mcp__notion__*` for project tracking
- Vercel: `mcp__vercel__*` for deployment monitoring

### When Workflow Changes (Self-Updating CLAUDE.md)
Automatically check if CLAUDE.md needs updating after:
1. ✅ Adding new workflows/tools
2. ✅ Changing project structure
3. ✅ Completing checkpoints
4. ✅ Adding documentation
5. ✅ Changing preferences

**Process**:
1. Suggest: "Should I update CLAUDE.md?"
2. Wait for approval
3. Update sections
4. Commit
5. Push

---

## 📚 Quick Reference Links

**For User**:
- Getting started: [README.md](README.md)
- Full roadmap: [docs/project/roadmap.md](docs/project/roadmap.md)
- Setup guides: [docs/setup/](docs/setup/)

**For AI Assistant**:
- Current status: [docs/checkpoints/checkpoint-N-results.md](docs/checkpoints/)
- Checkpoint index: [docs/checkpoints/README.md](docs/checkpoints/README.md)
- Implementation plan: [docs/project/roadmap.md](docs/project/roadmap.md)
- Workflows: [docs/development/workflows.md](docs/development/workflows.md)

---

## 💡 Tips for AI Assistants

### DO:
- ✅ Read checkpoint status before suggesting next steps
- ✅ Follow conventional commit format
- ✅ Update docs when completing tasks
- ✅ Use TodoWrite tool for multi-step tasks
- ✅ Ask about blockers
- ✅ Reference file paths clearly (e.g., api/server.js:124)
- ✅ Automatically check if CLAUDE.md needs updating

### DON'T:
- ❌ Assume what's tested - check checkpoint docs
- ❌ Skip reading current status
- ❌ Forget to update checkpoint docs
- ❌ Ignore workflow-tracker reminders
- ❌ Make assumptions about external dependencies

### When in Doubt:
1. Read `docs/checkpoints/checkpoint-X.md`
2. Read `docs/project/roadmap.md`
3. Ask user for clarification

---

## 🔖 Version History

- **v0.X.0 / v0.X.0-checkpoint-Y** (YYYY-MM-DD): [Checkpoint name]
  - See: [docs/checkpoints/checkpoint-Y-results.md]
  - [What was delivered]
  - Status: [Complete/In Progress]

[Add your version history as you progress]

---

## 📝 Notes for Future AI Sessions

### Current Status (As of YYYY-MM-DD)
- ✅ **Phase X COMPLETE**: All checkpoints finished
- 🔄 **Phase Y IN PROGRESS**: Checkpoint Z underway
- 🎯 **Next**: [What's next]

### If User Says "Continue"
1. Check current branch (should be `main` or `phase-Y-checkpoint-Z`)
2. Read `docs/checkpoints/checkpoint-Z.md` for latest status
3. Proceed with next task per roadmap

---

**Remember**: This is a living document. Update after major milestones!
```

### Appendix A2: Roadmap Template

**File**: `docs/project/roadmap.md`
**Purpose**: 8-phase product vision with checkpoints
**When to create**: Day 1
**Time to complete**: 1-2 hours initially, evolves over time

```markdown
# Product Roadmap & Implementation Plan

**Project**: [Your Project Name]
**Vision**: [One paragraph describing end goal]
**Last Updated**: YYYY-MM-DD

---

## Table of Contents

1. [Project Vision](#project-vision)
2. [Strategic Approach](#strategic-approach)
3. [Velocity Tracking & Timeline Analysis](#velocity-tracking--timeline-analysis)
4-11. [Phase 1-8](#phase-1-foundation)
12. [Technology Stack](#technology-stack)
13. [Timeline & Priorities](#timeline--priorities)
14. [Success Metrics](#success-metrics)

---

## Project Vision

[2-3 paragraphs describing:
- What problem does this solve?
- Who is it for?
- What makes it unique?
- What's the end state vision?]

---

## Strategic Approach

### Core Architectural Principle

**[Your principle]**: [One sentence]

Example: "Our API provides DATA, AI platforms provide SYNTHESIS"

### Why This Approach?

[Explain your architectural decisions and their benefits]

### What's NOT Included

[List things you're explicitly not building and why]

---

## Velocity Tracking & Timeline Analysis

**Note**: Add this section after completing Phase 2

### Actual vs. Estimated Performance

| Phase | Original Estimate | Actual Duration | Velocity Multiplier | Notes |
|-------|------------------|-----------------|---------------------|-------|
| Phase 1 | X weeks | Y days | Z.Xx faster/slower | [Key factors] |
| Phase 2 | X weeks | Y days | Z.Xx faster/slower | [Key factors] |

### Why Our Velocity

[Explain factors contributing to your speed or delays]

### Revised Phase Estimates

[Update future phase estimates based on demonstrated velocity]

### Risk Factors to Monitor

[List what could slow you down]

---

## Phase 1: Foundation

**Status**: [Planned/In Progress/Complete]
**Original Estimate**: 2-3 weeks
**Actual Duration**: [Fill when complete]
**Start**: YYYY-MM-DD
**Complete**: YYYY-MM-DD

### Goal

[Business objective in 1-2 sentences]

### Business Context

[Why this matters for users/stakeholders]

### Implementation: 3-4 Checkpoints

<details>
<summary><b>Checkpoint 1: [Name]</b> [Status]</summary>

**Original Estimate**: X weeks
**Actual**: Y hours

**Goal**: [Technical objective in 1 sentence]

**Deliverables**:
1. Deliverable 1
   - Subtask A
   - Subtask B
2. Deliverable 2
3. Deliverable 3

**Validation**:
- [ ] Test scenario 1
- [ ] Test scenario 2
- [ ] Performance metric (< Xs)
- [ ] Backward compatibility maintained

**Tagged**: v0.1.0-checkpoint-1
**Completed**: YYYY-MM-DD

</details>

<details>
<summary><b>Checkpoint 2: [Name]</b> [Status]</summary>

[Same structure as Checkpoint 1]

</details>

<details>
<summary><b>Checkpoint 3: [Name]</b> [Status]</summary>

[Same structure as Checkpoint 1]

</details>

### Deliverables

- ✅ Deliverable 1 (if complete)
- 🔄 Deliverable 2 (if in progress)
- ⏸️ Deliverable 3 (if pending)

### What's NOT Included

- ❌ Out of scope item 1 (reason)
- ❌ Deferred item 2 (deferred to Phase X)

---

## Phase 2: [Name]

[Same structure as Phase 1]

---

## Phase 3: [Name]

[Same structure as Phase 1]

---

## Phase 4: [Name]

[Same structure as Phase 1]

---

## Phase 5: [Name]

[Same structure as Phase 1]

---

## Phase 6: [Name]

[Same structure as Phase 1]

---

## Phase 7: [Name] (Optional)

[Same structure as Phase 1]

---

## Phase 8: [Name] (Optional)

[Same structure as Phase 1]

---

## Technology Stack

### Core Technologies
- **Runtime**: [Node.js/Python/etc.]
- **Framework**: [Express/Django/etc.]
- **Database**: [Supabase/PostgreSQL/etc.]
- **Deployment**: [Vercel/AWS/etc.]

### Key Services
- **Service 1**: [Purpose]
- **Service 2**: [Purpose]

### Development Tools
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Monitoring**: [Tool]

---

## Timeline & Priorities

### Critical Path

Phases that MUST complete for MVP:
```
Phase 1 → Phase 2 → Phase 3 → Phase 4
```

### Optional/Enhancement

Phases that improve but aren't critical:
```
Phase 5 → Phase 6
Phase 7 → Phase 8 (may not be needed)
```

### Target Timeline

**Original Estimate**: [X weeks total]
**Revised Estimate**: [Y weeks based on velocity]
**Target Launch**: [Date]

---

## Success Metrics

### Phase 1 Success
- [ ] Metric 1: [Target]
- [ ] Metric 2: [Target]

### Phase 2 Success
- [ ] Metric 1: [Target]
- [ ] Metric 2: [Target]

### Overall Success
- [ ] Metric 1: [Target]
- [ ] Metric 2: [Target]
- [ ] Metric 3: [Target]

---

**Document Version**: 1.0
**Last Updated**: YYYY-MM-DD
```

---

This completes the core templates. Due to the extensive length of the full manual, I've created the most critical sections (Parts 1-5, 8, and 10 with key templates).

Would you like me to:
1. Continue with the remaining template files?
2. Create the MID_PROJECT_ADOPTION_GUIDE.md?
3. Create example files from the actual project?
4. Create the methodology README index?