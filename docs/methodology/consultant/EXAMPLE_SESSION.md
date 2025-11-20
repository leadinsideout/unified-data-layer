# Methodology Consultant - Example Session

**Complete walkthrough of a real consultation**

Version 1.0 | November 19, 2025

---

## Scenario

**Team**: Acme Inc. Internal Tools Team
**Project**: "Customer Portal" - Internal dashboard for support team
**Participants**:
- Alex (Senior Developer, 5 years experience)
- Jordan (Product Manager, 2 years experience)

**Context**:
- Project is 6 months old
- 3 developers total (Alex + 2 others)
- ~15,000 lines of code (React + Node.js)
- 20 early production users (internal support team)
- Monthly releases, manual deployment
- No formal documentation besides README

---

## Session Transcript

### Phase 1: Current State Assessment (8 minutes)

**Consultant**: Hi! I'm here to help you figure out if and how the Unified Development Methodology might help your team. This will take about 30-45 minutes. I'll ask questions about your current state, where you want to go, and what pain points you're experiencing. Then I'll create a customized adoption plan. Sound good?

**Alex**: Sounds good. We're here because our onboarding is taking too long and deployments are stressful.

**Consultant**: Got it. I'll dig into those pain points in a bit. First, let me understand your current situation.

**Consultant**: How old is your project?

**Alex**: About 6 months. We launched to internal users 2 months ago.

**Consultant**: How many developers on the team?

**Alex**: Three. Me (senior), and two mid-level developers.

**Jordan**: Plus me as product manager, but I don't code.

**Consultant**: Perfect. How big is the codebase?

**Alex**: Maybe 15,000 lines? Mostly TypeScript - React frontend, Node.js backend.

**Consultant**: What's your current git workflow?

**Alex**: Uh... everyone makes branches, opens PRs, and I review them. Then we merge to main.

**Consultant**: Do you have branch protection? Required reviews?

**Alex**: No branch protection. Reviews are sort of informal - sometimes I catch them, sometimes they go straight in.

**Consultant**: How often do you deploy?

**Alex**: Once a month, usually. Sometimes more if there's a bug.

**Jordan**: And we usually delay releases because we're not sure if everything's ready.

**Consultant**: How do you know if something is ready to deploy?

**Alex**: ...we don't have a formal process. I usually just ask the team "is everything done?" in Slack.

**Consultant**: What does your deployment process look like?

**Alex**: I have a checklist in a Google Doc. Run tests, build, push to production, smoke test the UI, notify support team in Slack.

**Consultant**: How long does that take?

**Alex**: Maybe 30 minutes? But I'm always nervous I'll forget something.

**Consultant**: Do you use AI assistants like Claude Code or ChatGPT?

**Alex**: Yeah, all the time. Claude Code especially for implementing features.

**Jordan**: I use ChatGPT for writing documentation.

**Consultant**: Do the AI assistants ever get confused about your project structure?

**Alex**: Oh yeah, constantly. I spend the first 10 minutes of every session explaining where things are.

**Consultant**: Got it. Let me summarize what I'm hearing:

**Project Profile**:
- **Maturity**: Early stage (6 months, 2 months in production)
- **Team**: 3 developers + 1 PM
- **Codebase**: ~15,000 LOC (TypeScript/React/Node)
- **Users**: 20 internal users
- **Deployment**: Manual, monthly, ~30 mins, checklist-dependent
- **Git**: Informal branching, no protection, inconsistent reviews
- **AI Usage**: High (Claude Code, ChatGPT)
- **Documentation**: Minimal (README only)

**Assessment**: Mid-project, early-stage scenario. Good candidate for methodology adoption.

Does that sound right?

**Alex**: Yeah, that's us.

**Jordan**: Yep.

---

### Phase 2: Vision Clarification (6 minutes)

**Consultant**: Now let me understand where you want to go. What does "production-ready" mean for this project?

**Jordan**: Good question. I'd say... support team can use it confidently without bugging us constantly.

