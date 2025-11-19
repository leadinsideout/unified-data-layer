# PII Scrubbing Performance Optimization Options

**Current Performance**: ~2000ms average per document
**Current Accuracy**: 96% (24/25 tests passing)
**Status**: Shipped as-is for Phase 3 beta (accuracy prioritized over speed)

---

## Current Architecture

**Hybrid Detection Pipeline**:
1. **Regex Pass** (~50ms): High-confidence patterns (email, phone, SSN, credit cards)
2. **GPT Pass** (~1-4s): Context-aware detection (names, addresses, medical, employers)
3. **Merge & Redact** (~10ms): Deduplicate and apply redactions

**Performance Bottleneck**: OpenAI GPT-4o-mini API latency (network calls to external service)

**Why This Was Acceptable**:
- Upload pipeline is async (not user-facing)
- Accuracy critical for HIPAA compliance (96% vs ~80% regex-only)
- Low initial volume (Phase 3 beta with limited coaches)
- Cost-effective ($0.0001/doc vs $5-10 for manual review)

---

## Future Optimization Options

### Option 1: Hybrid Fast-Track ⚡ (Easiest)

**Implementation Time**: 1 week + 2 days testing
**Performance Gain**: 30% of documents <100ms, 70% still ~2s
**Accuracy Impact**: 85-90% (down from 96%)
**Ongoing Cost**: None

**How It Works**:
```javascript
// Skip GPT for documents with only simple PII patterns
async scrub(text, dataType) {
  const regexResults = await this.regexDetector.detect(text);

  // Fast-track: If only high-confidence patterns found, skip GPT
  const hasOnlySimplePatterns = regexResults.length > 0 &&
    regexResults.every(r => ['EMAIL', 'PHONE', 'SSN', 'CREDIT_CARD'].includes(r.type));

  if (hasOnlySimplePatterns) {
    return this.applyRedaction(text, regexResults); // ~100ms total
  }

  // Complex PII: Call GPT for context-aware detection
  const gptResults = await this.gptDetector.detect(text, dataType);
  return this.applyRedaction(text, [...regexResults, ...gptResults]); // ~2s total
}
```

**Best For**:
- Documents with mostly contact info (email/phone only)
- Low-risk content types (assessments, models)
- Volume >1,000 docs/day where 30% speed gain matters

**Risks**:
- Miss names, medical info, employers in "simple" documents
- Example: "Contact john@example.com" would miss "john" as a name
- False sense of security (85% accuracy still has gaps)

**Decision Criteria**: Ship this if coaches complain about slow uploads OR volume exceeds 1,000 docs/day

---

### Option 2: Smart Caching System 🧠 (Medium Complexity)

**Implementation Time**: 2-3 weeks + 1 week testing
**Performance Gain**: First upload ~2s, subsequent uploads ~200ms (95% cache hit rate)
**Accuracy Impact**: None (96% maintained)
**Ongoing Cost**: Database storage + cache invalidation logic

**How It Works**:
```sql
-- New table: pii_detection_cache
CREATE TABLE pii_detection_cache (
  id UUID PRIMARY KEY,
  coach_id UUID REFERENCES coaches(id),
  content_hash TEXT NOT NULL, -- SHA-256 of content
  detected_entities JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days',
  UNIQUE(coach_id, content_hash)
);

CREATE INDEX idx_cache_lookup ON pii_detection_cache(coach_id, content_hash, expires_at);
```

```javascript
async scrub(text, dataType, metadata) {
  const contentHash = sha256(text);

  // Check cache first
  const cached = await this.cache.get(metadata.coach_id, contentHash);
  if (cached && cached.expires_at > Date.now()) {
    console.log('[PII] Cache HIT - reusing previous detection');
    return this.applyRedaction(text, cached.entities); // ~200ms
  }

  // Cache MISS - run full detection
  console.log('[PII] Cache MISS - running GPT detection');
  const entities = await this.detectWithGPT(text, dataType); // ~2s

  // Store in cache
  await this.cache.set(metadata.coach_id, contentHash, entities, { ttl: 30 * 24 * 60 * 60 });

  return this.applyRedaction(text, entities);
}
```

