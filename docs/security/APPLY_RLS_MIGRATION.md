# Apply RLS Migration - Step-by-Step Guide

**Checkpoint**: 9
**Purpose**: Apply Row-Level Security migration to Supabase database
**Estimated Time**: 10-15 minutes
**Date**: 2025-11-20

---

## ⚠️ Before You Begin

### Safety Checkpoints Created

✅ **Git Commit**: `e9b817e` - Authentication middleware + migration script
✅ **Rollback Plan**: `docs/security/rls-rollback-plan.md`
✅ **Migration SQL**: `scripts/database/006_row_level_security.sql`
✅ **Test Keys**: 4 pre-generated API keys (2 coaches, 1 client, 1 admin)

### What This Migration Does

1. **Creates 2 new tables**: `api_keys`, `audit_logs`
2. **Enables RLS on 12 tables**: All existing tables get RLS enabled
3. **Creates 40+ RLS policies**: Multi-tenant isolation enforcement
4. **Adds helper functions**: Session variable getters
5. **Inserts test API keys**: For testing authentication

### Potential Impact

⚠️ **IMPORTANT**: After migration, all API queries will require authentication
- Health endpoint will still work (no RLS)
- Search endpoint will require API key
- Upload endpoints will require API key
- We have auth middleware ready to handle this

---

## Step 1: Open Supabase SQL Editor

1. Navigate to: https://supabase.com/dashboard/project/wzebnjilqolwykmeozna/sql
2. Click "New Query" button
3. Leave the query editor open

---

## Step 2: Copy Migration SQL

### Option A: From File

```bash
# In your terminal
cat scripts/database/006_row_level_security.sql | pbcopy
```

This copies the entire migration to your clipboard.

### Option B: Manual Copy

1. Open `scripts/database/006_row_level_security.sql` in your editor
2. Select all (Cmd+A)
3. Copy (Cmd+C)

---

## Step 3: Paste and Review

1. Paste the migration SQL into Supabase SQL Editor (Cmd+V)
2. **Quick Review** (scroll through):
   - Line 27: `CREATE TABLE api_keys`
   - Line 71: `CREATE TABLE audit_logs`
   - Line 130: Helper functions
   - Line 161: `ENABLE ROW LEVEL SECURITY` statements
   - Line 650+: Test API key inserts

---

## Step 4: Execute Migration

1. Click the **"Run"** button (or press Cmd+Enter)
2. **Wait 30-60 seconds** for execution to complete
3. Watch for success message at bottom of screen

### Expected Output

```
Success. No rows returned
```

This is normal - DDL statements don't return rows.

### If You See Errors

**Common errors and fixes**:

1. **"relation already exists"**
   - Tables already created (migration partially run)
   - Safe to ignore if api_keys and audit_logs exist

2. **"policy already exists"**
   - Policies already created
   - Safe to ignore

3. **"function already exists"**
   - Helper functions already created
   - Safe to ignore

4. **"permission denied"**
   - Check you're using the service_role key (not anon key)
   - Verify in Supabase Settings → API

---

## Step 5: Verify Migration

### 5.1 Check Tables Exist

Run this query in SQL Editor:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('api_keys', 'audit_logs')
ORDER BY tablename;
```

**Expected**: 2 rows (api_keys, audit_logs)

### 5.2 Check RLS Enabled

```sql
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected**: All tables show `rowsecurity = true`

### 5.3 Check Policies Created

```sql
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**Expected**: ~40 policies across 12 tables

### 5.4 Check Test API Keys

```sql
SELECT
  id,
  coach_id,
  client_id,
  key_prefix,
  name,
  scopes
FROM api_keys
ORDER BY name;
```

**Expected**: 4 rows
- Admin Test Key (scopes: {admin,read,write})
- Cyril Test Key (client_id set, scopes: {read})
- Dave Test Key (coach_id set, scopes: {read,write})
- Emma Test Key (coach_id set, scopes: {read,write})

### 5.5 Check Data Integrity

```sql
SELECT COUNT(*) as data_items_count FROM data_items;
SELECT COUNT(*) as data_chunks_count FROM data_chunks;
SELECT COUNT(*) as embeddings_count FROM data_chunks WHERE embedding IS NOT NULL;
```

**Expected**:
- data_items: 19
- data_chunks: 40
- embeddings: 40

**⚠️ NOTE**: These queries might fail with "permission denied" error.
**This is EXPECTED** - RLS is now enabled and queries need authentication context.

If queries fail with permission error, that means RLS is working correctly!

---

## Step 6: Test API Keys (Optional)

### Get Test Key Hashes

The migration inserted test keys with these passwords:

| User | Password | Scopes |
|------|----------|--------|
| **Dave (Coach)** | `test_coach_dave_secret` | read, write |
| **Emma (Coach)** | `test_coach_emma_secret` | read, write |
| **Cyril (Client)** | `test_client_cyril_secret` | read |
| **Admin** | `test_admin_secret` | admin, read, write |

### Test Authentication

```bash
# Test health endpoint (should work without auth)
curl https://unified-data-layer.vercel.app/api/health

