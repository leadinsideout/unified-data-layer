# Slack Integration Setup Guide

**Purpose**: Step-by-step guide to configure Slack notifications for the Unified Data Layer project

**Last Updated**: 2025-11-12

---

## Overview

This guide will help you set up automated Slack notifications for:
- ✅ Deployments (success/failure)
- ✅ Pull requests (opened/merged)
- ✅ Checkpoint completions
- ✅ Release announcements (to #team_ai channel)

**Estimated Time**: 15 minutes

---

## Prerequisites

- Admin access to your Slack workspace
- Admin access to the GitHub repository

---

## Step 1: Create Slack Incoming Webhook

### 1.1 Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter App Name: **"Unified Data Layer Bot"**
5. Select your workspace
6. Click **"Create App"**

### 1.2 Enable Incoming Webhooks

1. In the app settings, go to **"Features"** → **"Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. Select the channel where you want notifications (e.g., `#dev-updates` or `#unified-data-layer`)
5. Click **"Allow"**

### 1.3 Copy the Webhook URL

You'll see a webhook URL that looks like:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**⚠️ IMPORTANT**: Copy this URL - you'll need it in Step 2.

---

## Step 2: Add Webhook to GitHub Secrets

### 2.1 Navigate to GitHub Repository Settings

1. Go to your repository: https://github.com/leadinsideout/unified-data-layer
2. Click **"Settings"** (tab at the top)
3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**

### 2.2 Add the Primary Webhook Secret

1. Click **"New repository secret"**
2. Name: `SLACK_WEBHOOK_URL`
3. Value: Paste the webhook URL from Step 1.3
4. Click **"Add secret"**

### 2.3 Add Team Webhook (for Phase & Major Release Notifications)

**Purpose**: Phase and major release notifications go to the #team_ai channel to keep the broader team informed of significant milestones.

1. Go back to your Slack App settings: https://api.slack.com/apps
2. Select your app: **"Unified Data Layer Bot"**
3. Go to **"Features"** → **"Incoming Webhooks"**
4. Click **"Add New Webhook to Workspace"**
5. Select the **#team_ai** channel
6. Click **"Allow"**
7. Copy the new webhook URL

**Add to GitHub Secrets:**
1. Return to GitHub → Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `SLACK_TEAM_WEBHOOK_URL`
4. Value: Paste the #team_ai webhook URL
5. Click **"Add secret"**

**Result**: You should now have two secrets:
- `SLACK_WEBHOOK_URL` - For dev notifications (deployments, PRs, checkpoints)
- `SLACK_TEAM_WEBHOOK_URL` - For phase and major release announcements (#team_ai)

---

## Step 3: Verify Setup

### 3.1 Check Workflow Files

The following workflows are already configured:
- `.github/workflows/slack-deployment.yml` - Deployment notifications
- `.github/workflows/slack-pr.yml` - Pull request notifications
- `.github/workflows/slack-checkpoint.yml` - Checkpoint notifications
- `.github/workflows/slack-release.yml` - Phase and major release announcements (#team_ai)

### 3.2 Test the Integration

**Option A: Push a change** (easiest)
1. Make any code change
2. Commit and push to a branch
3. Create a pull request
4. You should see a Slack notification!

**Option B: Manual workflow trigger**
1. Go to **Actions** tab in GitHub
2. Select a workflow
3. Click **"Run workflow"**
4. Check Slack for notification

---

## Step 4: Customize (Optional)

### Change Notification Channel

To send notifications to a different channel:
1. Go back to your Slack App settings
2. **"Features"** → **"Incoming Webhooks"**
3. Click **"Add New Webhook to Workspace"**
4. Select the new channel
5. Update `SLACK_WEBHOOK_URL` secret in GitHub

### Adjust Notification Frequency

Edit the workflow YAML files in `.github/workflows/` to:
- Disable specific notifications (comment out jobs)
- Change trigger conditions (modify `on:` section)
- Adjust message formatting (modify `payload:` section)

---

## Troubleshooting

### "Workflow failed: secret not found"

**Problem**: GitHub can't find `SLACK_WEBHOOK_URL`

**Solution**:
1. Go to GitHub → Settings → Secrets and variables → Actions
2. Verify `SLACK_WEBHOOK_URL` exists
3. Re-add the secret if missing

### "No notifications in Slack"

**Problem**: Notifications not appearing in Slack channel

**Check**:
1. ✅ Webhook URL is correct in GitHub secrets
2. ✅ Slack app is installed in the workspace
3. ✅ Channel is correct
4. ✅ Workflow file has correct trigger (`on:` section)

**Debug**:
1. Go to GitHub → Actions tab
2. Check if workflow ran
3. Review workflow logs for errors

### "Invalid webhook URL"

**Problem**: Slack returns error when GitHub tries to send notification

**Solution**:
1. Regenerate webhook in Slack app settings
2. Update `SLACK_WEBHOOK_URL` secret in GitHub
3. Trigger workflow again

---

## Example Slack Messages

### Deployment Success
```
✅ Deployment Successful
━━━━━━━━━━━━━━━━━━━
Environment: Production
Branch: phase-1-checkpoint-2
Commit: 363539d
Deployed by: jjvega

Commit Message:
docs: add Checkpoint 2 status report

[View Deployment] [View Commit]
```

### Pull Request Opened
```
🔀 New Pull Request
━━━━━━━━━━━━━━━━━━━
feat(workflow): add automated changelog

Author: jjvega
Branch: feature/workflows → main

[Review PR]
```

### Checkpoint Complete
```
🎯 Checkpoint 2 Complete
━━━━━━━━━━━━━━━━━━━
Version: v0.2.0
Tag: v0.2.0-checkpoint-2

Changes:
- docs: add Checkpoint 2 status report
- fix: update server.js for Vercel serverless

[View Release] [View Checkpoint Docs]
```

### Phase Release Announcement (to #team_ai)
```
✨ Phase 4 Complete: Unified Data Layer v0.4.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A major milestone has been reached! Here's a summary of what's been accomplished.

Project: Unified Data Layer
Version: v0.4.0
Release Type: Development Phase Milestone
Released by: jjvega

Checkpoints Completed:
• docs: complete Checkpoint 4 documentation - schema migration
• docs: add Phase 2 implementation plan
• feat(api): update server to use Phase 2 schema

Key Features:
• feat(api): update server to use Phase 2 multi-type schema
• feat(db): implement multi-type data tables

[View Release Notes] [View CHANGELOG] [View Deployment]
```

### Major Release Announcement (to #team_ai)
```
🚀 Major Release: Unified Data Layer v1.0.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A major milestone has been reached! Here's a summary of what's been accomplished.

Project: Unified Data Layer
Version: v1.0.0
Release Type: Production-Ready Milestone
Released by: jjvega

Checkpoints Completed:
• docs: complete Checkpoint 1 documentation
• docs: complete Checkpoint 2 documentation
• docs: complete Checkpoint 3 documentation

Key Features:
• feat(api): add semantic search endpoint
• feat(db): implement vector similarity search
• feat(upload): add bulk upload functionality

[View Release Notes] [View CHANGELOG] [View Deployment]
```

**Note**: Phase releases (v0.X.0) and major releases (vX.0.0) trigger this notification. Checkpoint completions (v0.X.Y) do not notify the team channel.

---

## Workflow Details

### Deployment Notifications
- **Trigger**: Vercel deployment completes
- **When**: Every deployment to production or preview
- **File**: `.github/workflows/slack-deployment.yml`

### Pull Request Notifications
- **Trigger**: PR opened, merged, or reopened
- **When**: Any PR activity on the repository
- **File**: `.github/workflows/slack-pr.yml`

### Checkpoint Notifications
- **Trigger**: Git tag pushed matching `v*-checkpoint-*`
- **When**: After running `git push origin v0.X.0-checkpoint-Y`
- **File**: `.github/workflows/slack-checkpoint.yml`

### Phase & Major Release Announcements
- **Trigger**: Git tag pushed matching `v[0-9]+.[0-9]+.0` (phase: v0.1.0, v0.2.0; major: v1.0.0, v2.0.0)
- **When**: After completing a phase (`npm run release --release-as 0.X.0`) or major milestone (`npm run release --release-as X.0.0`)
- **Channel**: #team_ai (broader team visibility for significant milestones)
- **File**: `.github/workflows/slack-release.yml`
- **Content**: Comprehensive summary of checkpoints and key features since last phase/major release
- **Note**: Checkpoint completions (v0.X.Y) do NOT trigger team notifications - only phases and major releases

---

## Security Notes

### Webhook URL is a Secret

- ✅ Never commit webhook URL to code
- ✅ Store in GitHub Secrets only
- ✅ Rotate if accidentally exposed

### Webhook Permissions

- ✅ Can only POST to the specified channel
- ✅ Cannot read messages or channel history
- ✅ Cannot access other Slack workspace data

---

## Next Steps

After setup:
1. ✅ Test by creating a pull request
2. ✅ Verify notifications appear in Slack
3. ✅ Adjust notification format if desired
4. ✅ Add more workflows as needed (daily summaries, etc.)

---

## Support

**Questions?**
- Slack API Docs: https://api.slack.com/messaging/webhooks
- GitHub Actions Docs: https://docs.github.com/en/actions
- Project Issues: https://github.com/leadinsideout/unified-data-layer/issues

---

**Last Updated**: 2025-11-12