**Alex**: And we can deploy without anxiety. Right now I triple-check everything.

**Consultant**: What would "deploy without anxiety" look like practically?

**Alex**: Uh... I guess automated checks? Or at least a process I trust?

**Consultant**: When you say "process you trust," what would that include?

**Alex**: Tests passing, documentation updated, someone else reviewing the code, knowing we can roll back easily if something breaks.

**Consultant**: How often would you WANT to deploy if you had that confidence?

**Alex**: Weekly, maybe? Or every two weeks.

**Jordan**: That would be huge for us. Support team is always asking for features.

**Consultant**: What would "good documentation" look like for your project?

**Jordan**: Someone new could understand the project in a day instead of a week.

**Alex**: And AI assistants wouldn't need a 10-minute orientation every time.

**Consultant**: What happens now when someone new joins?

**Alex**: I sit with them for 2-3 days and walk them through everything. We hired a junior developer last month and it took 5 days before they could make their first PR.

**Consultant**: What does success look like for this project in 6 months?

**Jordan**: Support team is fully self-service. We're just adding features and fixing bugs, not firefighting.

**Alex**: And we're shipping features faster. Right now everything feels slow.

**Consultant**: What does "slow" mean quantitatively?

**Alex**: A feature that should take 3 days takes a week because we're constantly context-switching and nobody knows what's "done."

**Consultant**: Let me summarize your vision:

**Desired State (6 months)**:
- **Deployment**: Weekly/bi-weekly, low anxiety, automated checks
- **Onboarding**: New developers productive in 1 day (vs 5 days now)
- **AI Assistants**: Self-orienting (no 10-minute explanations)
- **Feature Velocity**: 3-day features take 3 days (not 7)
- **Team Focus**: Building features, not firefighting
- **Documentation**: Complete, maintained, navigable

**Gaps**:
- No deployment confidence → Need automation + process
- Slow onboarding → Need documentation + navigation
- Unclear "done" criteria → Need validation standards
- AI confusion → Need AI-friendly docs (CLAUDE.md)

Does that capture it?

**Alex**: Exactly.

**Jordan**: Yeah, that's the dream.

---

### Phase 3: Pain Discovery (18 minutes)

**Consultant**: Now let's dig into the pain points you mentioned. I'm going to ask you to tell me stories about specific incidents. This helps me understand what's actually happening vs. what you think is happening.

**Consultant**: Let's start with deployment anxiety. Walk me through your LAST deployment. What happened?

**Alex**: Last deployment was... two weeks ago. I pulled main, ran the build, ran tests—two tests failed. Turned out someone had committed broken code.

**Consultant**: How did broken code get to main?

**Alex**: The other developer merged their own PR without review. I was on vacation.

**Consultant**: So no required reviews. What happened next?

**Alex**: I fixed the tests, re-ran the build, pushed to production. Then I manually tested the login flow, the search feature, the export button... took about 40 minutes.

**Consultant**: Did you have a checklist for what to test?

**Alex**: Kind of. I have a Google Doc but I didn't follow it exactly. I just clicked around until it felt right.

**Consultant**: What would have happened if you missed something?

**Alex**: Support team would Slack us immediately. That's happened before.

**Consultant**: How often does that happen?

**Alex**: Maybe 1 in 4 deployments? Not terrible, but not great.

**Consultant**: What happens when you need to roll back?

**Alex**: Uh... we've never done that. If something breaks, we just hotfix it forward.

**Consultant**: Why not roll back?

**Alex**: I guess we don't have a formal process? We don't tag releases, so I'd have to figure out which commit to roll back to.

**Consultant**: **Pain Signals Detected**:
- ✅ Broken code reaches main (no required reviews)
- ✅ Tests fail at deploy time (not in CI)
- ✅ Manual checklist exists but not followed (not automated)
- ✅ No rollback strategy (no git tags)
- ✅ 1 in 4 deployments have issues caught by users
- ✅ Deployment takes 30-40 minutes manual work

Let's move to onboarding. You mentioned it took 5 days for your junior developer. Walk me through Day 1.

