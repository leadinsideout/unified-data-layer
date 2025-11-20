# Local Development Setup

**Purpose**: Set up local PostgreSQL environment for testing migrations and development before applying to production.

**Last Updated**: 2025-11-20

---

## Why Local Development?

Testing migrations locally before production prevents:
- ❌ Production errors from untested migrations
- ❌ Downtime from failed migrations
- ❌ Data loss from incorrect rollback procedures
- ❌ Time wasted debugging in production

Benefits:
- ✅ Catch errors early (function volatility, missing tables, constraint violations)
- ✅ Test rollback procedures safely
- ✅ Validate data integrity before production
- ✅ Develop with confidence

**Time Investment**: ~30 minutes setup
**Time Saved**: 2-3 hours per migration (debugging, rollback, recovery)

---

## Prerequisites

- macOS, Linux, or Windows with WSL
- Terminal access with admin/sudo privileges
- PostgreSQL 17.x compatible system
- 500 MB free disk space

---

## Installation

### macOS (Homebrew)

```bash
# Install PostgreSQL 17
brew install postgresql@17

# Install pgvector extension
brew install pgvector

# Start PostgreSQL service
brew services start postgresql@17

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 17.x
```

### Linux (Ubuntu/Debian)

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update

# Install PostgreSQL 17
sudo apt install postgresql-17 postgresql-17-pgvector

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 17.x
```

### Windows (WSL)

Follow Linux instructions above in your WSL environment.

---

## Database Setup

### 1. Create Local Database

```bash
# Connect as postgres user (default superuser)
psql -U postgres

# Create database
CREATE DATABASE unified_data_layer_local;

# Connect to new database
\c unified_data_layer_local

# Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

# Enable pg_trgm for text search (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

# Verify extensions
\dx
# Expected: vector, pg_trgm in list

# Exit psql
\q
```

### 2. Configure Connection

Create connection alias in `~/.psql_aliases` (or `~/.bashrc`):

```bash
# Add to ~/.bashrc or ~/.zshrc
alias psql-local='psql -U postgres -d unified_data_layer_local'
alias psql-prod='psql postgresql://[SUPABASE_CONNECTION_STRING]'
```

**Security Note**: Never commit production connection strings to git. Use environment variables.

---

## Schema Management

### Option 1: Export from Supabase Dashboard

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Run this query to export schema:

```sql
-- Export all table structures (no data)
SELECT
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || E'\n  ' ||
  string_agg(
    column_name || ' ' || data_type ||
    CASE WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
    E',\n  '
  ) || E'\n);'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
```

4. Copy output to `scripts/database/current_schema.sql`
5. Apply to local database:

```bash
psql-local < scripts/database/current_schema.sql
```

### Option 2: Use Supabase CLI (Recommended)

**Install Supabase CLI**:
```bash
# macOS
brew install supabase/tap/supabase

# Linux/Windows (WSL)
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/
```

**Export Schema**:
```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref wzebnjilqolwykmeozna

# Export schema (no data)
supabase db dump --schema-only > scripts/database/current_schema.sql

# Import to local database
psql-local < scripts/database/current_schema.sql
```

### Option 3: Manual Table Creation

If you have migration scripts from `scripts/database/`, run them in order:

```bash
# Run all migrations in sequence
for file in scripts/database/00*.sql; do
  echo "Applying $file..."
  psql-local < "$file"
  if [ $? -ne 0 ]; then
    echo "❌ Migration failed: $file"
    exit 1
  fi
done

echo "✅ All migrations applied successfully"
```

---

## Verify Setup

### Check Tables Exist

```bash
psql-local -c "\dt"
```

**Expected Output**:
```
                List of relations
 Schema |         Name         | Type  |  Owner
--------+----------------------+-------+----------
 public | api_keys             | table | postgres
 public | audit_logs           | table | postgres
 public | client_organizations | table | postgres
 public | clients              | table | postgres
 public | coach_clients        | table | postgres
 public | coach_model_associations | table | postgres
 public | coach_organizations  | table | postgres
 public | coaches              | table | postgres
 public | coaching_companies   | table | postgres
 public | coaching_models      | table | postgres
 public | data_chunks          | table | postgres
 public | data_items           | table | postgres
