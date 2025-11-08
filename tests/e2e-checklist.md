# End-to-End Test Checklist

**Purpose**: Manual E2E testing checklist to validate functionality before merging PRs and deploying to production.

**When to Run**:
- Before completing each checkpoint
- Before merging PRs to main
- After production deployments
- After any breaking changes

---

## Checkpoint 1: Local MVP Foundation

**Run**: Before merging phase-1-checkpoint-1 to main

### Test 1: Health Check
- [ ] Start server locally: `npm run dev`
- [ ] Test: `curl http://localhost:3000/api/health`
- [ ] Verify: Returns 200 with `{"status": "healthy"}`

### Test 2: Transcript Upload (Text)
- [ ] Create test transcript file or prepare JSON
- [ ] Test: `curl -X POST http://localhost:3000/api/transcripts/upload -H "Content-Type: application/json" -d '{"text": "Sample coaching session transcript...", "meeting_date": "2025-11-08"}'`
- [ ] Verify: Returns 201 with transcript_id
- [ ] Verify: Database shows new transcript record
- [ ] Note transcript_id for next tests: `_______________`

### Test 3: Embedding Generation
- [ ] Run: `node scripts/embed.js <transcript_id>`
- [ ] Verify: Script completes without errors
- [ ] Verify: Database shows transcript_chunks created
- [ ] Verify: Chunks have embeddings (1536-dimensional vectors)
- [ ] Note: Number of chunks created: `_______________`

### Test 4: Semantic Search
- [ ] Test: `curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{"query": "career goals", "limit": 5}'`
- [ ] Verify: Returns 200 with results array
- [ ] Verify: Results contain similarity scores (0.0-1.0)
- [ ] Verify: Results contain content chunks
- [ ] Verify: Results sorted by similarity (descending)

### Test 5: Error Handling
- [ ] Test empty transcript: `curl -X POST http://localhost:3000/api/transcripts/upload -H "Content-Type: application/json" -d '{"text": ""}'`
- [ ] Verify: Returns 400 error
- [ ] Test missing query: `curl -X POST http://localhost:3000/api/search -H "Content-Type: application/json" -d '{}'`
- [ ] Verify: Returns 400 error

**Checkpoint 1 Complete**: [ ] All tests pass

---

## Checkpoint 2: Deployment & Public Access

**Run**: Before merging phase-1-checkpoint-2 to main

### Test 6: Vercel Preview Deployment
- [ ] Create PR for checkpoint 2
- [ ] Locate Vercel preview URL in PR comments
- [ ] Note preview URL: `_______________`
- [ ] Test health check: `curl <preview-url>/api/health`
- [ ] Verify: Returns 200 with status healthy

### Test 7: Production Environment Variables
- [ ] Verify: SUPABASE_URL set in Vercel dashboard
- [ ] Verify: SUPABASE_SERVICE_KEY set in Vercel dashboard
- [ ] Verify: OPENAI_API_KEY set in Vercel dashboard
- [ ] Test upload on preview: (use curl or Postman)
- [ ] Verify: Upload works with production Supabase

### Test 8: OpenAPI Schema
- [ ] Test: `curl <preview-url>/openapi.json`
- [ ] Verify: Returns valid JSON OpenAPI schema
- [ ] Verify: Schema includes /api/search endpoint
- [ ] Verify: Schema includes /api/transcripts/upload endpoint

### Test 9: CORS Configuration
- [ ] Test from browser console (if applicable)
- [ ] Verify: CORS headers present in response
- [ ] Verify: Custom GPT domain allowed (or * for testing)

**Checkpoint 2 Complete**: [ ] All tests pass

---

## Checkpoint 3: Custom GPT Integration (North Star)

**Run**: Before merging phase-1-checkpoint-3 to main

### Test 10: Custom GPT Setup
- [ ] Go to ChatGPT → Explore GPTs → Create
- [ ] Configure GPT name and description
- [ ] Add instructions (see REBUILD_PLAN.md)
- [ ] Import OpenAPI schema from: `<production-url>/openapi.json`
- [ ] Verify: Schema imports without errors
- [ ] Save Custom GPT
- [ ] Note Custom GPT URL: `_______________`

### Test 11: Basic Search via Custom GPT
- [ ] Upload test transcript via API
- [ ] In Custom GPT, type: "Search for transcripts about career change"
- [ ] Verify: Custom GPT calls /api/search endpoint
- [ ] Verify: Custom GPT displays results
- [ ] Verify: Results are relevant to query

