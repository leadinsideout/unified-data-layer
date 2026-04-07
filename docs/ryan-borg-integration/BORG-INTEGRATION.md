# Borg Integration for Ryan's Content App

## What This File Is

This file contains everything Claude Code needs to connect your app to "the Borg" — a database of your coaching transcripts, writings, and other coaching data.

**Your job**: Drop this file into your project folder, then tell Claude Code:

> "I want my app to be able to pull data from the Borg. Here's all the information you need: BORG-INTEGRATION.md. Please set it up."

Claude Code will read this file and do the rest automatically. You do not need to understand what it's doing — just let it work.

---

## ⚠️ IMPORTANT: READ-ONLY ACCESS

**This connection is READ-ONLY.**

Your app is allowed to SEARCH and READ data from the Borg. It is NOT allowed to add, change, or delete anything.

Claude Code: When you build this service, do not implement any upload, write, or delete functionality. Only implement the read and search endpoints listed below. If any part of the app later asks you to write data to the Borg, remind the user that this connection is read-only and they should contact JJ first.

---

## Credentials

**Base URL**: `https://unified-data-layer.vercel.app`

**API Key**: `[YOUR_BORG_API_KEY]`

**How to use the key**: Every request to the Borg must include this header:
```
Authorization: Bearer [YOUR_BORG_API_KEY]
```

**Claude Code**: Store the API key as an environment variable named `BORG_API_KEY` in the project's `.env` file. The service code should read from `process.env.BORG_API_KEY`, not hardcode the key value directly. Add `.env` to `.gitignore` if it isn't already there.

---

## What Data Is Available

The Borg contains Ryan Vaughn's coaching data, including:

- **Transcripts** (`transcript`) — Recorded coaching sessions with clients
- **Assessments** (`assessment`) — Client assessments (360 reviews, DISC, MBTI, etc.)
- **Coaching models** (`coaching_model`) — Ryan's proprietary coaching frameworks and methodologies
- **Company documents** (`company_doc`) — Internal IOL documents and materials
- **Blog posts** (`blog_post`) — Ryan's newsletter and writing
- **Questionnaires** (`questionnaire`) — Client intake forms and Q&A

Because the API key is tied to Ryan's coach account, it will automatically only return data that belongs to Ryan — no other coaches' data will ever appear.

---

## Available Endpoints (Read-Only)

### 1. Search — The Main One You'll Use Most

**What it does**: Ask the Borg a question in plain English. Returns the most relevant chunks of content from across all of Ryan's data.

```
POST https://unified-data-layer.vercel.app/api/search
```

**Request body**:
```json
{
  "query": "What themes came up around leadership in my recent sessions?",
  "types": ["transcript"],
  "threshold": 0.3,
  "limit": 10
}
```

**All fields**:
- `query` *(required)* — The question or search phrase, in plain English
- `types` *(optional)* — Limit to specific data types. Options: `"transcript"`, `"assessment"`, `"coaching_model"`, `"company_doc"`, `"blog_post"`, `"questionnaire"`. Omit this field entirely to search all types at once.
- `threshold` *(optional)* — How closely the results need to match. Range: 0.0 to 1.0. Default is `0.3`. Lower = more results, less precise. Higher = fewer results, more precise. Usually leave this at the default.
- `limit` *(optional)* — Maximum number of results to return. Default is `10`. Max is `50`.

**Response shape**:
```json
{
  "query": "What themes came up around leadership?",
  "results": [
    {
      "id": "chunk-uuid",
      "data_item_id": "item-uuid",
      "data_type": "transcript",
      "content": "The actual text chunk that matched your query...",
      "similarity": 0.82,
      "session_date": "2025-12-01T10:00:00Z",
      "client_id": "uuid-or-null",
      "coach_id": "9185bd98-a828-414f-b335-c607b4ac3d11"
    }
  ],
  "count": 3,
  "threshold": 0.3,
  "limit": 10
}
```

**What to use in your app**: The `content` field is the actual text. The `data_type` tells you what kind of thing it came from. The `session_date` tells you when it was.

