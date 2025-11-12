# Custom GPT Setup Guide

**Purpose**: Step-by-step instructions for creating and configuring a Custom GPT that integrates with the Unified Data Layer API.

**Prerequisites**: ChatGPT Plus or ChatGPT Team account

**Last Updated**: 2025-11-10

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
You are a coaching transcript analyst. Your role is to help coaches search
through their client transcripts, assessments, coaching models, and company
documents to answer questions about client progress, patterns, and insights.

When a user asks a question:
1. Use the searchCoachingData action to find relevant content
   - IMPORTANT: Always set threshold to 0.3 (default) or lower for broader results
   - Use threshold 0.25 for exploratory searches
   - Only use higher thresholds (0.4+) if user explicitly wants precise matches
2. Analyze the retrieved content carefully
3. Synthesize a clear, helpful answer that directly addresses the question
4. Include specific quotes or references when possible
5. If no relevant information is found, try lowering the threshold before giving up

Search Parameters:
- query: Your search query (natural language)
- threshold: 0.3 (default, use 0.25 for broader results)
- limit: 10 (adjust based on complexity of question)
- types: Filter by data type if needed (transcript, assessment, coaching_model, company_doc)

Guidelines:
- Be professional and supportive
- Focus on factual information from the data
- Highlight patterns and insights when you notice them
- Respect client confidentiality (this is a private tool)
- If asked about multiple topics, search separately for each
- When results are sparse, try a lower threshold before suggesting query refinement
- Multi-type data is available: transcripts, assessments, coaching models, company docs

Remember: You have access to semantic search across multiple data types, so users
can ask natural questions like "What did the client say about career goals?" and
you'll find relevant content even if those exact words weren't used.
```

### Step 5: Conversation Starters (Optional)

Add these suggested prompts for users:

```
What patterns do you see across my recent client sessions?
```

```
What did [client name] discuss about their career goals?
```

```
Show me conversations about work-life balance
```

```
What insights can you find about client progress over time?
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

The schema will be automatically loaded with:
- `searchTranscripts` - Search coaching transcripts
- `uploadTranscript` - Upload new transcripts (if you want GPT to help with uploads)

**Method 2: Manual Paste (Alternative)**

1. Go to: https://unified-data-layer.vercel.app/openapi.json
2. Copy the entire JSON schema
3. Paste into the Schema field
4. Click "Import"

### Step 10: Configure Action Authentication

**For Phase 1 (Testing):**
1. Authentication: **None**
2. (We're testing with public API - no auth yet)

**For Phase 3+ (Production with Auth):**
1. Authentication: **API Key**
2. Auth Type: **Bearer**
3. API Key: `[Your Production API Key]`
4. Custom Header Name: `Authorization`

*Note: You'll update this in Phase 3 when we add authentication.*

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
1. ✅ **Test thoroughly** with all 3 test scenarios
2. ✅ **Upload real transcripts** (via API)
3. ✅ **Try various question types** to understand capabilities
4. ✅ **Document any issues** for Phase 2 improvements

### Phase 2 Enhancements
- Support for multiple data types (assessments, personality profiles)
- Better metadata filtering (date ranges, client IDs)
- Enhanced search capabilities

### Phase 3 Security
- Authentication via API key
- Row-level security (RLS) for multi-tenant
- PII scrubbing

### Phase 4 Production
- MCP server integration (for Claude)
- Shared Custom GPTs for multiple coaches
- Real-time updates via webhooks

---

## Questions?

**Q: Can I share this Custom GPT with others?**
A: Not yet (Phase 1 is single-user testing). In Phase 4, you'll be able to share with controlled access.

**Q: How much does this cost?**
A: ChatGPT Plus subscription ($20/mo) + API costs (search queries + embeddings). See Phase 1 results doc for actual costs.

**Q: Can I use this with Claude instead?**
A: Yes! Phase 4 includes an MCP server for Claude integration (even better - no schema caching issues).

**Q: What if the API goes down?**
A: Custom GPT will return an error. Check https://unified-data-layer.vercel.app/api/health for status.

**Q: Can I edit transcripts after uploading?**
A: Not in Phase 1. Phase 2 will add update/delete capabilities.

---

## Change Log

| Date | Change | Reason |
|------|--------|--------|
| 2025-11-10 | Initial creation | Checkpoint 3 - Custom GPT setup guide for Phase 1 |
