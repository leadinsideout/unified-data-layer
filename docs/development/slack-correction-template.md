# Slack Correction Message Template

**Purpose**: Template for posting correction messages when automated Slack notifications contain errors

**Last Updated**: 2025-11-19

---

## When to Use This Template

Use this template when:
- Automated Slack notification contains incorrect information
- Phase/checkpoint numbering is wrong
- Message was sent to wrong channel
- Content is too vague or misleading

**Process**:
1. Identify the error in the notification
2. Analyze root cause (workflow trigger, logic, content)
3. Draft correction message using this template
4. Post to affected channel(s)
5. Fix the workflow to prevent future occurrences
6. Document the fix and verification steps

---

## Template Structure

```markdown
# Slack Correction Message: [Version Number]

**Date**: YYYY-MM-DD
**Original Message**: [Brief description of incorrect message]
**Channel**: [Slack channel that received incorrect message]
**Root Cause**: [Brief explanation of what went wrong]

---

## Correction Message (Markdown)

**Title**: Correction to Previous [Version] Notification

**Actual Status**:
- [Correct phase/checkpoint information]
- [Correct project status]

**What Was Actually Delivered**:
- [Specific feature/capability name]
- [Key metrics or achievements]
- [Production readiness status]

**Why the Error Occurred**:
[Brief explanation of workflow issue]

**What We've Fixed**:
- [Workflow changes made]
- [Verification steps added]

**Phase Progress**:
✅ Phase 1: [Description]
✅ Phase 2: [Description]
🔄 Phase X: [Description] (IN PROGRESS)
  ✅ Checkpoint Y: [Name] ← WE ARE HERE
  ⏸️ Checkpoint Y+1: [Name]
  ⏸️ Checkpoint Y+2: [Name]
⏸️ Phase X+1: [Description]

---

## Slack Block Kit JSON Payload

```json
{
  "text": "Correction: [Brief summary of correction]",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "⚠️ Correction to Previous [Version] Notification"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "The earlier automated notification incorrectly stated [WRONG INFO]. This was an error in our workflow."
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Actual Status:*\\n[Correct info]"
        },
        {
          "type": "mrkdwn",
          "text": "*Phase Progress:*\\n[X/Y] checkpoints complete"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*What Was Delivered:*\\n✅ **[Feature Name]**\\n  • [Detail 1]\\n  • [Detail 2]\\n  • [Detail 3]"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Phase Progress:*\\n✅ Phase 1: [Name]\\n✅ Phase 2: [Name]\\n🔄 *Phase X: [Name] (IN PROGRESS)*\\n  ✅ Checkpoint Y: [Name] ← *WE ARE HERE*\\n  ⏸️ Checkpoint Y+1: [Name]\\n  ⏸️ Checkpoint Y+2: [Name]\\n⏸️ Phase X+1: [Name]"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "We've fixed the workflow to prevent this in future notifications. Apologies for any confusion!"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Full Results"
          },
          "url": "[GitHub URL to checkpoint results doc]"
        }
      ]
    }
  ]
}
```

---

## Example: v0.8.0 Correction

See [slack-correction-message-v080.md](./slack-correction-message-v080.md) and [slack-correction-payload.json](./slack-correction-payload.json) for a real-world example of using this template.

**Error**: v0.8.0 release notification incorrectly stated "Phase 8 Complete"
**Correction**: v0.8.0 is Checkpoint 8 within Phase 3 (not Phase 8)

---

## Posting the Correction

### Option 1: Using curl
```bash
# Set your webhook URL
WEBHOOK_URL="[Your Slack webhook URL]"

# Post the correction using the JSON payload file
curl -X POST -H 'Content-type: application/json' \
  --data @docs/development/slack-correction-payload.json \
  "$WEBHOOK_URL"
```

### Option 2: Using Slack API
1. Go to your Slack workspace
2. Navigate to the affected channel
3. Manually post the message using the markdown format
4. Optionally attach the JSON as a file for reference

### Option 3: GitHub Actions Manual Trigger
If you have a workflow_dispatch trigger set up:
```bash
# Trigger correction workflow (if exists)
gh workflow run slack-correction.yml \
  -f version="v0.8.0" \
  -f channel="#team_ai"
```

---

## Verification Steps

After posting correction:
- [ ] Verify message appeared in correct channel
- [ ] Check that all links work correctly
- [ ] Confirm formatting renders properly (bold, bullets, etc.)
- [ ] Get acknowledgment from team that correction was received
- [ ] Document the incident in relevant checkpoint docs
- [ ] Update CLAUDE.md with new verification steps (if needed)

---

## Prevention Checklist

To prevent similar errors in the future:
- [ ] Fix GitHub Actions workflow trigger patterns
- [ ] Update workflow logic (case statements, fallbacks)
- [ ] Add checkpoint-to-phase mapping in workflow
- [ ] Test workflow with sample tags before pushing
- [ ] Document the fix in workflow comments
- [ ] Add verification steps to CLAUDE.md
- [ ] Update checkpoint-phase-mapping.md if needed

---

## Related Documentation

- [Checkpoint-Phase Mapping](./checkpoint-phase-mapping.md) - Authoritative mapping reference
- [Slack Setup Guide](./slack-setup-guide.md) - Slack integration configuration
- [Workflow Tracker](./workflow-tracker.md) - Automation milestones
- [CLAUDE.md](../../CLAUDE.md) - AI assistant verification steps

---

**Notes**:
- Keep correction messages professional and concise
- Focus on facts, not blame
- Explain what was fixed to prevent future occurrences
- Always link to full documentation for details
- Update this template if you discover better patterns
