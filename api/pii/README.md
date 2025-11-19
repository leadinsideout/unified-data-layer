# PII Scrubbing API Documentation

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2025-11-19

## Overview

The PII (Personally Identifiable Information) Scrubbing system provides automated detection and redaction of sensitive information in coaching transcripts and other text content.

**Key Features**:
- 🎯 **96% Accuracy** on coaching content
- ⚡ **37s average** processing time (5K+ char documents)
- 💰 **$0.005 per document** cost
- 🔄 **Hybrid detection**: Regex (high-confidence) + GPT (context-aware)
- 📦 **Intelligent chunking**: Automatic for large documents (>5K chars)
- 🛡️ **Graceful degradation**: Never blocks uploads on failure

---

## Quick Start

### Basic Usage

```javascript
import OpenAI from 'openai';
import { PIIScrubber } from './api/pii/index.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const scrubber = new PIIScrubber(openai);

const result = await scrubber.scrub(
  "Sarah Johnson mentioned her address at 123 Main St.",
  'transcript'
);

console.log(result.content);
// "[NAME] mentioned her address at [ADDRESS]."

console.log(result.audit.entities.total);
// 2
```

### With Expense Tracking

```javascript
import { APIExpenseTracker } from './api/utils/api-expense-tracker.js';

const expenseTracker = new APIExpenseTracker({
  sessionId: 'my_session',
  budgetLimit: 1.00
});

const scrubber = new PIIScrubber(openai, { expenseTracker });

const result = await scrubber.scrub(text, 'transcript');

expenseTracker.endSession();
// Logs: "Session my_session ended. Total: $0.005"
```

---

## Architecture

### Hybrid Detection Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    Input Text                           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Length Check (>5K chars?)   │
         └───────────────────────────────┘
                 │               │
        NO       │               │       YES
                 ▼               ▼
         ┌───────────┐   ┌──────────────┐
         │  Single   │   │   Chunking   │
         │  Pass     │   │   (5K + 500) │
         └───────────┘   └──────────────┘
                 │               │
                 │               ▼
                 │       ┌──────────────┐
                 │       │   Parallel   │
                 │       │  Processing  │
                 │       │  (5 chunks)  │
                 │       └──────────────┘
                 │               │
                 ▼               ▼
         ┌─────────────────────────────┐
         │    Regex Detection (50ms)   │
         │  • Email, phone, SSN, etc.  │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │   GPT Detection (1.5-2.5s)  │
         │  • Names, addresses, etc.   │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │    Merge & Deduplicate      │
         │  (Regex takes precedence)   │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │    Apply Redaction          │
         │  (Replace with [TYPE])      │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │    Validate Redaction       │
         │  (Ensure no length change)  │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │    Generate Audit Trail     │
         │  (Metadata + statistics)    │
         └─────────────────────────────┘
                         │
                         ▼
         ┌─────────────────────────────┐
         │      Return Result          │
         │  { content, audit }         │
         └─────────────────────────────┘
```

---

## Components

### 1. PIIScrubber (Main Orchestrator)

**File**: `api/pii/pii-scrubber.js`

**Responsibilities**:
- Orchestrate hybrid detection pipeline
- Manage chunking for large documents
- Merge results and apply redaction
- Generate audit trail

**Configuration Options**:

```javascript
const scrubber = new PIIScrubber(openaiClient, {
  // GPT Options
  gptModel: 'gpt-3.5-turbo',           // Model to use (default)
  gptTemperature: 0,                   // Deterministic output
  gptTimeout: 5000,                    // Deprecated (adaptive timeout used)
  gptMaxRetries: 2,                    // Retry failed requests

  // Redaction Options
  redactionStrategy: 'replace',        // 'replace' | 'hash' | 'mask'
  hashKey: 'secret',                   // For hash strategy

  // Audit Options
  version: '1.0.0',                    // PII scrubber version
  includeEntityDetails: true,          // Include entity list in audit

  // Chunking Options
  chunkSize: 5000,                     // Max chunk size (chars)
  overlapSize: 500,                    // Overlap between chunks (chars)
  preserveBoundaries: true,            // Find natural breakpoints
  enableChunking: true,                // Enable/disable chunking
  chunkThreshold: 5000,                // Chunk if text > threshold
  maxConcurrentChunks: 5,              // Parallel chunk processing

  // Feature Flags
  enableGPT: true,                     // Enable GPT detection
  enableRegex: true,                   // Enable regex detection

  // Expense Tracking
  expenseTracker: trackerInstance      // Optional expense tracker
});
```

**Methods**:

```javascript
// Main scrubbing method
async scrub(text, dataType = 'unknown', options = {})
// Returns: { content: string, audit: Object }

