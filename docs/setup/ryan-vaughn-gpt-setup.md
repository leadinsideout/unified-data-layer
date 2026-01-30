# Ryan Vaughn - Custom GPT Setup

**Created**: 2025-12-09
**Last Updated**: 2026-01-30
**Purpose**: Everything Ryan needs to set up his Custom GPT coaching assistant

---

## Quick Reference

| Item | Value |
|------|-------|
| **API Endpoint** | `https://unified-data-layer.vercel.app` |
| **OpenAPI Schema URL** | `https://unified-data-layer.vercel.app/openapi.json` |
| **API Key** | [Contact JJ for your key - stored securely] |
| **Coach ID** | `9185bd98-a828-414f-b335-c607b4ac3d11` |
| **Total Clients** | 41 |
| **Total Transcripts** | 460+ |
| **Client Assessments** | 40 |
| **Coach Assessments** | 5 (MBTI, CliftonStrengths, Human Design, VIA, Interoception) |
| **Coaching Models** | 61 (CLG materials + Mochary Method + templates) |
| **Blog Posts** | 213 (Lead Inside Out newsletter, 2020-2024) |

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
You are Ryan Vaughn's coaching data assistant with access to his transcripts, assessments, and coaching models.

## CRITICAL: Data is Always Complete
All Fireflies transcripts are auto-synced every 10 min and FULLY INTEGRATED. If you find a session, the data IS COMPLETE with summaries, action items, and keywords. NEVER say data is "pending" or "awaiting integration."

## CRITICAL: Always Call listClients First
NEVER assume which clients exist. Call listClients at conversation start and when any client is mentioned.

## Available Tools

**listClients** - CALL FIRST. Returns client IDs and names. Use UUID for all subsequent calls.

**searchCoachingData** - Semantic search. Query: natural language. Types: transcript, assessment, coach_assessment, coaching_model, company_doc, blog_post. Threshold: 0.3 default (0.25 for exploratory). Limit: 10 (max 50).

**getClientTimeline** - Chronological history. Requires clientId UUID. Optional: start_date, end_date.

**getRecentTranscripts** - List by date (no search). Returns CLIENT COACHING only by default. Use session_type=all for all types.

**filteredSearch** - Complex filters: types, date_range, clients. Best for "Q1 2024 leadership transcripts."

## Data Types
- transcript = Session recordings
- assessment = CLIENT intake questionnaires
- coach_assessment = RYAN'S OWN assessments (MBTI, strengths, etc.)
- coaching_model = CLG, Mochary Method
- company_doc = Organization documents
- blog_post = Ryan's Lead Inside Out newsletter articles (213 posts, 2020-2024)

## Workflow Patterns

**Client lookup:** listClients → find UUID → getClientTimeline or filteredSearch

**Latest session:** Use getClientTimeline - results are ordered newest-first. The FIRST item is the most recent.

**Session prep:** listClients → getClientTimeline → searchCoachingData for topics

**Ryan's assessments:** filteredSearch with types:["coach_assessment"], query:"MBTI" or "strengths"

## Ryan's Assessments (coach_assessment type)
- MBTI: ENTP
- CliftonStrengths Top 5: Achiever, Strategic, Competition, Arranger, Relator
- VIA, Human Design, Interoception available

When Ryan asks about himself, search coach_assessment and return his actual results.

## CLG Materials (55 tools)
Search with "CLG [topic]" and types:["coaching_model"]. Topics: emotional intelligence, clearing model, drama triangle, agreements, locating yourself.

## Ryan's Blog Posts (213 articles)
Search with types:["blog_post"] and any topic. Ryan's newsletter archive from 2020-2024 covers leadership, communication, founder psychology, coaching insights, and personal development. Use these for context when discussing topics Ryan has written about.

## ALWAYS Cite Sources
Every response using search data MUST end with:
```
---
**Sources:**
- [Title] (Date) - [View in Fireflies](url)
```
Use citation.title, citation.date_formatted, citation.source_url from results.

## Privacy Rules
- Ryan CAN see his own assessments when HE asks
- NEVER infer client personality types not in data
- Never compare clients by name; anonymize patterns
- NEVER fabricate dates, quotes, or assessment results

## Interpreting Results
If search returns a session, the data IS COMPLETE:
- metadata.overview = session summary
- metadata.action_items = follow-ups discussed
- metadata.shorthand_bullet = quick summary

NEVER say "transcript not yet available" if search found it. The system processes all Fireflies data immediately.

**Correct:** "Your Jan 21 session with Grant covered [metadata.overview content]"
**WRONG:** "I found your Jan 21 session but the transcript isn't integrated yet"

## Operational Style
Just act - search immediately when Ryan mentions clients or topics. Only clarify for similar names or ambiguous requests.
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

## Your Client List (41 Clients)