**Alex**: Day 1, I sat with them and explained the project structure. "Frontend is in /src/client, backend is in /src/server, database schema is in /db/migrations..." Took about 2 hours.

**Consultant**: Did they have documentation to reference later?

**Alex**: Just the README. It has install instructions but not much else.

**Consultant**: What happened Day 2?

**Alex**: They tried to implement a small feature. Got confused about where components live, how to make API calls, what the authentication flow was. I paired with them for 3 hours.

**Consultant**: Could Claude Code have helped them?

**Alex**: Maybe? But Claude Code was also confused. It kept suggesting file paths that didn't exist.

**Consultant**: What would have helped Day 1 go smoother?

**Jordan**: A map. Like "here's where everything is, here's how it works, here's who to ask for what."

**Alex**: Yeah, and examples. Our README doesn't have any example code.

**Consultant**: **Pain Signals Detected**:
- ✅ No project navigation guide (2 hours manual orientation)
- ✅ Minimal documentation (README only)
- ✅ No code examples or patterns documented
- ✅ AI assistants can't self-orient (suggest wrong paths)
- ✅ Senior developer spends 5+ hours pairing (opportunity cost)

Let's talk about "unclear done criteria." You said nobody knows when a feature is done. Tell me about a recent feature.

**Jordan**: Last feature was "export to CSV." Developer said it was done, I tested it, it worked. Then we deployed and support team said "wait, it doesn't export the date column."

**Consultant**: Why was the date column missing?

**Alex**: Developer didn't know that was a requirement. I didn't catch it in review. Jordan assumed it was obvious.

**Jordan**: It WAS obvious! CSV export should export all columns.

**Alex**: Sure, but there was no spec. Jordan just said "add CSV export" in the issue.

**Consultant**: How do you currently define what "done" means?

**Alex**: Uh... tests pass, PR is approved, code works locally?

**Jordan**: But that doesn't include "meets requirements" apparently.

**Consultant**: Do you have a PR template? Checklist for reviewers?

**Alex**: No. Everyone just writes their own PR description.

**Consultant**: **Pain Signals Detected**:
- ✅ No clear acceptance criteria (mismatched expectations)
- ✅ No PR template (inconsistent code review)
- ✅ No testing checklist (incomplete QA)
- ✅ Features "done" but don't meet requirements

One more thing: you mentioned features taking 7 days instead of 3. Why the slowdown?

**Alex**: Context switching. I'll start a feature, get pulled into a bug, forget where I was. Or I'll finish a feature but realize I don't remember what the original goal was.

**Consultant**: Do you document work-in-progress?

**Alex**: Not really. I have TODOs in my code sometimes.

**Consultant**: When you come back to a feature after 2 days away, how do you remember context?

**Alex**: I read the code and try to remember. Sometimes I ask Jordan what the goal was.

**Jordan**: And sometimes I don't remember either because it was 3 weeks ago.

**Consultant**: Do you have milestones or checkpoints?

**Alex**: We have monthly releases. But those are more like "dump whatever's done into production."

**Consultant**: **Pain Signals Detected**:
- ✅ No work-in-progress documentation (context loss)
- ✅ No milestone/checkpoint structure (unclear progress)
- ✅ No clear feature boundaries ("done" = "whatever's finished")

Let me summarize the pain points I'm hearing:

**Pain Category 1: Deployment Confidence**
- Broken code reaches main (no required reviews)
- No automated testing in CI
- Manual deployment checklist not followed
- No rollback strategy (no git tags)
- 25% of deployments have issues

**Pain Category 2: Onboarding Speed**
- No project navigation guide (2-hour orientation)
- Minimal documentation (README only)
- AI assistants can't self-orient
- 5 days to first productive contribution

**Pain Category 3: Feature Velocity & Clarity**
- No acceptance criteria or PR templates
- No testing checklists
- Context loss from context switching
- Unclear "done" definition
- 3-day features take 7 days