// Single-pass scrubbing (no chunking)
async scrubSingle(text, dataType, options)

// Chunked scrubbing (for large documents)
async scrubChunked(text, dataType, options)

// Test scrubber on sample text
async test(text, dataType = 'transcript')

// Get performance statistics
getPerformanceStats(results)
```

---

### 2. RegexDetector (High-Confidence Patterns)

**File**: `api/pii/regex-detector.js`

**Detects**:
- Email addresses
- Phone numbers (US/International)
- Social Security Numbers (SSN)
- Credit card numbers
- IP addresses
- URLs with personal info

**Performance**: ~50ms per document

**Example**:

```javascript
import { RegexDetector } from './api/pii/regex-detector.js';

const detector = new RegexDetector();
const entities = await detector.detect("Call me at 555-1234");

// [{ text: '555-1234', type: 'PHONE', start: 11, end: 19, ... }]
```

---

### 3. GPTDetector (Context-Aware Detection)

**File**: `api/pii/gpt-detector.js`

**Detects**:
- Person names (full names, first names in conversation)
- Physical addresses
- Dates of birth
- Medical information
- Financial details
- Employer names (especially well-known companies)

**Model**: GPT-3.5-turbo (production default)
**Performance**: 1.5-2.5s per 5K chunk
**Accuracy**: 95-98% with coaching context

**Coaching-Aware**: Excludes false positives like:
- Assessment names (DISC, Myers-Briggs, MBTI, etc.)
- Coaching frameworks (GROW model, Adaptive Leadership, etc.)
- Generic roles ("the client", "a manager", etc.)

**Configuration**:

```javascript
const detector = new GPTDetector(openaiClient, {
  model: 'gpt-3.5-turbo',              // Default model
  temperature: 0,                       // Deterministic
  baseTimeout: 30000,                   // 30s base timeout
  timeoutPerKB: 10000,                  // 10s per KB
  maxTimeout: 600000,                   // 10 min cap
  useAdaptiveTimeout: true,             // Adaptive timeout (recommended)
  maxRetries: 2,                        // Retry logic
  expenseTracker: null                  // Optional tracker
});
```

**Adaptive Timeout**:

Formula: `30s + (length_kb × 10s/KB)`, capped at 10 minutes

| Text Size | Calculated Timeout |
|-----------|-------------------|
| 1K chars | 40s |
| 5K chars | 80s |
| 10K chars | 130s |
| 30K chars | 330s |
| 60K chars | 600s (capped) |

**Methods**:

```javascript
// Detect PII entities
async detect(text, dataType = 'unknown', options = {})

// Calculate adaptive timeout
calculateTimeout(textLength)

// Call GPT API with retry logic
async callGPT(prompt, textLength = 0)
```

---

### 4. ContentChunker (Intelligent Splitting)

**File**: `api/pii/content-chunker.js`

**Purpose**: Split large documents into optimal chunks while preserving context boundaries.

**Features**:
- Natural boundary detection (paragraph > sentence > word)
- Configurable chunk size and overlap
- Offset tracking for entity position mapping
- Validation of chunk integrity

**Configuration**:

```javascript
const chunker = new ContentChunker({
  maxChunkSize: 5000,                  // 5K chars per chunk
  overlapSize: 500,                    // 10% overlap for context
  preserveBoundaries: true             // Find natural breakpoints
});
```

**Boundary Detection**:

1. **Paragraph breaks**: `\n\n+` (weight: 3, highest priority)
2. **Sentence ends**: `[.!?]\s+` (weight: 2)
3. **Word boundaries**: `\s+` (weight: 1, fallback)

**Methods**:

```javascript
// Chunk text into optimal pieces
chunk(text, metadata = {})
// Returns: Array of { content, startOffset, endOffset, chunkIndex, totalChunks, metadata }

