# Methodology Consultant - Usage Guide

**How to use the Unified Development Methodology consultant system**

Version 1.0 | November 19, 2025

---

## What Is This?

The Methodology Consultant is a specialized prompt that transforms Claude Code into a software consultant and product manager. It helps development teams:

- **Discover pain points** they may not realize they have
- **Assess project state** and maturity level
- **Clarify roadmap** and development goals
- **Choose methodology modules** that fit their needs
- **Create customized adoption plans** tailored to their situation

---

## Who Should Use This?

### Ideal Users
✅ Teams who know they have pain but can't articulate it ("deployments are scary")
✅ Teams unsure if this methodology applies to them
✅ Teams with conflicting opinions on what to adopt
✅ New technical leaders wanting to improve team processes
✅ Teams transitioning from no process to structured process

### You Probably Don't Need This If
❌ You've already read the main manual and know exactly what you want
❌ Your team has zero pain points (if true, congrats!)
❌ You're looking for quick answers (just read the [README](../README.md) instead)

---

## Getting Started

### Prerequisites
- **Claude Code** installed and running
- **30-45 minutes** uninterrupted time for discovery session
- **1-2 team representatives** (developer + product owner ideal)
- **Basic project context**: Codebase size, team size, current workflows (even if messy)

### Setup (5 minutes)

1. **Open Claude Code** in your project directory
2. **Copy the consultant prompt**:
   ```bash
   # Copy the entire CONSULTANT_PROMPT.md file
   cat docs/methodology/consultant/CONSULTANT_PROMPT.md
   ```
3. **Paste into Claude Code** as a new message
4. **Wait for acknowledgment** from the consultant

---

## What to Expect

### Timeline
- **Phase 1: Current State Assessment** (5-10 minutes)
- **Phase 2: Vision Clarification** (5-10 minutes)
- **Phase 3: Pain Discovery** (15-20 minutes)
- **Phase 4: Solution Mapping** (5-10 minutes)
- **Plan Creation** (5 minutes)
- **Total**: 30-45 minutes

### The Consultant Will
✅ Ask questions about your current workflows
✅ Listen for pain signals in your answers
✅ Help you articulate problems you feel but can't name
✅ Map your pain points to methodology modules
✅ Recommend adoption level (minimum/standard/full)
✅ Create a customized 1-3 month adoption roadmap

### The Consultant Will NOT
❌ Judge your current processes
❌ Force you to adopt everything
❌ Prescribe solutions without understanding context
❌ Rush you through discovery
❌ Make you feel bad about technical debt

---

## Discovery Process Walkthrough

### Phase 1: Current State Assessment (5-10 minutes)

**What Happens:**
- Consultant asks about project maturity, team size, codebase size
- Establishes baseline understanding of your situation
- Identifies whether greenfield or mid-project scenario

**Example Questions:**
- "How old is your project?"
- "How many developers on the team?"
- "How many lines of code?"
- "What's your current git workflow?"

**Your Role:**
- Answer honestly (even if answer is "we don't have one")
- Don't exaggerate or downplay problems
- Mention if context varies across teams/projects

---

### Phase 2: Vision Clarification (5-10 minutes)

**What Happens:**
- Consultant helps you articulate where you want to go
- Identifies gaps between current state and desired state
- Surfaces misalignment within team (if multiple people present)

**Example Questions:**
- "What does 'production-ready' mean to you?"
- "How fast do you want to ship features?"
- "What would 'good documentation' look like?"
- "What does success look like in 6 months?"

**Your Role:**
- Think aspirationally (not just fixing current problems)
- Be specific about outcomes you want
- Call out uncertainty ("We haven't defined that yet")

---

### Phase 3: Pain Discovery (15-20 minutes)

**What Happens:**
- **This is the most important phase**
- Consultant uses Socratic questioning to reveal hidden pain
- You'll likely have "aha moments" realizing problems you didn't name
- Consultant maps your pain to specific methodology modules

**Example Questions:**
- "Walk me through your last deployment. What happened?"
- "What happens when a new developer joins?"
- "When was the last time you rolled back a change?"
- "How do you know if a feature is done?"

**Your Role:**
- Tell stories, not summaries ("Last week we deployed and...")
- Describe actual behavior, not ideal behavior
- Mention workarounds ("We just Slack the team before deploying")
- Admit anxiety or confusion openly

**Common Pain Signals:**
| What You Say | Pain Signal Detected |
|--------------|----------------------|
| "Deployments make me nervous" | Need deployment automation + docs |
| "Onboarding takes 2 weeks" | Need CLAUDE.md + documentation hierarchy |
| "We had to revert last week" | Need checkpoint-based development + testing |
| "I don't know what commit broke it" | Need conventional commits + changelog |
| "We just Slack everyone before deploying" | Need Slack notifications + workflows |

---

### Phase 4: Solution Mapping (5-10 minutes)