**Pain Category 4: Team Communication**
- Manual Slack announcements for deploys
- Tribal knowledge not documented
- Misaligned expectations (PM vs dev)

Does that sound right? Anything I missed?

**Alex**: No, that's pretty much it. Seeing it written out is... depressing.

**Consultant**: Don't be! Most teams at your stage have these pain points. The good news is they're all solvable.

**Jordan**: How long will it take to fix?

**Consultant**: That's what we'll figure out next.

---

### Phase 4: Solution Mapping (12 minutes)

**Consultant**: Based on your pain points, here's how the methodology modules map to your problems:

**Your Pain Point → Methodology Module → Expected Value**

1. **AI assistants confused (10 min orientation)**
   → **Module 1: CLAUDE.md** (2-4 hours setup, zero ongoing)
   → **Value**: AI self-orients in 30 seconds. IMMEDIATE IMPACT.

2. **Onboarding takes 5 days**
   → **Module 7: Workflow Documentation** (2-4 hours setup)
   → **Value**: Onboarding drops to 1-2 days. HIGH IMPACT.

3. **Deployment anxiety (25% failure rate)**
   → **Module 2: Checkpoint Documentation** (30-60 mins each) + **Module 6: PR Template** (15 mins)
   → **Value**: Clear validation criteria, consistent code review. MEDIUM-HIGH IMPACT.

4. **Context loss (3-day → 7-day features)**
   → **Module 8: Checkpoint Planning** (4-6 hours)
   → **Value**: Clear milestones, less context switching. MEDIUM IMPACT.

5. **Broken code reaches main**
   → **Module 3: Conventional Commits** (1 hour setup) + Git branch protection
   → **Value**: Required reviews, automated checks. MEDIUM IMPACT.

6. **Manual Slack deployment announcements**
   → **Module 5: Slack Notifications** (2 hours)
   → **Value**: Automated team notifications. LOW-MEDIUM IMPACT.

7. **Manual deployment checklist**
   → **Module 4: Automated Changelog** (30 mins) + CI/CD
   → **Value**: Automated deployment confidence. MEDIUM IMPACT (but requires commit standardization first).