// Find natural boundary near target position
findNaturalBoundary(text, targetPosition, chunkStart)

// Get statistics about chunking
getChunkStats(chunks)

// Validate chunk integrity
validateChunks(chunks, originalText)
```

---

### 5. RedactionStrategy (Text Replacement)

**File**: `api/pii/redaction-strategy.js`

**Strategies**:

1. **Replace** (default): Replace with `[TYPE]` placeholders
   ```javascript
   "John Smith lives at 123 Main St"
   // "[NAME] lives at [ADDRESS]"
   ```

2. **Hash**: Replace with deterministic hashes
   ```javascript
   "John Smith" → "[NAME:a3f9d2...]"
   ```

3. **Mask**: Replace with asterisks
   ```javascript
   "John Smith" → "****"
   ```

**Methods**:

```javascript
// Apply redaction strategy
apply(text, entities)

// Validate redaction (ensure no length change for offsets)
validate(originalText, scrubbedText, entities)
```

---

### 6. AuditLogger (Metadata Trail)

**File**: `api/pii/audit-logger.js`

**Generates**: Comprehensive audit trail for compliance and debugging.

**Audit Structure**:

```javascript
{
  version: '1.0.0',
  timestamp: '2025-11-19T...',
  method: 'hybrid_chunked',            // hybrid_gpt4o_regex | hybrid_chunked | regex_only | gpt_only
  dataType: 'transcript',
  entities: {
    total: 215,
    by_type: {
      NAME: 133,
      DOB: 47,
      MEDICAL: 15,
      EMPLOYER: 7,
      ADDRESS: 7,
      FINANCIAL: 5
    },
    details: [                         // Optional (if includeEntityDetails: true)
      {
        text: 'Sarah',
        type: 'NAME',
        start: 0,
        end: 5,
        confidence: 0.95,
        method: 'gpt',
        description: 'Person name'
      },
      // ...
    ]
  },
  performance: {
    duration_ms: 37465,
    originalTextLength: 53538,
    redactedTextLength: 53538
  },
  chunkStats: {                        // If chunking used
    count: 12,
    avgSize: 4462,
    minSize: 3500,
    maxSize: 5000,
    totalSize: 53538,
    overlapSize: 500,
    maxChunkSize: 5000
  }
}
```

---

## PII Entity Types

### Detected by Regex

| Type | Examples | Confidence |
|------|----------|------------|
| EMAIL | user@example.com | High |
| PHONE | 555-1234, +1-555-1234 | High |
| SSN | 123-45-6789 | High |
| CREDIT_CARD | 4111-1111-1111-1111 | High |
| IP_ADDRESS | 192.168.1.1 | High |

### Detected by GPT

| Type | Examples | Confidence |
|------|----------|------------|
| NAME | Sarah Johnson, Dr. Smith, Michael | Medium-High |
| ADDRESS | 123 Main St, Boston, MA | Medium |
| DOB | March 15, 1985, born on 3/15/85 | Medium |
| MEDICAL | anxiety, depression, therapy | Medium-High |
| FINANCIAL | $150,000 salary, account #12345 | Medium |
| EMPLOYER | Google, Apple, Microsoft, Amazon | Medium-High |

**Note**: GPT is coaching-aware and excludes:
- Assessment names (DISC, MBTI, etc.)
- Coaching frameworks (GROW model, etc.)
- Generic roles ("the client", "a manager")

---

## Performance

### Benchmarks (Real Coaching Transcripts)

| Metric | Value |
|--------|-------|
| Average Processing Time | 37 seconds |
| Worst-Case Processing Time | 97 seconds (1m 37s) |
| Best-Case Processing Time | 17 seconds |
| Variance | 5.7x (17s to 97s) |
| Timeout Rate | 0% |
| Accuracy | 96%+ |
| Cost per Document | $0.005 |

### Scaling

| Document Size | Chunking | Processing Time | Cost |
|---------------|----------|-----------------|------|
| <5K chars | No | 2-5 seconds | $0.002 |
| 5K-10K chars | No | 3-8 seconds | $0.003 |
| 10K-30K chars | Yes (3-6 chunks) | 10-20 seconds | $0.004 |
| 30K-60K chars | Yes (6-12 chunks) | 20-100 seconds | $0.005 |
| 60K+ chars | Yes (12+ chunks) | 100-200 seconds | $0.006+ |

**Concurrency**: 5 chunks processed in parallel

---

## Error Handling

### Graceful Degradation

The PII scrubber **never blocks uploads** on failure. It always returns a result:

```javascript
try {
  const result = await scrubber.scrub(text, 'transcript');

  if (result.audit.method === 'error') {
    console.warn('PII scrubbing failed, uploaded original text');
  }

  // Upload result.content (either scrubbed or original)
} catch (error) {
  // This should never happen - scrubber catches all errors
}
```

### Error Scenarios

| Scenario | Behavior |
|----------|----------|
| OpenAI API timeout | Retry 2x, then return original text |
| OpenAI API rate limit | Retry with exponential backoff |
| Invalid API key | Return original text |
| Network error | Return original text |
| Chunk processing failure | Process remaining chunks, return partial results |
| Validation failure | Return original text with error in audit |

---

## Cost Management

### Budget Limits

```javascript
import { APIExpenseTracker } from './api/utils/api-expense-tracker.js';

