# Mid-Project Adoption Guide

**For projects already in progress (3+ months old)**

Version 1.0 | November 19, 2025

---

## Overview

This guide covers how to adopt the Unified Development Methodology when your project is already underway. Unlike greenfield adoption, mid-project adoption requires:

- **Shadow → Validate → Migrate** approach
- **Incremental rollout** over 1-3 months
- **Team buy-in** strategies
- **Documentation catch-up** without disruption

## Quick Decision Tree

**Is your project**:
- **0-2 months old**: Use [Greenfield Quick Start](./UNIFIED_DEVELOPMENT_METHODOLOGY.md#greenfield-quick-start) instead
- **3-6 months old**: See [Early Stage Project](#scenario-1-early-stage-project) below
- **6+ months old, no production users**: See [Mid Stage Project](#scenario-2-mid-stage-project) below
- **6+ months old, production users**: See [Mature Project](#scenario-3-mature-project) below

---

## Three Adoption Levels

Regardless of project maturity, you can choose your adoption level:

### Level 1: Minimum Viable (2-4 hours, zero ongoing)
**What**:
1. Create CLAUDE.md (current state)
2. Add PR template
3. Document "What's working" and "Known issues"
4. Tag current commit as baseline

**Value**: 50% of methodology benefit
**Best for**: Skeptical teams, limited bandwidth

### Level 2: Standard (1 week + 10% ongoing)
**What**: Minimum viable PLUS
1. Create docs/ folder structure
2. Document workflows.md
3. Checkpoint docs for major milestones
4. Commitlint (warning mode)

**Value**: 80% of methodology benefit
**Best for**: Most mid-project teams

### Level 3: Full (3 months gradual)
**What**: Standard PLUS
1. Checkpoint-based planning
2. Enforce conventional commits
3. Progressive workflow automation
4. Comprehensive documentation

**Value**: 100% of methodology benefit
**Best for**: Teams with bandwidth and high pain

---

## Scenario 1: Early Stage Project (3-6 months old)

### Project Characteristics
- 5,000-15,000 lines of code
- 100-300 commits
- Core features working
- Some documentation (possibly outdated)
- 3-5 person team
- Early adopters or beta users

### Adoption Path: "Audit, Document, Incrementalize"

#### Month 1: Foundation & Audit

**Week 1: Documentation Audit** (1 day)
- Identify all existing docs
- Mark outdated sections with ⚠️ warnings
- Create docs/README.md as index
- **Don't fix everything**—just catalog

**Week 2: Create CLAUDE.md** (1 day)
- Document actual project structure (not ideal)
- List what's working (not what should work)
- Document known issues and technical debt
- Add navigation for current state

**Week 3: Retroactive Checkpoints** (1-2 days)
- Create checkpoint docs for major milestones
- Tag major milestones retrospectively
- Document known issues per checkpoint
- **Don't be perfect**—capture major states

**Week 4: Team Alignment** (4 hours)
- Workshop: Document actual workflows
- Agree on standardized git flow
- Introduce checkpoint concept
- Get buy-in for 3-month trial

#### Month 2: Process Standardization

**Week 1: Git Workflow**
- Branch protection enabled
- PRs required for main
- Team training on PR template

**Week 2-3: Commit Convention**
- Commitlint warnings reviewed weekly
- Team training session
- Enable enforcement after grace period

**Week 4: Checkpoint Planning**
- Break roadmap into checkpoints
- Define validation criteria
- Schedule next 3 checkpoints

#### Month 3: Automation & Validation

**Progressive automation**:
- Auto-deploy to staging
- Slack notifications
- Basic CI checks
- Schema change tracking

**Review**: Gather feedback, decide continue/adapt/stop

---

## Scenario 2: Mid-Stage Project (6-12 months old)

### Project Characteristics
- 10,000-30,000 lines of code
- 300-800 commits
- Production users (but not many)
- Established workflows (may be inconsistent)
- 5-10 person team
- Some technical debt

### Reality Check: Should You Adopt?

**Ask first**:
1. Why are we considering this?
   - ❌ "Process is perfect" → **Don't adopt**
   - ✅ "Onboarding takes 2+ weeks" → **Adopt**
   - ✅ "Deployments are scary" → **Adopt**

2. Do we have bandwidth?
   - If at capacity, **defer** 3-6 months
   - If can dedicate 10% sprint time, **adopt incrementally**

### Adoption Path: "Shadow → Validate → Migrate"

#### Month 1: Shadow Period (Don't Disrupt Anything)
- Create unified-methodology docs alongside existing
- Use checkpoint approach for ONE feature
- One team member pilots conventional commits (optional)
- Document: Did it help?

#### Month 2: Validation Period (Selective Adoption)
- Use checkpoint approach for 2-3 features
- Add PR template for NEW code (grandfather old)
- Conventional commits optional but encouraged
- Measure: Faster or slower?

#### Month 3: Partial Migration (If Validation Succeeds)
- Merge unified-methodology docs into existing
- Enforce PR template for new code
- Enable commitlint (warning mode)
- Keep existing workflows for legacy code

---

## Scenario 3: Mature Project (12+ months, production users)

### Project Characteristics
- 20,000+ lines of code
- 500+ commits
- Production customers
- Established (but possibly messy) processes
- 5-10+ person team
- Can't afford major disruption

### Minimum Viable Adoption (Recommended)

**Only do this**:
1. Create CLAUDE.md (2 hours)
2. Add PR template (15 mins)
3. Document current state (1 hour)
4. Tag baseline (1 min)

**Stop there. Evaluate after 1 month.**

**Why**: Risk of disruption outweighs benefit for mature projects unless documentation pain is severe.

### If Minimum Viable Helps After 1 Month

Consider **hybrid model**:
- **New code**: Use methodology (checkpoints, PR template, conventional commits)
- **Legacy code**: Keep old process
- **Documentation**: Unified (CLAUDE.md describes both)

This is **completely fine**. Many projects end up here.

---

## Module-by-Module Adoption

You don't have to adopt everything. Pick modules that solve your pain:

### Module 1: CLAUDE.md (2-4 hours)
**Solves**: AI assistants confused about project
**Standalone**: Yes
**Value**: High

### Module 2: Checkpoint Documentation (30-60 mins each)
**Solves**: No clear rollback points, unclear status
**Standalone**: Yes
**Value**: Medium-high

### Module 3: Conventional Commits (1 hour setup)
**Solves**: Messy git history, manual changelogs
**Standalone**: Less valuable alone (needs changelog automation)
**Value**: Medium

### Module 4: Automated Changelog (30 mins)
**Solves**: Manual changelog maintenance
**Standalone**: No (requires conventional commits)
**Value**: Medium

### Module 5: Slack Notifications (2 hours)
**Solves**: Team unaware of deployments/PRs
**Standalone**: Yes
**Value**: Medium

### Module 6: PR Templates (15 mins)
**Solves**: Inconsistent code reviews
**Standalone**: Yes
**Value**: Medium

### Module 7: Workflow Documentation (2-4 hours)
**Solves**: Tribal knowledge, onboarding difficulty
**Standalone**: Yes
**Value**: High

### Module 8: Phase/Checkpoint Planning (4-6 hours)
**Solves**: Unclear roadmap, no milestones
**Standalone**: Yes
**Value**: Medium-high

---

## Git History Approach

**Universal principle**: **NEVER rewrite public history for mid-project adoption**

**Instead**:
1. Tag current state as baseline: `v0.X.0-baseline`
2. Optionally tag major past milestones (don't move commits)
3. Document history in `docs/history/timeline.md`
4. Start new conventions from now forward
5. Embrace hybrid: Old commits = old style, new commits = new style

---

## Documentation Catch-Up Strategy

**Problem**: Months of outdated docs is overwhelming

**Solution**: "Living Documentation" approach

1. **Don't rewrite everything** (wastes weeks)
2. **Mark all docs with "Last Verified" date** (1 day)
3. **Create CLAUDE.md describing current truth** (1 day)
4. **Update as you touch**: PR rule "update docs when you touch code"
5. **Archive dead docs** to `docs/archive/` (gradual)

**Timeline**: 2 days upfront, then 5-10 mins per PR

---

## Team Buy-In Strategy

### For 3-5 Person Teams

**Month 0 (Pre-Adoption)**:
1. **Week 1**: Share this guide with team
2. **Week 2**: Propose 3-month trial with exit criteria
3. **Week 3**: Run workshop to document current workflows
4. **Week 4**: Get commitment from all members

**Success Criteria for Trial**:
- ✅ PRs don't take >30 mins longer
- ✅ Onboarding takes <4 hours (not days)
- ✅ Deployment process documented
- ✅ At least 2 checkpoints completed
- ✅ Team reports less confusion

**Exit Strategy**:
- Month 3 review: Continue, adapt, or stop
- If stopping: Keep documentation, drop process
- If adapting: Keep what worked, drop what didn't

### For 5-10 Person Teams

**Pilot approach**:
1. **Month 1**: 2-3 volunteers pilot
2. **Month 2**: Pilot reports back
3. **Month 3**: Team decides together

**Only proceed with full adoption if pilot demonstrates value**

---

## Common Pitfalls

### Pitfall 1: "Let's rewrite everything first"
**Symptom**: 2 weeks rewriting docs before adopting
**Fix**: Create CLAUDE.md for current state, update incrementally

### Pitfall 2: "Let's enforce all workflows immediately"
**Symptom**: Installing everything on Day 1
**Fix**: Add one workflow per month

### Pitfall 3: "Let's clean up git history"
**Symptom**: Planning to rebase/rewrite commits
**Fix**: Keep history, start fresh from now

### Pitfall 4: "Let's pilot with skeptics"
**Symptom**: Assigning reluctant developers
**Fix**: Only pilot with volunteers

---

## Measuring Success

### Qualitative (Survey Monthly)
- "Do you feel more confident deploying?" (1-10)
- "Is onboarding easier than 3 months ago?" (1-10)
- "Do you understand project state better?" (1-10)

### Quantitative
- Time to onboard new developer (hours)
- Deployment frequency (deploys per week)
- Time to diagnose production issues (hours)
- Documentation freshness (% verified in last 30 days)

---

## Decision Framework: Should You Adopt Mid-Project?

Score each question **0-10**:

1. **Onboarding**: Takes >3 days?
2. **Deployment**: Causes anxiety?
3. **AI Confusion**: AI assistants struggle?
4. **Documentation**: Outdated or missing?
5. **Workflow Inconsistency**: Different processes per person?
6. **Process Openness**: Team open to experiments? (higher is better)
7. **Bandwidth**: Have 10% time for process improvements?

**Total Score**: _____ / 70

**Recommendation**:
- **0-20**: Don't adopt (process working or no bandwidth)
- **21-35**: Minimum viable only
- **36-50**: Standard adoption (3 months)
- **51-70**: Full adoption (if team bought in)

---

## Key Takeaway

**The methodology is modular**. You can:
- ✅ Adopt just CLAUDE.md and stop (valid)
- ✅ Add checkpoints for major milestones only (valid)
- ✅ Use hybrid old/new processes (valid)
- ✅ Pick 2-3 modules that solve your pain (valid)

**You don't need everything to get value.**

---

For detailed templates and examples, see:
- [Main Manual](./UNIFIED_DEVELOPMENT_METHODOLOGY.md)
- [Templates Directory](./templates/)
- [Examples Directory](./examples/)
