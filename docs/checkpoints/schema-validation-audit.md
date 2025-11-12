# Schema Validation Audit: Slug + JSONB Architecture

**Purpose**: Validate that actual database schema (slug + JSONB) aligns with Phase 2 roadmap assumptions

**Date**: 2025-11-12

**Status**: Audit Complete - Action Items Identified

---

## Executive Summary

The actual database schema uses **slug + JSONB metadata** pattern instead of individual columns as originally planned in the Phase 2 implementation plan. This is a **good architectural decision** for flexibility, but requires validation that all downstream roadmap assumptions remain valid.

**Key Finding**: No critical failure points identified. Schema change is **compatible** with roadmap, but documentation and validation queries need updates.

---

## Schema Comparison

### User/Org Tables (Actual vs. Planned)

#### Coaching Companies
**Planned**: `id, name, website, active, created_at, updated_at`
**Actual**: `id, name, slug, metadata, created_at, updated_at`

**Impact**: ✅ Compatible
- `website` and `active` moved to `metadata` JSONB
- Added `slug` for URL-friendly references
- No breaking changes to FK relationships

#### Coaches
**Planned**: `id, coaching_company_id, name, email, bio, active, created_at, updated_at`
**Actual**: `id, coaching_company_id, name, email, bio, metadata, created_at, updated_at`

**Impact**: ✅ Compatible
- `active` moved to `metadata` JSONB
- Can add custom fields per coach (e.g., `experience_years`)
- No breaking changes to FK relationships

#### Client Organizations
**Planned**: `id, name, industry, size, active, created_at, updated_at`
**Actual**: `id, name, slug, industry, metadata, created_at, updated_at`

**Impact**: ✅ Compatible
- `size` and `active` moved to `metadata` JSONB
- Added `slug` for URL-friendly references
- `industry` kept as column (frequently queried)
- No breaking changes to FK relationships

#### Clients
**Planned**: `id, name, email, job_title, department, client_organization_id, primary_coach_id, active, created_at, updated_at`
**Actual**: `id, name, email, title, client_organization_id, primary_coach_id, metadata, created_at, updated_at`

**Impact**: ✅ Compatible
- `job_title` renamed to `title` (simpler)
- `department` and `active` moved to `metadata` JSONB
- FK relationships unchanged
- No breaking changes

#### Coaching Models
**Planned**: Referenced in roadmap but schema not fully specified
**Actual**: `id, coaching_company_id, name, slug, description, content, metadata, created_at, updated_at`

**Impact**: ✅ Well-designed
- Has dedicated table (not just in `data_items`)
- Supports associations via `coach_model_associations` table
- Content stored in table (can also be in `data_items` for search)

---

## Roadmap Impact Analysis

### Checkpoint 5 (Multi-Type Processing) ✅ COMPLETE

**Status**: No issues
- Processors don't depend on individual columns
- All metadata stored in JSONB in `data_items.metadata`
- FK constraints work correctly with actual schema

### Checkpoint 6 (Type-Aware Search) ⚠️ NEEDS VALIDATION

**Planned Queries**:
```sql
-- Filter by coach
WHERE coach_id = $1

-- Filter by active coaches only
WHERE coach_id IN (SELECT id FROM coaches WHERE active = true)
```

**Required Updates**:
```sql
-- Filter by active coaches (JSONB query)
WHERE coach_id IN (
  SELECT id FROM coaches
  WHERE metadata->>'active' = 'true'
)

-- Filter by client org size
WHERE client_organization_id IN (
  SELECT id FROM client_organizations
  WHERE metadata->>'size' = 'enterprise'
)

-- Filter by client department
WHERE client_id IN (
  SELECT id FROM clients
  WHERE metadata->>'department' = 'Engineering'
)
```

**Impact**: ⚠️ Minor - Queries need JSONB operators, but fully supported

### Checkpoint 7 (Custom GPT Integration) ✅ NO IMPACT

**Why**: Custom GPT queries via API, which abstracts database schema
- API layer handles JSONB metadata extraction
- No direct database access from Custom GPT
- Responses format data regardless of storage schema

### Phase 3 (Security & RLS) ⚠️ NEEDS VALIDATION

**Planned RLS Policies** (from roadmap):
```sql
-- Only return data visible to requesting coach
CREATE POLICY coach_visibility ON data_items
  FOR SELECT USING (
    coach_id = current_user_id()
    OR visibility_level IN ('org_visible', 'public')
  );
```

**Impact with Slug/JSONB**: ✅ No issues
- RLS policies operate on `data_items` table
- User/org tables are reference data, not restricted
- JSONB metadata doesn't affect RLS logic

---

## Potential Failure Points & Mitigations

### 1. JSONB Query Performance ⚠️ LOW RISK

**Issue**: Queries on JSONB fields (`metadata->>'active'`) may be slower than indexed columns

**Mitigation**:
- Create GIN indexes on frequently-queried metadata keys:
```sql
CREATE INDEX idx_coaches_active ON coaches
  USING GIN ((metadata->'active'));

CREATE INDEX idx_orgs_size ON client_organizations
  USING GIN ((metadata->'size'));

CREATE INDEX idx_clients_department ON clients
  USING GIN ((metadata->'department'));
```

**Priority**: Medium (implement in Checkpoint 6)

### 2. Type Safety for Metadata ⚠️ LOW RISK

