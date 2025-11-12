# Checkpoint 5b: User/Organization Table Seeding

**Purpose**: Populate user and organization tables to enable full multi-type data testing

**Status**: Planning

**Created**: 2025-11-12

**Dependencies**: Checkpoint 4 (schema migration complete)

---

## Problem Statement

Checkpoint 5 implemented the multi-type processing pipeline, but end-to-end testing is blocked by empty user/organization tables. The database schema has foreign key constraints (by design), which require valid coach_id, client_id, and client_organization_id references.

**Current State**:
- ✅ Multi-type processors implemented and working
- ✅ API endpoint deployed and functional
- ✅ Validation working correctly
- ⚠️ Cannot test full upload flow due to FK constraints
- ⚠️ User tables (coaches, clients, etc.) are empty

**What We Need**:
- Seed data for coaches, clients, and client organizations
- Test data that matches realistic InsideOut Leadership scenarios
- Ability to reference these IDs in sample data uploads

---

## Scope

### In Scope:
1. Create seed data SQL script
2. Populate minimal set of test users/orgs
3. Update sample upload files with valid IDs
4. Document seed data structure
5. Provide instructions for clearing/reseeding

### Out of Scope:
- Authentication/authorization (Phase 3)
- Real production data migration
- Coaching model associations (can be null for now)
- Complex org hierarchies

---

## Seed Data Design

### Coaching Company

**1 company**: InsideOut Leadership

```sql
INSERT INTO coaching_companies (id, name, website, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440100',
  'InsideOut Leadership',
  'https://insideoutdev.com',
  true
);
```

### Coaches

**3 coaches**: Representative of different experience levels

```sql
INSERT INTO coaches (id, coaching_company_id, name, email, bio, active)
VALUES
  -- Coach A: Senior executive coach
  (
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440100',
    'Alex Rivera',
    'alex.rivera@insideoutdev.com',
    'Senior executive coach with 15 years experience. Specializes in C-suite leadership development and organizational transformation.',
    true
  ),
  -- Coach B: Mid-level coach
  (
    '550e8400-e29b-41d4-a716-446655440011',
    '550e8400-e29b-41d4-a716-446655440100',
    'Sam Chen',
    'sam.chen@insideoutdev.com',
    'Executive coach focused on emerging leaders and career transitions. Expert in DISC assessments and strengths-based coaching.',
    true
  ),
  -- Coach C: New coach
  (
    '550e8400-e29b-41d4-a716-446655440012',
    '550e8400-e29b-41d4-a716-446655440100',
    'Jordan Taylor',
    'jordan.taylor@insideoutdev.com',
    'Professional coach specializing in team dynamics and leadership presence.',
    true
  );
```

### Client Organizations

**2 client orgs**: Different industries and sizes

```sql
INSERT INTO client_organizations (id, name, industry, size, active)
VALUES
  -- Org A: Media company
  (
    '550e8400-e29b-41d4-a716-446655440200',
    'Acme Media',
    'Media & Publishing',
    'mid-market',
    true
  ),
  -- Org B: Tech startup
  (
    '550e8400-e29b-41d4-a716-446655440201',
    'TechCorp Inc',
    'Technology',
    'enterprise',
    true
  );
```

### Clients

**4 clients**: Distributed across coaches and orgs

```sql
INSERT INTO clients (id, name, email, job_title, department,
                     client_organization_id, primary_coach_id, active)
VALUES
  -- Client 1: Executive at Acme Media, coached by Alex
  (
    '550e8400-e29b-41d4-a716-446655440001',
    'Sarah Williams',
    'sarah.williams@acmemedia.com',
    'VP of Product',
    'Product',
    '550e8400-e29b-41d4-a716-446655440200',
    '550e8400-e29b-41d4-a716-446655440010',
    true
  ),
  -- Client 2: Executive at Acme Media, coached by Sam
  (
    '550e8400-e29b-41d4-a716-446655440002',
    'Michael Torres',
    'michael.torres@acmemedia.com',
    'Director of Engineering',
    'Engineering',
    '550e8400-e29b-41d4-a716-446655440200',
    '550e8400-e29b-41d4-a716-446655440011',
    true
  ),
  -- Client 3: Executive at TechCorp, coached by Alex
  (
    '550e8400-e29b-41d4-a716-446655440003',
    'Emily Zhang',
    'emily.zhang@techcorp.com',
    'CEO',
    'Executive',
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440010',
    true
  ),
  -- Client 4: Executive at TechCorp, coached by Jordan
  (
    '550e8400-e29b-41d4-a716-446655440004',
    'David Kim',
    'david.kim@techcorp.com',
    'VP of Sales',
    'Sales',
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440012',
    true
  );
```

