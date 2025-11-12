# Test-Driven Development Workflow for Phase 2+

**Purpose**: Define TDD workflow for remaining phases to ensure quality and prevent regressions.

**Status**: Proposal
**Created**: 2025-11-12
**Applies To**: Phase 2 (Checkpoints 5-7), Phase 3+

---

## Table of Contents

1. [Lessons from Phase 1](#lessons-from-phase-1)
2. [Proposed TDD Workflow](#proposed-tdd-workflow)
3. [Test Categories](#test-categories)
4. [Checkpoint-Specific Testing](#checkpoint-specific-testing)
5. [Tools & Infrastructure](#tools--infrastructure)
6. [Implementation Timeline](#implementation-timeline)

---

## Lessons from Phase 1

### What Worked Well

**✅ Database Testing**:
- Manual SQL validation queries were effective
- MCP Supabase tools allowed real-time verification
- Migration validation scripts caught issues immediately

**✅ Manual E2E Checklists**:
- `tests/e2e-checklist.md` provided clear validation steps
- Human verification was fast for small-scale testing
- Custom GPT testing validated real-world usage

**✅ Documentation-First Approach**:
- Migration scripts had comprehensive comments
- Rollback procedures documented upfront
- Validation queries embedded in migration files

### What Could Be Improved

**🔴 Lack of Automated Tests**:
- No automated test suite for API endpoints
- Manual testing required after each change
- Risk of breaking existing functionality during development

**🔴 No Integration Tests**:
- Database changes tested in isolation
- API changes tested manually
- No automated verification of end-to-end flows

**🔴 No Regression Testing**:
- Each checkpoint required full manual retest
- Time-consuming to verify old features still work
- Custom GPT testing was manual and slow

---

## Proposed TDD Workflow

### Core Principles

1. **Test Before Code**: Write tests before implementing features
2. **Three-Layer Testing**: Unit → Integration → E2E
3. **Automated by Default**: Manual tests only for UI/UX validation
4. **Continuous Validation**: Run tests on every commit (via Husky)
5. **Database-First Testing**: Test migrations before API changes

### Workflow Steps

```
┌─────────────────────────────────────────────────────┐
│ Step 1: Define Requirements                         │
│ - Read checkpoint goals from roadmap.md             │
│ - Break down into testable user stories             │
│ - Identify edge cases and failure modes             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 2: Write Tests (RED)                           │
│ Database: Write SQL test queries                    │
│ API: Write Jest/Supertest tests                     │
│ Integration: Write E2E test scenarios               │
│ Result: All tests FAIL (feature doesn't exist yet)  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 3: Implement Feature (GREEN)                   │
│ - Write minimal code to pass tests                  │
│ - Run tests frequently during development           │
│ - Iterate until all tests pass                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 4: Refactor (REFACTOR)                         │
│ - Clean up code without changing behavior           │
│ - Tests ensure refactoring doesn't break things     │
│ - Improve performance, readability, maintainability │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step 5: Validate & Document                         │
│ - Run full test suite                               │
│ - Manual E2E checklist for UI/UX                    │
│ - Update checkpoint docs with test results          │
│ - Commit with test coverage report                  │
└─────────────────────────────────────────────────────┘
```

---

## Test Categories

### 1. Database Tests (SQL Queries)

**Location**: `tests/database/`

**Purpose**: Verify schema, migrations, data integrity, RPC functions

**Tools**:
- Supabase MCP tools (`mcp__supabase__execute_sql`)
- SQL test files with assertions
- Migration validation scripts

**Example Structure**:
```sql
-- tests/database/003_multi_type_schema.test.sql

-- Test 1: New tables exist
SELECT
  'New Tables Check' as test_name,
  COUNT(*) as actual,
  8 as expected,
  COUNT(*) = 8 as passed
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (...);

-- Test 2: Data migration integrity
SELECT
  'Migration Integrity' as test_name,
  (SELECT COUNT(*) FROM transcripts) as old_count,
  (SELECT COUNT(*) FROM data_items WHERE data_type = 'transcript') as new_count,
  (SELECT COUNT(*) FROM transcripts) = (SELECT COUNT(*) FROM data_items WHERE data_type = 'transcript') as passed;

-- Test 3: RPC function works
SELECT
  'RPC Function Test' as test_name,
  COUNT(*) > 0 as passed
FROM match_data_chunks(
  (SELECT embedding::text FROM data_chunks LIMIT 1),
  ARRAY['transcript']::text[],
  NULL, NULL, NULL,
  0.99, 1
);
```

**When to Run**:
- Before committing migration files
- After applying migrations
- Before merging to main
- In CI/CD pipeline

### 2. API Unit Tests (Jest)

**Location**: `tests/api/unit/`

**Purpose**: Test individual API functions, helpers, utilities

**Tools**:
- Jest (test runner)
- Supertest (HTTP assertions)
- Nock (HTTP mocking for external APIs)

**Example Structure**:
```javascript
// tests/api/unit/chunking.test.js

describe('chunkText function', () => {
  test('should chunk text into 500-word segments', () => {
    const text = generateText(1000); // 1000 words
    const chunks = chunkText(text, 500, 50);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].split(' ')).toHaveLength(500);
  });

  test('should handle overlap correctly', () => {
    const text = 'word1 word2 word3 word4 word5';
    const chunks = chunkText(text, 3, 1); // 3 words, 1 overlap

    expect(chunks[0]).toBe('word1 word2 word3');
    expect(chunks[1]).toBe('word3 word4 word5'); // word3 overlaps
  });

  test('should handle short text without errors', () => {
    const text = 'short';
    const chunks = chunkText(text, 500, 50);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe('short');
  });
});
```

**When to Run**:
- During development (watch mode)
- Before committing code
- In pre-commit hook
- In CI/CD pipeline

### 3. API Integration Tests

**Location**: `tests/api/integration/`

**Purpose**: Test API endpoints with real database, verify E2E flows

**Tools**:
- Jest + Supertest
- Test database or seeded development database
- Transaction rollback for cleanup

**Example Structure**:
```javascript
// tests/api/integration/upload-search.test.js

describe('Upload → Search Flow', () => {
  let transcriptId;

  afterEach(async () => {
    // Cleanup: delete test data
    await supabase.from('data_items').delete().eq('id', transcriptId);
  });

  test('should upload transcript and make it searchable', async () => {
    // Step 1: Upload transcript
    const uploadResponse = await request(app)
      .post('/api/transcripts/upload')
      .send({
        text: 'This is a test coaching session about delegation.',
        meeting_date: '2025-11-12T10:00:00',
        metadata: { test: true }
      });

    expect(uploadResponse.status).toBe(201);
    expect(uploadResponse.body).toHaveProperty('transcript_id');
    transcriptId = uploadResponse.body.transcript_id;

    // Step 2: Wait for embeddings (async process)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Search for uploaded content
    const searchResponse = await request(app)
      .post('/api/search')
      .send({
        query: 'delegation coaching',
        threshold: 0.3,
        limit: 5
      });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.results.length).toBeGreaterThan(0);

    // Verify our transcript is in results
    const foundTranscript = searchResponse.body.results.find(
      r => r.data_item_id === transcriptId
    );
    expect(foundTranscript).toBeDefined();
    expect(foundTranscript.similarity).toBeGreaterThan(0.3);
  });
});
```

**When to Run**:
- Before committing API changes
- Before merging to main
- In CI/CD pipeline
- Before deployment

### 4. Database Migration Tests

**Location**: `tests/migrations/`

**Purpose**: Test migration scripts, rollback procedures, data integrity

**Tools**:
- Custom test runner (Node.js script)
- Supabase branching (Phase 6+)
- SQL validation queries

**Example Structure**:
```javascript
// tests/migrations/003_multi_type_schema.test.js

describe('Migration 003: Multi-Type Schema', () => {
  let supabase;

  beforeAll(async () => {
    supabase = createSupabaseClient(); // Test database
  });

  test('should create all new tables', async () => {
    const { data } = await supabase.rpc('list_tables');

    expect(data).toContainEqual({ name: 'coaching_companies' });
    expect(data).toContainEqual({ name: 'coaches' });
    expect(data).toContainEqual({ name: 'data_items' });
    expect(data).toContainEqual({ name: 'data_chunks' });
  });

  test('should preserve old tables', async () => {
    const { data } = await supabase.rpc('list_tables');

    expect(data).toContainEqual({ name: 'transcripts' });
    expect(data).toContainEqual({ name: 'transcript_chunks' });
  });

  test('should migrate all data without loss', async () => {
    const { data: oldCount } = await supabase
      .from('transcripts')
      .select('id', { count: 'exact', head: true });

    const { data: newCount } = await supabase
      .from('data_items')
      .select('id', { count: 'exact', head: true })
      .eq('data_type', 'transcript');

    expect(oldCount.count).toBe(newCount.count);
  });

  test('should rollback cleanly', async () => {
    // Apply down migration
    await supabase.rpc('rollback_migration', { name: '003_multi_type_schema' });

    // Verify new tables removed
    const { data } = await supabase.rpc('list_tables');
    expect(data).not.toContainEqual({ name: 'data_items' });

    // Verify old tables still exist
    expect(data).toContainEqual({ name: 'transcripts' });
  });
});
```

**When to Run**:
- Before applying migration to production
- After creating migration file
- In staging environment first
- Before checkpoint completion

### 5. E2E Tests (Playwright)

**Location**: `tests/e2e/`

**Purpose**: Test full user workflows including Custom GPT integration

**Tools**:
- Playwright (browser automation)
- Custom GPT API testing
- Screenshot comparison

**Example Structure**:
```javascript
// tests/e2e/custom-gpt-integration.test.js

describe('Custom GPT Integration', () => {
  test('should search via Custom GPT API', async () => {
    // Step 1: Upload test data via API
    const transcript = await uploadTestTranscript({
      text: 'Coaching session about goal setting and accountability.'
    });

    // Step 2: Simulate Custom GPT calling our API
    const response = await fetch('https://unified-data-layer.vercel.app/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'goal setting accountability',
        threshold: 0.3,
        limit: 5
      })
    });

    const data = await response.json();

    // Step 3: Verify results
    expect(response.status).toBe(200);
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results[0]).toHaveProperty('content');
    expect(data.results[0]).toHaveProperty('similarity');
    expect(data.results[0].similarity).toBeGreaterThan(0.3);
  });

  test('should handle type filtering', async () => {
    // Upload different data types
    await uploadTestData({ type: 'transcript' });
    await uploadTestData({ type: 'assessment' });

    // Search with type filter
    const response = await fetch('https://unified-data-layer.vercel.app/api/search', {
      method: 'POST',
      body: JSON.stringify({
        query: 'test content',
        types: ['assessment'],
        threshold: 0.3
      })
    });

    const data = await response.json();

    // Verify only assessments returned
    data.results.forEach(result => {
      expect(result.data_type).toBe('assessment');
    });
  });
});
```

**When to Run**:
- Before checkpoint completion
- Before production deployment
- After significant API changes
- Weekly smoke tests in production

### 6. Performance Tests

**Location**: `tests/performance/`

**Purpose**: Verify response times, database query performance, scalability

**Tools**:
- Artillery (load testing)
- k6 (performance testing)
- Custom benchmarking scripts

**Example Structure**:
```javascript
// tests/performance/search-load.test.js

describe('Search Endpoint Performance', () => {
  test('should handle 100 concurrent searches under 5s', async () => {
    const queries = Array(100).fill(null).map(() => ({
      query: 'coaching leadership goals',
      threshold: 0.3,
      limit: 10
    }));

    const startTime = Date.now();

    const results = await Promise.all(
      queries.map(query =>
        fetch('/api/search', { method: 'POST', body: JSON.stringify(query) })
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(results.every(r => r.ok)).toBe(true);
  });

  test('should return results within 3s for 95th percentile', async () => {
    const queries = Array(100).fill(null).map(() => ({
      query: 'test query',
      threshold: 0.3
    }));

    const times = [];

    for (const query of queries) {
      const start = Date.now();
      await fetch('/api/search', { method: 'POST', body: JSON.stringify(query) });
      times.push(Date.now() - start);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];

    expect(p95).toBeLessThan(3000); // 3 seconds
  });
});
```

**When to Run**:
- Before checkpoint completion
- After database schema changes
- Before production deployment
- Monthly performance regression tests

---

## Checkpoint-Specific Testing

### Phase 2, Checkpoint 4: Schema Migration (✅ DONE)

**Tests Implemented**:
- ✅ Migration validation SQL queries
- ✅ Data integrity checks
- ✅ RPC function validation
- ✅ Backward compatibility verification

**What We Did Well**:
- Comprehensive SQL validation
- Real-time testing via Supabase MCP
- Clear PASSED/FAILED indicators

**What to Add**:
- Automated migration test suite
- Rollback testing
- Performance benchmarks

### Phase 2, Checkpoint 5: Multi-Type Processing Pipeline

**Proposed Tests** (TDD Approach):

**1. Before Writing Code - Write Tests**:
```javascript
// tests/api/unit/type-processors.test.js

describe('Assessment Processor', () => {
  test('should extract DISC scores from assessment text', () => {
    const text = 'DISC Assessment: D=85, I=45, S=30, C=60';
    const result = processAssessment(text);

    expect(result.scores).toEqual({ D: 85, I: 45, S: 30, C: 60 });
    expect(result.type).toBe('DISC');
  });

  test('should chunk assessments by section', () => {
    const assessment = generateSampleAssessment();
    const chunks = chunkAssessment(assessment);

    expect(chunks[0]).toContain('Executive Summary');
    expect(chunks[1]).toContain('Detailed Scores');
  });
});

// tests/api/integration/assessment-upload.test.js

describe('POST /api/assessments/upload', () => {
  test('should upload DISC assessment', async () => {
    const response = await request(app)
      .post('/api/assessments/upload')
      .send({
        type: 'DISC',
        content: 'DISC Assessment results...',
        client_id: 'test-client-uuid',
        date_taken: '2025-11-12'
      });

    expect(response.status).toBe(201);
    expect(response.body.data_type).toBe('assessment');
    expect(response.body.chunks_created).toBeGreaterThan(0);
  });

  test('should reject invalid assessment type', async () => {
    const response = await request(app)
      .post('/api/assessments/upload')
      .send({ type: 'INVALID', content: 'test' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid assessment type');
  });
});
```

**2. Then Write Implementation**:
- Create `api/processors/assessment.js`
- Implement type-specific chunking
- Add validation logic
- Run tests to verify

**3. Validation Criteria**:
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] E2E upload → search → retrieve works
- [ ] Performance: Upload completes in < 5s

### Phase 2, Checkpoint 6: Type-Aware Search

**Proposed Tests**:

```javascript
// tests/api/integration/type-aware-search.test.js

describe('Type-Aware Search', () => {
  beforeAll(async () => {
    // Seed test data with multiple types
    await seedTestData({
      transcripts: 5,
      assessments: 3,
      company_docs: 2
    });
  });

  test('should filter by single type', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({
        query: 'leadership',
        types: ['assessment'],
        threshold: 0.3
      });

    expect(response.status).toBe(200);
    response.body.results.forEach(result => {
      expect(result.data_type).toBe('assessment');
    });
  });

  test('should filter by multiple types', async () => {
    const response = await request(app)
      .post('/api/search')
      .send({
        query: 'leadership',
        types: ['transcript', 'assessment'],
        threshold: 0.3
      });

    const types = response.body.results.map(r => r.data_type);
    expect(types).toContain('transcript');
    expect(types).toContain('assessment');
    expect(types).not.toContain('company_doc');
  });

  test('should filter by coach_id', async () => {
    const coachId = 'test-coach-uuid';

    const response = await request(app)
      .post('/api/search')
      .send({
        query: 'leadership',
        coach_id: coachId,
        threshold: 0.3
      });

    response.body.results.forEach(result => {
      expect(result.coach_id).toBe(coachId);
    });
  });
});
```

**Validation Criteria**:
- [ ] Type filtering works for all data types
- [ ] Multiple filter combinations work
- [ ] Performance: Search with filters < 3s
- [ ] Custom GPT can use type filters via OpenAPI schema

### Phase 3: Security & RLS

**Proposed Tests**:

```javascript
// tests/security/rls-policies.test.js

describe('Row-Level Security', () => {
  test('coaches can only see their own clients data', async () => {
    const coach1 = await createTestCoach({ id: 'coach-1' });
    const coach2 = await createTestCoach({ id: 'coach-2' });

    await createTestTranscript({ coach_id: 'coach-1', content: 'private' });
    await createTestTranscript({ coach_id: 'coach-2', content: 'secret' });

    // Set RLS context for coach-1
    const results = await supabase
      .from('data_items')
      .select('*')
      .eq('coach_id', 'coach-1');

    expect(results.data.length).toBe(1);
    expect(results.data[0].content).toContain('private');
    expect(results.data[0].content).not.toContain('secret');
  });

  test('clients can only see their own data', async () => {
    const client1 = await createTestClient({ id: 'client-1' });

    await createTestAssessment({ client_id: 'client-1' });
    await createTestAssessment({ client_id: 'client-2' });

    // Set RLS context for client-1
    const results = await supabase
      .from('data_items')
      .select('*')
      .eq('client_id', 'client-1');

    expect(results.data.length).toBe(1);
    expect(results.data[0].client_id).toBe('client-1');
  });
});

// tests/security/pii-scrubbing.test.js

describe('PII Scrubbing', () => {
  test('should scrub email addresses', () => {
    const text = 'Contact me at john@example.com for details';
    const scrubbed = scrubPII(text);

    expect(scrubbed).not.toContain('john@example.com');
    expect(scrubbed).toContain('[EMAIL]');
  });

  test('should scrub phone numbers', () => {
    const text = 'Call me at (555) 123-4567';
    const scrubbed = scrubPII(text);

    expect(scrubbed).not.toContain('555');
    expect(scrubbed).toContain('[PHONE]');
  });

  test('should preserve coaching content', () => {
    const text = 'Discussed delegation strategies';
    const scrubbed = scrubPII(text);

    expect(scrubbed).toBe(text); // No PII, unchanged
  });
});
```

---

## Tools & Infrastructure

### Testing Stack

**Core Framework**:
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library for API testing
- **Playwright**: Browser automation for E2E tests

**Database Testing**:
- **Supabase MCP Tools**: Real-time SQL query execution
- **pg**: Direct PostgreSQL connection for test isolation
- **Transaction Rollback**: Clean test database after each test

**Mocking & Stubbing**:
- **Nock**: HTTP request mocking (OpenAI API, external services)
- **Jest Mocks**: Function mocking for unit tests
- **Test Fixtures**: Predefined test data

**Performance Testing**:
- **Artillery**: Load testing HTTP endpoints
- **k6**: Performance and stress testing
- **Custom Benchmarks**: Query performance tracking

**CI/CD Integration**:
- **GitHub Actions**: Run tests on every PR
- **Vercel Preview**: Test deployments automatically
- **Supabase Branching** (Phase 6): Isolated test databases

### File Structure

```
unified-data-layer/
├── tests/
│   ├── database/               ← SQL validation queries
│   │   ├── 001_initial_schema.test.sql
│   │   ├── 002_vector_search.test.sql
│   │   ├── 003_multi_type_schema.test.sql
│   │   └── helpers.sql
│   │
│   ├── api/
│   │   ├── unit/               ← Function-level tests
│   │   │   ├── chunking.test.js
│   │   │   ├── embedding.test.js
│   │   │   ├── processors/
│   │   │   │   ├── transcript.test.js
│   │   │   │   ├── assessment.test.js
│   │   │   │   └── coaching-model.test.js
│   │   │   └── helpers.test.js
│   │   │
│   │   └── integration/        ← API endpoint tests
│   │       ├── upload.test.js
│   │       ├── search.test.js
│   │       ├── bulk-upload.test.js
│   │       └── type-aware-search.test.js
│   │
│   ├── migrations/             ← Migration testing
│   │   ├── migration-runner.test.js
│   │   ├── rollback.test.js
│   │   └── data-integrity.test.js
│   │
│   ├── security/               ← Security tests (Phase 3)
│   │   ├── rls-policies.test.js
│   │   ├── pii-scrubbing.test.js
│   │   ├── api-key-auth.test.js
│   │   └── injection-attacks.test.js
│   │
│   ├── e2e/                    ← End-to-end tests
│   │   ├── custom-gpt-integration.test.js
│   │   ├── upload-search-flow.test.js
│   │   └── multi-user-scenarios.test.js
│   │
│   ├── performance/            ← Performance tests
│   │   ├── search-load.test.js
│   │   ├── upload-throughput.test.js
│   │   └── database-queries.test.js
│   │
│   ├── fixtures/               ← Test data
│   │   ├── transcripts.json
│   │   ├── assessments.json
│   │   ├── coaching-models.json
│   │   └── users.json
│   │
│   └── helpers/                ← Test utilities
│       ├── setup.js
│       ├── teardown.js
│       ├── seed-data.js
│       └── assertions.js
│
├── jest.config.js              ← Jest configuration
├── playwright.config.js        ← Playwright configuration
└── .github/workflows/
    └── test.yml                ← CI test pipeline
```

### Configuration Files

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'api/**/*.js',
    'scripts/**/*.js',
    '!scripts/database/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  testTimeout: 30000 // 30s for integration tests
};
```

**playwright.config.js**:
```javascript
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: process.env.API_URL || 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'API E2E',
      testMatch: /.*\.test\.js/
    }
  ]
};
```

**.github/workflows/test.yml**:
```yaml
name: Test Suite

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: supabase/postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## Implementation Timeline

### Phase 2 Remaining (Now)

**Checkpoint 5 (Week 1)**:
- ✅ Set up Jest + Supertest
- ✅ Write unit tests for type processors
- ✅ Write integration tests for new endpoints
- ✅ Implement features (TDD)
- ✅ 70%+ test coverage

**Checkpoint 6 (Week 2)**:
- ✅ Add type-aware search tests
- ✅ Test filter combinations
- ✅ Performance benchmarks
- ✅ E2E Custom GPT testing

**Checkpoint 7 (Week 3)**:
- ✅ Validate all Phase 2 features
- ✅ Run full regression suite
- ✅ Document test results
- ✅ Checkpoint completion

### Phase 3: Security (4-5 weeks)

**Week 1: RLS Testing**
- Set up RLS test environment
- Write policy tests
- Implement RLS policies
- Validate isolation

**Week 2: PII Scrubbing Testing**
- Write PII detection tests
- Test scrubbing accuracy
- Performance testing
- False positive/negative testing

**Week 3: Auth Testing**
- API key authentication tests
- Multi-tenant isolation tests
- Token validation tests
- Security audit

**Week 4-5: Integration & E2E**
- Full security E2E tests
- Penetration testing
- Load testing with auth
- Security documentation

### Phase 4+: Continuous Testing

**Ongoing**:
- Run full test suite on every PR
- Weekly performance regression tests
- Monthly security audits
- Quarterly load testing

---

## Success Metrics

### Coverage Targets

**Unit Tests**: 80%+ coverage
- All utility functions
- All type processors
- All validation logic

**Integration Tests**: 70%+ coverage
- All API endpoints
- All database operations
- All E2E flows

**E2E Tests**: Critical paths
- Upload → Search flow
- Custom GPT integration
- Multi-user scenarios

### Performance Targets

**API Response Times**:
- Health check: < 100ms
- Upload: < 5s
- Search: < 3s (95th percentile)
- Bulk upload: < 30s (50 items)

**Database Query Performance**:
- Vector search: < 500ms
- Type-filtered search: < 1s
- RLS policy evaluation: < 100ms overhead

### Quality Metrics

**Test Reliability**:
- < 1% flaky tests
- 99%+ pass rate in CI
- Zero false positives

**Bug Detection**:
- Catch 90%+ bugs before production
- Zero P0 bugs in production
- < 1 hour MTTR for test failures

---

## Adoption Strategy

### Phase 2 (Now)

1. **Set up infrastructure** (1-2 days)
   - Install Jest, Supertest, Playwright
   - Create test directory structure
   - Configure CI/CD pipeline

2. **Write database tests** (ongoing)
   - Convert manual SQL queries to automated tests
   - Add to migration workflow

3. **TDD for new features** (Checkpoint 5+)
   - Write tests before code
   - Run tests during development
   - Require tests for PR approval

### Phase 3+

1. **Expand coverage** (ongoing)
   - Add security tests
   - Add performance benchmarks
   - Add E2E scenarios

2. **Enforce standards** (Week 1)
   - Require 70%+ coverage for new code
   - Block PRs with failing tests
   - Daily test reports

3. **Continuous improvement** (monthly)
   - Review test effectiveness
   - Update flaky tests
   - Add new test scenarios

---

## Questions for Discussion

1. **Test Environment**: Should we use Supabase branching (Phase 6) or maintain a separate test database now?
2. **Coverage Requirements**: Is 70% a good target, or should we aim higher?
3. **CI/CD Integration**: GitHub Actions only, or add other tools?
4. **E2E Testing**: How frequently should we run E2E tests (every PR, daily, weekly)?
5. **Performance Baselines**: What performance targets should we set for Phase 2?

---

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/ladjs/supertest)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Testing PostgreSQL with Docker](https://testcontainers.com/guides/testing-postgresql-with-docker/)
- [TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

**Next Steps**: Review proposal, discuss questions, create implementation plan for Checkpoint 5.

**Owner**: Development Team
**Status**: Awaiting approval
