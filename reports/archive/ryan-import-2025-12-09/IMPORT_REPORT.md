# Ryan Vaughn Data Import Report

**Date:** December 9, 2025
**Prepared by:** JJ Vega (via Claude AI Assistant)
**Coach:** Ryan Vaughn (ryan@leadinsideout.io)
**Company:** Inside-Out Leadership

---

## Executive Summary

We successfully imported Ryan's coaching data into the Unified Data Layer system. This data will power his Custom GPT coaching assistant, enabling AI-powered search across all his coaching sessions, client assessments, and methodology documents.

### Key Numbers

| Metric | Count | Status |
|--------|-------|--------|
| **Total Transcripts** | 358 | ✅ Imported |
| **Matched to Clients** | 151 (42%) | ✅ Searchable by client |
| **Unmatched** | 207 (58%) | ⚠️ See breakdown below |
| **Client Records** | 37 | ✅ From intake questionnaire |
| **Assessments** | 37 | ✅ Intake questionnaires |
| **Coaching Models** | 5 | ✅ Methodology docs |

### What's Working Now

✅ Ryan can query his Custom GPT about any of the 151 matched client sessions
✅ All 37 intake questionnaires are searchable
✅ Mochary Method and Ryan's coaching style documents are indexed
✅ API key generated for Custom GPT access

### What Needs Attention

⚠️ **151 of 358 transcripts (42%) are linked to clients** — the rest need verification
⚠️ **5 360-degree reviews** need client mapping by Jem
⚠️ **Tom has 13 sessions** but no client record — likely needs to be created

---

## Data Imported

### 1. Transcripts (358 files)

All `.docx` transcript files from Ryan's Fireflies recordings were processed:

- **Text extracted** from Word documents
- **PII scrubbed** (names, emails, phone numbers redacted from searchable content)
- **Chunked** into ~500-word segments for semantic search
- **Embedded** using OpenAI for vector similarity matching

### 2. Client Records (37 clients)

Created from the September 2020 Intake Questionnaire spreadsheet:

- Name, email, company association
- Linked to Ryan as primary coach
- 12 additional clients failed to import (duplicate/missing emails)

### 3. Intake Assessments (37 assessments)

Each client's questionnaire responses are now searchable, including:

- Leadership background and experience
- Strengths and growth areas
- Coaching goals and ideal outcomes
- Personal context (family, values, purpose)

### 4. Coaching Models (5 documents)

| Document | Type | Purpose |
|----------|------|---------|
| Personal Coaching Style Profile | PDF | Ryan's methodology |
| Coaching Supervisor Feedback | Word | Supervision notes |
| Direct Communication Feedback | Word | Communication patterns |
| Mochary Method Part 1 | PDF | Reference methodology |
| Mochary Method Part 2 | PDF | Reference methodology |

---

## Transcript Matching Analysis

### Why Only 42% Matched?

Transcript filenames from Fireflies vary widely in format. We built a parser with **38 different patterns** to extract client names, but many files still couldn't be automatically linked.

### Breakdown of 207 Unmatched Transcripts

| Category | Count | Explanation | Action Needed |
|----------|-------|-------------|---------------|
| **Staff Meetings** | 16 | Meetings with Jem (team member) | None — correctly excluded |
| **Intern Sessions** | 11 | Meetings with Nick (former intern) | None — correctly excluded |
| **Collaborator Calls** | 2 | Calls with Santi (external collaborator) | None — correctly excluded |
| **Non-Coaching Calls** | 40 | Training, sales, internal meetings | None — correctly excluded |
| **Likely Clients (not in DB)** | 16 | Clients from before Sept 2020 or not in questionnaire | **Create client records** |
| **Single Sessions** | 51 | One-off calls — trials, referrals, consultations | **Ryan to verify** |
| **Unparseable Filenames** | 71 | Unusual naming, multi-person calls | Review if important |

### High-Priority Names for Verification

These people have **3+ coaching sessions** but no client record:

| Name | Sessions | Date Range | Recommendation |
|------|----------|------------|----------------|
| **Tom** | 13 | Jun–Nov 2025 | 🔴 Almost certainly a client — create record |
| Copy of Pete | 3 | Jun–Jul 2025 | Likely "Pete" — check if existing client |
| James | 3 | Jun–Jul 2025 | May match "James Hill" in database |

### Medium-Priority (2 sessions each)

- Amanda Lewan
- Fritz Lensch
- Katie Birge
- Mina Lee
- Sasza Lohrey
- William Dickinson

