# Production Cost Analysis - Unified Data Layer

**Date**: 2025-11-22
**Status**: Approved
**Scenario**: 5 coaches, 50 sessions/week

---

## Executive Summary

**Year 1 Cost**: **$13.78/year** ($1.15/month)
**Year 2+ Cost**: **$313.78/year** ($26.15/month)
**Per Coach**: $2.76/year (Year 1) or $62.76/year (Year 2+)
**Per Session**: **$0.0053** (~half a penny)

**Recommendation**: ✅ No cost optimization needed at current scale

---

## Scenario Assumptions

### Volume
- **Coaches**: 5 active coaches
- **Sessions**: 50 per week (10 sessions/coach/week avg)
- **Monthly**: ~217 sessions (50 × 4.33 weeks)
- **Annual**: 2,600 sessions (50 × 52 weeks)

### Integration
- **Source**: Fireflies.ai automatic transcription
- **Pipeline**: Transcript → chunking → embedding → PII scrubbing → storage → search
- **Average session**: 54,635 characters (~13,659 tokens)

### Pricing (OpenAI Standard Rates)
- **text-embedding-3-small**: $0.02 per 1M tokens
- **GPT-3.5-turbo input**: $0.50 per 1M tokens
- **GPT-3.5-turbo output**: $1.50 per 1M tokens
- **Supabase Free Tier**: 500MB storage, 1GB bandwidth (included)
- **Supabase Pro Tier**: $25/month (8GB storage, 50GB bandwidth)

---

## Cost Breakdown Per Session

### 1. Embedding Costs

**Process**:
- Chunk size: 500 words
- Overlap: 50 words
- Average session: 54,635 chars = ~13,659 tokens
- Number of chunks: ~30 chunks per session

**Calculation**:
```
Tokens per session: 13,659
Cost: 13,659 × $0.02 / 1,000,000 = $0.000273
```

**Cost per session**: **$0.0003**

---

### 2. PII Scrubbing Costs

**Process** (from Checkpoint 8 results):
- Model: GPT-3.5-turbo
- Hybrid detection: Regex + context-aware GPT
- Chunking: Enabled for documents >5K chars
- Average: 12-13 chunks per session

**Measured Cost** (from Checkpoint 8 real transcripts):
- Cost per 50K+ char document: **$0.005**
- Accuracy: 96% (24/25 tests passed)
- Processing time: ~37 seconds

**Cost per session**: **$0.005**

---

### 3. Search Costs

**Process**:
- Each search generates 1 embedding query
- Typical query: ~10 tokens ("What did client discuss about leadership?")
- No GPT synthesis (API returns data, AI platforms synthesize)

**Assumptions**:
- 5 coaches × 10 searches/day = 50 searches/day
- 50 × 7 = 350 searches/week

**Calculation**:
```
Tokens per search: 10
Cost per search: 10 × $0.02 / 1,000,000 = $0.0000002
Weekly cost: 350 × $0.0000002 = $0.00007
```

**Cost per week**: **$0.0001** (negligible)

---

### 4. Storage Costs

**Database Size Estimate**:
- Per session:
  - 1 `data_item` row: ~1 KB
  - 30 chunks × 500 chars: 15 KB raw text
  - 30 embeddings × 1536 dimensions × 4 bytes: 184 KB
  - **Total**: ~200 KB per session

**Annual Storage**:
```
50 sessions/week × 200 KB = 10 MB/week
10 MB × 52 weeks = 520 MB/year
```

**Tier Thresholds**:
- **Year 1**: 520 MB < 500 MB free tier ✅ **$0/year**
- **Year 2+**: >500 MB → Pro tier required → **$300/year**

---

## Total Cost Summary

### Per Session
| Component | Cost | % of Total |
|-----------|------|------------|
| Embeddings | $0.0003 | 5.7% |
| PII Scrubbing | $0.0050 | 94.3% |
| Search | ~$0 | <0.1% |
| Storage | ~$0 | 0% (Year 1) |
| **TOTAL** | **$0.0053** | 100% |

**Note**: PII scrubbing is 94% of per-session cost

---

### Weekly Costs (50 sessions)

| Component | Cost/Week |
|-----------|-----------|
| Embeddings | $0.015 |
| PII Scrubbing | $0.250 |
| Search | $0.0001 |
| Storage | $0 |
| **TOTAL** | **$0.265** |

---

### Monthly Costs (~217 sessions)

| Component | Cost/Month |
|-----------|------------|
| Embeddings | $0.065 |
| PII Scrubbing | $1.09 |
| Search | $0.0004 |
| Storage | $0 (Yr1) / $25 (Yr2+) |
| **TOTAL** | **$1.15** (Yr1) / **$26.15** (Yr2+) |

---

### Annual Costs (2,600 sessions)

#### Year 1 (Supabase Free Tier)
| Component | Cost/Year |
|-----------|-----------|
| OpenAI Embeddings | $0.78 |
| OpenAI PII Scrubbing | $13.00 |
| OpenAI Search | $0.005 |
| Supabase Storage | $0 |
| **TOTAL** | **$13.78** |