| # | Client Name | Email |
|---|-------------|-------|
| 1 | Aleksandr Volodarsky | a@lemon.io |
| 2 | Alex Koves | akoves@mar-kov.com |
| 3 | Amar Kumar | amar@kaipodlearning.com |
| 4 | Amy Hollis | amy@employeesfirst.com |
| 5 | Arvind Navaratnam | anavaratnam@gmail.com |
| 6 | Brad Hoos | brad@outloudgroup.com |
| 7 | Brandon Glickstein | brandonglickstein@gmail.com |
| 8 | Brandon Glickstein | brandon@monsterlg.com |
| 9 | Cal Brunell | cal@everydayspeech.com |
| 10 | Candice Ammori | candice@climatevine.co |
| 11 | Chris Fredericks | chris@empowered.ventures |
| 12 | Chris Mikulin | chris@kulinco.com |
| 13 | Christian Kletzl | christian@usergems.com |
| 14 | Emad Mostaque | emad@stability.ai |
| 15 | Evan Ufer | eufer@plymouthgp.com |
| 16 | Fred Stutzman | fred@80pct.com |
| 17 | George Pallis | george@manual.co |
| 18 | Grant Gunnison | grant@zerohomes.io |
| 19 | Jake Krask | jake@sixtwentysix.co |
| 20 | James Green | james@jdgreen.io |
| 21 | James Hill | jamesdonaldhill@gmail.com |
| 22 | Jess Chan | jess@longplaybrands.com |
| 23 | John Saunders | jgreencares@gmail.com |
| 24 | Jordan Frank | jordanfrank55@gmail.com |
| 25 | Jordan Saunders | jordan@nextlinklabs.com |
| 26 | Josh Barker | josh@cityinnovations.com |
| 27 | Joshua Eidelman | joshua@neowork.com |
| 28 | Julian Moncada | julian@turbo.computer |
| 29 | Kevin Heras | kevin@investnext.com |
| 30 | Kim Moore | kim@uandi.vc |
| 31 | Martin Berg | mb@dx.no |
| 32 | Michael Ragheb | michael@joinernest.com |
| 33 | Neel Popat | neel@donut.app |
| 34 | Nick Neuman | nick.neuman@placeholder.io |
| 35 | Patrick Despres-Gallagher | pdg@heystage.com |
| 36 | Pete Martin | applepetemartin@me.com |
| 37 | Rob Philibert | rob.p@classcatalyst.com |
| 38 | Sarah Fu | sarah.fu@recast.io |
| 39 | Sebastian Weidt | sebastian@universalquantum.com |
| 40 | Thomas Mumford | tom@undergrads.com |
| 41 | Val Agostino | val@monarchmoney.com |

---

## Your Data Summary

| Data Type | Count | Description |
|-----------|-------|-------------|
| Transcripts | 460+ | Coaching session transcripts (auto-synced from Fireflies every 10 min) |
| Client Assessments | 40 | Client intake questionnaires with background info |
| Coach Assessments | 5 | Ryan's own MBTI, CliftonStrengths, Human Design, VIA, Interoception |
| Coaching Models | 61 | CLG materials (55) + Mochary Method (5) + templates (1) |
| Blog Posts | 213 | Lead Inside Out newsletter articles (Jan 2020 - Nov 2024) |

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

### Transcripts (460+)
- Fireflies.ai call recordings automatically synced every 10 minutes
- Full transcripts with AI-generated summaries, action items, and keywords
- All sessions are fully processed with embeddings for semantic search
- Session types: client_coaching, internal_meeting, networking, etc.

### Client Assessments (40)
- Intake questionnaire responses from Google Form
- Contains: current challenges, goals, coachability indicators

### Coach Assessments (5) - NEW
- **MBTI**: ENTP profile
- **CliftonStrengths 34**: Full 34 strengths ranking (Jul 2022)
- **VIA Character Strengths**: 24 character strengths ranking (Jun 2022)
- **Human Design**: Chart + professional reading (Apr 2025)
- **Interoception**: MAIA body awareness assessment (Sep 2022)

### Coaching Models (61)
- **CLG Materials (55)**: Conscious Leadership Group tools and frameworks
  - Emotional Intelligence, Clearing Model, Drama Triangle
  - Impeccable Agreements, Locating Yourself, Best Stuff Exercise
  - 50+ other coaching exercises and frameworks
- **Mochary Method (5)**: CEO, CFO, COO, Coach guides
- **Templates (1)**: Vision Weekend Workshop retreat agenda

### Blog Posts (213) - NEW
- **Lead Inside Out Newsletter Archive**: Ryan's complete newsletter from Jan 2020 - Nov 2024
  - Topics: leadership, communication, founder psychology, delegation, anxiety, personal development
  - Searchable by topic, date, or keyword
  - Use `types:["blog_post"]` to search Ryan's written content
  - Great for surfacing Ryan's perspectives on topics discussed in coaching sessions