### Coaching Models (Optional)

**1 model**: Adaptive Leadership Framework

```sql
INSERT INTO coaching_models (id, coaching_company_id, name, version,
                             model_type, description, full_content, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440300',
  '550e8400-e29b-41d4-a716-446655440100',
  'Adaptive Leadership Framework',
  '2.0',
  'framework',
  'Framework for leading through adaptive challenges',
  '(Full content from coaching-model-sample.json)',
  true
);
```

---

## Implementation Plan

### Task 1: Create Seed Script

**File**: `scripts/database/004_seed_test_data.sql`

**Content**:
- All INSERT statements above
- Clear comments explaining each section
- Idempotent (safe to run multiple times)
- Option to clear existing seed data first

**Structure**:
```sql
-- ============================================
-- Checkpoint 5b: Seed Test Data
-- ============================================
-- Purpose: Populate user/org tables for testing
-- Safe to run multiple times (uses ON CONFLICT)
--
-- To clear and reseed:
--   DELETE FROM clients;
--   DELETE FROM client_organizations;
--   DELETE FROM coaches;
--   DELETE FROM coaching_companies;
--   Then run this script
-- ============================================

-- Coaching Company
INSERT INTO coaching_companies (id, name, website, active)
VALUES (...)
ON CONFLICT (id) DO NOTHING;

-- Coaches
INSERT INTO coaches (id, coaching_company_id, ...)
VALUES (...), (...), (...)
ON CONFLICT (id) DO NOTHING;

-- ... etc
```

### Task 2: Apply Seed Script

**Options**:

**Option A: Via Supabase MCP** (Recommended)
```javascript
await mcp__supabase__execute_sql({
  project_id: 'wzebnjilqolwykmeozna',
  query: seedScriptContent
});
```

**Option B: Via Supabase SQL Editor**
1. Go to Supabase dashboard → SQL Editor
2. Paste script contents
3. Run

**Option C: Via node script**
```javascript
// scripts/seed-test-users.js
import { createClient } from '@supabase/supabase-js';
// Read and execute SQL file
```

### Task 3: Update Sample Upload Files

Update all sample files in `data/sample-uploads/` to use valid IDs:

**assessment-sample.json**:
```json
{
  "metadata": {
    "client_id": "550e8400-e29b-41d4-a716-446655440001",  // Sarah Williams
    "coach_id": "550e8400-e29b-41d4-a716-446655440010",   // Alex Rivera
    ...
  }
}
```

**coaching-model-sample.json**:
```json
{
  "metadata": {
    "coach_id": "550e8400-e29b-41d4-a716-446655440010",          // Alex Rivera
    "coaching_company_id": "550e8400-e29b-41d4-a716-446655440100", // InsideOut
    ...
  }
}
```

**company-doc-sample.json**:
```json
{
  "metadata": {
    "client_organization_id": "550e8400-e29b-41d4-a716-446655440200", // Acme Media
    "coach_id": "550e8400-e29b-41d4-a716-446655440010",               // Alex Rivera
    ...
  }
}
```

### Task 4: Create Reference Documentation

**File**: `docs/development/test-data-reference.md`

**Content**:
- Table of all seed data IDs
- Quick reference for creating test data
- Instructions for clearing/reseeding
- Examples of valid FK combinations

**Format**:
```markdown
# Test Data Reference

## Quick Reference Table

| Entity Type | Name | ID | Notes |
|-------------|------|----|----- |
| Company | InsideOut Leadership | 550e8400-e29b-41d4-a716-446655440100 | Primary coaching company |
| Coach | Alex Rivera | 550e8400-e29b-41d4-a716-446655440010 | Senior coach, works with Sarah & Emily |
| Client | Sarah Williams | 550e8400-e29b-41d4-a716-446655440001 | VP Product @ Acme Media |
| ... | ... | ... | ... |

## Valid Combinations

**For Transcripts**:
- coach_id + client_id + client_organization_id
- Example: Alex coaching Sarah at Acme Media
  - coach_id: 550e8400-e29b-41d4-a716-446655440010
  - client_id: 550e8400-e29b-41d4-a716-446655440001
  - client_organization_id: 550e8400-e29b-41d4-a716-446655440200

**For Assessments**:
- client_id (required)
- coach_id (optional)
- client_organization_id (optional)
```