### Test 12: Fresh Data Retrieval (NORTH STAR TEST)
- [ ] Prepare NEW transcript with unique phrase: "The client discussed fear of public speaking and gave a presentation at work yesterday"
- [ ] Upload via API: `curl -X POST <production-url>/api/transcripts/upload ...`
- [ ] Run embeddings: `node scripts/embed.js <transcript_id>`
- [ ] **Immediately** ask Custom GPT: "What did the client discuss about public speaking?"
- [ ] Verify: Custom GPT retrieves fresh data WITHOUT manual context updates
- [ ] Verify: Response includes "presentation at work"
- [ ] Verify: Response is synthesized by GPT (not just echoing chunk)

### Test 13: Natural Language Q&A with Synthesis
- [ ] Ask Custom GPT: "What progress has the client made on their confidence goals?"
- [ ] Verify: Custom GPT uses /api/search to retrieve chunks
- [ ] Verify: Custom GPT synthesizes answer from multiple chunks
- [ ] Verify: Answer is grounded in actual transcript content
- [ ] Verify: Custom GPT cites meeting dates or sources

### Test 14: Edge Cases
- [ ] Ask Custom GPT about topic NOT in transcripts
- [ ] Verify: GPT responds appropriately (no hallucination)
- [ ] Try search with special characters
- [ ] Verify: Handles gracefully
- [ ] Try very long query (500+ words)
- [ ] Verify: Handles gracefully or returns helpful error

### Test 15: Performance Validation
- [ ] Measure search response time: `time curl -X POST <url>/api/search ...`
- [ ] Verify: Response time < 5 seconds
- [ ] Ask Custom GPT complex question
- [ ] Verify: Total response time reasonable (< 15 seconds)
- [ ] Note: Search latency: `_______` | Full Q&A latency: `_______`

**Checkpoint 3 Complete**: [ ] All tests pass
**North Star Validated**: [ ] Yes

---

## Production Deployment Validation

**Run**: After merging to main and production deployment

### Test 16: Production Smoke Test
- [ ] Test health check: `curl <production-url>/api/health`
- [ ] Verify: Returns 200
- [ ] Test search with known query
- [ ] Verify: Returns expected results
- [ ] Check Vercel deployment logs
- [ ] Verify: No errors in logs

### Test 17: Custom GPT Production Test
- [ ] Update Custom GPT to use production URL (if different)
- [ ] Ask test question
- [ ] Verify: Works identically to preview
- [ ] Monitor for 1 hour
- [ ] Verify: No errors reported

**Production Deployment Complete**: [ ] All tests pass

---

## Phase 2+ Tests (Future)

### Test 18: Multi-Data-Type Search (Phase 2)
- [ ] Upload assessment data
- [ ] Upload personality profile
- [ ] Search across multiple types
- [ ] Verify: Type filtering works
- [ ] Verify: Cross-type search works

### Test 19: Security & PII (Phase 3)
- [ ] Upload transcript with PII
- [ ] Verify: PII scrubbed before storage
- [ ] Test unauthorized access
- [ ] Verify: Returns 401/403
- [ ] Test multi-tenant isolation
- [ ] Verify: Coach A cannot access Coach B's data

### Test 20: MCP Integration (Phase 4)
- [ ] Configure Claude Desktop with MCP
- [ ] Test search via Claude
- [ ] Verify: Works identically to Custom GPT
- [ ] Test simultaneous Custom GPT + MCP usage
- [ ] Verify: Both work without conflicts

---

## Test Results Log

**Latest Test Run**: `_________ (Date)`
**Tester**: `_________`
**Branch/Commit**: `_________`

**Results**:
- Checkpoint 1: [ ] Pass / [ ] Fail
- Checkpoint 2: [ ] Pass / [ ] Fail
- Checkpoint 3: [ ] Pass / [ ] Fail
- Production: [ ] Pass / [ ] Fail

**Failures** (if any):



**Notes**:



---

## Tips for Effective E2E Testing

1. **Test in order** - Don't skip tests, dependencies matter
2. **Document results** - Note transcript IDs, response times, etc.
3. **Use fresh data** - Don't reuse old test data
4. **Test edge cases** - Empty strings, special chars, very long inputs
5. **Check logs** - Always review server logs after tests
6. **Wait for embeddings** - Give OpenAI API time to respond
7. **Clean up after** - Delete test data from database if needed

---

## Troubleshooting Common Issues

**Search returns no results**:
- Verify embeddings generated (check database)
- Lower similarity threshold
- Check query embedding generation

**Custom GPT doesn't call API**:
- Verify OpenAPI schema is valid
- Check CORS configuration
- Verify Custom GPT has correct URL
- Check authentication settings

**Slow performance**:
- Check Vercel logs for cold starts
- Verify database indexes exist
- Check OpenAI API latency
- Consider caching (future)

**Upload fails**:
- Verify environment variables set
- Check Supabase connection
- Verify request format (JSON)
- Check file size limits
