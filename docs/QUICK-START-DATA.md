# Quick Start: Adding Data

Fast reference for adding coaching transcripts to the system.

## 🚀 Fastest Method: CLI Tool

```bash
# 1. Create a JSON file with your transcripts
cat > data/my-sessions.json << 'JSONEOF'
[
  {
    "text": "Your coaching session transcript here...",
    "meeting_date": "2025-12-15T10:00:00",
    "metadata": {
      "client_name": "Client Name",
      "session_number": 1,
      "topics": ["topic1", "topic2"]
    }
  }
]
JSONEOF

# 2. Upload to production
node scripts/upload-transcripts.js data/my-sessions.json

# 3. Test the search
curl -X POST https://unified-data-layer.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"your search query","threshold":0.3,"limit":5}'
```

## 📊 Example Queries for Testing

With the sample data now in production, test your Custom GPT with:

1. **"Find sessions about delegation and micromanagement"**
2. **"Search for discussions about work-life balance"**
3. **"Show me conversations about conflict resolution"**
4. **"What did Sarah learn about strategic thinking?"**
5. **"Find sessions from November 2025"**
6. **"How did the client handle burnout?"**

## 🎯 Sample Data Available

7 coaching sessions following Sarah Chen's leadership journey:
- Session 1: Executive presence & imposter syndrome
- Session 2: Delegation & micromanagement
- Session 3: Strategic thinking & board presentations
- Session 4: Conflict resolution & difficult conversations
- Session 5: Work-life balance & burnout
- Session 6: Leadership development & coaching others
- Session 7: Year-end reflection & goal setting

All uploaded and searchable in production! ✅

## 📚 More Details

- Complete guide: `docs/data-management.md`
- API reference: `docs/api/README.md` (coming soon)
- Example files: `data/example-upload.json`
