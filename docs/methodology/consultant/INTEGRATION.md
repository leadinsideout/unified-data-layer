# Methodology Consultant - Integration Guide

**How the consultant fits into the Unified Development Methodology**

Version 1.0 | November 19, 2025

---

## Overview

The Methodology Consultant is an **optional entry point** for teams who don't yet know which parts of the methodology to adopt. It's not a replacement for the methodology itself—it's a **discovery tool** that helps teams create a customized adoption plan.

---

## Where It Fits

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│        Team discovers this methodology              │
│                                                     │
└─────────────┬───────────────────────────────────────┘
              │
              ├─────────────────────────────────────────┐
              │                                         │
    ┌─────────▼─────────┐                  ┌───────────▼──────────┐
    │                   │                  │                      │
    │  KNOWS WHAT       │                  │  DOESN'T KNOW        │
    │  THEY NEED        │                  │  WHAT THEY NEED      │
    │                   │                  │                      │
    └─────────┬─────────┘                  └───────────┬──────────┘
              │                                        │
              │                                        │
    ┌─────────▼─────────┐                  ┌───────────▼──────────┐
    │                   │                  │                      │
    │  READ MAIN        │                  │  USE CONSULTANT      │
    │  MANUAL DIRECTLY  │                  │  (30-45 mins)        │
    │                   │                  │                      │
    └─────────┬─────────┘                  └───────────┬──────────┘
              │                                        │
              │                                        │
              │                          ┌─────────────▼──────────┐
              │                          │                        │
              │                          │  RECEIVE CUSTOMIZED    │
              │                          │  ADOPTION PLAN         │
              │                          │                        │
              │                          └─────────────┬──────────┘
              │                                        │
              └────────────────────┬───────────────────┘
                                   │
                    ┌──────────────▼─────────────┐
                    │                            │
                    │  EXECUTE ADOPTION PLAN     │
                    │  (Week 1 → Month 1+)       │
                    │                            │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────▼─────────────┐
                    │                            │
                    │  USE METHODOLOGY           │
                    │  (Checkpoints, workflows,  │
                    │   CLAUDE.md, etc.)         │
                    │                            │
                    └────────────────────────────┘