**Modules NOT Relevant for You**:
- ❌ Phase-based planning (you're mid-project, not greenfield)
- ❌ Comprehensive documentation rewrite (too disruptive, use living docs approach)

**Recommended Adoption Level**: Standard (1 week setup + 10% ongoing)

**Why Standard and not Full?**
- You have bandwidth (3 devs + PM)
- You have clear pain points (methodology directly addresses them)
- You use AI assistants heavily (methodology is built for this)
- But you're mid-project (full adoption would be too disruptive)

**Why Standard and not Minimum Viable?**
- Minimum viable only addresses AI confusion (Module 1: CLAUDE.md)
- Your pain points are broader (onboarding, deployment, velocity)
- Standard adoption targets 80% of your pain with reasonable effort

Does this make sense? Any questions?

**Alex**: What's the time commitment?

**Consultant**: Week 1 is concentrated effort (1 full day). Then 2-3 hours per week ongoing for first month. After Month 1, it drops to maybe 30 minutes per week maintaining docs.

**Jordan**: What if we don't have a full day to dedicate Week 1?

**Consultant**: Then we can spread it out over 2 weeks. But I'd recommend blocking 4-6 hours to get the foundation in place, otherwise you'll lose momentum.

**Alex**: Which modules should we start with?

**Consultant**: I'd recommend this order based on your pain points:

**Week 1 (High Impact, Low Effort)**:
1. CLAUDE.md (2-4 hours) - Solves AI confusion, helps onboarding
2. PR template (15 mins) - Solves unclear "done" criteria
3. Workflow docs (2-4 hours) - Solves onboarding, tribal knowledge
4. Git branch protection (30 mins) - Prevents broken code reaching main

**Week 2-3 (Medium Impact, Medium Effort)**:
5. Checkpoint docs for last 3 milestones (2-3 hours total) - Clarifies project history
6. Conventional commits setup (1 hour) - Enables changelog automation later

**Week 4+ (Optional, Progressive Automation)**:
7. Slack notifications (2 hours) - Automates team communication
8. CI/CD setup (4-6 hours) - Automates testing + deployment

**Jordan**: What's the validation criteria? How do we know if this is working?

**Consultant**: Great question. Here's how you'll know:

**Week 1 Validation**:
- ✅ AI assistants start new sessions by reading CLAUDE.md (observable immediately)
- ✅ PRs follow template structure (check after first 2-3 PRs)
- ✅ New developer can find workflow docs without asking Alex (test with junior dev)

**Month 1 Validation**:
- ✅ Onboarding time drops from 5 days to 2-3 days (measure with next hire)
- ✅ Deployments feel less stressful (survey Alex: 1-10 scale)
- ✅ Context switching doesn't lose context (check checkpoint docs)
- ✅ 25% deployment failure rate drops to <10%

**Red Flags to Watch For**:
- ❌ Team actively resisting new processes
- ❌ Documentation created but not maintained after Week 2
- ❌ Everything taking longer (not just Week 1, but Week 3-4 too)
- ❌ No measurable improvement in pain points by Month 1

If you see red flags, we'll adapt the plan or stop. Sound reasonable?

**Alex**: Yeah, that makes sense.

**Jordan**: What if we want to stop after Month 1?

**Consultant**: That's totally fine. Methodology is modular - you can keep what works (usually CLAUDE.md + docs structure) and drop the rest. Partial adoption is a valid outcome.

**Alex**: Okay, I'm in. What's the plan?

---

### Plan Creation (5 minutes)

**Consultant**: Here's your customized 30-day adoption plan:

---

## 30-Day Adoption Plan for Acme Inc. Customer Portal

**Team**: 3 developers + 1 PM
**Project**: 6 months old, 15K LOC, early production
**Adoption Level**: Standard
**Estimated Time**: 1 day setup (Week 1) + 2-3 hours/week ongoing

---

### Week 1: Foundation (Day 1 concentrated effort)

**Goal**: Make project navigable, reduce deployment anxiety, improve onboarding

**Day 1 (4-6 hours total)**:

**Task 1: Create CLAUDE.md** (2-4 hours)
- Copy template from `docs/methodology/templates/CLAUDE_TEMPLATE.md`
- Document ACTUAL project structure (not ideal):
  - Frontend: `/src/client`
  - Backend: `/src/server`
  - Database: `/db/migrations`
- Document current workflows:
  - Git: "Everyone makes branches, informal reviews"
  - Deploy: "Monthly, manual checklist, Alex runs it"
  - Testing: "Manual, no E2E checklist yet"
- Add "Known Issues" section:
  - No branch protection
  - 25% deployment failure rate
  - Context switching causes slowdown
- Add navigation map for AI assistants
- **Assignee**: Alex (with Jordan input)
- **Validation**: Claude Code reads CLAUDE.md and knows where components live

**Task 2: Add PR Template** (15 minutes)
- Copy template from `docs/methodology/templates/PR_TEMPLATE.md`
- Customize checklist:
  - [ ] Feature meets acceptance criteria (from issue)
  - [ ] Tests written and passing
  - [ ] Tested locally
  - [ ] No console errors
  - [ ] Documentation updated (if needed)
  - [ ] Ready for production deploy
- Save as `.github/pull_request_template.md`
- **Assignee**: Alex
- **Validation**: Next PR automatically uses template

**Task 3: Document Workflows** (2-4 hours)
- Create `docs/development/workflows.md`
- Document:
  - Git workflow (branch naming, PR process, review expectations)
  - Deployment process (step-by-step, including smoke tests)
  - Testing approach (what to test before merging)
  - Code review checklist (what reviewers should check)
- **Assignee**: Alex writes, Jordan reviews
- **Validation**: Junior developer can follow deployment process using only docs

**Task 4: Git Branch Protection** (30 minutes)
- GitHub Settings → Branches → Add rule for `main`:
  - Require pull request before merging
  - Require 1 approval
  - Dismiss stale approvals when new commits pushed
- **Assignee**: Alex
- **Validation**: Can't push directly to main anymore

**Day 2 (Optional - 2 hours)**:

**Task 5: Create docs/ folder structure**
- Create folders:
  - `docs/development/` (workflows, patterns)
  - `docs/project/` (roadmap, vision)
  - `docs/checkpoints/` (milestone documentation)
- Create `docs/README.md` as documentation index
- **Assignee**: Jordan
- **Validation**: Docs are organized and discoverable

**Task 6: Tag current state as baseline**
- Tag current commit: `git tag v0.6.0-baseline`
- Push tag: `git push origin v0.6.0-baseline`
- **Assignee**: Alex
- **Validation**: Rollback point exists

---

### Week 2-3: Process Standardization (2-3 hours/week)

**Goal**: Standardize git workflow, clarify "done" criteria

**Task 7: Retroactive Checkpoint Documentation** (2-3 hours total)
- Document last 3 major milestones:
  - Initial launch (4 months ago)
  - Internal beta release (2 months ago)
  - Current state (baseline tag)
- For each milestone:
  - What was delivered?
  - What worked? What didn't?
  - Known issues at that point?
- Save as `docs/checkpoints/checkpoint-1.md`, `checkpoint-2.md`, `checkpoint-3.md`
- **Assignee**: Alex + Jordan
- **Validation**: Project history is documented

**Task 8: Conventional Commits Setup** (1 hour)
- Install commitlint: `npm install --save-dev @commitlint/cli @commitlint/config-conventional`
- Copy config: `docs/methodology/templates/commitlintrc.json` → `.commitlintrc.json`
- Add Husky hook (pre-commit validation)
- Run in **warning mode** for 2 weeks (don't block commits yet)
- **Assignee**: Alex
- **Validation**: Commit messages follow `feat:`, `fix:`, `docs:` format

**Task 9: Team Training** (1 hour meeting)
- Walk team through new processes:
  - CLAUDE.md (how AI assistants use it)
  - PR template (what each section means)
  - Workflows docs (where to find answers)
  - Conventional commits (why and how)
- Answer questions, address concerns
- **Assignee**: Alex leads, Jordan supports
- **Validation**: Team understands and bought in

---

### Week 4: Validation & Adjustment (1-2 hours)

**Goal**: Assess if methodology is helping or hurting

**Task 10: Validation Survey** (30 minutes)
- Survey team (1-10 scale):
  - "Do deployments feel less stressful?"
  - "Is onboarding documentation helpful?"
  - "Are PRs clearer and more consistent?"
  - "Is this process helping or hurting velocity?"
- Review answers with team
- **Assignee**: Jordan
- **Validation**: Decide continue/adapt/stop

**Task 11: Adapt Plan if Needed** (1 hour)
- If helping: Continue to Month 2 tasks (Slack automation, CI/CD)
- If mixed: Keep what works, drop what doesn't
- If not helping: Stop, keep CLAUDE.md, drop the rest
- **Assignee**: Alex + Jordan
- **Validation**: Plan reflects team feedback

---

### Month 2+: Progressive Automation (Optional)

**Only proceed if Week 4 validation shows positive results**

**Task 12: Slack Notifications** (2 hours)
- Set up GitHub Actions for:
  - PR notifications (#dev channel)
  - Deployment notifications (#dev channel)
- Copy workflows from `docs/methodology/templates/github-workflows/`
- **Value**: Automated team communication
- **Assignee**: Alex

**Task 13: CI/CD Pipeline** (4-6 hours)
- Set up GitHub Actions for:
  - Automated testing on every PR
  - Automated deployment to staging
  - Manual approval for production deploy
- **Value**: Deployment confidence, reduced manual work
- **Assignee**: Alex

---

## Validation Criteria Summary

**Week 1 Success**:
- ✅ AI assistants self-orient using CLAUDE.md
- ✅ PRs follow template structure
- ✅ Workflows documented and referenced

**Month 1 Success**:
- ✅ Onboarding time: 5 days → 2-3 days
- ✅ Deployment stress: 8/10 → 4/10 (Alex's rating)
- ✅ Deployment failure rate: 25% → <10%
- ✅ Context switching: Documented checkpoints prevent context loss

**Red Flags (Stop/Adapt if Seen)**:
- ❌ Team resisting processes
- ❌ Documentation abandoned after Week 2
- ❌ Everything taking longer (Week 3-4)
- ❌ No measurable improvement by Month 1

---

## Next Steps

1. **Share this plan with team** (get buy-in)
2. **Schedule Day 1** (block 4-6 hours)
3. **Start with Task 1** (CLAUDE.md)
4. **Check in after Week 1** (validation survey)
5. **Adapt as needed** (methodology is modular)

---

**Optional Ongoing Coaching**:
- **Week 1 check-in**: If you get stuck on CLAUDE.md or workflows, paste this plan + your question back to Claude Code
- **Month 1 check-in**: Re-run consultant with "Month 1 validation results are [X]" to adapt plan
- **Month 2-3 check-in**: If expanding to automation, ask consultant for CI/CD recommendations

---

## Resources

- [CLAUDE.md Template](docs/methodology/templates/CLAUDE_TEMPLATE.md)
- [PR Template](docs/methodology/templates/PR_TEMPLATE.md)
- [Checkpoint Template](docs/methodology/templates/CHECKPOINT_TEMPLATE.md)
- [Main Methodology Manual](docs/methodology/UNIFIED_DEVELOPMENT_METHODOLOGY.md)
- [Mid-Project Adoption Guide](docs/methodology/MID_PROJECT_ADOPTION_GUIDE.md)

---

**Remember**: This plan is a starting point. Adapt it based on your team's feedback. Partial adoption is valid!

---

### Session Conclusion

**Consultant**: That's your customized plan. What questions do you have?

**Alex**: This looks doable. I'm a little worried about the time commitment for Week 1, but I can block a day.

**Jordan**: I like that we can stop after Month 1 if it's not working.

**Consultant**: Exactly. The methodology is modular - you can adopt pieces and drop others. The most important thing is Week 1 foundation (CLAUDE.md + workflows). Everything else is optional.

**Alex**: When should we start?

**Consultant**: Whenever you can block 4-6 hours. I'd recommend next week so it's fresh in your mind.

**Jordan**: Let's do it. I'll share this plan with the team.

**Consultant**: Sounds good! If you get stuck, paste this plan + your question back to Claude Code and I can help troubleshoot. Good luck!

---

## End of Session

**Total Time**: 43 minutes
**Output**: 30-day customized adoption plan
**Next Steps**: Team reviews plan, schedules Day 1, executes Week 1 tasks

---

## Key Takeaways from This Example

1. **Socratic questioning reveals hidden pain**: Alex didn't realize they had 25% deployment failure rate until consultant asked for stories
2. **Prioritization matters**: Consultant recommended CLAUDE.md first (high impact, low effort) over CI/CD (high effort, requires other modules first)
3. **Modular adoption reduces risk**: Team can stop after Month 1 if not helping
4. **Validation criteria prevent wasted effort**: Clear red flags to watch for
5. **Customization is key**: Generic advice wouldn't have addressed Acme Inc.'s specific pain points (onboarding, context loss, deployment anxiety)

---

## How This Differs from Generic Advice

**Generic Advice**:
- "Set up CI/CD"
- "Write better documentation"
- "Use git flow"

**Consultant's Customized Advice**:
- "Create CLAUDE.md first (2-4 hours) because your team uses AI assistants heavily and this will immediately reduce 10-minute orientation sessions"
- "Add PR template before conventional commits because your pain is 'unclear done criteria' not 'messy git history'"
- "Document workflows before automating them because junior developer needs to understand process before it's automated"

**Result**: Pain-first, effort-aware, sequenced recommendations instead of generic best practices.
