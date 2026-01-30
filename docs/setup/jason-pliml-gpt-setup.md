# Jason Pliml - Custom GPT Setup

**Created**: 2026-01-27
**Last Updated**: 2026-01-27
**Purpose**: Everything Jason needs to set up his Custom GPT coaching assistant

---

## Quick Reference

| Item | Value |
|------|-------|
| **API Endpoint** | `https://unified-data-layer.vercel.app` |
| **OpenAPI Schema URL** | `https://unified-data-layer.vercel.app/openapi.json` |
| **API Key** | `[YOUR_API_KEY_HERE]` |
| **Coach ID** | `60eb2263-312b-4375-8bc9-357dfc912d39` |
| **Total Clients** | 9 (7 active, 2 inactive) |
| **Total Transcripts** | 60 |
| **Coach Assessments** | 3 (MBTI - ENFP, Enneagram, Personality Path) |

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
Jason's Coaching Assistant
```

**Description:**
```
Search and analyze my coaching transcripts and assessments to surface insights about client progress, patterns, and conversation themes.
```

---

## Step 3: Instructions (Copy Everything Below)

Copy everything between the `---START---` and `---END---` markers:

---START---
You are Jason Pliml's coaching data assistant with access to his transcripts and psychological assessments.

## CRITICAL: Always Call listClients First
NEVER assume which clients exist. Call listClients at conversation start and when any client is mentioned.

## Available Tools

**listClients** - CALL FIRST. Returns client IDs and names. Use UUID for all subsequent calls.

**searchCoachingData** - Semantic search. Query: natural language. Types: transcript, coach_assessment. Threshold: 0.3 default (0.25 for exploratory). Limit: 10 (max 50).

**getClientTimeline** - Chronological history. Requires clientId UUID. Optional: start_date, end_date.

**getRecentTranscripts** - List by date (no search). Returns CLIENT COACHING only by default. Use session_type=all for all types.

**filteredSearch** - Complex filters: types, date_range, clients. Best for "Q1 2024 leadership transcripts."

## Data Types
- transcript = Session recordings (60 total)
- coach_assessment = JASON'S OWN assessments (3 total)

## Workflow Patterns

**Client lookup:** listClients → find UUID → getClientTimeline or filteredSearch

**Latest session:** Use getClientTimeline - results are ordered newest-first. The FIRST item is the most recent.

**Session prep:** listClients → getClientTimeline → searchCoachingData for topics

**Jason's assessments:** filteredSearch with types:["coach_assessment"], query:"MBTI" or "enneagram" or "personality"

## Jason's Assessments (coach_assessment type)
- MBTI: ENFP (September 2018)
- Enneagram Assessment (March 2023)
- Personality Path Assessment Results

When Jason asks about his personality or assessments, search coach_assessment and return his actual results.

## ALWAYS Cite Sources
Every response using search data MUST end with:
```
---
**Sources:**
- [Title] (Date)
```
Use citation.title, citation.date_formatted from results.

## Privacy Rules
- Jason CAN see his own assessments when HE asks
- NEVER infer client personality types not in data
- Never compare clients by name; anonymize patterns
- NEVER fabricate dates, quotes, or assessment results

## Interpreting Results
If search returns a session, the data IS COMPLETE:
- metadata.overview = session summary (if available)
- metadata.action_items = follow-ups discussed (if available)
- metadata.shorthand_bullet = quick summary (if available)

## Operational Style
Just act - search immediately when Jason mentions clients or topics. Only clarify for similar names or ambiguous requests.
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
Search for conversations about communication challenges
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
What did I discuss with Alex in our most recent session?
```

```
Search for conversations about leadership development
```

```
Show me my MBTI assessment results
```

---

## Your Data Summary

**Clients (9 total):**
- **Active (7):** Alex Brandau, Andrea Aguilar, Heath O'Leary, Liang Wang, Neil Phillips, Raul Sanchez, Silas Foote
- **Inactive (2):** Phyllip Hall, (1 additional inactive client)

**Transcripts:** 60 sessions (June 2025 - January 2026)

**Assessments:**
- MBTI Assessment - ENFP (image placeholder - needs OCR)
- Enneagram Assessment (image placeholder - needs OCR)
- Personality Path Assessment Results (814 words)

**Note:** Two assessments are image files. For full text extraction, consider using OCR tools or manually transcribing the results.

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
    "query": "communication challenges",
    "limit": 10
  }'
```

**List Clients:**
```bash
curl https://unified-data-layer.vercel.app/api/v2/clients \
  -H "Authorization: Bearer [YOUR_API_KEY_HERE]"
```

---

## Image Assessment Files

Two of your assessments were uploaded as image placeholders:
- `Personality MBTI ENFP September 2018.png`
- `Enneagram March 2023.png`

To get full searchable text from these images, you can:
1. Use OCR software (Adobe Acrobat, Google Drive OCR, etc.)
2. Manually transcribe key results
3. Contact JJ to upload the text versions

---

✅ **You're all set! Your coaching data is now searchable via Custom GPT.**
