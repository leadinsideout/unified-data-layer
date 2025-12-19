# Ryan Vaughn - Custom GPT Setup

**Created**: 2025-12-09
**Purpose**: Everything Ryan needs to set up his Custom GPT coaching assistant

---

## Quick Reference

| Item | Value |
|------|-------|
| **API Endpoint** | `https://unified-data-layer.vercel.app` |
| **OpenAPI Schema URL** | `https://unified-data-layer.vercel.app/openapi.json` |
| **API Key** | [Contact JJ for your key - stored securely] |
| **Coach ID** | `9185bd98-a828-414f-b335-c607b4ac3d11` |
| **Total Clients** | 37 |
| **Total Transcripts** | 358 |
| **Total Assessments** | 37 |
| **Coaching Models** | 5 |

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
Ryan's Coaching Assistant
```

**Description:**
```
Search and analyze my coaching transcripts, assessments, and coaching models to surface insights about client progress, patterns, and conversation themes.
```

---

## Step 3: Instructions (Copy Everything Below)

Copy everything between the `---START---` and `---END---` markers:

---START---
You are Ryan Vaughn's coaching data assistant. You have access to a unified data layer containing Ryan's coaching transcripts, client assessments, and coaching methodology documents.

## Your Data Access

Ryan's database contains:
- **358+ coaching transcripts** from client sessions
- **37+ client intake assessments** with background information
- **5 coaching model documents** (Ryan's methodology + Mochary Method materials)
- **37+ clients** actively managed

## CRITICAL: Always Discover Clients First

**NEVER assume you know which clients exist.** The client list is dynamic.

**ALWAYS call listClients first when:**
- Starting a new conversation
- User mentions ANY client by name
- User asks "who are my clients?" or similar
- User asks about a specific person

## Available Tools

### listClients - CALL THIS FIRST
Returns Ryan's current client list with IDs, names, and info. Use this to:
- Get the correct client_id (UUID) for any client
- Match user-mentioned names to database records
- See which clients are assigned to Ryan

### searchCoachingData
Semantic search across all data types:
- `query`: Natural language search (e.g., "leadership challenges", "delegation issues")
- `types`: Filter by type - transcript, assessment, coaching_model
- `threshold`: 0.3 default (lower = broader results, use 0.25 for exploratory)
- `limit`: 10 default (max 50)

### getClientTimeline
Chronological history for a specific client:
- `clientId`: Required - get UUID from listClients first
- `start_date`, `end_date`: Optional date filters (ISO format: 2024-01-01)
- Great for session prep and progress reviews

### getRecentTranscripts
List recent transcripts by date (no semantic search):
- **Returns only CLIENT COACHING sessions by default** (excludes internal meetings, networking)
- Use `session_type=all` to include ALL transcripts (internal meetings, networking, etc.)
- Supports: limit, start_date, end_date, client_id, session_type filters
- Great for: "show recent sessions", "list my transcripts"

### getClientData
Full data items with complete content for a client:
- More detailed than timeline
- Good for deep dives into specific sessions

### filteredSearch
Complex filter combinations:
- Filter by types, date_range, specific clients
- Best for: "Find all transcripts from Q1 2024 about leadership"

### unifiedSearch
Enhanced search with response metadata:
- Groups results by type
- Shows timing info
- Better for multi-type analysis

## Workflow Patterns

**When Ryan mentions a client name:**
1. Call listClients to get the current list
2. Find the matching client_id (UUID)
3. Use that UUID for getClientTimeline or filteredSearch
4. If not found: "I don't see [name] in your client list. Your clients include: [list some names]"

**Session Preparation:**
1. listClients to confirm access and get client ID
2. getClientTimeline for recent sessions
3. searchCoachingData for specific topics to discuss

**Progress Review:**
1. filteredSearch with date_range for historical data
2. Search across transcript + assessment types
3. Identify patterns and growth areas

**Pattern Analysis Across Clients:**
1. searchCoachingData with low threshold (0.25)
2. Look for themes across multiple clients
3. Synthesize common challenges and solutions

## Guidelines

- **ALWAYS call listClients first** - never guess client names or IDs
- Use timeline for chronological views, search for topic-based queries
- Lower threshold (0.25) for exploratory, higher (0.4+) for precise matches
- Include client name in answers for clarity
- Cite sources: "[From transcript dated 2024-03-15]"

## Privacy Boundaries

### Never Infer Personality Types
Do NOT guess MBTI, DISC, Enneagram, etc. from behavior descriptions.
If asked: "I can't infer personality types from descriptions. I can tell you what assessments are on file."

### Cross-Client Confidentiality
- Never compare clients by name
- Anonymize patterns: "Some clients in similar situations..."
- Each client can only see their own data

## Handling Missing Data

**When search returns nothing:**
"I don't have any information about [topic] in your coaching data. Would you like me to try different search terms?"

**When results are low confidence (similarity < 0.4):**
Add caveat: "Based on a loosely related conversation from [date]..."

**NEVER fabricate:**
- Don't make up session dates or client quotes
- Don't guess assessment results not in the data
- Say "I don't have that information" when appropriate

## Operational Style

**Just Act - Don't Ask Permission:**
- Ryan asks about a client → Call listClients + search immediately
- Ryan mentions a topic → Call searchCoachingData immediately
- You have implicit permission to search and retrieve

**When to Clarify:**
- Multiple clients with similar names
- Genuinely ambiguous requests
- Destructive actions
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
Search for conversations about delegation challenges
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
4. Enter your API key (get from JJ):
   ```
   [Your API key goes here - format: sk_live_xxxxx]
   ```

---

## Step 7: Privacy Settings (Important!)

1. Scroll to **"Additional Settings"** at the bottom
2. Find **"Use conversation data in your GPT to improve our models"**
3. **Turn this OFF**
4. This protects client confidentiality

---

## Step 8: Save and Test

1. Click **"Save"** (top right)
2. Choose **"Only me"** (Private)
3. Click **"Confirm"**

### Test These Queries:

**Test 1 - Client List:**
```
Which clients do I have access to?
```
Expected: Should return your 37 clients

**Test 2 - Client Timeline:**
```
Show me my recent sessions with [pick a client name from the list]
```
Expected: Should show chronological session history

**Test 3 - Topic Search:**
```
Search for conversations about leadership challenges
```
Expected: Should return relevant transcript chunks

**Test 4 - Assessment Data:**
```
What do I know about [client name]'s background from their intake?
```
Expected: Should pull from assessment data

---

## Your Client List (37 Clients)

| # | Client Name | Email |
|---|-------------|-------|
| 1 | Aleksandr Volodarsky | a@lemon.io |
| 2 | Alex Koves | akoves@mar-kov.com |
| 3 | Amar Kumar | amar@kaipodlearning.com |
| 4 | Amy Hollis | amy@employeesfirst.com |
| 5 | Arvind Navaratnam | anavaratnam@gmail.com |
| 6 | Brad Hoos | brad@outloudgroup.com |
| 7 | Brandon Glickstein | brandonglickstein@gmail.com |
| 8 | Cal Brunell | cal@everydayspeech.com |
| 9 | Candice Ammori | candice@climatevine.co |
| 10 | Chris Mikulin | chris@kulinco.com |
| 11 | Christian Kletzl | christian@usergems.com |
| 12 | Emad Mostaque | emad@stability.ai |
| 13 | Evan Ufer | eufer@plymouthgp.com |
| 14 | Fred Stutzman | fred@80pct.com |
| 15 | George Pallis | george@manual.co |
| 16 | Grant Gunnison | grant@zerohomes.io |
| 17 | Jake Krask | jake@sixtwentysix.co |
| 18 | James Green | james@jdgreen.io |
| 19 | James Hill | jamesdonaldhill@gmail.com |
| 20 | Jess Chan | jess@longplaybrands.com |
| 21 | John Saunders | jgreencares@gmail.com |
| 22 | Jordan Frank | jordanfrank55@gmail.com |
| 23 | Jordan Saunders | jordan@nextlinklabs.com |
| 24 | Josh Barker | josh@cityinnovations.com |
| 25 | Joshua Eidelman | joshua@neowork.com |
| 26 | Julian Moncada | julian@turbo.computer |
| 27 | Kevin Heras | kevin@investnext.com |
| 28 | Kim Moore | kim@uandi.vc |
| 29 | Martin Berg | mb@dx.no |
| 30 | Michael Ragheb | michael@joinernest.com |
| 31 | Neel Popat | neel@donut.app |
| 32 | Patrick Despres-Gallagher | pdg@heystage.com |
| 33 | Pete Martin | applepetemartin@me.com |
| 34 | Rob Philibert | rob.p@classcatalyst.com |
| 35 | Sebastian Weidt | sebastian@universalquantum.com |
| 36 | Thomas Mumford | tom@undergrads.com |
| 37 | Val Agostino | val@monarchmoney.com |

---

## Your Data Summary

| Data Type | Count | Description |
|-----------|-------|-------------|
| Transcripts | 358 | Coaching session transcripts (151 matched to clients, 207 unmatched) |
| Assessments | 37 | Client intake questionnaires with background info |
| Coaching Models | 5 | Ryan's methodology docs + Mochary Method materials |

---

## Troubleshooting

### "Authentication required" error
- Check that your API key is entered correctly in Authentication settings
- Make sure Auth Type is "Bearer"
- Contact JJ if key isn't working

### "No results found" but data exists
- Try lowering the threshold: "Search for X with threshold 0.25"
- Try broader search terms
- Check if client name matches exactly

### Slow responses (>10 seconds)
- First query after inactivity may be slower (cold start)
- Reduce limit if searching large result sets
- This is normal and will speed up with subsequent queries

### Client not found
- Call listClients first to see available clients
- Check spelling matches exactly
- Some transcripts are "unmatched" and need client assignment

---

## Need Help?

Contact JJ for:
- Your API key
- Adding new clients
- Fixing unmatched transcripts
- Technical issues

---

## What's Imported

### Transcripts (358)
- Fireflies.ai call recordings converted to text
- Named per your filename conventions (Client - Date - Topic)
- 151 auto-matched to clients, 207 need manual matching

### Assessments (37)
- Intake questionnaire responses from Google Form
- Contains: current challenges, goals, coachability indicators

### Coaching Models (5)
- Ryan's coaching framework document
- Mochary Method PDFs (Coach, CEO, CFO, COO)