**What Happens:**
- Consultant shows you which methodology modules address your pain
- Explains trade-offs (time investment vs. value)
- Recommends adoption level (minimum/standard/full)
- Checks for team buy-in and bandwidth

**Example Recommendations:**
```
Your Pain Points:
1. Onboarding takes 2+ weeks → CLAUDE.md + docs hierarchy
2. Deployments scary → Workflow automation + checkpoints
3. No one knows what's "done" → Checkpoint validation + E2E checklists

Recommended Adoption: Standard (1 week + 10% ongoing)

Modules to Adopt:
- Module 1: CLAUDE.md (2-4 hours, IMMEDIATE VALUE)
- Module 7: Workflow docs (2-4 hours, HIGH VALUE)
- Module 2: Checkpoint docs (30-60 mins each, MEDIUM VALUE)
- Module 6: PR template (15 mins, MEDIUM VALUE)

Skip for Now:
- Conventional commits (no clear need yet)
- Slack notifications (team small enough to communicate manually)
- Automated changelog (not needed until commit standardization)
```

**Your Role:**
- Challenge recommendations if they don't feel right
- Ask "why this and not that?"
- Be honest about bandwidth constraints
- Negotiate scope (start smaller if needed)

---

## After the Consultation

### You Will Receive

**1. Customized Adoption Plan**
```markdown
## 30-Day Adoption Plan for [Your Team]

**Adoption Level**: Standard
**Estimated Time**: 1 week setup + 2-3 hours/week ongoing

### Week 1: Foundation
**Day 1** (4 hours):
- [ ] Create CLAUDE.md for current project state
- [ ] Document current workflows in docs/development/workflows.md
- [ ] Add PR template

**Day 2-3** (4 hours):
- [ ] Create docs/ folder structure
- [ ] Create checkpoint docs for last 3 major milestones
- [ ] Tag current state as baseline

...
```

**2. Module Implementation Guides**
- Links to specific templates you need
- Examples from reference project
- Expected time investment per module

**3. Validation Criteria**
- How to know if adoption is working
- Red flags to watch for
- When to stop/adapt

**4. Ongoing Coaching Offer**
- Week 1, Month 1, Month 2-3 check-in offers
- Optional, not required

---

## Using Your Customized Plan

### Step 1: Share with Team (1 hour)
- Present the consultant's recommendations
- Explain why each module was recommended (show pain → solution mapping)
- Get team buy-in for 30-day trial
- Assign owners for each Week 1 task

### Step 2: Execute Week 1 (Foundation)
- Follow the plan's Day 1-5 tasks
- Don't skip documentation steps (they're critical)
- Use templates provided by consultant
- Ask questions in Claude Code if stuck

### Step 3: Validate (End of Week 1)
- Check validation criteria from plan
- Survey team: "Is this helping or hurting?"
- Adjust scope if needed (consultant can help)

### Step 4: Continue or Adapt (Month 1+)
- If helping: Continue to Month 2-3 tasks
- If mixed: Keep what works, drop what doesn't
- If not helping: Stop and try something else (no shame!)

---

## Common Scenarios

### Scenario 1: "We don't have time for 30 minutes"

**Short answer**: Don't use the consultant. Just adopt CLAUDE.md (2-4 hours, zero ongoing).

**Why**: The consultant is for teams unsure what they need. If you're time-constrained, you need the [Minimum Viable Adoption](../README.md#minimum-viable-adoption) path, not discovery.

---

### Scenario 2: "Our team disagrees on what we need"

**Perfect use case for consultant!**

**Process**:
1. Run discovery session with 2-3 team representatives
2. Consultant will surface disagreements during Phase 2 (Vision Clarification)
3. Consultant helps team articulate competing priorities
4. Recommendations will be compromise/hybrid approach

**Example**:
- Developer A: "We need better git workflows"
- Developer B: "We need better documentation"
- Consultant: "Let's do both, but phase them. Week 1: CLAUDE.md + PR template. Week 2: Conventional commits."

---

### Scenario 3: "We tried process improvements before and they failed"

**Consultant will help you avoid repeating mistakes.**

**During Phase 3 (Pain Discovery), mention this**:
- "We tried [X] and it didn't work"
- Consultant will ask why it failed
- Common reasons: Too much too fast, no buy-in, wrong solution for problem
- Customized plan will account for this history

---

### Scenario 4: "We're not sure this methodology applies to us"

**This is EXACTLY what the consultant is for.**

**Consultant will determine**:
- Does your team size fit? (methodology best for 1-5 people)
- Does your project maturity fit? (methodology best for 0-12 months)
- Do your pain points match what methodology solves?
- Are there better alternatives for your situation?

**Consultant may recommend AGAINST adoption** if:
- Your processes are already working well
- Your team is too large (10+ people, needs more structure)
- Your project is too mature (2+ years, too disruptive)
- You don't use AI assistants (50% of value is AI integration)

---

## Tips for a Successful Consultation