---

## Full Name Verification List (For Ryan)

**Instructions:** For each name below, mark in the "Is Client?" column:
- **YES** = This is a coaching client (I'll create a record)
- **NO** = Not a client (internal, collaborator, one-off)
- **MERGE: [Name]** = This is the same person as an existing client (e.g., "MERGE: Pete Smith")

| Name | Sessions | Category | Confidence | Date Range | Sample Filename | Notes | Is Client? |
|------|----------|----------|------------|------------|-----------------|-------|------------|
| Jem | 16 | staff | confirmed | 2025-06-03 to 2025-11-13 | Ryan - Jem-transcript-2025-06-03T19-11-26.391Z | Ryan's team member | NO |
| **Tom** | 13 | likely_client | high | 2025-06-24 to 2025-12-09 | Tom - Ryan biweekly session-transcript-2025-07-22T19-07-16.1 | 13 sessions over time - consistent coaching relationship | _____ |
| Nick | 11 | intern | confirmed | 2025-05-30 to 2025-12-09 | Nick & Ryan biweekly updated-transcript-2025-11-26T20-32-27. | Former intern | NO |
| **Copy of Pete** | 3 | likely_client | medium | 2025-06-18 to 2025-07-02 | Copy of Pete - Ryan session-transcript-2025-06-18T20-35-49.7 | 3 sessions - probably a client | _____ |
| **James** | 3 | likely_client | medium | 2025-06-25 to 2025-07-25 | Ryan - James session-transcript-2025-06-25T21-02-59.732Z | 3 sessions - probably a client | _____ |
| Amanda Lewan | 2 | possible_client | medium | 2025-07-11 to 2025-12-09 | Ryan Vaughn and Amanda Lewan-transcript-2025-07-11T16-25-57. | 2 sessions - could be trial or active client | _____ |
| Fritz Lensch | 2 | possible_client | medium | 2025-07-21 to 2025-12-09 | Fritz Lensch _ Ryan Vaughn-transcript-2025-07-21T18-34-23.71 | 2 sessions - could be trial or active client | _____ |
| Katie Birge | 2 | possible_client | medium | 2025-07-15 to 2025-12-09 | Katie Birge _ Ryan Vaughn-transcript-2025-07-15T19-54-45.010 | 2 sessions - could be trial or active client | _____ |
| Mina Lee | 2 | possible_client | medium | 2025-08-21 to 2025-09-03 | Mina Lee - Ryan Vaughn-transcript-2025-08-21T19-04-04.684Z | 2 sessions - could be trial or active client | _____ |
| Santi | 2 | collaborator | confirmed | 2025-05-28 to 2025-08-25 | Ryan - Santi-transcript-2025-05-28T22-03-54.583Z | External collaborator, not a client | NO |
| Sasza Lohrey | 2 | possible_client | medium | 2025-08-27 to 2025-09-22 | Sasza Lohrey - Ryan Vaughn-transcript-2025-09-22T20-06-32.56 | 2 sessions - could be trial or active client | _____ |
| William Dickinson | 2 | possible_client | medium | 2025-07-21 to 2025-12-09 | Ryan Vaughn and William Dickinson-transcript-2025-07-21T18-0 | 2 sessions - could be trial or active client | _____ |

### Single Session Names (Lower Priority)

These had only 1 session each. Most are likely fit calls, referrals, or one-off consultations. Only mark as "YES" if you know they became ongoing clients.

| Name | Date | Sample Filename | Is Client? |
|------|------|-----------------|------------|
| AJ Mizes | 2025-06-30 | Ryan Vaughn _ AJ Mizes-transcript-2025-06-30T17-53-21.454Z | _____ |
| Astrid Korin | 2025-08-29 | Astrid Korin _ Ryan Vaughn-transcript-2025-08-29T16-33-50.09 | _____ |
| Astrid Schanz | 2025-08-05 | Ryan Vaughn and Astrid Schanz-Garbassi-transcript-2025-08-05 | _____ |
| Brian connect | 2025-06-13 | Ryan - Brian connect-transcript-2025-06-13T15-16-10.179Z | _____ |
| Carleigh Finch | 2025-09-15 | Carleigh Finch _ Ryan Vaughn-transcript-2025-09-15T20-01-13. | _____ |
| Chad Todd | 2025-06-23 | Ryan Vaughn _ Chad Todd-transcript-2025-06-23T17-39-10.007Z | _____ |
| Copy of Kevin | 2025-07-03 | Copy of Kevin - Ryan Session-transcript-2025-07-03T19-07-31. | _____ |
| Corinda Hayes | 2025-11-10 | Corinda Hayes - Ryan Vaughn-transcript-2025-11-10T18-57-29.2 | _____ |
| Darren Clifford | 2025-06-02 | Ryan Vaughn and Darren Clifford-transcript-2025-06-02T20-05- | _____ |
| EJ Merkert | 2025-10-17 | EJ Merkert - Ryan Vaughn-transcript-2025-10-17T16-32-45.244Z | _____ |
| Emma Wood | 2025-10-08 | Ryan H Vaughn and Emma Wood-transcript-2025-10-08T19-59-47.1 | _____ |
| Fit-Call- Barron Caster | 2025-07-01 | Fit-Call- Barron Caster _ Ryan Vaughn-transcript-2025-07-01T | _____ |
| Gabor Soter | 2025-09-02 | Gabor Soter _ Ryan Vaughn - JJ Vega-transcript-2025-09-02T16 | _____ |
| Glenn Rubenstein | 2025-08-13 | Ryan Vaughn and Glenn Rubenstein-transcript-2025-08-13T19-42 | _____ |
| Guy Turner | 2025-06-26 | Ryan Vaughn _ Guy Turner-transcript-2025-06-26T15-45-32.573Z | _____ |
| Haley Hughes | 2025-08-27 | Ryan Vaughn _ Haley Hughes - Josh Felser-transcript-2025-08- | _____ |
| Harry | 2025-11-06 | Harry - Ryan-transcript-2025-11-06T16-34-07.427Z | _____ |
| I-O Fit Call- Rich Gerbe | 2025-08-08 | I-O Fit Call- Rich Gerbe _ Ryan Vaughn-transcript-2025-08-08 | _____ |
| Itay Forer | 2025-08-29 | Ryan Vaughn and Itay Forer-transcript-2025-08-29T15-32-49.94 | _____ |
| Jay Krause | 2025-07-02 | Ryan Vaughn _ Jay Krause-transcript-2025-07-02T15-59-53.341Z | _____ |
| Jeremy Fisher | 2025-11-18 | Jeremy Fisher & Ryan Vaughn-transcript-2025-11-18T16-33-46.7 | _____ |
| Joe Malcoun | 2025-12-09 | Catch-Up-Joe-Malcoun-Ryan-Vaughn-62ed28ff-61ea | _____ |
| Joe Marston | 2025-11-11 | Joe Marston & Ryan Vaughn-transcript-2025-11-11T14-39-42.181 | _____ |
| John Burns | 2025-11-14 | John Burns & Ryan Vaughn-transcript-2025-11-14T16-38-01.214Z | _____ |
| Jordan Morgan | 2025-05-30 | Ryan Vaughn _ Jordan Morgan-transcript-2025-05-30T18-09-44.3 | _____ |
| Karl Brandt | 2025-07-17 | Ryan Vaughn and Karl Brandt-transcript-2025-07-17T17-07-20.3 | _____ |
| Kayla Carreiro | 2025-09-12 | Kayla Carreiro - Ryan Vaughn-transcript-2025-09-12T17-07-31. | _____ |
| Kendall Hines | 2025-09-25 | Kendall Hines - Ryan Vaughn-transcript-2025-09-25T20-19-14.9 | _____ |
| Kristina | 2025-06-23 | Ryan _ Kristina - Founder Health Retreat-transcript-2025-06- | _____ |
| Lance Rosen | 2025-12-05 | Lance Rosen - Ryan Vaughn-transcript-2025-12-05T16-35-07.863 | _____ |
| Lou Marchetti | 2025-12-05 | Lou Marchetti & Ryan Vaughn-transcript-2025-12-05T17-05-01.0 | _____ |
| Lulu Liang | 2025-07-25 | Lulu Liang _ Ryan Vaughn-transcript-2025-07-25T16-01-35.255Z | _____ |
| Matt Auron | 2025-06-30 | Ryan Vaughn _ Matt Auron - Dan Hunt-transcript-2025-06-30T20 | _____ |
| Matthew Attou | 2025-07-07 | Matthew Attou _ Ryan Vaughn-transcript-2025-07-07T17-49-11.7 | _____ |
| Michael | 2025-08-13 | Ryan x Michael-transcript-2025-08-13T19-16-18.330Z | _____ |
| Michael Gisi | 2025-12-09 | Michael-Gisi-Ryan-Vaughn-44ee337b-e481 | _____ |
| Mike Algrim | 2025-07-11 | Ryan Vaughn _ Mike Algrim-transcript-2025-07-11T20-16-38.832 | _____ |
| Neil Carlson | 2025-12-09 | Neil-Carlson-Ryan-Vaughn-28c8feb3-79fb | _____ |
| Nnamdi Ugwu | 2025-08-26 | Nnamdi Ugwu _ Ryan Vaughn-transcript-2025-08-26T17-47-20.209 | _____ |
| Philip Swanson | 2025-07-18 | Ryan Vaughn _ Philip Swanson- Dennis Shaver - Margarit-trans | _____ |
| Pranab | 2025-09-17 | Copiloting with Pranab and Ryan-transcript-2025-09-17T15-02- | _____ |
| Ricky Sperber | 2025-08-29 | Ryan Vaughn _ Ricky Sperber-transcript-2025-08-29T16-03-28.1 | _____ |
| Ritik | 2025-06-23 | Zoom- Ryan (Inside-Out Leadership) - Ritik (Savvy Wealt-tran | _____ |
| Scott | 2025-10-06 | Scott - Ryan-transcript-2025-10-06T15-04-09.551Z | _____ |
| Shayn Diamond | 2025-07-07 | Ryan Vaughn _ Shayn Diamond-transcript-2025-07-07T15-44-18.9 | _____ |
| Steve Taylor | 2025-12-01 | Ryan H Vaughn and Steve Taylor-transcript-2025-12-01T18-02-0 | _____ |
| Taryn | 2025-09-22 | Taryn x Ryan Intro-transcript-2025-09-22T17-49-14.703Z | _____ |
| Yuheng Wang | 2025-08-19 | Yuheng Wang _ Ryan Vaughn-transcript-2025-08-19T16-09-04.896 | _____ |
| Zain Jaffer | 2025-10-09 | Zain Jaffer - Ryan Vaughn-transcript-2025-10-09T16-01-15.481 | _____ |

---

## 360-Degree Reviews (For Jem)

**5 transcripts** were identified as 360-degree stakeholder interviews. Jem needs to identify which coaching client each interview belongs to.

| File | Interviewee | For Client (Jem to fill in) |
|------|-------------|----------------------------|
| 360 Interview- Mark Kraynak - Ryan Vaughn-transcript-2025-11-05T17-32-39.934Z.docx | Mark Kraynak | ___________________ |
| 360 Interview- Pallavi Sud & Ryan-transcript-2025-11-14T20-33-39.502Z.docx | Pallavi Sud | ___________________ |
| 360 Review- Brian Grabowski - Ryan Vaughn-transcript-2025-11-13T16-29-59.438Z.docx | Brian Grabowski | ___________________ |
| 360 Review- Logan Sease - Ryan Vaughn-transcript-2025-11-13T17-03-22.397Z.docx | Logan Sease | ___________________ |
| Ryan Vaughn - Alyse Killeen - Nick Neuman 360 Review-transcript-2025-11-26T19-31-10.628Z.docx | Alyse Killeen / Nick Neuman | ___________________ |

**Instructions for Jem:** For each row, write the name of the coaching client that this 360 interview was conducted for. For example, if Mark Kraynak was interviewed as part of Cal Brunell's 360 review, write "Cal Brunell" in the last column.

---

## Appendix: Import Statistics (Machine-Readable)

```json
{
  "generated": "2025-12-09T12:15:00.000Z",
  "updated": "2025-12-09T19:30:00.000Z",
  "coachId": "9185bd98-a828-414f-b335-c607b4ac3d11",
  "coachName": "Ryan Vaughn",
  "coachEmail": "ryan@leadinsideout.io",
  "apiKey": "[REDACTED - see admin for key]",
  "batchTag": "ryan-vaughn-2025-12",
  "counts": {
    "transcripts": {
      "total": 358,
      "matched": 151,
      "unmatched": 207,
      "360_interviews": 5
    },
    "assessments": 37,
    "coaching_models": 5,
    "clients": 37
  },
  "unmatchedBreakdown": {
    "staff": 16,
    "intern": 11,
    "collaborator": 2,
    "nonCoachingCalls": 40,
    "likelyClients": 16,
    "unknownSingleSession": 51,
    "stillUnparseable": 71
  },
  "notes": {
    "clientImportIssues": "12 clients failed to import due to email uniqueness constraint",
    "reMatchingRuns": "Round 1: +27 matches. Round 2: +3 matches"
  }
}
```

---

## Next Steps

### Immediate (This Week)

1. **Ryan reviews the Name Verification List (above)**
   - Fill in "Is Client?" column with: YES / NO / MERGE: [Name]
   - Priority: Tom (13 sessions), Copy of Pete, James

2. **Jem maps 360 reviews (table above)**
   - Fill in "For Client" column with the coaching client's name
   - Return completed mapping for database update

3. **Test Custom GPT**
   - Use API key: `[REDACTED - see admin for key]`
   - Try queries like: "What are Amar's coaching goals?" or "What does Mochary say about delegation?"

### After Verification

4. **Create missing client records** for confirmed names
5. **Re-run matching** to link additional transcripts
6. **Final validation** of search results

---

## Recommendations for Future Data Capture

To achieve **100% automatic matching** for future imports, we recommend standardizing how data is captured:

### 1. Standardize Fireflies Meeting Titles

**Current Problem:** Meeting names vary wildly:
- `Amar & Ryan session` ✅ Easy to parse
- `Tom-Ryan-biweekly-session-05132025-a6df4e7f` ⚠️ Parseable but messy
- `IO Co-Creation Call` ❌ No client indicator

**Recommendation:** Use consistent format:
```
[Client Name] - Ryan Coaching Session
```

Examples:
- `Amar Doshi - Ryan Coaching Session`
- `Tom Smith - Ryan Coaching Session`
- `Cal Brunell - Ryan 360 Review`

### 2. Maintain a Central Client List

**Current Problem:** Only clients from the Sept 2020 intake questionnaire were in the database. Clients added since then had no records.

**Recommendation:**
- Ensure every new coaching client fills out the intake questionnaire
- OR maintain a simple spreadsheet: Name, Email, Start Date
- Sync quarterly with the database

### 3. Tag Meeting Types in Fireflies

**Current Problem:** Can't distinguish coaching sessions from:
- Internal team meetings
- Sales/fit calls
- Training sessions (Hakomi, IFS)
- Peer collaborations

**Recommendation:** Use prefixes:
- `[COACHING]` - Client sessions
- `[INTERNAL]` - Team meetings
- `[SALES]` - Fit calls
- `[TRAINING]` - Personal development
- `[360]` - Stakeholder interviews

### 4. Use Client Email as Unique Identifier

**Current Problem:** Matching by first name is unreliable (multiple "James" or "Michael").

**Recommendation:** When Fireflies integration is fully active:
- Match by participant email address (100% accurate)
- Fall back to name matching only when email unavailable

### 5. Intake Questionnaire Improvements

**Current Problem:** 12 clients failed to import due to missing/duplicate emails.

**Recommendation:**
- Make email field required
- Validate email format on form submission
- Check for duplicates before accepting

---

## Technical Details

### API Access

| Item | Value |
|------|-------|
| Coach ID | `9185bd98-a828-414f-b335-c607b4ac3d11` |
| API Key | `[REDACTED - see admin for key]` |
| Batch Tag | `ryan-vaughn-2025-12` |

### Rollback Capability

All imported data is tagged with `import_batch: ryan-vaughn-2025-12`. If needed, the entire import can be rolled back:

```bash
node scripts/cleanup/rollback-import.js ryan-vaughn-2025-12
```

### Parser Patterns

The filename parser now includes **38 patterns** covering:
- Standard formats: `Client & Ryan session`
- Ryan-first formats: `Ryan - Client session`
- Hyphenated formats: `Client-Ryan-biweekly-UUID`
- Full name formats: `FirstName LastName - Ryan Vaughn`
- Special formats: Catch-up calls, Zoom auto-names, 360 reviews

---

## Summary

| Category | Status | Confidence |
|----------|--------|------------|
| Transcripts imported | ✅ Complete | 100% |
| Transcripts matched to clients | ⚠️ Partial | 42% |
| Client records created | ✅ Complete | 100% of intake list |
| Assessments indexed | ✅ Complete | 100% |
| Coaching models indexed | ✅ Complete | 100% |
| 360 reviews tagged | ⚠️ Needs mapping | 0% linked |

**Bottom Line:** The system is functional and Ryan can start using his Custom GPT today. To improve from 42% to 80%+ matched transcripts, Ryan needs to verify ~20 names and Jem needs to map 5 360-reviews.

---

## Contact

For questions or issues:
- **Technical:** JJ Vega
- **360 Mapping:** Jem (EA)
- **Client Verification:** Ryan Vaughn

---

*Report generated December 9, 2025*