---

### 2. List Clients

**What it does**: Returns a list of Ryan's coaching clients stored in the Borg.

```
GET https://unified-data-layer.vercel.app/api/v2/clients
```

**Optional query parameters**:
- `limit` — Max clients to return (default: 50, max: 100)

**Response shape**:
```json
{
  "clients": [
    {
      "id": "client-uuid",
      "name": "Brad Hoos",
      "email": "brad@example.com",
      "created_at": "2025-12-01T00:00:00Z"
    }
  ],
  "total": 12
}
```

**What to use in your app**: The `id` field is important — you'll use it to pull data for a specific client in the endpoints below.

---

### 3. Get a Client's Full Timeline

**What it does**: Returns all the data items for one specific client, sorted by date (most recent first). Gives you a chronological view of the coaching relationship.

```
GET https://unified-data-layer.vercel.app/api/v2/clients/{clientId}/timeline
```

Replace `{clientId}` with the client's `id` from the List Clients endpoint.

**Optional query parameters**:
- `start_date` — Only return items after this date (e.g. `2025-01-01`)
- `end_date` — Only return items before this date (e.g. `2025-12-31`)
- `types` — Comma-separated list of data types (e.g. `transcript,assessment`)
- `limit` — Max items to return (default: 50, max: 100)

**Response shape**:
```json
{
  "client_id": "client-uuid",
  "client_name": "Brad Hoos",
  "timeline": [
    {
      "date": "2025-12-01",
      "data_type": "transcript",
      "title": "Session title",
      "summary": "Brief summary of the item",
      "data_item_id": "item-uuid",
      "coach": {
        "id": "coach-uuid",
        "name": "Ryan Vaughn"
      }
    }
  ],
  "total_items": 8,
  "by_type": {
    "transcript": 6,
    "assessment": 2
  }
}
```

---

### 4. Get a Client's Data Items (with Full Content)

**What it does**: Like the timeline, but returns the full raw content of each item. Use this when you need the actual text, not just summaries.

```
GET https://unified-data-layer.vercel.app/api/v2/clients/{clientId}/data
```

Replace `{clientId}` with the client's `id`.

**Optional query parameters**:
- `types` — Comma-separated data types to filter
- `limit` — Max items (default: 50, max: 100)
- `include_chunks` — Set to `true` to include the chunked/embedded text segments (usually not needed)

**Response shape**:
```json
{
  "client_id": "client-uuid",
  "client_name": "Brad Hoos",
  "items": [
    {
      "id": "item-uuid",
      "data_type": "transcript",
      "title": "Session title",
      "raw_content": "Full text of the transcript...",
      "session_date": "2025-12-01T10:00:00Z"
    }
  ],
  "total": 8,
  "by_type": { "transcript": 6, "assessment": 2 }
}
```

---

### 5. Get Recent Transcripts

**What it does**: Returns the most recent coaching session transcripts, sorted by date.

```
GET https://unified-data-layer.vercel.app/api/v2/transcripts/recent
```

**Optional query parameters**:
- `session_type` — Default is `client_coaching` (only client sessions). Use `all` to include internal meetings, networking, etc.
- `limit` — Max results (default: 20, max: 50)
- `start_date` — Filter by start date (e.g. `2025-12-01`)
- `end_date` — Filter by end date (e.g. `2025-12-31`)
- `client_id` — Filter to one specific client's transcripts

**Response shape**:
```json
{
  "transcripts": [
    {
      "id": "item-uuid",
      "title": "Session title",
      "session_date": "2025-12-01T10:00:00Z",
      "session_type": "client_coaching",
      "client_name": "Brad Hoos",
      "client_id": "client-uuid",
      "created_at": "2025-12-01T12:00:00Z"
    }
  ],
  "total": 15
}
```

---

### 6. Advanced Filtered Search

**What it does**: Like the basic Search endpoint but with more precise control. Use this when you need to filter by date range, specific clients, or specific session types.