**Cache Invalidation Strategy**:
- **TTL**: 30 days (people's names/employers rarely change)
- **Size**: 100KB per cache entry × 10,000 coaches = 1GB storage
- **Eviction**: LRU (least recently used) after 90 days inactive

**Best For**:
- Coaches who upload frequently (daily/weekly)
- Similar document types (coaching transcripts with recurring names)
- Volume >10,000 docs/month where caching provides ROI

**Risks**:
- Stale cache if coach changes name/employer (mitigated by 30-day TTL)
- Complex invalidation logic (what if coach leaves company?)
- Storage costs (~$0.10/GB/month on Supabase)

**Decision Criteria**: Ship this if >50% of uploads are from repeat coaches AND average uploads >100/coach/month

---

### Option 3: Adaptive Timeout Strategy ⏱️ (Low Complexity)

**Implementation Time**: 3 days + 1 day testing
**Performance Gain**: Reduces flaky timeouts, no speed improvement
**Accuracy Impact**: None (96% maintained)
**Ongoing Cost**: None

**How It Works**:
```javascript
class GPTDetector {
  async detect(text, dataType) {
    // Adaptive timeout based on content length
    const baseTimeout = 5000; // 5s baseline
    const tokenEstimate = estimateTokens(text);
    const timeout = baseTimeout + Math.min(tokenEstimate / 100, 25000); // Max 30s

    console.log(`[PII] Adaptive timeout: ${timeout}ms for ${tokenEstimate} tokens`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [...],
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  }
}
```

**Timeout Calculation**:
- Short text (<500 tokens): 5s timeout
- Medium text (500-1000 tokens): 10s timeout
- Long text (1000-2000 tokens): 20s timeout
- Stress test (2000+ tokens): 30s timeout

**Best For**:
- Reducing Test 020 flakiness (currently times out at 30s)
- Variable document lengths (assessments vs transcripts)
- No downside - should be implemented regardless

**Risks**: None (pure improvement)

**Decision Criteria**: Ship this in next maintenance release (low effort, high value)

---

### Option 4: Custom In-House Model 🤖 (High Complexity)

**Implementation Time**: 2-3 months + $5K-10K ML engineering
**Performance Gain**: All documents ~300-500ms
**Accuracy Impact**: 90-93% (down from 96%)
**Ongoing Cost**: $0 API costs, 1 day/month maintenance

**How It Works**:

**Phase 1: Training Data Generation** (2 weeks)
```javascript
// Use GPT-4o to generate 10,000 labeled examples
const trainingData = [];
for (let i = 0; i < 10000; i++) {
  const syntheticDoc = await generateCoachingTranscript();
  const labels = await gpt4o.labelPII(syntheticDoc);
  trainingData.push({ text: syntheticDoc, labels });
}
saveTrainingData('pii-training-10k.jsonl', trainingData);
```

**Phase 2: Model Training** (4-6 weeks)
```python
# Fine-tune DistilBERT for token classification
from transformers import DistilBertForTokenClassification, Trainer

model = DistilBertForTokenClassification.from_pretrained(
    'distilbert-base-uncased',
    num_labels=7  # NAME, EMAIL, PHONE, SSN, MEDICAL, FINANCIAL, EMPLOYER
)

trainer = Trainer(
    model=model,
    train_dataset=train_data,
    eval_dataset=val_data,
    compute_metrics=compute_metrics
)

trainer.train()
model.save_pretrained('models/pii-detector-v1')
```

**Phase 3: Inference Server** (2 weeks)
```javascript
// Self-hosted model inference
import { pipeline } from '@xenova/transformers';

class LocalPIIDetector {
  constructor() {
    this.model = await pipeline('token-classification', 'models/pii-detector-v1');
  }

  async detect(text) {
    const predictions = await this.model(text); // ~300-500ms on CPU
    return this.postProcess(predictions);
  }
}
```

**Infrastructure**:
- **Development**: $2K (GPT-4o for training data generation)
- **Training**: $3K-5K (GPU compute on AWS/GCP for 4-6 weeks)
- **Hosting**: $200/month (dedicated CPU instance for inference)
- **Maintenance**: $3K/year (1 day/month model updates)

**Best For**:
- Volume >100,000 docs/year (ROI on API cost savings)
- Strategic independence from OpenAI
- Predictable latency requirements (<500ms SLA)

**Risks**:
- Accuracy degradation (93% vs 96% with GPT)
- ML expertise required (hire or contract)
- Model drift over time (needs retraining)
- Coaching terminology changes (model update lag)

**ROI Calculation**:
```
Current Cost (GPT-4o-mini): $0.0001/doc × 100,000 docs/year = $10/year
Custom Model Cost: $5K initial + $200/month hosting + $3K/year maintenance = $10.4K/year

Break-even: Never (unless volume exceeds 100M docs/year)

Real ROI: Strategic independence + Predictable latency
```

**Decision Criteria**: Ship this if:
- OpenAI reliability becomes a blocker (frequent outages)
- Volume exceeds 100,000 docs/year AND latency is critical
- Strategic decision to own AI infrastructure (vendor independence)

---

## Recommended Decision Tree

```
Start: Is accuracy >95% required?
  ├─ NO → Option 1: Hybrid Fast-Track (85-90% accuracy, faster)
  └─ YES → Is volume >10,000 docs/month?
      ├─ NO → Ship current (2s is acceptable for beta)
      └─ YES → Are 50%+ uploads from repeat coaches?
          ├─ NO → Option 1 or 3 (fast-track or adaptive timeout)
          └─ YES → Option 2: Smart Caching (maintains 96% accuracy)

Future consideration (2+ years):
  └─ Volume >100,000 docs/year + Strategic independence needed?
      └─ YES → Option 4: Custom Model (full control, predictable costs)
```

---

## Current Decision (Phase 3 Beta)

**Status**: ✅ **SHIP AS-IS** (2 seconds, 96% accuracy)

**Rationale**:
1. ✅ Accuracy critical for HIPAA/PII compliance (96% > 95% target)
2. ✅ Upload pipeline is async (not user-facing, no UX impact)
3. ✅ Low volume initially (Phase 3 beta with limited coaches)
4. ✅ Cost-effective ($0.0001/doc vs $5-10 manual review)
5. ✅ OpenAI dependency acceptable for MVP (can optimize later)

**Revisit When**:
- ⚠️ Coaches complain about slow uploads (unlikely for background process)
- ⚠️ Volume exceeds 1,000 uploads/day (then Option 1 or 2)
- ⚠️ OpenAI reliability issues (frequent >30s timeouts) → Option 3
- ⚠️ Volume exceeds 100,000 docs/year + budget for ML → Option 4

---

## Quick Reference

| Option | Time | Cost | Speed Gain | Accuracy | Best For |
|--------|------|------|------------|----------|----------|
| **Current** | - | $0.0001/doc | Baseline (2s) | 96% | Beta launch |
| **Option 1: Fast-Track** | 1 week | $0 | 30% docs <100ms | 85-90% | High volume, lower risk |
| **Option 2: Caching** | 2-3 weeks | +$10/month | 95% docs <200ms | 96% | Repeat uploaders |
| **Option 3: Adaptive Timeout** | 3 days | $0 | Reduces flakiness | 96% | Quick win (do next) |
| **Option 4: Custom Model** | 2-3 months | $10K/year | All docs <500ms | 90-93% | 100K+ docs/year |

---

**Last Updated**: 2025-11-19
**Phase**: 3 (Checkpoint 8)
**Decision Owner**: JJ Vega
**Next Review**: After Phase 3 beta (3-6 months)