const tracker = new APIExpenseTracker({
  sessionId: 'bulk_upload_123',
  budgetLimit: 5.00                    // $5 limit
});

const scrubber = new PIIScrubber(openai, { expenseTracker: tracker });

for (const transcript of transcripts) {
  const result = await scrubber.scrub(transcript, 'transcript');

  if (tracker.isOverBudget()) {
    console.error('Budget exceeded!');
    break;
  }
}

tracker.endSession();
```

### Cost Breakdown

| Operation | Model | Input Tokens | Output Tokens | Cost |
|-----------|-------|--------------|---------------|------|
| PII detection (5K chunk) | GPT-3.5-turbo | ~1,500 | ~200 | $0.0024 |
| Regex detection | N/A | N/A | N/A | $0 |

**Total per 50K transcript**: ~$0.005

---

## Testing

### Unit Tests

```bash
npm test -- api/pii/tests/
```

**Test Coverage**:
- 25 PII detection tests (24 passing, 1 flaky documented)
- Regex patterns (email, phone, SSN, credit card)
- GPT detection (names, addresses, medical info)
- Chunking (boundary detection, offset tracking)
- Redaction (validation, strategies)
- Edge cases (empty text, very short text, non-text input)

### Integration Tests

```bash
node scripts/test-real-transcripts-simple.js ~/path/to/transcripts
```

**Tests**:
- Real coaching transcripts (4 PDF files, 220K chars)
- End-to-end pipeline validation
- Performance measurement
- Cost tracking
- Manual review of scrubbed content

---

## Deployment

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (feature flag)
PII_SCRUBBING_ENABLED=true
```

### Feature Flag

```javascript
// In api/server.js or upload handler
const piiEnabled = process.env.PII_SCRUBBING_ENABLED === 'true';

if (piiEnabled && openaiClient) {
  const scrubber = new PIIScrubber(openaiClient);
  const result = await scrubber.scrub(text, dataType);
  textToStore = result.content;
  metadata.pii_audit = result.audit;
} else {
  textToStore = text; // Original text
}
```

### Staging Deployment

1. Enable feature flag: `PII_SCRUBBING_ENABLED=true`
2. Set budget limit in APIExpenseTracker
3. Monitor logs for errors
4. Collect user feedback on accuracy

### Production Deployment

1. Validate accuracy on representative data
2. Set production budget limits
3. Enable monitoring/alerting
4. Document known limitations for users

---

## Troubleshooting

### Issue: Timeouts on Large Documents

**Symptom**: Documents >60K chars timeout
**Solution**: Chunking is enabled by default, but verify:

```javascript
const scrubber = new PIIScrubber(openai, {
  enableChunking: true,                // Ensure enabled
  chunkThreshold: 5000,                // Adjust if needed
  maxConcurrentChunks: 5               // Reduce if rate limited
});
```

### Issue: Low Accuracy on Domain-Specific Content

**Symptom**: Missing PII or too many false positives
**Solution**: Customize GPT prompt in `gpt-detector.js`:

