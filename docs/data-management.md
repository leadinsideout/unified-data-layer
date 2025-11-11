# Data Management Guide

Complete guide for adding, managing, and organizing coaching transcript data.

## 📊 Available Methods

### Method 1: Bulk Upload API (Recommended)
**Best for:** Adding multiple transcripts programmatically

**Endpoint:** `POST /api/transcripts/bulk-upload`

**Request:**
```json
{
  "transcripts": [
    {
      "text": "Full transcript content...",
      "meeting_date": "2025-11-15T10:00:00",
      "metadata": {
        "client_name": "Sarah Chen",
        "session_number": 1,
        "topics": ["leadership", "delegation"]
      }
    }
  ]
}
```

**Response:**
```json
{
  "total": 5,
  "successful": 5,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "transcript_id": "uuid...",
      "chunks_created": 2,
      "status": "success"
    }
  ]
}
```

**Limits:**
- Maximum 50 transcripts per request
- Each transcript automatically chunked and embedded
- Processing time: ~2-3 seconds per transcript

### Method 2: CLI Upload Tool
**Best for:** Quick uploads from your terminal

**Usage:**
```bash
# From JSON file
node scripts/upload-transcripts.js data/my-transcripts.json

# Dry run (preview without uploading)
node scripts/upload-transcripts.js --dry-run data/my-transcripts.json

# Interactive mode
node scripts/upload-transcripts.js --interactive
```

**Example JSON file:**
```json
[
  {
    "text": "Coaching session transcript...",
    "meeting_date": "2025-12-01T10:00:00",
    "metadata": {
      "client_name": "John Doe",
      "session_number": 1,
      "topics": ["career", "goals"]
    }
  }
]
```

### Method 3: Single Upload API
**Best for:** Real-time integrations (e.g., Fireflies webhook)

**Endpoint:** `POST /api/transcripts/upload`

**Request:**
```json
{
  "text": "Transcript content...",
  "meeting_date": "2025-11-15T10:00:00",
  "metadata": {
    "client_name": "Sarah Chen"
  }
}
```

### Method 4: PDF Upload
**Best for:** Uploading exported Fireflies PDFs

**Endpoint:** `POST /api/transcripts/upload-pdf`

**cURL Example:**
```bash
curl -X POST https://unified-data-layer.vercel.app/api/transcripts/upload-pdf \
  -F "file=@transcript.pdf" \
  -F "meeting_date=2025-11-15T10:00:00" \
  -F "metadata={\"client_name\":\"Sarah Chen\"}"
```

## 🎯 Common Workflows

### Workflow 1: Testing with Sample Data
```bash
# 1. Generate sample data
node scripts/seed-sample-data.js

# 2. Verify in database
# Transcripts are automatically chunked and embedded
```

### Workflow 2: Production Data Upload
```bash
# 1. Export your Fireflies transcripts to JSON

# 2. Format as array of transcript objects
# See data/example-upload.json for format

# 3. Upload via CLI
node scripts/upload-transcripts.js data/my-transcripts.json

# 4. Verify via search API
curl -X POST https://unified-data-layer.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"leadership","threshold":0.3,"limit":5}'
```

### Workflow 3: Continuous Integration
```bash
# Add to your CI/CD pipeline
node scripts/upload-transcripts.js data/weekly-transcripts.json
```

## 📁 Data Organization

### Recommended File Structure
```
data/
├── clients/
│   ├── sarah-chen/
│   │   ├── 2025-11.json    # November sessions
│   │   ├── 2025-12.json    # December sessions
│   │   └── README.md       # Client notes
│   └── john-doe/
│       └── 2025-11.json
├── archive/
│   └── 2024/               # Historical data
└── example-upload.json     # Template
```

### Metadata Best Practices

**Required:**
```json
{
  "text": "Transcript content..."  // Only required field
}
```

**Recommended:**
```json
{
  "text": "...",
  "meeting_date": "2025-11-15T10:00:00",
  "metadata": {
    "client_name": "Sarah Chen",
    "session_number": 5,
    "topics": ["delegation", "leadership"],
    "coach_id": "uuid...",          // For multi-coach orgs
    "session_type": "1-on-1",       // vs. group
    "duration_minutes": 60
  }
}
```

## 🔄 Data Processing Pipeline

```
Upload → Validation → Chunking → Embedding → Storage
  1. Validate text and metadata
  2. Chunk into 500-word segments (50-word overlap)
  3. Generate OpenAI embeddings (text-embedding-3-small)
  4. Store in Supabase with pgvector
  5. Return success with transcript_id and chunk count
```

## 🛠️ Troubleshooting

### Upload Fails with "OpenAI API error"
**Cause:** Rate limit or quota exceeded
**Solution:**
- Reduce batch size
- Add delay between requests
- Check OpenAI dashboard for quota

### "Embedding dimensions mismatch"
**Cause:** Using different embedding model
**Solution:** Must use `text-embedding-3-small` (1536 dimensions)

### Search Returns No Results
**Cause:** Embeddings not generated
**Solution:**
```bash
# Re-run embedding generation
node scripts/embed.js
```

### Duplicate Transcripts
**Cause:** Uploading same data twice
**Solution:** Currently no deduplication - manage externally

## 📈 Performance Tips

1. **Batch uploads:** Use bulk-upload for 10+ transcripts
2. **Optimal batch size:** 20-30 transcripts per request
3. **Processing time:** ~2-3 seconds per transcript
4. **Chunk size:** Default 500 words works for most cases
5. **Metadata:** Keep under 5KB per transcript

## 🔒 Security Notes

- No authentication currently required (add in Phase 2)
- Validate all data client-side before upload
- Never include PII in metadata unless encrypted
- Use HTTPS for all API calls

## 📚 Related Documentation

- [API Documentation](./api/README.md)
- [Search Guide](./search-guide.md)
- [Database Schema](./setup/supabase-setup.md)
- [Workflow Automation](./development/workflows.md)