### Task 5: Test Full Upload Flow

After seeding, test each data type:

1. **Assessment Upload**:
   ```bash
   curl -X POST https://unified-data-layer.vercel.app/api/data/upload \
     -H "Content-Type: application/json" \
     -d @data/sample-uploads/assessment-sample.json
   ```

2. **Coaching Model Upload**:
   ```bash
   curl -X POST https://unified-data-layer.vercel.app/api/data/upload \
     -H "Content-Type: application/json" \
     -d @data/sample-uploads/coaching-model-sample.json
   ```

3. **Company Doc Upload**:
   ```bash
   curl -X POST https://unified-data-layer.vercel.app/api/data/upload \
     -H "Content-Type: application/json" \
     -d @data/sample-uploads/company-doc-sample.json
   ```

4. **Transcript Upload** (via new endpoint):
   ```bash
   curl -X POST https://unified-data-layer.vercel.app/api/data/upload \
     -H "Content-Type: application/json" \
     -d '{
       "data_type": "transcript",
       "content": "Session transcript text...",
       "metadata": {
         "coach_id": "550e8400-e29b-41d4-a716-446655440010",
         "client_id": "550e8400-e29b-41d4-a716-446655440001"
       }
     }'
   ```

---

## Success Criteria

### Checkpoint 5b Complete When:

1. ✅ Seed script created and documented
2. ✅ User/org tables populated in database
3. ✅ Sample upload files updated with valid IDs
4. ✅ All 4 data types successfully upload with embeddings
5. ✅ Database queries return seeded data correctly
6. ✅ Reference documentation created

### Validation Tests:

```sql
-- Test 1: Verify seed data counts
SELECT
  (SELECT COUNT(*) FROM coaching_companies) as companies,
  (SELECT COUNT(*) FROM coaches) as coaches,
  (SELECT COUNT(*) FROM clients) as clients,
  (SELECT COUNT(*) FROM client_organizations) as orgs;

-- Expected: 1 company, 3 coaches, 4 clients, 2 orgs

-- Test 2: Verify FK relationships
SELECT
  c.name as coach_name,
  cl.name as client_name,
  co.name as org_name
FROM coaches c
JOIN clients cl ON cl.primary_coach_id = c.id
JOIN client_organizations co ON cl.client_organization_id = co.id;

-- Expected: 4 rows showing coach-client-org relationships

-- Test 3: Verify data_items can reference user tables
SELECT di.data_type, c.name as coach_name, cl.name as client_name
FROM data_items di
LEFT JOIN coaches c ON di.coach_id = c.id
LEFT JOIN clients cl ON di.client_id = cl.id
LIMIT 5;

-- Expected: Should run without FK constraint errors
```

---

## Estimated Effort

- **Task 1** (Create seed script): 30 minutes
- **Task 2** (Apply to database): 10 minutes
- **Task 3** (Update sample files): 20 minutes
- **Task 4** (Documentation): 30 minutes
- **Task 5** (Test uploads): 30 minutes

**Total**: ~2 hours

---

## Risk Mitigation

### Risk 1: Seed data conflicts with existing data
**Mitigation**:
- Use explicit UUIDs that won't conflict
- Use `ON CONFLICT DO NOTHING` in SQL
- Document clear/reseed process

### Risk 2: FK constraints fail during seeding
**Mitigation**:
- Seed in correct order (companies → coaches → orgs → clients)
- Include all required fields
- Test script on empty database first

### Risk 3: Sample files become out of sync
**Mitigation**:
- Create reference doc with all IDs
- Add validation script to check sample files
- Document process for adding new test data

---

## Future Enhancements (Post-Checkpoint 5b)

1. **Automated Seeding**:
   - Add to CI/CD pipeline
   - Seed on fresh database deploys
   - npm script: `npm run seed:test-data`

2. **Data Factories**:
   - JavaScript functions to generate test data
   - Randomized but valid test scenarios
   - Useful for stress testing

3. **Seed Data Variations**:
   - Multiple coaching companies
   - More complex org hierarchies
   - Inactive/archived users for testing filters

4. **Database Reset Script**:
   - Clear all test data
   - Preserve schema
   - Quick iteration during testing

---

## Notes

- This is a **testing-only** checkpoint
- Seed data should NOT go to production
- Real user data will come from authentication (Phase 3)
- IDs are hardcoded for reproducibility
- Safe to run multiple times (idempotent)

---

**Last Updated**: 2025-11-12

**Status**: Ready for Implementation