```

---

## Three Entry Points to the Methodology

### Entry Point 1: Main Manual (For Teams Who Know What They Need)

**When to use**:
- ✅ Team has clear pain points ("deployments are scary")
- ✅ Team knows which modules they want (CLAUDE.md + checkpoints)
- ✅ Team has bandwidth and buy-in

**Path**:
1. Read [UNIFIED_DEVELOPMENT_METHODOLOGY.md](../UNIFIED_DEVELOPMENT_METHODOLOGY.md)
2. Choose adoption level (minimum/standard/full)
3. Follow quick start guide (greenfield or mid-project)
4. Execute adoption plan

**Time**: 1-2 hours reading + execution time

---

### Entry Point 2: Mid-Project Guide (For Teams with Existing Codebases)

**When to use**:
- ✅ Project is 3+ months old
- ✅ Team wants to adopt incrementally
- ✅ Team needs strategies for documentation catch-up

**Path**:
1. Read [MID_PROJECT_ADOPTION_GUIDE.md](../MID_PROJECT_ADOPTION_GUIDE.md)
2. Identify project scenario (early/mid/mature)
3. Choose adoption level
4. Follow Shadow → Validate → Migrate approach

**Time**: 30 mins reading + execution time

---

### Entry Point 3: Consultant (For Teams Who Don't Know What They Need)

**When to use**:
- ✅ Team has pain but can't articulate it
- ✅ Team unsure if methodology applies to them
- ✅ Team wants guided discovery

**Path**:
1. Read [USAGE_GUIDE.md](./USAGE_GUIDE.md) (10 mins)
2. Copy [CONSULTANT_PROMPT.md](./CONSULTANT_PROMPT.md) into Claude Code
3. Run 30-45 minute discovery session
4. Receive customized adoption plan
5. Execute plan

**Time**: 30-45 mins discovery + execution time

---

## When to Use Each Entry Point

| Scenario | Entry Point | Reasoning |
|----------|-------------|-----------|
| "We need better git workflows" | Main Manual | Clear pain, knows what they need |
| "Our project is 8 months old, not sure if this applies" | Mid-Project Guide | Mid-project scenario, needs incremental approach |
| "Something's not working but we don't know what" | Consultant | Unclear pain, needs discovery |
| "Deployments are scary but we're not sure why" | Consultant | Knows pain exists, doesn't know root cause |
| "We want CLAUDE.md and checkpoints only" | Main Manual | Knows exactly which modules to adopt |
| "Is this methodology right for us?" | Consultant | Needs validation and customization |

---

## How Consultant Output Integrates with Methodology

### Consultant Creates
- **Customized adoption plan** (30-day roadmap)
- **Module recommendations** (which parts of methodology to use)
- **Validation criteria** (how to know if it's working)
- **Resource links** (templates, examples from methodology)

### Team Executes Using
- **Templates** from `docs/methodology/templates/`
- **Examples** from `docs/methodology/examples/`
- **Main manual sections** referenced in plan
- **Mid-project guide** (if mid-project scenario)

### Example Flow

1. **Consultant session** identifies pain: "Onboarding takes 5 days"
2. **Consultant recommends**: Module 1 (CLAUDE.md) + Module 7 (Workflow docs)
3. **Team uses templates**:
   - Copy `templates/CLAUDE_TEMPLATE.md`
   - Follow CLAUDE.md structure from main manual Part 3
4. **Team validates**:
   - Uses validation criteria from consultant plan
   - Checks examples in `examples/` directory
5. **Team adapts**:
   - If stuck, re-run consultant with "We're stuck on [X]"
   - Consultant references main manual sections for deeper dive

---

## Consultant Does NOT Replace Methodology

**Important**: The consultant is a **planning tool**, not an execution tool.

**Consultant provides**:
- ✅ Pain point discovery
- ✅ Module recommendations
- ✅ Adoption roadmap
- ✅ Validation criteria

**Consultant does NOT provide**:
- ❌ Detailed implementation instructions (use main manual)
- ❌ Templates and examples (use templates/ and examples/ directories)
- ❌ Ongoing execution support (use methodology workflows)
- ❌ Deep dives into specific modules (use main manual parts)

**Analogy**: Consultant is like a **personal trainer assessment** (identifies needs, creates plan), not the **workout program itself** (that's the methodology).

---

## When to Re-Run Consultant

### Month 1 Check-In
**When**: After 30 days of adoption
**Why**: Validate if plan is working, adapt if needed
**Process**:
1. Copy consultant prompt
2. Add context: "We ran your Month 1 plan. Here are our results: [X]"
3. Consultant reviews validation criteria
4. Consultant recommends: Continue / Adapt / Stop

### Expanding Adoption
**When**: Successfully adopted minimum viable, want to expand
**Why**: Get recommendations for next modules to adopt
**Process**:
1. Copy consultant prompt
2. Add context: "We've successfully adopted CLAUDE.md + workflows. What's next?"
3. Consultant recommends next 2-3 modules based on new pain points

### New Project
**When**: Starting a different project
**Why**: Different project = different pain points
**Process**:
1. Run full discovery session for new project
2. Get new customized plan
3. May have different recommendations than first project

### Team Growth
**When**: Team size changes significantly (e.g., 3 → 8 people)
**Why**: Team size affects which modules are valuable
**Process**:
1. Copy consultant prompt
2. Add context: "Our team grew from 3 to 8 people. Should we adjust our adoption?"
3. Consultant recommends additional modules (e.g., more structured planning for larger team)

---

## Consultant + Main Manual: Complementary, Not Redundant

| Question | Consultant Answer | Main Manual Answer |
|----------|-------------------|-------------------|
| "Should we adopt this?" | "Let me ask about your pain points" (discovery) | "Here's who this is for" (self-assessment) |
| "Which modules do we need?" | "Based on your pain, adopt [X, Y, Z]" (customized) | "Here are all 10 modules" (comprehensive) |
| "How do we implement CLAUDE.md?" | "Here's your roadmap, see Part 3 for details" (reference) | "Here's the complete guide" (implementation) |
| "Is this working?" | "Check these validation criteria" (metrics) | "Here's how to measure success" (general guidance) |
| "We're stuck on [X]" | "Let's troubleshoot your specific situation" (coaching) | "Here are common pitfalls" (patterns) |

**Use both**: Consultant for **discovery and planning**, Main Manual for **implementation and reference**.

---

## Integration with Existing Methodology Documentation

### README.md (Index)
- **Role**: Entry point and navigation
- **Integration**: Links to consultant as "Not sure where to start?" option
- **When to use**: First time discovering methodology

### Main Manual
- **Role**: Comprehensive reference and implementation guide
- **Integration**: Consultant references specific parts (e.g., "See Part 3 for CLAUDE.md implementation")
- **When to use**: During execution of adoption plan

### Mid-Project Guide
- **Role**: Scenario-specific guidance for existing projects
- **Integration**: Consultant may recommend reading this for mid-project teams
- **When to use**: Project is 3+ months old

### Templates
- **Role**: Copy-paste starting points
- **Integration**: Consultant plan links to specific templates team needs
- **When to use**: During Week 1 foundation tasks

### Examples
- **Role**: Real-world validation of methodology
- **Integration**: Consultant references examples as proof points
- **When to use**: When team skeptical or wants to see results

---

## For Documentation Maintainers

### Where Consultant Lives
```
docs/methodology/
├── README.md                           # Links to consultant
├── UNIFIED_DEVELOPMENT_METHODOLOGY.md  # References consultant in Part 1
├── MID_PROJECT_ADOPTION_GUIDE.md       # May recommend consultant
├── consultant/
│   ├── CONSULTANT_PROMPT.md            # Core prompt (450+ lines)
│   ├── USAGE_GUIDE.md                  # How to use (this file)
│   ├── EXAMPLE_SESSION.md              # Complete walkthrough
│   └── INTEGRATION.md                  # How it fits (you are here)
```

### Cross-References to Maintain

**README.md should link to**:
- Consultant in "Not sure where to start?" section
- Main manual, mid-project guide, consultant as three entry points

**Main Manual should link to**:
- Consultant in Part 1 (philosophy section)
- Consultant as alternative for teams who don't know their needs

**Mid-Project Guide should link to**:
- Consultant for teams unsure if methodology applies

**Consultant should link to**:
- Templates (for execution)
- Main manual parts (for implementation details)
- Examples (for validation)

---

## FAQ

**Q: Is the consultant required to use the methodology?**
A: No. It's an optional entry point for teams who don't know what they need yet.

**Q: Can we skip the consultant and go straight to the main manual?**
A: Yes, absolutely. If you know what you need, read the manual directly.

**Q: What if we run the consultant and don't like the recommendations?**
A: Challenge them! The consultant will explain reasoning. You can also ignore recommendations and pick modules yourself from the main manual.

**Q: Can we use the consultant multiple times?**
A: Yes. Use it for discovery (first time), validation (Month 1), expansion (Month 2+), or new projects.

**Q: Does the consultant work for greenfield and mid-project scenarios?**
A: Yes. The consultant adapts recommendations based on project maturity. Greenfield teams get Phase 1-4 checkpoint planning, mid-project teams get incremental adoption roadmaps.

---

## Next Steps

- **New to methodology?** Start with [README.md](../README.md) to understand all entry points
- **Want guided discovery?** Use [CONSULTANT_PROMPT.md](./CONSULTANT_PROMPT.md)
- **Know what you need?** Skip to [Main Manual](../UNIFIED_DEVELOPMENT_METHODOLOGY.md)
- **Mid-project team?** Read [Mid-Project Adoption Guide](../MID_PROJECT_ADOPTION_GUIDE.md)

---

**Remember**: The consultant is a **tool for discovery**, not a replacement for the methodology itself. Use it to create your plan, then use the methodology to execute it.