```

### Check Extensions Enabled

```bash
psql-local -c "\dx"
```

**Expected Output**:
```
                 List of installed extensions
  Name   | Version |   Schema   |         Description
---------+---------+------------+------------------------------
 pg_trgm | 1.6     | public     | text similarity measurement
 plpgsql | 1.0     | pg_catalog | PL/pgSQL procedural language
 vector  | 0.7.0   | public     | vector data type and ivfflat access method
```

### Check Vector Dimension

```bash
psql-local -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'data_chunks' AND column_name = 'embedding';"
```

**Expected Output**:
```
 column_name | data_type
-------------+-----------
 embedding   | vector(1536)
```

---

## Testing Migrations

### Pre-Migration Checklist

Before testing a migration:

- [ ] Local database has current production schema
- [ ] Local database has test data (optional but recommended)
- [ ] Migration SQL file is finalized
- [ ] Rollback SQL file is created
- [ ] Verification queries are prepared

### Test Migration Execution

```bash
# 1. Backup current schema (in case of issues)
pg_dump -U postgres --schema-only unified_data_layer_local > backup_schema.sql

# 2. Apply migration
psql-local < scripts/database/XXX_new_migration.sql

# 3. Check for errors
echo $?  # Should be 0 (success)

# 4. Run verification queries (from migration file)
psql-local -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"

# 5. Verify data integrity
psql-local -c "SELECT COUNT(*) FROM data_items;"
psql-local -c "SELECT COUNT(*) FROM data_chunks;"
```

### Test Rollback Procedure

```bash
# 1. Apply rollback
psql-local < scripts/database/XXX_rollback.sql

# 2. Verify rollback succeeded
psql-local -c "\dt"  # Check tables removed/restored
psql-local -c "\df"  # Check functions removed/restored

# 3. Verify data integrity after rollback
psql-local -c "SELECT COUNT(*) FROM data_items;"
psql-local -c "SELECT COUNT(*) FROM data_chunks;"
```

### Document Test Results

Create test log: `scripts/database/XXX_test_log.txt`

```
Migration Test Log
==================
Migration: XXX_descriptive_name.sql
Date: 2025-11-20
Tester: leadinsideout

Environment
-----------
PostgreSQL Version: 17.6.1
pgvector Version: 0.7.0
Database: unified_data_layer_local

Pre-Migration State
-------------------
Tables: 12
Functions: 5
Policies: 40
Data Items: 19
Data Chunks: 40

Migration Execution
-------------------
✅ Step 1: Create tables - PASSED (0.023s)
✅ Step 2: Create functions - PASSED (0.015s)
✅ Step 3: Enable RLS - PASSED (0.008s)
✅ Step 4: Create policies - PASSED (0.042s)
✅ Step 5: Create indexes - PASSED (0.031s)
✅ Step 6: Seed data - PASSED (0.012s)
✅ Step 7: Verification - PASSED

Post-Migration State
--------------------
Tables: 14 (+2)
Functions: 7 (+2)
Policies: 45 (+5)
Data Items: 19 (unchanged)
Data Chunks: 40 (unchanged)

Rollback Test
-------------
✅ Rollback executed - PASSED (0.018s)
✅ Tables restored - PASSED
✅ Functions removed - PASSED
✅ Policies removed - PASSED
✅ Data integrity - PASSED (no data loss)

Issues Encountered
------------------
None

Overall Result
--------------
✅ PASSED - Ready for production deployment

Production Deployment Plan
--------------------------
1. Create safety checkpoint commit
2. Document rollback instructions
3. Schedule maintenance window (optional)
4. Apply via Supabase dashboard
5. Run verification queries
6. Monitor API endpoints
```

---

## Seed Test Data

To test migrations with realistic data:

### Minimal Test Dataset

```sql
-- Insert test coaching company
INSERT INTO coaching_companies (id, name, slug)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'Test Coaching Co',
  'test-coaching-co'
);

