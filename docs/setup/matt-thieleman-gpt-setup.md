# Matt Thieleman - Custom GPT Setup

**Created**: 2026-01-27
**Last Updated**: 2026-01-27
**Purpose**: Everything Matt needs to set up his Custom GPT coaching assistant

---

## Quick Reference

| Item | Value |
|------|-------|
| **API Endpoint** | `https://unified-data-layer.vercel.app` |
| **OpenAPI Schema URL** | `https://unified-data-layer.vercel.app/openapi.json` |
| **API Key** | `[Contact JJ for your API key]` |
| **Coach ID** | `f5fa94f1-c76b-41b6-b6ad-f8d18cfb4b39` |
| **Total Clients** | 9 (2 active, 7 inactive) |
| **Total Transcripts** | 29 |
| **Coach Profile Documents** | 3 (Coaching Framework, Marketing Voice, Style Profile) |

---

## Step 1: Create a New Custom GPT

1. Go to [ChatGPT](https://chatgpt.com) (requires ChatGPT Plus or Team)
2. Click **"Explore GPTs"** in the left sidebar
3. Click **"Create"** (top right)
4. Click the **"Configure"** tab

---

## Step 2: Basic Settings

**Name:**
```
Matt's Coaching Assistant
```

**Description:**
```
Search and analyze my coaching transcripts and profile documents to surface insights about client progress, patterns, and conversation themes.
```

---

## Step 3: Instructions (Copy Everything Below)

Copy everything between the `---START---` and `---END---` markers:

---START---
You are Matt Thieleman's coaching data assistant with access to his transcripts and profile documents.

## CRITICAL: Always Call listClients First
NEVER assume which clients exist. Call listClients at conversation start and when any client is mentioned.

## Available Tools

**listClients** - CALL FIRST. Returns client IDs and names. Use UUID for all subsequent calls.

**searchCoachingData** - Semantic search. Query: natural language. Types: transcript, coach_assessment. Threshold: 0.3 default (0.25 for exploratory). Limit: 10 (max 50).

**getClientTimeline** - Chronological history. Requires clientId UUID. Optional: start_date, end_date.

**getRecentTranscripts** - List by date (no search). Returns CLIENT COACHING only by default. Use session_type=all for all types.

**filteredSearch** - Complex filters: types, date_range, clients. Best for "Q1 2024 leadership transcripts."

## Data Types
- transcript = Session recordings (29 total)
- coach_assessment = MATT'S OWN profile documents (3 total)

## Workflow Patterns

**Client lookup:** listClients → find UUID → getClientTimeline or filteredSearch

**Latest session:** Use getClientTimeline - results are ordered newest-first. The FIRST item is the most recent.

**Session prep:** listClients → getClientTimeline → searchCoachingData for topics

**Matt's profile:** filteredSearch with types:["coach_assessment"], query:"coaching style" or "framework"

## Matt's Profile Documents (coach_assessment type)
- Coaching Evaluation & Development Framework
- Marketing & Content Voice Overview
- Personal Coaching Style Profile

When Matt asks about his coaching approach or style, search coach_assessment and return his actual profile content.

## ALWAYS Cite Sources
Every response using search data MUST end with:
```
---
**Sources:**
- [Title] (Date)
```
Use citation.title, citation.date_formatted from results.

## Privacy Rules
- Matt CAN see his own profile documents when HE asks
- NEVER infer client personality types not in data
- Never compare clients by name; anonymize patterns
- NEVER fabricate dates, quotes, or assessment results

## Interpreting Results
If search returns a session, the data IS COMPLETE:
- metadata.overview = session summary (if available)
- metadata.action_items = follow-ups discussed (if available)
- metadata.shorthand_bullet = quick summary (if available)

## Operational Style
Just act - search immediately when Matt mentions clients or topics. Only clarify for similar names or ambiguous requests.
---END---

---

## Step 4: Conversation Starters (Optional)

Add these suggested prompts:

```
Which clients do I have sessions with?
```

```
Help me prepare for my session with [client name]
```

```
What patterns do you see across my recent sessions?
```

```
Search for conversations about leadership challenges
```

---

## Step 5: Configure Actions (API Connection)

1. Scroll to **"Actions"** section
2. Click **"Create new action"**
3. Click **"Import from URL"**
4. Paste this URL:
   ```
   https://unified-data-layer.vercel.app/openapi.json
   ```
5. Click **"Import"**

---

## Step 6: Configure Authentication

1. Click the **"Authentication"** dropdown in the Actions section
2. Select **"API Key"**
3. Auth Type: **"Bearer"**
4. Enter your API key:
   ```
   [YOUR_API_KEY_HERE]
   ```

---

## Step 7: Privacy Settings (Important!)

1. Scroll down to **"Additional Settings"**
2. Under **"What can this GPT do?"**, make sure these are set:
   - ✅ **Use conversation data to improve model** → **OFF**
   - ✅ **Who can use this GPT** → **Only you**

This ensures your coaching data stays private and is NEVER used for AI training.

---

## Step 8: Test Your GPT

Click **"Save"** then try these test queries:

```
List all my clients
```

```
What did I discuss with Brian in our most recent session?
```

```
Search for conversations about goal setting
```

```
Show me my coaching style profile
```

---

## Your Data Summary

**Clients (9 total):**
- **Active (2):** Brian Falther, Kim Chayka
- **Inactive (7):** Justin Noordeloos, Lindsay Levin, Neil Marty, Tristan Brasseur, Ashley Pierce, Mallory Goodwin, Laurel Lieb

**Transcripts:** 29 sessions (June 2025 - November 2025)

**Profile Documents:**
- Coaching Evaluation & Development Framework (502 words)
- Marketing & Content Voice Overview (714 words)
- Personal Coaching Style Profile (834 words)

---

## Need Help?

**Questions?** Contact JJ Vega (InsideOut Leadership)

**API Issues?** Check the API health endpoint:
```
https://unified-data-layer.vercel.app/api/health
```

**API Key Issues?** Your key provides access only to YOUR data. Keep it secure!

---

## Advanced: Using the API Directly

You can also access your data via direct API calls:

**Search Example:**
```bash
curl -X POST https://unified-data-layer.vercel.app/api/search \
  -H "Authorization: Bearer [YOUR_API_KEY_HERE]" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "leadership challenges",
    "limit": 10
  }'
```

**List Clients:**
```bash
curl https://unified-data-layer.vercel.app/api/v2/clients \
  -H "Authorization: Bearer [YOUR_API_KEY_HERE]"
```

---

✅ **You're all set! Your coaching data is now searchable via Custom GPT.**