**Per Coach**: $13.78 / 5 = **$2.76/year** = **$0.23/month**

#### Year 2+ (Supabase Pro Tier)
| Component | Cost/Year |
|-----------|-----------|
| OpenAI Embeddings | $0.78 |
| OpenAI PII Scrubbing | $13.00 |
| OpenAI Search | $0.005 |
| Supabase Storage | $300.00 |
| **TOTAL** | **$313.78** |

**Per Coach**: $313.78 / 5 = **$62.76/year** = **$5.23/month**

---

## Cost Breakdown by Service

### OpenAI API Costs

| Volume | Embeddings | PII Scrubbing | Search | Total |
|--------|------------|---------------|--------|-------|
| **Per session** | $0.0003 | $0.0050 | ~$0 | $0.0053 |
| **Per week** (50) | $0.015 | $0.250 | $0.0001 | $0.265 |
| **Per month** (217) | $0.065 | $1.09 | $0.0004 | $1.15 |
| **Per year** (2,600) | $0.78 | $13.00 | $0.005 | $13.78 |

### Supabase Costs

| Tier | Storage | Bandwidth | Monthly | Annual |
|------|---------|-----------|---------|--------|
| **Free** | 500 MB | 1 GB | $0 | $0 |
| **Pro** | 8 GB | 50 GB | $25 | $300 |

**Recommendation**: Use Free tier for Year 1, upgrade to Pro when storage exceeds 400 MB (~80% of limit)

---

## Cost Optimization Analysis

### Current State: No Optimization Needed ✅

**Why**:
- Total cost: $1.15/month (Year 1) or $26.15/month (Year 2+)
- Per-session cost: $0.005 (half a penny)
- Engineering time for optimization: 1 hour = $100-200 (not cost-effective)

### Optimization Trigger Points

| Volume | Monthly Cost | Action |
|--------|--------------|--------|
| **<100 sessions/week** | <$2.50 | ✅ No action needed |
| **100-500 sessions/week** | $2.50-$12.50 | ⚠️ Monitor costs, defer optimization |
| **500-1,000 sessions/week** | $12.50-$25 | 🔶 Consider caching, batching |
| **>1,000 sessions/week** | >$25 | 🔴 Optimize: self-hosting, caching required |

---

## Potential Optimization Strategies (Future)

### 1. Selective PII Scrubbing (-73% session cost)

**Current**: All transcripts scrubbed ($0.005/session)
**Optimized**: Only scrub client sessions, skip internal practice sessions

**Savings**:
- If 50% are internal practice → $0.005 → $0.0025 avg
- Annual savings: $6.50/year

**Tradeoff**: Requires session type classification

---

### 2. Cache Embeddings for Duplicate Content (-10-20% embedding cost)

**Current**: Re-embed all text chunks
**Optimized**: Hash-based lookup before embedding

**Savings**:
- ~10-20% reduction in embedding costs
- Annual savings: $0.08-$0.16/year

**Tradeoff**: Minimal - just storage overhead for hash index

---

### 3. Batch Embedding Requests (+speed, no cost savings)

**Current**: Sequential embedding generation
**Optimized**: Batch up to 100 chunks per API call

**Savings**: No cost savings, but 10x faster processing

**Recommendation**: Implement when processing speed becomes issue

---

### 4. Adjust PII Scrubbing Sensitivity (-50% PII cost, +risk)

**Current**: Hybrid regex + GPT detection (96% accuracy)
**Optimized**: Regex-only for high-confidence patterns (85% accuracy)

**Savings**: $0.005 → $0.0001 per session ($12.48/year)

**Tradeoff**: Lower accuracy, higher PII leak risk

**Recommendation**: ❌ NOT RECOMMENDED for coaching data (privacy critical)

---

### 5. Self-Host Embeddings (-100% embedding cost, +complexity)

**Current**: OpenAI text-embedding-3-small ($0.02/1M tokens)
**Optimized**: Self-hosted sentence-transformers model

**Savings**: $0.78/year (embedding costs eliminated)

**Tradeoff**: Infrastructure costs ($10-50/month), maintenance burden

**Recommendation**: ❌ NOT worth it until >10,000 sessions/month

---

## Risk Factors to Monitor

### 1. OpenAI Pricing Changes

**Current**: $0.02/1M tokens (embeddings), $0.50/1M (GPT-3.5)
**Risk**: Prices could increase 2-3x if OpenAI shifts to enterprise-only pricing

**Mitigation**:
- Monitor OpenAI pricing page monthly
- Evaluate self-hosting if prices >2x current
- Consider alternative providers (Anthropic, Cohere)

---

### 2. PII Scrubbing Accuracy Drift

**Current**: 96% accuracy (24/25 tests)
**Risk**: GPT model updates could reduce accuracy (false positives/negatives)

**Mitigation**:
- Run automated test suite monthly
- Track entity detection rates over time
- Alert if accuracy drops below 90%

---

### 3. Supabase Free Tier Limits

**Current**: 500 MB storage (enough for Year 1)
**Risk**: Hit limit sooner if transcript sizes increase (video transcripts, multi-hour sessions)

