# Pitfall Template

**Purpose**: Document common mistakes discovered during checkpoints to prevent recurrence

**Usage**: Fill in all `[PLACEHOLDER]` fields with checkpoint-specific details

---

## Pitfall: [NAME]

**Added**: Checkpoint [N] ([YYYY-MM-DD])

**Category**: [Database / Security / Documentation / Testing / Deployment / Communication]

**Severity**: [Low / Medium / High / Critical]

---

### Symptom

[Observable problem that indicates this pitfall]

**What the user sees**:
- [Symptom 1]
- [Symptom 2]
- [Symptom 3]

**Why it's a problem**:
[Explain the negative impact - time wasted, bugs introduced, security risk, etc.]

---

### Example

**Context**: [Brief scenario from the checkpoint where this occurred]

**What happened**:
[Detailed description of the mistake]

**Result**:
[What went wrong - error messages, failures, delays, etc.]

---

### Root Cause

[Why does this pitfall happen?]

**Common triggers**:
- [Trigger 1: e.g., "Rushing to complete checkpoint"]
- [Trigger 2: e.g., "Assuming X without verifying"]
- [Trigger 3: e.g., "Not reading documentation"]

**Underlying issue**:
[The deeper reason - workflow gap, missing validation, unclear documentation, etc.]

---

### Fix

[Step-by-step solution to resolve this pitfall]

**Immediate fix**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Verification**:
```bash
# Command to verify the fix
[command]
```

**Expected result**:
```
[What success looks like]
```

---

### Prevention

[How to avoid this pitfall in future checkpoints]

**Proactive measures**:
- [ ] [Prevention step 1]
- [ ] [Prevention step 2]
- [ ] [Prevention step 3]

**Workflow integration**:
[Where in the checkpoint workflow should this check be added?]

**Example**: Add to pre-commit hook, add to checkpoint validation criteria, add to CLAUDE.md workflow

---

### ROI (Return on Investment)

**Cost of pitfall**:
- Time lost: [X hours/minutes]
- Bugs introduced: [N bugs]
- Rework required: [Y%]

**Cost of prevention**:
- Time to check: [X minutes]
- Automation setup: [Y hours one-time]

**ROI**: [X]x time savings (prevention cost vs pitfall cost)

**Example**: 5 min proactive check vs 30 min reactive fix = 6x ROI

---

### Related Patterns

**Similar pitfalls**:
- [Link to related pitfall 1]
- [Link to related pitfall 2]

**Prevention workflows**:
- [Link to workflow that prevents this]

**Case studies**:
- [Link to checkpoint where this occurred]

---

## Template Metadata

**Template Version**: 1.0
**Created**: 2025-11-22
**Token Cost**: ~50-100 words to fill
**Fill Time**: ~5 minutes

---

## Example Usage

For a real example of this template filled out, see:
- [Checkpoint 10: "We'll Update Docs Later" Pitfall](../learnings/checkpoint-10-doc-sync.md#docs-later-pitfall)
- [Checkpoint 9: Database Migration Without Local Testing](../learnings/checkpoint-9-rls-migrations.md#migration-pitfall)
