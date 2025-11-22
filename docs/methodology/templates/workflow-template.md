# Workflow Template

**Purpose**: Document new or improved development processes discovered during checkpoints

**Usage**: Fill in all `[PLACEHOLDER]` fields with checkpoint-specific details

---

## Workflow: [NAME]

**Added**: Checkpoint [N] ([YYYY-MM-DD])

**Category**: [Database / Security / Documentation / Testing / Deployment / Communication]

**Status**: ✅ Active / ⚠️ Experimental / 🔴 Deprecated

---

### Purpose

[Why this workflow exists - what problem does it solve?]

**Pain Points Addressed**:
- [Pain point 1 that this workflow eliminates]
- [Pain point 2]
- [Pain point 3]

**Benefits**:
- ✅ [Benefit 1]
- ✅ [Benefit 2]
- ✅ [Benefit 3]

---

### When to Use

**Trigger**: [What event or situation initiates this workflow]

**Frequency**: [How often this workflow runs]
- Options: Every checkpoint / Weekly / Monthly / As needed / On specific events

**Prerequisites**:
- [ ] [Prerequisite 1]
- [ ] [Prerequisite 2]
- [ ] [Prerequisite 3]

---

### Workflow Steps

#### Step 1: [ACTION NAME]

**Who**: [AI / User / Both]

**What**: [Detailed description of this step]

**How**:
```bash
# Command or process
[command or action]
```

**Output**: [What this step produces]

**Time**: [X minutes]

---

#### Step 2: [ACTION NAME]

**Who**: [AI / User / Both]

**What**: [Description]

**How**:
```bash
[command or action]
```

**Output**: [What is produced]

**Time**: [X minutes]

---

#### [Repeat for all steps]

---

### Step-by-Step Example

**Scenario**: [Concrete example of this workflow in action]

```bash
# Step 1: [Action]
$ [command]
[output]

# Step 2: [Action]
$ [command]
[output]

# [Continue for all steps]
```

**Total Time**: [N minutes from start to finish]

---

### Success Criteria

**How do you know this workflow worked?**

- [ ] [Success criterion 1]
- [ ] [Success criterion 2]
- [ ] [Success criterion 3]

**Validation Command**:
```bash
# Command to verify workflow success
[validation command]
```

**Expected Output**:
```
[What success looks like]
```

---

### Failure Modes

**What can go wrong?**

#### Failure Mode 1: [NAME]

**Symptom**: [How you know this failed]

**Cause**: [Why this happens]

**Fix**: [How to resolve]

**Prevention**: [How to avoid]

---

#### Failure Mode 2: [NAME]

**Symptom**: [How you know]

**Cause**: [Why]

**Fix**: [How to resolve]

**Prevention**: [How to avoid]

---

### Integration Points

**Where does this fit in existing workflows?**

**Before this workflow**:
[What should happen before this workflow starts]

**After this workflow**:
[What happens when this workflow completes]

**Integration with CLAUDE.md**:
[Where in CLAUDE.md workflow this should be documented]

**Integration with checkpoint completion**:
[When in checkpoint lifecycle this runs]

---

### Automation

**Can this be automated?**

[Yes / Partially / No]

**Automation approach**:
```bash
# Script to automate this workflow
[script or command]
```

**Manual steps remaining**:
- [Step 1 that still requires human judgment]
- [Step 2]

**Future automation opportunities**:
- [Future enhancement 1]
- [Future enhancement 2]

---

### Metrics

**Time Investment**:
- Setup (one-time): [X hours]
- Per use: [Y minutes]

**ROI**:
- Time saved per checkpoint: [Z minutes]
- Errors prevented: [N%]
- Payback period: [After X uses]

**Example**: 1 hour setup + 5 min per use vs 30 min manual = Pays off after 2 checkpoints

---

### Variations

**Alternative approaches**:

#### Variation 1: [NAME]

**When to use**: [Scenario where this variation is better]

**Differences**: [How this differs from main workflow]

**Trade-offs**: [Pros and cons]

---

#### Variation 2: [NAME]

**When to use**: [Scenario]

**Differences**: [Changes]

**Trade-offs**: [Pros/cons]

---

### Common Mistakes

**Pitfall 1**: [Common mistake when using this workflow]

**How to avoid**: [Prevention]

---

**Pitfall 2**: [Another common mistake]

**How to avoid**: [Prevention]

---

### Related Patterns

**Workflows this depends on**:
- [Prerequisite workflow 1]
- [Prerequisite workflow 2]

**Workflows that depend on this**:
- [Downstream workflow 1]
- [Downstream workflow 2]

**Related case studies**:
- [Link to case study where this workflow was created]

**Related pitfalls**:
- [Link to pitfall this workflow prevents]

---

## Template Metadata

**Template Version**: 1.0
**Created**: 2025-11-22
**Token Cost**: ~75-125 words to fill
**Fill Time**: ~7 minutes

---

## Example Usage

For a real example of this template filled out, see:
- [Checkpoint 10: Pre-Checkpoint Cleanup Audit](../learnings/checkpoint-10-doc-sync.md#pre-checkpoint-audit)
- [Checkpoint 9: Checkpoint Retrospective](../learnings/checkpoint-9-rls-migrations.md#retrospective-pattern)
- [Checkpoint 10: Documentation Sync (BLOCKING)](../learnings/checkpoint-10-doc-sync.md#blocking-requirement)