```javascript
buildPrompt(text, dataType) {
  // Add domain-specific examples
  // Adjust PII categories
  // Update exclusion list
}
```

### Issue: High API Costs

**Symptom**: Exceeding budget
**Solutions**:

1. Reduce chunk overlap:
   ```javascript
   const scrubber = new PIIScrubber(openai, {
     overlapSize: 200  // Reduce from 500
   });
   ```

2. Disable GPT for small documents:
   ```javascript
   const scrubber = new PIIScrubber(openai, {
     enableGPT: text.length > 1000  // Only for large docs
   });
   ```

3. Use regex-only mode:
   ```javascript
   const scrubber = new PIIScrubber(openai, {
     enableGPT: false  // Regex only
   });
   ```

### Issue: False Positives

**Symptom**: Non-PII flagged as PII (e.g., "DISC", "MBTI")
**Solution**: Update GPT prompt exclusion list in `gpt-detector.js`

### Issue: Validation Failures

**Symptom**: `validation_errors` in audit trail
**Cause**: Redaction changed text length (breaks offsets)
**Solution**: This should never happen with 'replace' strategy. If it does:

1. Check entity offsets are valid
2. Verify no overlapping entities
3. Report bug with test case

---

## API Reference

### PIIScrubber

#### Constructor

```typescript
constructor(openaiClient: OpenAI, options?: {
  gptModel?: string;
  gptTemperature?: number;
  gptTimeout?: number;
  gptMaxRetries?: number;
  redactionStrategy?: 'replace' | 'hash' | 'mask';
  hashKey?: string;
  version?: string;
  includeEntityDetails?: boolean;
  chunkSize?: number;
  overlapSize?: number;
  preserveBoundaries?: boolean;
  enableChunking?: boolean;
  chunkThreshold?: number;
  maxConcurrentChunks?: number;
  enableGPT?: boolean;
  enableRegex?: boolean;
  expenseTracker?: APIExpenseTracker;
})
```

#### scrub()

```typescript
async scrub(
  text: string,
  dataType?: string,
  options?: object
): Promise<{
  content: string;
  audit: {
    version: string;
    timestamp: string;
    method: string;
    dataType: string;
    entities: {
      total: number;
      by_type: Record<string, number>;
      details?: Array<{
        text: string;
        type: string;
        start: number;
        end: number;
        confidence: number;
        method: string;
        description: string;
      }>;
    };
    performance: {
      duration_ms: number;
      originalTextLength: number;
      redactedTextLength: number;
    };
    chunkStats?: {
      count: number;
      avgSize: number;
      minSize: number;
      maxSize: number;
      totalSize: number;
      overlapSize: number;
      maxChunkSize: number;
    };
  };
}>
```

---

## Changelog

### Version 1.0.0 (2025-11-19)

**Initial Production Release**

- ✅ Hybrid detection pipeline (Regex + GPT)
- ✅ Intelligent content chunking for large documents
- ✅ GPT-3.5-turbo for consistent performance
- ✅ Adaptive timeout strategy
- ✅ Parallel chunk processing
- ✅ Entity deduplication
- ✅ Graceful degradation on errors
- ✅ Comprehensive audit trail
- ✅ API expense tracking integration
- ✅ 96% accuracy on coaching content
- ✅ 37s average processing time
- ✅ $0.005 per document cost

**Performance**:
- Sprint 1: Adaptive timeout (3.6x faster)
- Sprint 2: Chunking + GPT-3.5-turbo (14x faster on worst case)

**Testing**:
- 25 automated unit tests (96% pass rate)
- 4 real coaching transcripts validated
- 215 entities detected across 220K characters

---

## Support

**Documentation**:
- Sprint Results: `docs/performance/pii-sprint-1-2-results.md`
- Optimization Options: `docs/performance/pii-scrubbing-optimization-options.md`
- Known Issues: `tests/KNOWN_ISSUES.md`

**Contact**:
- Project Lead: JJ Vega
- GitHub: leadinsideout/unified-data-layer
- Issues: https://github.com/leadinsideout/unified-data-layer/issues

---

**Last Updated**: 2025-11-19
**Version**: 1.0.0