### DO
✅ Block 45 minutes uninterrupted (no Slack, no meetings)
✅ Have 1-2 people present (not whole team, too many voices)
✅ Answer with stories ("Last week we...") not summaries
✅ Admit uncertainty ("We haven't figured that out yet")
✅ Challenge recommendations if they don't feel right
✅ Ask "why?" when you don't understand

### DON'T
❌ Rush through discovery to get to recommendations
❌ Answer with "ideal state" instead of actual behavior
❌ Try to impress the consultant (it's AI, doesn't judge)
❌ Commit to more than you have bandwidth for
❌ Feel bad about current processes (everyone has debt)
❌ Adopt everything just because it's recommended

---

## After Your First 30 Days

### Successful Adoption Indicators
✅ Onboarding time decreased (even by 1-2 hours)
✅ Deployments feel less stressful
✅ Team knows where documentation lives
✅ AI assistants (Claude Code, ChatGPT) get oriented faster
✅ PRs have consistent structure

### Mixed Results Indicators
🟡 Some modules helping, others not
🟡 Team split on whether it's worth it
🟡 Documentation exists but not maintained

**Action**: Request Month 1 check-in with consultant (see [CONSULTANT_PROMPT.md](./CONSULTANT_PROMPT.md) ongoing coaching section)

### Unsuccessful Adoption Indicators
❌ Team actively resisting new processes
❌ Everything taking longer than before
❌ Documentation abandoned after Week 2
❌ No measurable improvement in pain points

**Action**: Stop. Keep CLAUDE.md if useful, drop the rest. Try again in 6 months or try different approach.

---

## Getting More Help

### If You Get Stuck During Adoption
1. Re-run consultant with "We're stuck on [X]" as context
2. Consultant can troubleshoot and adapt plan
3. Check [Mid-Project Adoption Guide](../MID_PROJECT_ADOPTION_GUIDE.md#common-pitfalls) for common issues

### If You Want to Expand Adoption Later
1. Request Month 2-3 check-in with consultant
2. Consultant can recommend additional modules
3. Can upgrade from Minimum → Standard → Full

### If Methodology Isn't Working
1. Don't force it
2. Keep what works (usually CLAUDE.md + docs structure)
3. Drop what doesn't
4. Modular adoption means partial adoption is VALID

---

## Example Output

Here's what a consultation produces (see [EXAMPLE_SESSION.md](./EXAMPLE_SESSION.md) for full walkthrough):

```markdown
# Customized Adoption Plan for Acme Inc. Project

**Team**: 3 developers (2 senior, 1 junior)
**Project**: 6 months old, 15,000 LOC, early production users
**Primary Pain Points**:
1. Onboarding takes 5+ days (junior developer struggled)
2. Deployments cause anxiety (manual checklist)
3. Documentation outdated (README hasn't been touched in 3 months)

**Recommended Adoption**: Standard (1 week + 10% ongoing)

## 30-Day Plan

### Week 1: Foundation (1 day concentrated work)
**Goal**: Make project navigable and reduce deployment anxiety

**Tasks**:
- [ ] Create CLAUDE.md describing current state (2 hours)
  - Document actual workflows, not ideal
  - Mark outdated docs with warnings
  - Include "Known Issues" section
- [ ] Add PR template (15 mins)
  - Copy from templates/PR_TEMPLATE.md
  - Customize checklist for your deploy steps
- [ ] Create docs/development/workflows.md (1 hour)
  - Document current git flow
  - Document current deploy process
  - Document current testing approach
- [ ] Tag current commit as baseline (1 min)

**Validation Criteria**:
✅ New AI assistant sessions start with "read CLAUDE.md"
✅ PRs follow template structure
✅ Team references workflows.md at least once

### Week 2-4: Process Standardization
...
```

---

## FAQ

**Q: Do we have to answer all the consultant's questions?**
A: No, you can skip questions that aren't relevant. But the more you answer, the better the recommendations.

**Q: Can we run the consultation multiple times?**
A: Yes! Run it again after 1 month to adapt the plan, or run it for different teams/projects.

**Q: What if we disagree with the recommendations?**
A: Challenge them! The consultant will explain the reasoning. If you're still not convinced, don't follow that recommendation.

**Q: Can we just read the main manual instead?**
A: Yes, if you know what you need. The consultant is for teams who DON'T know what they need yet.

**Q: Is this consultation free?**
A: Yes, it's part of the methodology. You just need Claude Code running (which you probably already have).

---

## Next Steps

1. **Ready to start?** → Copy [CONSULTANT_PROMPT.md](./CONSULTANT_PROMPT.md) into Claude Code
2. **Want to see an example first?** → Read [EXAMPLE_SESSION.md](./EXAMPLE_SESSION.md)
3. **Not sure about consultant?** → Go back to [README](../README.md) and pick a quick start path

---

**Remember**: The consultant is a tool, not a requirement. If you already know what you need, skip straight to the [main manual](../UNIFIED_DEVELOPMENT_METHODOLOGY.md).