**Mitigation**:
- Monitor database size monthly (query via Supabase dashboard)
- Upgrade to Pro tier when >400 MB (80% of limit)
- Set up alert at 450 MB (90% limit)

---

### 4. Search Query Volume

**Current**: Assumed 10 searches/coach/day (negligible cost)
**Risk**: If coaches search 100+ times/day, costs could increase 10x

**Mitigation**:
- Implement search result caching (reduce redundant embeddings)
- Monitor query patterns (which queries are repeated?)
- Rate limit excessive search usage

---

## Comparison to Current Spend

### Development/Testing (Checkpoints 1-9)
- **Transcripts uploaded**: 16 (Checkpoint 3) + 4 real (Checkpoint 8)
- **Estimated monthly spend**: $0-5 (testing only)

### Production (50 sessions/week)
- **Volume increase**: 14x (16 transcripts → ~217/month)
- **Monthly cost**: $1.15 (Year 1) or $26.15 (Year 2+)
- **Percentage increase**: Minimal (<$2/month difference in Year 1)

---

## Cost Projection: Scaling Scenarios

### Scenario 1: Current (5 coaches, 50 sessions/week)
- **Annual**: $13.78 (Yr1) / $313.78 (Yr2+)
- **Per coach**: $2.76 (Yr1) / $62.76 (Yr2+)
- **Action**: ✅ No optimization needed

### Scenario 2: 10 coaches, 100 sessions/week
- **Annual**: $27.56 (OpenAI) + $300 (Supabase) = **$327.56**
- **Per coach**: $32.76/year
- **Action**: ⚠️ Monitor, still acceptable

### Scenario 3: 25 coaches, 250 sessions/week
- **Annual**: $68.90 (OpenAI) + $300 (Supabase) = **$368.90**
- **Per coach**: $14.76/year
- **Action**: ⚠️ Consider selective PII scrubbing

### Scenario 4: 50 coaches, 500 sessions/week
- **Annual**: $137.80 (OpenAI) + $300 (Supabase) = **$437.80**
- **Per coach**: $8.76/year
- **Action**: 🔶 Implement caching, batching

### Scenario 5: 100 coaches, 1,000 sessions/week
- **Annual**: $275.60 (OpenAI) + $300-600 (Supabase) = **$575-875**
- **Per coach**: $5.75-8.75/year
- **Action**: 🔴 Optimize PII scrubbing, consider self-hosting embeddings

---

## Recommendations

### For Current Scenario (5 coaches, 50 sessions/week)

1. ✅ **Proceed with current architecture** - Costs are minimal
2. ✅ **Use Supabase Free tier** - Sufficient for Year 1
3. ✅ **Keep PII scrubbing enabled** - $0.005/session is acceptable for security
4. ✅ **Monitor costs monthly** - Track actual spend vs estimates
5. ✅ **Defer optimizations** - Engineering time > $1.15/month cost

### When to Revisit This Analysis

- **Volume exceeds 100 sessions/week** (monthly cost >$2.50)
- **OpenAI pricing increases** (monitor quarterly)
- **Supabase storage hits 400 MB** (approaching free tier limit)
- **Coaches request faster processing** (consider batch embedding)

---

## Appendix: Cost Calculation Examples

### Example 1: Single Session Processing

```
Input: 54,635 character transcript (~13,659 tokens)

Processing Steps:
1. Chunking: 500 words/chunk, 50 overlap → 30 chunks
2. Embedding: 30 API calls → $0.000273
3. PII Scrubbing: Hybrid detection → $0.005
4. Storage: 200 KB → $0 (free tier)

Total Cost: $0.0053
Processing Time: ~47 seconds (embedding: 10s, PII: 37s)
```

### Example 2: Weekly Production (50 sessions)

```
Sessions: 50
Total tokens: 50 × 13,659 = 682,950 tokens

Costs:
- Embeddings: 682,950 × $0.02 / 1M = $0.0137
- PII Scrubbing: 50 × $0.005 = $0.25
- Search: 350 queries × $0.0000002 = $0.00007
- Storage: $0 (free tier)

Total: $0.264/week
Annual: $0.264 × 52 = $13.73/year
```

### Example 3: At Scale (500 sessions/week)

```
Sessions: 500
Total tokens: 500 × 13,659 = 6,829,500 tokens

Costs:
- Embeddings: 6,829,500 × $0.02 / 1M = $0.137
- PII Scrubbing: 500 × $0.005 = $2.50
- Search: 3,500 queries × $0.0000002 = $0.0007
- Storage: $25/month (Pro tier)

Total: $2.64/week + $25/month storage
Annual: ($2.64 × 52) + ($25 × 12) = $137 + $300 = $437/year
```

---

## Version History

- **v1.0** (2025-11-22): Initial analysis based on 5 coaches, 50 sessions/week scenario
- Status: Approved for production planning

---

## Related Documentation

- [Checkpoint 8 Results](../checkpoints/checkpoint-8-results.md) - PII scrubbing performance metrics
- [Checkpoint 9 Results](../checkpoints/checkpoint-9-results.md) - RLS and authentication costs
- [Roadmap](../project/roadmap.md) - Phase 3 and scaling plans
