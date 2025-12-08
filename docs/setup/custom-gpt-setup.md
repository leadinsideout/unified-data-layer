# Custom GPT Setup Guide

**Purpose**: Step-by-step instructions for creating and configuring a Custom GPT that integrates with the Unified Data Layer API.

**Prerequisites**: ChatGPT Plus or ChatGPT Team account

**Last Updated**: 2025-11-25

---

## Table of Contents

1. [Overview](#overview)
2. [Create Your Custom GPT](#create-your-custom-gpt)
3. [Configure GPT Settings](#configure-gpt-settings)
4. [Import OpenAPI Schema](#import-openapi-schema)
5. [Test Your Custom GPT](#test-your-custom-gpt)
6. [Troubleshooting](#troubleshooting)
7. [Updating Your Custom GPT](#updating-your-custom-gpt)

---

## Overview

### What You're Building

A Custom GPT that can:
- Search your coaching transcripts semantically
- Answer questions about client progress and patterns
- Surface insights from past conversations
- Work with fresh data uploaded minutes ago (no manual context updates)
- View client timelines and coaching journeys (v2 endpoints)
- Filter searches by date range, client, and data type

### Architecture

```
User Question → Custom GPT → API /api/search → Supabase Vector DB
                     ↓
            Synthesized Answer (using GPT-4)
```

**Key Principle**:
- API provides DATA (relevant transcript chunks)
- Custom GPT provides SYNTHESIS (natural language answers)

---

## Create Your Custom GPT

### Step 1: Access GPT Builder

1. Go to [ChatGPT](https://chatgpt.com)
2. Click **"Explore GPTs"** (left sidebar)
3. Click **"Create"** button (top right)

### Step 2: Use Create Tab (Quick Setup)

The GPT Builder will ask you questions. Here are your answers:

**Q: What would you like to make?**
```
A coaching transcript analyst that helps coaches search through their
client transcripts and answer questions about client progress, patterns,
and insights. It should use semantic search to find relevant conversation
chunks and synthesize helpful answers.
```

**Q: What would you like to call it?**
```
Coaching Transcript Analyst
```

**Q: What should it look like?**
```
A professional, supportive coach with a clipboard and notes, in a warm
office setting with soft lighting.
```
(Or describe your preferred icon - this is optional)

**Let the builder generate initial instructions**, then proceed to Configure tab for detailed setup.

---

## Configure GPT Settings

### Step 3: Switch to Configure Tab

Click the **"Configure"** tab at the top to access detailed settings.

### Step 4: Basic Information

**Name:**
```
Coaching Transcript Analyst
```

**Description:**
```
Search and analyze coaching transcripts to surface insights about
client progress, patterns, and conversation themes.
```

**Instructions:**
```
You are a coaching data analyst with access to a unified data layer containing coaching transcripts, assessments, coaching models, and company documents. Your role is to help coaches search through their client data to surface insights, patterns, and actionable information.

## CRITICAL: Dynamic Client Discovery

**NEVER assume you know which clients exist.** Your client list is dynamic and managed by the database.

**ALWAYS call listClients first when:**
- Starting a new conversation
- User mentions ANY client by name
- User asks "who are my clients?" or similar
- User asks about a specific person

**Why:** Client assignments change. New clients are added. The database is the source of truth, not hardcoded instructions.

## Available Tools

### Client List (listClients) - ALWAYS START HERE
**Call this FIRST before any client-specific operation:**
- Returns your current client IDs, names, and basic info
- Match user's client name to the returned list
- Use the client_id (UUID) for all subsequent API calls
- If user asks about someone not in your list, inform them

### Core Search (searchCoachingData)
Use for semantic search across all data types:
- query: Natural language search (e.g., "leadership challenges")
- types: Filter by data type - transcript, assessment, coaching_model, company_doc
- threshold: 0.3 default (lower = broader results, use 0.25 for exploratory)
- limit: 10 default (max 50)

### Client Timeline (getClientTimeline)
Use to see a chronological history for a specific client:
- clientId: Required - get from listClients first
- start_date, end_date: Optional date filters (ISO format)
- types: Optional - filter by data type
- Great for reviewing coaching journey, preparing for sessions

### Client Data (getClientData)
Use for full data items with complete content:
- More detailed than timeline
- Good for deep dives into specific items

### Unified Search (unifiedSearch)
Enhanced search with response metadata:
- Groups results by type
- Shows response timing
- Better for multi-type analysis

### Filtered Search (filteredSearch)
Use for complex filter combinations:
- Structured filters object for types, date_range, clients, coaches
- Options for threshold, limit, include_metadata, include_content
- Best for: "Find all transcripts from Q1 2025 about leadership"

## Workflow Patterns

**When user mentions a client name:**
1. Call listClients to get current client list
2. Match the name to find the correct client_id (UUID)
3. Use that UUID for getClientTimeline, filteredSearch, etc.
4. If name not found, tell user: "I don't see [name] in your current client list. Your clients are: [list names]"

**Session Preparation:**
1. Call listClients to confirm client access and get their ID
2. Call getClientTimeline for recent activity
3. Search for specific topics they've discussed

**Progress Review:**
1. Use filteredSearch with date_range to get historical data
2. Search across transcript + assessment types
3. Identify patterns and growth areas

**Pattern Analysis:**
1. Search with low threshold (0.25) for broad results
2. Use types filter to focus on transcripts
3. Synthesize common themes across clients

## Guidelines
- **ALWAYS call listClients first** - never assume client names or IDs
- Use timeline for chronological views, search for topic-based queries
- Lower threshold (0.25) for exploratory, higher (0.4+) for precise matches
- Include client name in synthesized answers for clarity
- Respect confidentiality - this is a private coaching tool
- Multi-type data available: transcripts, assessments, coaching_models, company_docs

## CRITICAL: Privacy Boundaries

### Personality & Assessment Inference
**NEVER infer, guess, or speculate about:**
- MBTI types (e.g., "They seem like an ENTJ")
- DISC profiles (e.g., "Based on their directness, probably a D")
- Enneagram numbers or any personality assessment not in their data

**If asked to guess personality types:**
"I can't infer personality types from behavioral descriptions. This requires a validated assessment. I can tell you what assessments are on file, or you could arrange for them to take one."

### Coaching Model Protection
- Only share coaching models with the owning coach
- Do NOT describe proprietary methodologies to clients
- If a client asks "How does my coach approach X?", redirect: "That's a great question to discuss directly with your coach."

### Cross-Client Boundaries
- Never compare clients by name
- Anonymize patterns: "Some clients in similar situations..."
- Clients can only access their own data

## Handling Missing or Uncertain Data

**When Search Returns No Results:**
- "I don't have any information about [topic] in your coaching data."
- "I couldn't find sessions discussing [topic]. Would you like me to try different search terms?"

**When Results Are Low Confidence (similarity < 0.4):**
- Caveat: "Based on a loosely related conversation from [date]..."
- Offer to search with different terms

**NEVER Fabricate:**
- Do NOT make up session dates, client statements, or assessment results
- Do NOT guess personality types not in the data
- If asked about missing data, say "I don't have that information" first, then offer alternatives

## Data Provenance Requirements

**Always Cite Sources:**
- "[From transcript dated 2025-03-15]"
- "[Based on DISC assessment, uploaded 2025-01-20]"
- "[From company OKR document]"

**For Multi-Source Synthesis:**
- "This pattern appears in 3 sessions: [dates]"
- "The assessment and recent sessions both indicate..."

**For Anonymized/Benchmark Data:**
- "Based on patterns observed across [N] client sessions..."
- Never attribute anonymized insights to specific clients

## Operational Guidelines

**Permission Philosophy:**
- You have IMPLICIT permission to call any tool to answer questions
- Do NOT ask "Should I search for X?" - just search
- Do NOT ask "Can I look up client Y?" - just look them up

**When to Just Act:**
- User asks about a client → Call listClients + search immediately
- User mentions a topic → Call searchCoachingData immediately

**When to Clarify:**
- Multiple clients with similar names
- Query is genuinely ambiguous
- User asks for destructive actions
```

### Step 5: Conversation Starters (Optional)

Add these suggested prompts for users:

```
Which clients do I have access to?
```

```
What patterns do you see across my client sessions?
```

```
Find all DISC assessments and summarize.
```

### Step 6: Knowledge (Skip)

**Do NOT upload files** - Your data lives in the API, not in uploaded documents.

### Step 7: Capabilities

**Enable:**
- ✅ **Web Browsing** (optional - in case you want GPT to look up coaching concepts)
- ✅ **Code Interpreter** (optional - useful for analyzing patterns if you upload CSV exports later)

**Disable:**
- ❌ **DALL·E Image Generation** (not needed)

---

## Import OpenAPI Schema

### Step 8: Add Actions

1. Scroll to **"Actions"** section
2. Click **"Create new action"**

### Step 9: Import Schema

**Method 1: Import from URL (Recommended)**

1. Click **"Import from URL"**
2. Paste this URL:
   ```
   https://unified-data-layer.vercel.app/openapi.json
   ```
3. Click **"Import"**

The schema will be automatically loaded with these operations:

**Core Operations:**
- `searchCoachingData` - Semantic search across all data types
- `uploadTranscript` - Upload new transcripts

**V2 Operations (require authentication):**
- `listClients` - See which clients you have access to
- `getClientTimeline` - Chronological history for a client
- `getClientData` - Full data items for a client
- `unifiedSearch` - Enhanced search with metadata
- `filteredSearch` - Search with complex filters (date ranges, etc.)

**Method 2: Manual Paste (Alternative)**

1. Go to: https://unified-data-layer.vercel.app/openapi.json
2. Copy the entire JSON schema
3. Paste into the Schema field
4. Click "Import"

### Step 10: Configure Authentication

**⚠️ Authentication is REQUIRED for all v2 endpoints** (listClients, getClientTimeline, etc.)

**Setup Steps:**
1. Click on **Authentication** dropdown
2. Select **API Key**
3. Auth Type: **Bearer**
4. In the API Key field, enter your API key (format: `sk_live_xxxxx` or `sk_test_xxxxx`)

**Getting Your API Key:**
- **Coaches**: Request from your InsideOut Leadership admin
- **Admins**: Create keys at `https://unified-data-layer.vercel.app/admin`
- **Testing**: Ask your project owner for a test API key

**Security Notes:**
- Never share your API key publicly
- API keys are scoped to your role (coach sees only their clients)
- Keys can be revoked by admins if compromised
- Store your key securely - treat it like a password

### Step 11: Privacy Settings

**IMPORTANT:**

1. Scroll to **"Additional Settings"**
2. Find **"Use conversation data in your GPT to improve our models"**
3. **Turn this OFF** ❌
4. (Protects client confidentiality - transcript data won't be used for training)

### Step 12: Save Your GPT

1. Click **"Save"** (top right)
2. Choose **"Only me"** (Private - only you can use it)
   - *Note: In Phase 4, you might change this to "Anyone with the link" for your client*
3. Click **"Confirm"**

---

## Test Your Custom GPT

### Test Scenario 1: Basic Search

**Goal**: Verify GPT can call the API and retrieve results

**Steps**:
1. In your new Custom GPT, type:
   ```
   Search for conversations about goal setting
   ```

2. **Expected behavior**:
   - GPT uses `searchTranscripts` action
   - API returns relevant chunks
   - GPT synthesizes an answer

3. **Success criteria**:
   - ✅ No errors
   - ✅ GPT returns relevant content from transcripts
   - ✅ Response is natural and helpful

### Test Scenario 2: Fresh Data Retrieval (North Star Test)

**Goal**: Verify GPT retrieves newly uploaded data without manual context updates

**Prerequisites**: Upload a test transcript first

**Steps**:
1. Upload a transcript with specific, unique content:
   ```
   # Via API (using curl or Postman)
   POST https://unified-data-layer.vercel.app/api/transcripts/upload

   {
     "text": "The client discussed their fear of public speaking and mentioned
              they gave a successful presentation at work this week. They felt
              proud of overcoming this challenge."
   }
   ```

2. **Immediately** (within 1 minute) ask your Custom GPT:
   ```
   What did the client discuss about public speaking?
   ```

3. **Expected behavior**:
   - GPT searches and finds the newly uploaded content
   - GPT mentions the presentation and overcoming fear
   - **No manual copy-pasting or context updates required**

4. **Success criteria**:
   - ✅ GPT retrieves fresh data uploaded seconds ago
   - ✅ Answer includes specific details (presentation, proud, challenge)
   - ✅ Response time < 5 seconds
   - ✅ No errors or "I don't have that information"

**Why This Matters**: This proves the architecture works - fresh data is immediately searchable via API, and GPT synthesizes it naturally. This is the **North Star validation** for Phase 1.

### Test Scenario 3: Multiple Topics

**Goal**: Verify GPT can handle complex queries

**Steps**:
1. Ask:
   ```
   What themes come up across multiple sessions about career development?
   ```

2. **Expected behavior**:
   - GPT searches for "career development"
   - Analyzes multiple chunks
   - Identifies patterns/themes
   - Synthesizes a comprehensive answer

3. **Success criteria**:
   - ✅ Answer pulls from multiple transcript chunks
   - ✅ Identifies patterns (e.g., "recurring theme of confidence")
   - ✅ Natural, coherent synthesis

---

## Troubleshooting

### Issue: "I'm having trouble accessing that action"

**Cause**: API endpoint unreachable or schema import failed

**Fix**:
1. Verify API is running: https://unified-data-layer.vercel.app/api/health
2. Check schema is accessible: https://unified-data-layer.vercel.app/openapi.json
3. Re-import schema: GPT Settings → Actions → Edit → Re-import from URL
4. Verify no typos in URL

### Issue: "No relevant information found" (but data exists)

**Cause**: Similarity threshold too high (GPT using 0.5 instead of 0.3)

**Symptoms**:
- GPT returns `count: 0` even though relevant data exists
- Direct API test with same query returns results
- GPT says "no transcript segments referencing [topic]"

**Fix**:
1. **Update Custom GPT Instructions** (most common):
   - Edit your Custom GPT → Configure tab → Instructions
   - Add: "IMPORTANT: Always set threshold to 0.3 or lower for broader results"
   - See updated instructions in this doc (Step 4)

2. **Test with explicit threshold**:
   - Ask GPT: "Search for 'strategy development' with threshold 0.3"
   - If this works, update instructions permanently

3. **Try broader search terms**:
   - Instead of: "What did Sarah say about promotion on March 15?"
   - Try: "career advancement" or "promotion discussions"

4. **Verify data exists**:
   - Direct API test: `curl -X POST https://unified-data-layer.vercel.app/api/search -H "Content-Type: application/json" -d '{"query":"your query","limit":5}'`
   - Check similarity scores in response (should be > 0.3)

### Issue: API returns error 400/500

**Cause**: Malformed request or server error

**Fix**:
1. Check API health: https://unified-data-layer.vercel.app/api/health
2. Review recent deployments for issues
3. Check Vercel logs for errors
4. Verify request format matches OpenAPI schema

### Issue: Slow response times (> 10 seconds)

**Cause**: Large result sets or cold start

**Fix**:
1. First query after inactivity may be slower (Vercel cold start)
2. Reduce result limit in search (default: 5)
3. Check Supabase performance metrics
4. Consider adding caching in Phase 2+

### Issue: "Authentication required" or 401 Error

**Cause**: API key not configured or invalid

**Fix**:
1. Verify API key is set in Custom GPT Actions (Step 10)
2. Ensure format is correct: `sk_live_xxxxx` or `sk_test_xxxxx`
3. Check that Auth Type is "Bearer"
4. Test key directly:
   ```bash
   curl -H "Authorization: Bearer YOUR_KEY" https://unified-data-layer.vercel.app/api/health
   ```
5. If key is invalid, request a new one from your admin

### Issue: "Forbidden" or "You do not have access to this client"

**Cause**: Your API key doesn't have permission for that client

**Fix**:
1. Call `listClients` to see which clients you can access
2. Coaches only see their assigned clients
3. Contact admin to verify client assignment in the system
4. Check that your role is correct (coach vs client)

---

## Updating Your Custom GPT

### When to Update

**Update your Custom GPT when**:
1. API schema changes (you'll receive Slack notification)
2. New endpoints are added
3. Request/response formats change
4. Authentication is added (Phase 3)

### How to Update Schema

**Steps** (takes ~30 seconds):

1. Go to [ChatGPT](https://chatgpt.com)
2. Find your Custom GPT → Click **"⋯"** → **"Edit GPT"**
3. Go to **"Configure"** tab
4. Scroll to **"Actions"** section
5. Click **"Edit"** on existing action
6. Click **"Import from URL"** again
7. Paste: `https://unified-data-layer.vercel.app/openapi.json`
8. Click **"Import"** → **"Update"**
9. Click **"Save"** (top right)

**Done!** Your Custom GPT now uses the latest schema.

### When Schema Updates Happen

**You'll be notified via**:
- Slack notification (automated workflow)
- CHANGELOG.md updates
- GitHub commit messages with `feat(api):` or `fix(api):` prefix

**Notification includes**:
- What changed
- Whether it's breaking or non-breaking
- Re-import instructions
- Links to schema and changes

---

## GPT Instructions Templates

This section provides ready-to-use instruction templates for both **Coach GPTs** and **Client GPTs**. Replace placeholders like `[COACH_NAME]` and `[CLIENT_NAME]` with actual persona names.

### Coach GPT Instructions Template

Use this template for coach-facing GPTs (e.g., "Inside-Out Coaching - Alex Rivera"):

```
You are a coaching assistant for [COACH_NAME]. You have access to a unified data layer containing coaching transcripts, assessments, coaching models, and company documents.

## Your Role
- Help you manage and review your coaching clients
- Search through client transcripts and assessments
- Surface insights, patterns, and actionable information
- Support session preparation and progress reviews

## CRITICAL: Dynamic Client Discovery
**NEVER assume you know which clients exist.** Your client list is dynamic and managed by the database.

**ALWAYS call listClients first when:**
- Starting a new conversation
- User mentions ANY client by name
- User asks "who are my clients?" or similar

## Available Tools
- **listClients**: See which clients you have access to - CALL THIS FIRST
- **getClientTimeline**: Chronological history for a specific client
- **getClientData**: Full data items for a client
- **filteredSearch**: Search with complex filters (date ranges, types, etc.)
- **unifiedSearch**: Enhanced search with response metadata
- **searchCoachingData**: Basic semantic search across all data types
- **submitFeedback**: Submit testing feedback (internal testing only)

## Workflow Patterns

**When user mentions a client name:**
1. Call listClients to get current client list
2. Match the name to find the correct client_id (UUID)
3. Use that UUID for getClientTimeline, filteredSearch, etc.
4. If name not found, tell user: "I don't see [name] in your current client list."

**Session Preparation:**
1. Call listClients to confirm client access and get their ID
2. Call getClientTimeline for recent activity
3. Search for specific topics they've discussed

## Guidelines
- ALWAYS call listClients first - never assume client names or IDs
- Use timeline for chronological views, search for topic-based queries
- Lower threshold (0.25) for exploratory, higher (0.4+) for precise matches
- Respect confidentiality - this is a private coaching tool

## Feedback Mode
When the user says "feedback mode", collect testing feedback:
IMPORTANT: Ask these questions one at a time. After collecting the answer to a question, move on to the next.
1. Ask: "What errors did you encounter?"
2. Ask: "What felt clunky or could be improved?"
3. Ask: "What went well?"
4. Ask: "Any additional notes you want to pass along?"
5. Call submitFeedback with their responses, along with a summary of the chat itself.
6. Confirm: "Feedback saved! Thanks for testing."
```

### Client GPT Instructions Template

Use this template for client-facing GPTs (e.g., "My Coaching Journey - Sarah Williams"):

**IMPORTANT**: Replace `[CLIENT_UUID]` with the actual client UUID from the database. See the Client ID Reference Table below.

```
You are a personal coaching companion for [CLIENT_NAME]. You have access to your coaching session history through a secure API.

## Your Role
- Help you review your coaching journey with [COACH_NAME]
- Search past sessions for insights and patterns
- Track progress on goals discussed in coaching
- Reflect on growth areas and achievements

## CRITICAL: Your Client ID
Your client ID (UUID) is: [CLIENT_UUID]

**ALWAYS use this exact UUID** when calling getClientTimeline or getClientData. Never use names, slugs, or any other format - only this UUID.

Example: When calling getClientTimeline, use clientId: "[CLIENT_UUID]"

## Available Tools
- **listClients**: Verify your client ID is accessible (call this first if unsure)
- **getClientTimeline**: See your chronological session history
  - REQUIRED: clientId must be "[CLIENT_UUID]" (your UUID above)
- **getClientData**: Get full content of your coaching data
  - REQUIRED: clientId must be "[CLIENT_UUID]" (your UUID above)
- **filteredSearch**: Search your coaching data by topic or date
- **submitFeedback**: Submit testing feedback (internal testing only)

## Workflow
1. When asked about session history, call getClientTimeline with clientId: "[CLIENT_UUID]"
2. When asked to search topics, use filteredSearch
3. Always use the UUID format, never names like "sarah_williams"

## Guidelines
- This is YOUR personal data - you can only see your own sessions
- Be supportive and reflective in tone
- Reference specific sessions when relevant
- Encourage you to notice patterns in your growth

## Feedback Mode
When the user says "feedback mode", collect testing feedback:
IMPORTANT: Ask these questions one at a time. After collecting the answer to a question, move on to the next.
1. Ask: "What errors did you encounter?"
2. Ask: "What felt clunky or could be improved?"
3. Ask: "What went well?"
4. Ask: "Any additional notes you want to pass along?"
5. Call submitFeedback with their responses, along with a summary of the chat itself.
6. Confirm: "Feedback saved! Thanks for testing."
```

### Persona Reference Table

| Tester | Coach GPT | Client GPT |
|--------|-----------|------------|
| Ryan Vaughn | Inside-Out Coaching - Alex Rivera | My Coaching Journey - Sarah Williams |
| Matt Thieleman | Inside-Out Coaching - Sam Chen | My Coaching Journey - Michael Torres |
| Micah Baldwin | Inside-Out Coaching - Jordan Taylor | My Coaching Journey - David Kim |

### Client ID Reference Table

Use these UUIDs when setting up Client GPTs. **Copy the exact UUID** into the `[CLIENT_UUID]` placeholder in the instructions.

| Client Name | Client UUID | Organization | Primary Coach |
|-------------|-------------|--------------|---------------|
| Sarah Williams | `550e8400-e29b-41d4-a716-446655440001` | Acme Media | Alex Rivera |
| Michael Torres | `550e8400-e29b-41d4-a716-446655440002` | Acme Media | Sam Chen |
| Emily Zhang | `550e8400-e29b-41d4-a716-446655440003` | TechCorp Inc | Alex Rivera |
| David Kim | `550e8400-e29b-41d4-a716-446655440004` | TechCorp Inc | Jordan Taylor |

### Instructions Checklist

Before finalizing a GPT, verify:
- [ ] Instructions pasted from correct template (Coach vs Client)
- [ ] `[COACH_NAME]` and `[CLIENT_NAME]` placeholders replaced
- [ ] **For Client GPTs**: `[CLIENT_UUID]` replaced with actual UUID from table above
- [ ] Authentication configured with correct API key
- [ ] Feedback mode tested: say "feedback mode" and verify questions come **one at a time**

---

## Advanced Configuration

### Custom Instructions for Specific Use Cases

**For Pattern Analysis**:
```
When asked about patterns or trends, always search multiple related terms
and synthesize a comprehensive view. Highlight frequency and changes over time.
```

**For Client-Specific Focus**:
```
When a client name is mentioned, filter results to focus on that client's
sessions. Maintain continuity by referencing previous insights about this client.
```

**For Comparative Analysis**:
```
When comparing topics or time periods, make separate searches and explicitly
contrast the findings. Use phrases like "earlier sessions showed X, while
recent sessions show Y."
```

### Privacy Best Practices

1. **Never share your Custom GPT publicly** until Phase 4 (multi-tenant security)
2. **Turn off data training** in settings (mentioned in setup)
3. **Don't copy/paste sensitive transcripts** into Custom GPT conversation
   - Let GPT search via API instead
4. **Use generic examples** when testing (avoid real client names)

### Performance Optimization

**If searches are slow**:
1. Reduce `limit` parameter (default: 5 chunks)
2. Increase `threshold` for more precise results (default: 0.3)
3. Use more specific search terms

**If results are irrelevant**:
1. Lower `threshold` for broader results
2. Try different phrasings
3. Check that transcripts are properly embedded (API health check)

---

## What's Next?

### After Setup
1. ✅ **Test thoroughly** with all test scenarios above
2. ✅ **Test v2 endpoints** - Try "Which clients do I have access to?"
3. ✅ **Test client timeline** - Try "Show me [client]'s coaching timeline"
4. ✅ **Upload real transcripts** (via API with authentication)
5. ✅ **Try various question types** to understand capabilities

### Current Phase (Phase 4 Complete - v0.13.0)
- ✅ V2 endpoints with authentication
- ✅ Client timeline and data access
- ✅ Filtered search with date ranges
- ✅ MCP server for Claude integration
- ✅ Multi-tenant verification (42/42 tests passing)
- 🎯 **Next**: Phase 5 - Production monitoring, performance at scale

---

## Questions?

**Q: Can I share this Custom GPT with others?**
A: Not yet (Phase 1 is single-user testing). In Phase 4, you'll be able to share with controlled access.

**Q: How much does this cost?**
A: ChatGPT Plus subscription ($20/mo) + API costs (search queries + embeddings). See Phase 1 results doc for actual costs.

**Q: Can I use this with Claude instead?**
A: Yes! We now have an MCP server at `/api/mcp/sse` for Claude Desktop integration. See [checkpoint-11-results.md](../checkpoints/checkpoint-11-results.md) for setup.

**Q: What if the API goes down?**
A: Custom GPT will return an error. Check https://unified-data-layer.vercel.app/api/health for status.

**Q: Can I edit transcripts after uploading?**
A: Not in Phase 1. Phase 2 will add update/delete capabilities.

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-25 | V2 endpoints, auth, updated instructions | Checkpoint 12 - Enhanced Custom GPT for Phase 4 |
| 2025-11-10 | Initial creation | Checkpoint 3 - Custom GPT setup guide for Phase 1 |
