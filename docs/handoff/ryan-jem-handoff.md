# Ryan's Coaching AI Assistant

## Hand-off Guide for Ryan & Jem

**Last Updated:** December 10, 2025

---

# Welcome

Your coaching data is now searchable by AI. This document explains how to use it.

**Ryan** can ask his Custom GPT questions about past sessions, client backgrounds, and coaching methodology — and get answers in seconds instead of scrolling through transcripts.

**Jem** can manage the system: add new clients, upload documents, and keep everything running smoothly.

---

## Quick Links

| Resource | Link |
|----------|------|
| Ryan's Custom GPT | [Link to be added after GPT creation] |
| Admin Dashboard | https://unified-data-layer.vercel.app/admin |
| API Health Check | https://unified-data-layer.vercel.app/api/health |
| Support | Contact JJ |

---

## Watch the Walkthrough

> **[Loom Video Placeholder]**
>
> *A 10-minute video walking through everything below*

---

---

# For Ryan: Using Your Coaching GPT

## Getting Started

1. Open your Custom GPT (link above)
2. Try this first query: **"Which clients do I have access to?"**
3. You should see your 37 clients listed

That's it. You're ready to go.

---

## What's Searchable

Your GPT can search across:

| Data Type | Count | What It Contains |
|-----------|-------|------------------|
| Coaching Transcripts | 358 | Your Fireflies session recordings, converted to text |
| Client Assessments | 37 | Intake questionnaire responses (goals, background, challenges) |
| Coaching Models | 5 | Your methodology doc + Mochary Method materials |
| Clients | 37 | Names, emails, coaching relationships |

**Note:** 151 of 358 transcripts are currently matched to specific clients. The rest are searchable but not yet linked to client records. (See "Pending Items" section.)

---

## Example Queries

Here's how to ask for what you want:

| What You Want | How to Ask |
|---------------|------------|
| **Prepare for a session** | "Help me prepare for my session with Amar Kumar" |
| **Find past discussions on a topic** | "What have I discussed with Cal about delegation?" |
| **Review a client's progress** | "Show me my last 5 sessions with Christian Kletzl" |
| **Check a client's background** | "What do I know about Brandon's coaching goals from his intake?" |
| **Find patterns across clients** | "What themes come up in my sessions about leadership transitions?" |
| **Reference your methodology** | "What does Mochary say about running effective 1:1s?" |
| **Search for specific content** | "Find sessions where we discussed imposter syndrome" |
| **Get a client timeline** | "Show me the coaching journey for Val Agostino" |

---

## Tips for Better Results

**Be specific with names**
- "Amar Kumar" works better than just "Amar"
- If results seem wrong, try the full name

**Rephrase if needed**
- "delegation challenges" vs "delegating work" may give different results
- Try synonyms if you don't find what you need

**Ask about recent sessions**
- "What were my last 3 sessions with [client]?"
- "What did I discuss with [client] in November?"

**Combine sources**
- "Compare what Amar said in his intake vs our recent sessions"
- "What does his intake say about goals, and how has that evolved?"

---

## What It Can't Do

| Limitation | Why |
|------------|-----|
| Access sessions for people not in the system | They need to be added as clients first |
| Remember previous GPT conversations | Each chat starts fresh (no conversation memory) |
| See your calendar or schedule | It only knows about past transcripts |
| Access transcripts from other coaches | Your data is private to you |

---

## Your Clients (37)

For reference, here are the clients currently in your system:

| Client | Email |
|--------|-------|
| Aleksandr Volodarsky | a@lemon.io |
| Alex Koves | akoves@mar-kov.com |
| Amar Kumar | amar@kaipodlearning.com |
| Amy Hollis | amy@employeesfirst.com |
| Arvind Navaratnam | anavaratnam@gmail.com |
| Brad Hoos | brad@outloudgroup.com |
| Brandon Glickstein | brandonglickstein@gmail.com |
| Cal Brunell | cal@everydayspeech.com |
| Candice Ammori | candice@climatevine.co |
| Chris Mikulin | chris@kulinco.com |
| Christian Kletzl | christian@usergems.com |
| Emad Mostaque | emad@stability.ai |
| Evan Ufer | eufer@plymouthgp.com |
| Fred Stutzman | fred@80pct.com |
| George Pallis | george@manual.co |
| Grant Gunnison | grant@zerohomes.io |
| Jake Krask | jake@sixtwentysix.co |
| James Green | james@jdgreen.io |
| James Hill | jamesdonaldhill@gmail.com |
| Jess Chan | jess@longplaybrands.com |
| John Saunders | jgreencares@gmail.com |
| Jordan Frank | jordanfrank55@gmail.com |
| Jordan Saunders | jordan@nextlinklabs.com |
| Josh Barker | josh@cityinnovations.com |
| Joshua Eidelman | joshua@neowork.com |
| Julian Moncada | julian@turbo.computer |
| Kevin Heras | kevin@investnext.com |
| Kim Moore | kim@uandi.vc |
| Martin Berg | mb@dx.no |
| Michael Ragheb | michael@joinernest.com |
| Neel Popat | neel@donut.app |
| Patrick Despres-Gallagher | pdg@heystage.com |
| Pete Martin | applepetemartin@me.com |
| Rob Philibert | rob.p@classcatalyst.com |
| Sebastian Weidt | sebastian@universalquantum.com |
| Thomas Mumford | tom@undergrads.com |
| Val Agostino | val@monarchmoney.com |