-- Insert test coach
INSERT INTO coaches (id, email, first_name, last_name, coaching_company_id)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'test.coach@example.com',
  'Test',
  'Coach',
  'c1111111-1111-1111-1111-111111111111'
);

-- Insert test client organization
INSERT INTO client_organizations (id, name, slug)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'Test Client Org',
  'test-client-org'
);

-- Insert test client
INSERT INTO clients (id, email, first_name, last_name, client_organization_id, primary_coach_id)
VALUES (
  'c4444444-4444-4444-4444-444444444444',
  'test.client@example.com',
  'Test',
  'Client',
  'c3333333-3333-3333-3333-333333333333',
  'c2222222-2222-2222-2222-222222222222'
);

-- Insert test data item
INSERT INTO data_items (id, data_type, slug, title, raw_content, coach_id, client_id)
VALUES (
  'd1111111-1111-1111-1111-111111111111',
  'transcript',
  'test-session-001',
  'Test Coaching Session',
  'This is test content for migration testing.',
  'c2222222-2222-2222-2222-222222222222',
  'c4444444-4444-4444-4444-444444444444'
);

-- Verify test data
SELECT 'coaching_companies' as table_name, COUNT(*) as count FROM coaching_companies
UNION ALL
SELECT 'coaches', COUNT(*) FROM coaches
UNION ALL
SELECT 'clients', COUNT(*) FROM clients
UNION ALL
SELECT 'data_items', COUNT(*) FROM data_items;
```

### Copy Production Data (Optional)

**⚠️ WARNING**: Only copy sanitized/anonymized data locally. Never store production PII locally.

```bash
# Export sanitized data from production
supabase db dump --data-only --exclude-table=audit_logs > production_data.sql

# Import to local (review first!)
psql-local < production_data.sql
```

---

## Common Issues & Solutions

### Issue 1: "psql: command not found"

**Cause**: PostgreSQL not in PATH

**Solution**:
```bash
# macOS
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc

# Linux
export PATH="/usr/lib/postgresql/17/bin:$PATH"
echo 'export PATH="/usr/lib/postgresql/17/bin:$PATH"' >> ~/.bashrc
```

### Issue 2: "FATAL: role 'postgres' does not exist"

**Cause**: Default superuser not created

**Solution**:
```bash
# macOS
createuser -s postgres

# Linux
sudo -u postgres createuser -s $(whoami)
```

### Issue 3: "ERROR: extension 'vector' is not available"

**Cause**: pgvector not installed or not in extensions directory

**Solution**:
```bash
# macOS
brew reinstall pgvector

# Linux
sudo apt install postgresql-17-pgvector

# Verify installation
psql -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
```

### Issue 4: "ERROR: could not connect to server"

**Cause**: PostgreSQL service not running

**Solution**:
```bash
# macOS
brew services start postgresql@17

# Linux
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### Issue 5: Migration fails with "relation already exists"

**Cause**: Migration already partially applied

**Solution**:
```sql
-- Check what exists
\dt  -- List tables
\df  -- List functions

-- Drop existing objects (if safe)
DROP TABLE IF EXISTS table_name CASCADE;
DROP FUNCTION IF EXISTS function_name CASCADE;

-- Re-run migration
\i scripts/database/XXX_migration.sql
```

---

## Development Workflow

### Daily Workflow

```bash
# 1. Start PostgreSQL (if not auto-started)
brew services start postgresql@17  # macOS
sudo systemctl start postgresql     # Linux

# 2. Connect to local database
psql-local

# 3. Run queries, test migrations, develop features
unified_data_layer_local=# \dt
unified_data_layer_local=# SELECT * FROM data_items LIMIT 5;

# 4. Stop PostgreSQL (optional, can leave running)
brew services stop postgresql@17   # macOS
sudo systemctl stop postgresql     # Linux
```