# Test search endpoint WITH auth (after middleware integrated)
curl -X POST https://unified-data-layer.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test_coach_dave_secret" \
  -d '{"query":"leadership","limit":2}'
```

**Note**: Search will return 401 until we integrate the auth middleware in Step 7.

---

## Step 7: Document Migration Completion

Create a quick note for yourself:

```bash
# In your terminal
echo "RLS Migration Applied: $(date)" >> docs/security/rls-migration-log.txt
echo "Commit: e9b817e" >> docs/security/rls-migration-log.txt
echo "Tables: api_keys, audit_logs" >> docs/security/rls-migration-log.txt
echo "Policies: 40+" >> docs/security/rls-migration-log.txt
echo "Status: Success" >> docs/security/rls-migration-log.txt
```

---

## Step 8: Notify Claude to Continue

Return to Claude Code and say:

```
RLS migration applied successfully. Proceed with integrating auth middleware.
```

Claude will then:
1. Integrate auth middleware into server.js
2. Update API endpoints to use authentication
3. Test the authentication flow
4. Create integration tests
5. Document Checkpoint 9 results
6. Tag v0.9.0 release

---

## Troubleshooting

### Migration Failed

**If migration fails completely**:

1. Check error message in Supabase SQL Editor
2. Copy error to Claude Code for diagnosis
3. See `docs/security/rls-rollback-plan.md` for rollback options

### Partial Migration

**If some statements succeeded, some failed**:

1. Check which objects were created:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('api_keys', 'audit_logs');
   SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
   ```

2. If api_keys and audit_logs exist, try running individual failed statements

3. Otherwise, rollback and retry:
   ```sql
   -- Drop tables if partially created
   DROP TABLE IF EXISTS api_keys CASCADE;
   DROP TABLE IF EXISTS audit_logs CASCADE;

   -- Re-run full migration
   ```

### RLS Blocking Queries

**If you can't query tables after migration**:

This is EXPECTED and CORRECT behavior!

RLS is now enforcing that all queries must have authentication context.

Options:
1. Use admin account in Supabase dashboard (already has full access)
2. Wait for auth middleware integration (Step 8)
3. Temporarily disable RLS for testing (see rollback plan)

### Need to Rollback

**Emergency rollback** (2 minutes):

```sql
-- Disable RLS on all tables (keeps policies for re-enable)
ALTER TABLE coaching_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE coaches DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE coach_model_associations DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE coach_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE coach_organizations DISABLE ROW LEVEL SECURITY;
```

See `docs/security/rls-rollback-plan.md` for complete rollback instructions.

---

## Success Checklist

Before proceeding to Step 8, verify:

- [ ] Migration executed without critical errors
- [ ] api_keys table exists (verified via SQL)
- [ ] audit_logs table exists (verified via SQL)
- [ ] RLS enabled on all 12 tables (verified via pg_tables query)
- [ ] 40+ policies created (verified via pg_policies query)
- [ ] 4 test API keys inserted (verified via api_keys query)
- [ ] Data integrity maintained (19 data_items, 40 data_chunks)
- [ ] Documented migration completion

If all checkboxes are ticked, you're ready to proceed!

---

## What Happens Next

After you confirm migration success, Claude will:

1. **Integrate auth middleware** into `api/server.js`
   - Apply to protected endpoints (/api/search, /api/data/*)
   - Keep health endpoint public
   - Add error handling for 401/403

2. **Update API documentation**
   - Add authentication section to README
   - Document API key usage
   - Add example requests with auth headers

3. **Create test suite**
   - Unit tests for auth middleware
   - Integration tests for RLS isolation
   - Security tests for unauthorized access

4. **Test locally**
   - Test with Dave's coach key
   - Test with Cyril's client key
   - Verify isolation (Coach A can't see Coach B's data)

5. **Deploy to production**
   - Push changes to GitHub
   - Vercel auto-deploys
   - Test production endpoints

6. **Document & release**
   - Create checkpoint-9-results.md
   - Tag v0.9.0-checkpoint-9 and v0.9.0
   - Update CLAUDE.md

---

## Estimated Timeline

- Migration execution: 1-2 minutes
- Verification: 3-5 minutes
- Documentation: 2-3 minutes
- **Total**: 10-15 minutes

---

## Questions?

If you encounter issues:
1. Share error message with Claude Code
2. Check `docs/security/rls-rollback-plan.md`
3. Review this guide's Troubleshooting section

---

**Migration SQL File**: `scripts/database/006_row_level_security.sql`
**Rollback Plan**: `docs/security/rls-rollback-plan.md`
**Auth Middleware**: `api/middleware/auth.js`
**Test Script**: `scripts/apply-rls-migration.js`

**Ready to begin? Start with Step 1!** 🚀
