# Database Migration Template

**Purpose**: Standard template for creating database migrations with proper documentation and safety checks.

**Last Updated**: 2025-11-20

---

## Migration File Header

Every migration should start with this header:

```sql
-- Migration: XXX_descriptive_name.sql
-- Description: Brief description of what this migration does
-- Phase: Phase X - Checkpoint Y
-- Author: leadinsideout
-- Date: YYYY-MM-DD
-- Prerequisites: List any required prior migrations (e.g., 005a, 005b, 004)
-- Rollback: See docs/security/rollback-plan-XXX.md (or inline below)

-- ============================================
-- PRE-MIGRATION AUDIT RESULTS
-- ============================================
-- Audit Date: YYYY-MM-DD
-- Current Tables Verified: [table1, table2, table3]
-- Missing Prerequisites: [none] or [list of missing tables/functions]
-- Special Cases Identified: [admin users, null values, system accounts]
-- PostgreSQL Compatibility: [verified/issues noted]
-- Local Testing: [passed/failed] (see test log)

-- ============================================
-- MIGRATION OVERVIEW
-- ============================================
-- This migration will:
-- 1. Create X new tables
-- 2. Add Y new columns
-- 3. Enable Z features
-- 4. Create N indexes/policies
-- 5. Seed initial data (optional)
```

---

## Function Volatility Checklist

Before creating functions that will be used in indexes, constraints, or triggers:

### Question 1: Is the function deterministic?
**Does it always return the same output for the same input?**

- ✅ Yes → Can be `IMMUTABLE`
- ❌ No → Continue to Question 2

**Examples**:
- IMMUTABLE: `LOWER('TEXT')` always returns `'text'`
- NOT IMMUTABLE: `NOW()` returns different value each call

### Question 2: Does the function read session state or configuration?
**Does it use `current_setting()`, `current_user`, `session_user`, etc.?**

- ✅ Yes → **Must be `STABLE`** (cannot use in index predicates)
- ❌ No → Can be `IMMUTABLE`

**Examples**:
- STABLE: `get_current_user_id()` reads `current_setting('app.current_user_id')`
- IMMUTABLE: `calculate_score(value INT)` only uses input parameter

### Question 3: Does the function modify database state?
**Does it INSERT, UPDATE, DELETE, or call functions that do?**

- ✅ Yes → **Must be `VOLATILE`**
- ❌ No → Can be `STABLE` or `IMMUTABLE`

**Examples**:
- VOLATILE: `log_access(user_id)` inserts audit log row
- STABLE: `get_user_name(id)` only reads data

### Decision Matrix

| Function Type | Deterministic? | Reads Session? | Modifies DB? | Volatility | Index Predicate OK? |
|---------------|----------------|----------------|--------------|------------|---------------------|
| Pure calculation | Yes | No | No | IMMUTABLE | ✅ Yes |
| Session getter | No | Yes | No | STABLE | ❌ No |
| Data reader | Yes | No | No | IMMUTABLE | ✅ Yes |
| Audit logger | No | No | Yes | VOLATILE | ❌ No |

### Function Template

```sql
-- Example: Session-dependent function (STABLE)
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.current_user_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Example: Pure function (IMMUTABLE)
CREATE OR REPLACE FUNCTION calculate_similarity_threshold(input_threshold FLOAT)
RETURNS FLOAT AS $$
BEGIN
  RETURN GREATEST(0.0, LEAST(1.0, input_threshold));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example: Audit function (VOLATILE)
CREATE OR REPLACE FUNCTION log_data_access(user_id UUID, resource_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (user_id, resource_id, action, created_at)
  VALUES (user_id, resource_id, 'READ', NOW());
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
```

---

## Constraint Design Checklist

Before creating constraints, verify:

### 1. Special Cases Identified
- [ ] Considered admin/system users (may not fit normal patterns)
- [ ] Considered null values (when are they valid?)
- [ ] Considered future user types (service accounts, API keys, etc.)
- [ ] Documented why each special case exists

### 2. Constraint Flexibility
- [ ] Constraint allows for future flexibility
- [ ] Constraint doesn't enforce business logic better handled in application
- [ ] Constraint can be modified without data migration

### 3. Constraint Validation
- [ ] Test data includes special cases
- [ ] Constraint validated with test inserts
- [ ] Error messages are clear and actionable

### 4. Constraint Documentation
- [ ] Documented why constraint is needed
- [ ] Documented what constraint enforces
- [ ] Documented known exceptions

### Constraint Patterns

**Pattern 1: Binary Relationship (One or the Other)**
```sql
-- ❌ TOO STRICT (doesn't allow special cases like admin)
CONSTRAINT key_has_single_owner CHECK (
  (coach_id IS NOT NULL AND client_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NOT NULL)
)

-- ✅ BETTER (allows both null for admin/system)
CONSTRAINT key_owner_not_both CHECK (
  NOT (coach_id IS NOT NULL AND client_id IS NOT NULL)
)

-- 📝 Document special case
-- NULL/NULL = admin or system key (identified by scope)
```