### Migration Development Workflow

```bash
# 1. Create migration file
touch scripts/database/007_new_feature.sql

# 2. Write migration SQL (follow template)
vim scripts/database/007_new_feature.sql

# 3. Create rollback file
touch scripts/database/007_rollback.sql

# 4. Test migration locally
psql-local < scripts/database/007_new_feature.sql

# 5. Verify migration succeeded
psql-local -c "SELECT * FROM new_table LIMIT 5;"

# 6. Test rollback
psql-local < scripts/database/007_rollback.sql

# 7. Verify rollback succeeded
psql-local -c "\dt new_table"  # Should show "Did not find any relation"

# 8. Re-apply migration (for final test)
psql-local < scripts/database/007_new_feature.sql

# 9. Document test results
echo "✅ Migration 007 tested successfully" >> scripts/database/007_test_log.txt

# 10. Ready for production!
```

---

## Maintenance

### Backup Local Database

```bash
# Full backup (schema + data)
pg_dump -U postgres unified_data_layer_local > backup_full_$(date +%Y%m%d).sql

# Schema only
pg_dump -U postgres --schema-only unified_data_layer_local > backup_schema_$(date +%Y%m%d).sql

# Data only
pg_dump -U postgres --data-only unified_data_layer_local > backup_data_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Drop existing database
dropdb -U postgres unified_data_layer_local

# Recreate database
createdb -U postgres unified_data_layer_local

# Restore backup
psql -U postgres unified_data_layer_local < backup_full_20251120.sql
```

### Reset Local Database

```bash
# Quick reset (drop and recreate)
dropdb -U postgres unified_data_layer_local
createdb -U postgres unified_data_layer_local
psql -U postgres -d unified_data_layer_local -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql-local < scripts/database/current_schema.sql
```

### Update Schema from Production

```bash
# Export latest production schema
supabase db dump --schema-only > scripts/database/current_schema.sql

# Reset local database
dropdb -U postgres unified_data_layer_local && createdb -U postgres unified_data_layer_local

# Apply latest schema
psql -U postgres -d unified_data_layer_local -c "CREATE EXTENSION IF NOT EXISTS vector;"
psql-local < scripts/database/current_schema.sql
```

---

## Performance Optimization

### Enable Query Timing

```sql
-- In psql
\timing on

-- Now all queries show execution time
SELECT COUNT(*) FROM data_chunks;
-- Time: 12.345 ms
```

### Analyze Query Performance

```sql
-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM data_chunks
WHERE data_item_id = 'd1111111-1111-1111-1111-111111111111';

-- Shows:
-- - Index usage
-- - Execution time
-- - Row estimates vs actual
```

### Create Test Indexes

```sql
-- Test index performance locally before production
CREATE INDEX idx_test ON data_chunks(data_item_id, chunk_index);

-- Compare query performance with/without index
DROP INDEX idx_test;
```

---

## Resources

### Documentation
- [PostgreSQL 17 Documentation](https://www.postgresql.org/docs/17/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)

### Tools
- [pgAdmin](https://www.pgadmin.org/) - GUI for PostgreSQL
- [DBeaver](https://dbeaver.io/) - Universal database tool
- [Postico](https://eggerapps.at/postico/) - macOS PostgreSQL client

### Troubleshooting
- [PostgreSQL Common Errors](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Stack Overflow: PostgreSQL](https://stackoverflow.com/questions/tagged/postgresql)

---

## Next Steps

After completing local setup:

1. ✅ Verify all tables exist: `psql-local -c "\dt"`
2. ✅ Run test queries: `psql-local -c "SELECT COUNT(*) FROM data_items;"`
3. ✅ Test a simple migration locally
4. ✅ Read migration template: `docs/development/migration-template.md`
5. ✅ Practice rollback procedure
6. ✅ Ready to develop with confidence!

---

**Setup Version**: 1.0
**Last Updated**: 2025-11-20
**Maintained By**: leadinsideout