---

---

# For Jem: Admin Dashboard Guide

## Accessing the Dashboard

1. Go to: **https://unified-data-layer.vercel.app/admin**
2. Log in with your admin credentials
3. You'll see the Dashboard tab with system stats

**Your admin credentials are stored:** [Add location - 1Password, shared doc, etc.]

---

## Daily Check (2 minutes)

Every day (or every few days), do a quick health check:

1. **Open the Dashboard tab**
2. **Check "Synced Today"** — This shows how many transcripts came in from Fireflies
3. **If it says 0 and Ryan had sessions:** Something may be wrong. Contact JJ.

That's it for daily maintenance. The system runs automatically.

---

## Core Admin Tasks

### Task: Add a New Client

**When to do this:** Ryan starts coaching someone new

**Why it matters:** New Fireflies transcripts auto-match by email. If the client isn't in the system, their sessions won't link to them.

**Steps:**
1. Go to **Users** tab
2. Click **"Add User"**
3. Select **"Client"** as the type
4. Enter their **name** and **email** (email is critical for matching)
5. Click **Save**
6. The system will automatically link them to Ryan

---

### Task: Upload Data Manually

**When to do this:** Uploading assessments, coaching models, or special documents that don't come from Fireflies

**Steps:**
1. Go to **Data Upload** tab
2. Select the **data type**:
   - Transcript (for session notes)
   - Assessment (for DISC, intake forms, etc.)
   - Coaching Model (for methodology docs)
3. Select **Ryan** as the coach
4. Select the **client** (if applicable)
5. Drag and drop your file (or click to browse)
6. Click **Upload**

**Supported formats:** .txt, .json, .pdf (max 10MB)

---

### Task: Browse & Delete Data

**When to do this:** Cleaning up test data, removing duplicates, or checking what's been uploaded

**Steps:**
1. Go to **Data Browser** tab
2. Use filters to find what you're looking for:
   - Filter by type (transcript, assessment, etc.)
   - Filter by client
3. Click **"View"** to preview content
4. Click **"Delete"** to remove (permanent!)

---

### Task: Create an API Key

**When to do this:** Rarely. Only if Ryan needs a new key for his GPT.

**Steps:**
1. Go to **API Keys** tab
2. Click **"Create API Key"**
3. Select **Coach** as the owner type
4. Select **Ryan Vaughn**
5. Give it a name (e.g., "Ryan's GPT - Dec 2025")
6. Click **Create**
7. **IMPORTANT:** Copy the key immediately! It won't be shown again.
8. Share the key with Ryan securely (not via email)

---

## Troubleshooting Quick Fixes

| Problem | What to Check | Solution |
|---------|---------------|----------|
| Transcript not appearing in GPT | Client email doesn't match database | Add client with correct email via Users tab |
| "Client not found" when querying GPT | Client doesn't exist in system | Add them via Users tab |
| GPT returns wrong or no results | Search terms too specific | Try broader terms or synonyms |
| Dashboard won't load | Server may be down | Check health endpoint, contact JJ |
| "Unauthorized" error | API key issue | Check if key is active in API Keys tab |

---

## What NOT to Touch

> **Safety first. When in doubt, ask JJ.**

- **Don't delete Ryan's API key** — His GPT will stop working
- **Don't delete existing clients** — Their linked transcripts become orphaned
- **Don't delete data you're unsure about** — Deletion is permanent
- **Don't change coach assignments** — Could break data access

---

## How Fireflies Sync Works

You don't need to do anything for this — it's automatic.

**Every 10 minutes:**
1. System checks Fireflies for new transcripts
2. Matches coach by email (Ryan)
3. Matches client by email (from meeting attendees)
4. Chunks, embeds, and stores the transcript

**If a client isn't matched:**
- The transcript is still imported
- It shows up in searches
- But it's not linked to a specific client
- Adding the client later fixes this going forward