**Pattern 2: Enum Values**
```sql
-- ❌ TOO STRICT (requires migration to add new types)
CONSTRAINT data_type_valid CHECK (
  data_type IN ('transcript', 'assessment', 'model', 'company_doc')
)

-- ✅ BETTER (use ENUM type or document valid values)
-- Use application-level validation for extensibility
-- Document valid types in comments instead
```

**Pattern 3: Range Validation**
```sql
-- ✅ GOOD (clear range with business reasoning)
CONSTRAINT similarity_threshold_range CHECK (
  similarity_threshold >= 0.0 AND similarity_threshold <= 1.0
)
-- Range: 0.0 = no match, 1.0 = exact match
```

---

## Migration Structure

Use this standard structure for all migrations:

```sql
-- ============================================
-- STEP 1: CREATE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  column1 TEXT NOT NULL,
  column2 INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- STEP 2: CREATE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type AS $$
BEGIN
  -- Function logic
END;
$$ LANGUAGE plpgsql [IMMUTABLE|STABLE|VOLATILE] SECURITY DEFINER;

-- ============================================
-- STEP 3: ENABLE FEATURES
-- ============================================

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS extension_name;

-- ============================================
-- STEP 4: CREATE POLICIES/RULES
-- ============================================

CREATE POLICY policy_name ON table_name FOR SELECT
  USING (condition);

CREATE POLICY policy_name ON table_name FOR INSERT
  WITH CHECK (condition);

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- NOTE: Cannot use STABLE/VOLATILE functions in index predicates
-- CREATE INDEX idx_name ON table (column) WHERE function(); -- ❌ FAILS if function is STABLE
-- CREATE INDEX idx_name ON table (column); -- ✅ OK

-- ============================================
-- STEP 6: SEED DATA (Optional)
-- ============================================

INSERT INTO table_name (column1, column2)
VALUES ('value1', 123)
ON CONFLICT (unique_column) DO NOTHING;

-- ============================================
-- STEP 7: VERIFICATION QUERIES
-- ============================================

-- Verify tables created
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('table1', 'table2')
ORDER BY tablename;

-- Verify policies created
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'table_name'
ORDER BY policyname;

-- Verify indexes created
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'table_name'
ORDER BY indexname;

-- Verify data seeded
SELECT COUNT(*) as row_count FROM table_name;
```

---

## Rollback Template

Create a separate rollback file: `XXX_rollback.sql`

```sql
-- Rollback: XXX_descriptive_name.sql
-- Description: Reverts migration XXX_descriptive_name.sql
-- Author: leadinsideout
-- Date: YYYY-MM-DD

-- ============================================
-- ROLLBACK OVERVIEW
-- ============================================
-- This rollback will:
-- 1. Disable features (RLS, triggers, etc.)
-- 2. Drop policies/rules
-- 3. Drop indexes
-- 4. Drop functions
-- 5. Drop tables (⚠️ data loss warning)

-- ============================================
-- STEP 1: DISABLE FEATURES
-- ============================================

ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP POLICIES
-- ============================================

DROP POLICY IF EXISTS policy_name ON table_name;

-- ============================================
-- STEP 3: DROP INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_table_column;

-- ============================================
-- STEP 4: DROP FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS function_name();

-- ============================================
-- STEP 5: DROP TABLES (⚠️ DATA LOSS)
-- ============================================

-- WARNING: This will delete all data in these tables
-- DROP TABLE IF EXISTS table_name CASCADE;

-- For safer rollback, consider:
-- 1. Backup data before dropping
-- 2. Use DISABLE instead of DROP
-- 3. Rename tables instead of dropping (for recovery)

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables dropped
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('table1', 'table2');
-- Expected: 0 rows

-- Verify policies dropped
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'table_name';
-- Expected: 0

-- Verify functions dropped
SELECT proname
FROM pg_proc
WHERE proname IN ('function1', 'function2');
-- Expected: 0 rows
```

---

## Migration Naming Convention

Format: `XXX_descriptive_name.sql`

- **XXX**: 3-digit sequence number (e.g., 001, 002, 003)
- **descriptive_name**: Kebab-case description

**Examples**:
- `001_initial_schema.sql`
- `002_add_vector_embeddings.sql`
- `003_multi_type_schema.sql`
- `004_coaching_organizations.sql`
- `005a_add_visibility_levels.sql`
- `005b_add_join_tables.sql`
- `006_row_level_security.sql`

**Suffixes**:
- `a`, `b`, `c`: Sub-migrations within same logical change
- No suffix: Single standalone migration

---

## Pre-Migration Audit Checklist

Run this audit BEFORE writing migration SQL:

### 1. Verify Current Schema
```sql
-- List all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all columns for specific table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'target_table'
ORDER BY ordinal_position;

-- List all constraints
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace;

-- List all indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### 2. Check for Missing Prerequisites
- [ ] Review design docs for required tables
- [ ] List all foreign key references in migration
- [ ] Verify all referenced tables exist
- [ ] Verify all referenced functions exist
- [ ] Document missing items

### 3. Identify Special Cases
- [ ] List all user types (coach, client, admin, system)
- [ ] Identify null value scenarios
- [ ] Consider future extensibility
- [ ] Document edge cases

### 4. Review PostgreSQL Requirements
- [ ] Check function volatility for indexes
- [ ] Review constraint types (CHECK, FOREIGN KEY, UNIQUE)
- [ ] Verify data types match across foreign keys
- [ ] Check for reserved keywords in names

### 5. Create Test Data
```sql
-- Create minimal test dataset
INSERT INTO table (columns) VALUES (test_values);

-- Test constraint validation
INSERT INTO table (columns) VALUES (invalid_values); -- Should fail

-- Test special cases
INSERT INTO table (columns) VALUES (null, null); -- Admin case
```

---

## Local Testing Procedure

### 1. Setup Local Database
```bash
# Create local test database
createdb unified_data_layer_test

# Enable required extensions
psql unified_data_layer_test -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql unified_data_layer_test -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### 2. Restore Production Schema
```bash
# Export production schema (no data)
pg_dump --schema-only -d production_db > current_schema.sql

# Import to local test database
psql unified_data_layer_test < current_schema.sql
```

### 3. Test Migration
```bash
# Apply migration
psql unified_data_layer_test < scripts/database/XXX_migration.sql

# Check for errors
echo $?  # Should be 0 (success)

# Run verification queries
psql unified_data_layer_test -f scripts/database/XXX_verify.sql
```

### 4. Test Rollback
```bash
# Apply rollback
psql unified_data_layer_test < scripts/database/XXX_rollback.sql

# Verify database restored
psql unified_data_layer_test -c "\dt"  # List tables
psql unified_data_layer_test -c "\df"  # List functions
```

### 5. Document Results
Create test log: `scripts/database/XXX_test_log.txt`

```
Migration Test Log: XXX_descriptive_name.sql
Date: YYYY-MM-DD
Tester: [name]

Pre-Migration State:
- Tables: [count]
- Functions: [count]
- Policies: [count]

Migration Execution:
✅ Step 1: Create tables - PASSED
✅ Step 2: Create functions - PASSED
✅ Step 3: Enable RLS - PASSED
✅ Step 4: Create policies - PASSED
✅ Step 5: Create indexes - PASSED
✅ Step 6: Seed data - PASSED
✅ Step 7: Verification queries - PASSED

Post-Migration State:
- Tables: [count] (+X)
- Functions: [count] (+Y)
- Policies: [count] (+Z)

Rollback Test:
✅ Rollback executed - PASSED
✅ Database restored - PASSED

Overall: ✅ PASSED - Ready for production
```

---

## Common Pitfalls

### 1. Using STABLE Functions in Index Predicates
```sql
-- ❌ FAILS
CREATE INDEX idx_active_keys ON api_keys(key_hash)
  WHERE is_revoked = false AND get_current_user_id() IS NOT NULL;
-- ERROR: functions in index predicate must be marked IMMUTABLE

-- ✅ FIX
CREATE INDEX idx_active_keys ON api_keys(key_hash)
  WHERE is_revoked = false;
-- Remove function from predicate
```

### 2. Missing CASCADE on Foreign Keys
```sql
-- ❌ RISKY
ALTER TABLE data_chunks ADD CONSTRAINT fk_data_item
  FOREIGN KEY (data_item_id) REFERENCES data_items(id);
-- Deleting data_item will fail if chunks exist

-- ✅ BETTER
ALTER TABLE data_chunks ADD CONSTRAINT fk_data_item
  FOREIGN KEY (data_item_id) REFERENCES data_items(id)
  ON DELETE CASCADE;
-- Deleting data_item automatically deletes chunks
```

### 3. Overly Restrictive Constraints
```sql
-- ❌ TOO STRICT
CONSTRAINT key_has_owner CHECK (
  coach_id IS NOT NULL OR client_id IS NOT NULL
)
-- Breaks for admin keys

-- ✅ FLEXIBLE
-- No constraint, handle in application logic
-- OR document that NULL/NULL is valid for admin
```

### 4. Missing IF NOT EXISTS
```sql
-- ❌ FAILS on re-run
CREATE TABLE api_keys (...);
-- ERROR: relation already exists

-- ✅ IDEMPOTENT
CREATE TABLE IF NOT EXISTS api_keys (...);
-- Safe to run multiple times
```

---

## References

- [PostgreSQL Function Volatility](https://www.postgresql.org/docs/current/xfunc-volatility.html)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

---

**Template Version**: 1.0
**Last Updated**: 2025-11-20
**Maintained By**: leadinsideout