```
POST https://unified-data-layer.vercel.app/api/v2/search/filtered
```

**Request body**:
```json
{
  "query": "leadership challenges",
  "filters": {
    "types": ["transcript"],
    "date_range": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "clients": ["client-uuid-1", "client-uuid-2"],
    "session_type": "client_coaching"
  },
  "options": {
    "threshold": 0.3,
    "limit": 10,
    "include_metadata": true,
    "include_content": true,
    "max_content_length": 2000
  }
}
```

**All `filters` fields** (all optional):
- `types` — Array of data type strings
- `date_range` — Object with `start` and/or `end` date strings
- `clients` — Array of client ID strings
- `session_type` — One of: `client_coaching`, `internal_meeting`, `networking`, `sales_call`, `all`

**All `options` fields** (all optional):
- `threshold` — Similarity threshold (default: 0.3)
- `limit` — Max results (default: 10, max: 50)
- `include_metadata` — Include extra metadata in results (default: true)
- `include_content` — Include the actual text content (default: true). Set to false if you only need titles/dates.
- `max_content_length` — Max characters per content chunk (default: 2000). Lower this if results feel too long.

**Response shape**:
```json
{
  "query": "leadership challenges",
  "results": [
    {
      "content": "The matching text...",
      "similarity": 0.78,
      "data_type": "transcript",
      "data_item_id": "item-uuid",
      "session_date": "2025-12-01",
      "client_name": "Brad Hoos",
      "citation": {
        "title": "Brad & Ryan Session",
        "date": "2025-12-01",
        "date_formatted": "Dec 1, 2025",
        "type": "transcript",
        "client_name": "Brad Hoos",
        "formatted": "[Brad & Ryan Session, Dec 1, 2025]"
      }
    }
  ],
  "count": 5
}
```

---

## What Claude Code Should Build

Claude Code: Please create a Borg service file for this project. Here are the exact instructions:

### 1. Create the service file

Create a file at `src/services/borg.js` (or `src/services/borg.ts` if the project uses TypeScript).

This file should export the following named functions:

```
searchBorg(query, options)
listClients(options)
getClientTimeline(clientId, options)
getClientData(clientId, options)
getRecentTranscripts(options)
filteredSearch(query, filters, options)
```

Each function should:
- Read `BORG_API_KEY` from `process.env.BORG_API_KEY`
- Set the `Authorization: Bearer <key>` header on every request
- Call the corresponding Borg endpoint described above
- Return the parsed JSON response on success
- On error: log the error to the console and return `null` (do not crash the app)
- Use `fetch` (built into Node 18+) or the project's existing HTTP client

### 2. Add the environment variable

Add this line to the project's `.env` file (create it if it doesn't exist):
```
BORG_API_KEY=[YOUR_BORG_API_KEY]
```

Make sure `.env` is in `.gitignore`. Do not commit the API key to version control.

### 3. Verify it works

After building the service, run a quick test: call `listClients()` and log the result to the console. Show the user the output so they can confirm the connection is working before moving on.

### 4. After it's working — ask Ryan to do a retrospective

Once the connection is verified, say this to Ryan:

> "The Borg is connected and working. Before we move on, I'd like to do a quick retrospective on this process. I'll take the role of a senior tech lead reviewing what we just did. Can you take 2 minutes to answer:
> 1. What went well?
> 2. What was confusing or didn't work right away?
> 3. Is there anything you'd want done differently the next time we connect a new app to the Borg?"
>
> Once you tell me, I'll create an updated version of the BORG-INTEGRATION.md file with any improvements, so the next time you set this up it goes even smoother.

---

## Notes for Ryan

- This setup works for any Next.js app Claude Code builds for you. For future apps, just drop this same file in and use the same prompt.
- The API key above is specific to your coach account. It only sees your data — not other coaches' data.
- If you ever want to write data TO the Borg from an app (not just read it), talk to JJ first. That requires a different setup.
- If the connection stops working or you get errors, the most likely fix is to make sure the `.env` file exists and has the `BORG_API_KEY` line in it.