---

---

# Pending Items (Action Required)

## For Ryan: Verify Names

**207 transcripts** couldn't be automatically matched to clients. Most are internal meetings or one-off calls, but some are likely real clients.

### High Priority (3+ sessions)

| Name | Sessions | Action Needed |
|------|----------|---------------|
| **Tom** | 13 | Almost certainly a client. Is this Tom [Last Name]? |
| Copy of Pete | 3 | Is this Pete Martin? |
| James | 3 | Is this James Hill or James Green? |

### Medium Priority (2 sessions each)

Please mark: **YES** (is a client), **NO** (not a client), or **MERGE: [Name]** (same as existing client)

| Name | Sessions | Your Answer |
|------|----------|-------------|
| Amanda Lewan | 2 | ________ |
| Fritz Lensch | 2 | ________ |
| Katie Birge | 2 | ________ |
| Mina Lee | 2 | ________ |
| Sasza Lohrey | 2 | ________ |
| William Dickinson | 2 | ________ |

### Single Session Names (Lower Priority)

These had only 1 session each — likely fit calls or one-offs. Only mark "YES" if they became ongoing clients:

AJ Mizes, Astrid Korin, Astrid Schanz, Brian connect, Carleigh Finch, Chad Todd, Copy of Kevin, Corinda Hayes, Darren Clifford, EJ Merkert, Emma Wood, Fit-Call- Barron Caster, Gabor Soter, Glenn Rubenstein, Guy Turner, Haley Hughes, Harry, I-O Fit Call- Rich Gerbe, Itay Forer, Jay Krause, Jeremy Fisher, Joe Malcoun, Joe Marston, John Burns, Jordan Morgan, Karl Brandt, Kayla Carreiro, Kendall Hines, Kristina, Lance Rosen, Lou Marchetti, Lulu Liang, Matt Auron, Matthew Attou, Michael, Michael Gisi, Mike Algrim, Neil Carlson, Nnamdi Ugwu, Philip Swanson, Pranab, Ricky Sperber, Ritik, Scott, Shayn Diamond, Steve Taylor, Taryn, Yuheng Wang, Zain Jaffer

---

## For Jem: Map 360 Reviews

**5 transcripts** are 360-degree stakeholder interviews. Please identify which coaching client each interview was conducted for.

| Interview File | Interviewee | For Which Client? |
|----------------|-------------|-------------------|
| 360 Interview- Mark Kraynak | Mark Kraynak | _____________ |
| 360 Interview- Pallavi Sud | Pallavi Sud | _____________ |
| 360 Review- Brian Grabowski | Brian Grabowski | _____________ |
| 360 Review- Logan Sease | Logan Sease | _____________ |
| Alyse Killeen / Nick Neuman 360 Review | Alyse Killeen / Nick Neuman | _____________ |

**Example:** If Mark Kraynak was interviewed as part of Cal Brunell's 360 review, write "Cal Brunell" in the last column.

---

## Timeline

| Task | Who | Deadline |
|------|-----|----------|
| Verify name list | Ryan | 2 weeks |
| Map 360 reviews | Jem | 2 weeks |
| Process updates & re-match | JJ | After you finish |

---

---

# Reference & Support

## Your Data Summary

| Data Type | Count | Notes |
|-----------|-------|-------|
| Transcripts | 358 | 151 matched to clients, 207 pending verification |
| Clients | 37 | From intake questionnaire |
| Assessments | 37 | Intake questionnaire responses |
| Coaching Models | 5 | Ryan's methodology + Mochary Method |

---

## FAQ

**How often does data sync from Fireflies?**
Every 10 minutes, automatically.

**Can I delete my own data?**
Yes, via the Admin Dashboard → Data Browser tab.

**Is my data private?**
Yes. Only Ryan can access Ryan's data. The system uses row-level security to enforce this.

**What if I start coaching someone new?**
Have Jem add them as a client with their email. Future transcripts will auto-match.

**What if the GPT gives wrong answers?**
Try rephrasing your question or using different search terms. If it's consistently wrong, contact JJ.

**Can clients access their own data?**
Not currently. This could be added in the future if Ryan wants to share session summaries with clients.

---

## Technical Reference (For JJ)

| Item | Value |
|------|-------|
| Coach ID | `9185bd98-a828-414f-b335-c607b4ac3d11` |
| Import Batch | `ryan-vaughn-2025-12` |
| API Key | [Stored securely - contact JJ] |
| Health Endpoint | https://unified-data-layer.vercel.app/api/health |

---

## Support

**For any issues:** Contact JJ

- Technical problems
- Feature requests
- Data questions
- Emergency support

---

*Document created December 10, 2025*