**Issue**: JSONB doesn't enforce schema - typos like `{"activ": true}` won't error

**Mitigation**:
- Application-layer validation in processors (already done)
- Optional: Add PostgreSQL CHECK constraints:
```sql
ALTER TABLE coaches ADD CONSTRAINT valid_metadata CHECK (
  jsonb_typeof(metadata->'active') = 'boolean'
  OR metadata->'active' IS NULL
);
```

**Priority**: Low (nice-to-have for Phase 3)

### 3. Documentation Drift ⚠️ MEDIUM RISK

**Issue**: Phase 2 plan shows old schema, may confuse future developers

**Mitigation**:
- Update [phase-2-implementation-plan.md](../project/phase-2-implementation-plan.md)
- Create schema reference doc with actual structure
- Add schema diagrams showing slug + JSONB pattern

**Priority**: High (do before Checkpoint 6)

### 4. Migration Scripts for Future Columns ⚠️ LOW RISK

**Issue**: Adding new JSONB keys doesn't require migration, but might need data backfill

**Mitigation**:
- Document JSONB key conventions in schema reference
- Use default values when reading: `COALESCE(metadata->>'active', 'true')`
- Create backfill scripts when needed

**Priority**: Low (future concern)

---

## Action Items

### Immediate (Before Checkpoint 6)

1. **Update Phase 2 Implementation Plan** ✅ HIGH PRIORITY
   - File: `docs/project/phase-2-implementation-plan.md`
   - Update schema examples to show slug + JSONB
   - Update query examples to use JSONB operators
   - Add note about schema flexibility benefits

2. **Create Schema Reference Doc** ✅ HIGH PRIORITY
   - File: `docs/development/schema-reference.md`
   - Document actual table structures
   - Show JSONB metadata conventions
   - Provide query patterns for common operations

3. **Validate Search Queries** ✅ MEDIUM PRIORITY
   - Test JSONB filtering performance
   - Ensure RPC function `match_data_chunks` handles JSONB filters
   - Update search endpoint to support metadata filters

### Short-Term (During Checkpoint 6)

4. **Add JSONB Indexes** ⚠️ MEDIUM PRIORITY
   - Create GIN indexes on frequently-queried metadata keys
   - Benchmark query performance before/after
   - Document index strategy

5. **Test Edge Cases** ⚠️ MEDIUM PRIORITY
   - Null metadata values
   - Missing JSONB keys
   - Invalid JSON structure handling

### Long-Term (Phase 3+)

6. **Add Metadata Validation** ℹ️ LOW PRIORITY
   - JSON Schema validation for metadata
   - PostgreSQL CHECK constraints
   - Application-layer type enforcement

7. **Create Slug Management Strategy** ℹ️ LOW PRIORITY
   - Slug generation rules
   - Uniqueness constraints
   - Update behavior (URL stability)

---

## Validation Queries

### Test JSONB Filtering Performance

```sql
-- Test: Find active coaches
EXPLAIN ANALYZE
SELECT * FROM coaches
WHERE metadata->>'active' = 'true';

-- Test: Find enterprise clients
EXPLAIN ANALYZE
SELECT c.* FROM clients c
JOIN client_organizations co ON c.client_organization_id = co.id
WHERE co.metadata->>'size' = 'enterprise';

-- Test: Complex filter with JSONB
EXPLAIN ANALYZE
SELECT di.* FROM data_items di
JOIN coaches c ON di.coach_id = c.id
WHERE di.data_type = 'assessment'
  AND c.metadata->>'active' = 'true'
  AND c.metadata->>'experience_years'::int > 10;
```

### Test Null/Missing Metadata Handling

```sql
-- Test: Default values for missing keys
SELECT
  id,
  name,
  COALESCE(metadata->>'active', 'true')::boolean as active,
  COALESCE(metadata->>'experience_years', '0')::int as experience_years
FROM coaches;

-- Test: Graceful null handling
SELECT * FROM coaches
WHERE metadata IS NULL
   OR metadata->>'active' IS NULL;
```

---

## Recommendations

### For Current Roadmap

1. ✅ **Continue with slug + JSONB pattern** - It's a good architectural decision
2. ✅ **Update documentation** before Checkpoint 6 to avoid confusion
3. ⚠️ **Add JSONB indexes** during Checkpoint 6 implementation
4. ⚠️ **Test query performance** with realistic data volumes

### For Future Phases

1. Consider **JSON Schema validation** for metadata structure enforcement
2. Document **metadata key conventions** (naming, types, required vs optional)
3. Create **helper functions** for common JSONB queries
4. Monitor **query performance** and add indexes as needed

---

## Conclusion

**Schema change from individual columns to slug + JSONB is COMPATIBLE with Phase 2 roadmap.**

**No critical failure points identified.** The architecture is actually **more flexible and future-proof** than the original plan.

**Required actions**:
1. Documentation updates (high priority)
2. Query pattern adjustments (medium priority)
3. Performance validation (medium priority)

**Timeline impact**: None - can proceed with Checkpoint 6 as planned.

**Recommendation**: ✅ **Proceed with current schema, update docs, add indexes during Checkpoint 6.**

---

**Next Steps**:
1. Update Phase 2 implementation plan
2. Create schema reference doc
3. Proceed to Checkpoint 6 (Type-Aware Search)
