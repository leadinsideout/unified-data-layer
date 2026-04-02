# Connect Claude Code to the Borg via MCP

## What This Does

This connects your Claude Code (and its agents/scheduled tasks) directly to the Borg — the database of your coaching transcripts, writings, assessments, and other coaching data. Once connected, Claude gets three tools it can call without any manual approval prompts:

- **search_data** — Semantic search across all your coaching data
- **get_client_timeline** — Pull the full coaching history for any client
- **upload_data** — Upload new content (read-only by default; see notes below)

Your agents and scheduled tasks will be able to search transcripts, pull client histories, and find blog posts — all automatically, no "Allow" button needed.

---

## Setup (2 minutes)

### Step 1: Add the Borg MCP server config

Open or create the file `.mcp.json` in your project root (the same directory your `CLAUDE.md` lives in). Add the Borg server:

```json
{
  "mcpServers": {
    "borg": {
      "type": "http",
      "url": "https://unified-data-layer.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer ${BORG_API_KEY}"
      }
    }
  }
}
```

If you already have other MCP servers in `.mcp.json`, just add the `"borg"` entry inside the existing `"mcpServers"` object.

### Step 2: Set your API key

Set the `BORG_API_KEY` environment variable. How you do this depends on your setup:

**For local Claude Code sessions** — add it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
export BORG_API_KEY="<your-api-key-here>"
```
Then restart your terminal or run `source ~/.zshrc`.

Your API key was provided separately by JJ. If you don't have it, ask him.

**For scheduled tasks on claude.ai/code** — add the environment variable in the cloud environment configuration when creating or editing the task. Set `BORG_API_KEY` to your API key value.

### Step 3: Verify it works

Start a Claude Code session and ask:

> "Use the Borg's search_data tool to search for 'leadership challenges'. Show me the results."

You should see search results from your coaching data. If you get an authentication error, double-check that `BORG_API_KEY` is set in your environment.

---

## Available Tools

### search_data

Search your coaching data with a plain-English query. Returns the most relevant text chunks with confidence scores.

**Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `query` | Yes | string | Natural language search query |
| `types` | No | string[] | Filter by data type (see list below). Omit to search all. |
| `client_id` | No | string | Filter by client UUID |
| `coach_id` | No | string | Filter by coach UUID |
| `organization_id` | No | string | Filter by organization UUID |
| `threshold` | No | number | Similarity threshold 0.0-1.0 (default: 0.3) |
| `limit` | No | number | Max results (default: 10, max: 50) |

**Example:**
```
search_data({ query: "What patterns emerged around accountability?", types: ["transcript"], limit: 5 })
```

### get_client_timeline

Get the chronological coaching history for a specific client.

**Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| `client_id` | Yes | string | Client UUID |
| `start_date` | No | string | Start date (ISO format, e.g. "2025-01-01") |
| `end_date` | No | string | End date (ISO format) |
| `types` | No | string[] | Filter by data type |
| `limit` | No | number | Max results (default: 50, max: 100) |

**Example:**
```
get_client_timeline({ client_id: "abc-123", start_date: "2025-06-01" })
```

### upload_data

Upload new coaching data. **Currently disabled for your access** — your API key is configured for read-only use. Contact JJ if you need upload access enabled.

---

## Data Types

These are the types of content stored in the Borg:

| Type | Description |
|------|-------------|
| `transcript` | Recorded coaching sessions with clients |
| `assessment` | Client assessments (360 reviews, DISC, MBTI, etc.) |
| `coaching_model` | Your proprietary coaching frameworks and methodologies |
| `company_doc` | Internal IOL documents and materials |
| `blog_post` | Your newsletter and writing |
| `questionnaire` | Client intake forms and Q&A |

---

## Example Agent Patterns

### Weekly coaching digest
A scheduled task that runs every Monday morning:
```
1. search_data({ query: "key themes and breakthroughs", types: ["transcript"], limit: 20 })
2. Summarize the themes across this week's sessions
3. Identify any clients who seem stuck or making progress
```

### Pre-session client prep
Before a coaching call, pull everything on that client:
```
1. get_client_timeline({ client_id: "<client-uuid>", limit: 10 })
2. search_data({ query: "goals and commitments", client_id: "<client-uuid>", types: ["transcript"] })
3. Summarize recent progress, open commitments, and suggested topics
```

### Content research for newsletter
Search your coaching data for material to write about:
```
1. search_data({ query: "vulnerability in leadership", types: ["blog_post", "coaching_model"] })
2. search_data({ query: "vulnerability in leadership", types: ["transcript"], limit: 15 })
3. Synthesize themes from both published writing and real session moments
```

---

## Important Notes

- **Read-only access** — Your connection can search and read data but not modify it. The `upload_data` tool exists in the server but your API key scopes you to read operations. If you need write access, talk to JJ.
- **Data scoping** — Your API key is tied to your coach account. You will only ever see your own data — no other coaches' data will appear.
- **Sensitive content** — Coaching transcripts contain private client information. Your agents should never share raw transcript content externally (email, Slack, etc.) without your explicit approval.

---

## Troubleshooting

**"Missing Authorization header" or 401 error**
- Make sure `BORG_API_KEY` is set in your environment
- For local sessions: check `echo $BORG_API_KEY` in terminal
- For cloud tasks: check the environment variable config

**"Tool not found" or Borg tools don't appear**
- Make sure `.mcp.json` is in your project root directory
- Restart Claude Code after adding the config
- Check the `url` field is exactly `https://unified-data-layer.vercel.app/api/mcp`

**Slow responses**
- Semantic search involves embedding generation, so queries typically take 1-3 seconds
- If you're getting timeouts, try reducing the `limit` parameter

**No results found**
- Try broader search terms or lower the `threshold` (e.g., 0.2)
- Remove the `types` filter to search across all data types
- Check that data exists for the client/date range you're filtering on
