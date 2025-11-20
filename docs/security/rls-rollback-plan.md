# RLS Rollback Plan

**Purpose**: Safe rollback procedure if Row-Level Security causes issues
**Created**: 2025-11-20
**Checkpoint**: 9

---

## Quick Rollback (Emergency - 2 minutes)

If RLS causes immediate production issues, run this SQL to disable RLS on all tables:

```sql
-- EMERGENCY: Disable RLS on all tables (preserves policies for later re-enable)
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

**Result**: All tables become accessible without session variables (original behavior restored)

**Impact**:
- ✅ API works immediately
- ✅ RLS policies preserved (can re-enable later)
- ✅ No data loss
- ⚠️ No multi-tenant isolation (back to pre-RLS state)

---

## Complete Rollback (Clean - 10 minutes)

If you need to completely remove RLS and clean up all artifacts:

### Step 1: Drop All RLS Policies

```sql
-- Drop policies on coaching_companies
DROP POLICY IF EXISTS coaches_see_own_company ON coaching_companies;

-- Drop policies on coaches
DROP POLICY IF EXISTS coaches_see_own_profile ON coaches;
DROP POLICY IF EXISTS coaches_see_company_peers ON coaches;
DROP POLICY IF EXISTS coaches_update_own_profile ON coaches;

-- Drop policies on client_organizations
DROP POLICY IF EXISTS coaches_see_assigned_orgs ON client_organizations;
DROP POLICY IF EXISTS clients_see_own_org ON client_organizations;

-- Drop policies on clients
DROP POLICY IF EXISTS coaches_see_assigned_clients ON clients;
DROP POLICY IF EXISTS clients_see_own_profile ON clients;
DROP POLICY IF EXISTS clients_update_own_profile ON clients;

-- Drop policies on coaching_models
DROP POLICY IF EXISTS coaches_see_company_models ON coaching_models;

-- Drop policies on coach_model_associations
DROP POLICY IF EXISTS coaches_manage_own_associations_select ON coach_model_associations;
DROP POLICY IF EXISTS coaches_manage_own_associations_insert ON coach_model_associations;
DROP POLICY IF EXISTS coaches_manage_own_associations_update ON coach_model_associations;
DROP POLICY IF EXISTS coaches_manage_own_associations_delete ON coach_model_associations;

-- Drop policies on data_items
DROP POLICY IF EXISTS coaches_see_own_data ON data_items;
DROP POLICY IF EXISTS coaches_see_assigned_client_data ON data_items;
DROP POLICY IF EXISTS clients_see_own_data ON data_items;
DROP POLICY IF EXISTS coaches_create_data ON data_items;
DROP POLICY IF EXISTS coaches_update_data ON data_items;
DROP POLICY IF EXISTS coaches_delete_data ON data_items;

-- Drop policies on data_chunks
DROP POLICY IF EXISTS coaches_see_chunks ON data_chunks;
DROP POLICY IF EXISTS clients_see_chunks ON data_chunks;
DROP POLICY IF EXISTS coaches_write_chunks ON data_chunks;

-- Drop policies on api_keys
DROP POLICY IF EXISTS users_see_own_keys ON api_keys;
DROP POLICY IF EXISTS users_create_own_keys ON api_keys;
DROP POLICY IF EXISTS users_update_own_keys ON api_keys;
DROP POLICY IF EXISTS users_delete_own_keys ON api_keys;

-- Drop policies on audit_logs
DROP POLICY IF EXISTS coaches_see_own_audit_trail ON audit_logs;
DROP POLICY IF EXISTS clients_see_own_audit_trail ON audit_logs;
DROP POLICY IF EXISTS admin_insert_audit_logs ON audit_logs;

-- Drop policies on coach_clients
DROP POLICY IF EXISTS coaches_see_own_client_assignments ON coach_clients;
DROP POLICY IF EXISTS admin_manage_coach_client_assignments ON coach_clients;

-- Drop policies on coach_organizations
DROP POLICY IF EXISTS coaches_see_own_org_assignments ON coach_organizations;
DROP POLICY IF EXISTS admin_manage_coach_org_assignments ON coach_organizations;
```

### Step 2: Disable RLS on All Tables

```sql
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

### Step 3: Drop Helper Functions

```sql
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_current_user_role();
DROP FUNCTION IF EXISTS get_current_coach_id();
DROP FUNCTION IF EXISTS get_current_client_id();
DROP FUNCTION IF EXISTS is_admin();
```

### Step 4: Drop Authentication Tables (Optional)

**⚠️ WARNING**: Only do this if you want to completely remove authentication infrastructure. This will delete all API keys and audit logs.

```sql
-- Drop tables (cascades to dependent objects)
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
```

### Step 5: Drop Performance Indexes (Optional)

```sql
-- Drop RLS-specific indexes (original indexes remain)
DROP INDEX IF EXISTS idx_api_keys_key_hash;
DROP INDEX IF EXISTS idx_api_keys_coach_id;
DROP INDEX IF EXISTS idx_api_keys_client_id;
DROP INDEX IF EXISTS idx_api_keys_active;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_data_items_client_visibility;
```

---

## Partial Rollback (Selective - 5 minutes)

If only specific tables are causing issues, you can disable RLS selectively:

### Example: Disable RLS only on data_items and data_chunks

```sql
-- Disable RLS on critical search tables
ALTER TABLE data_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE data_chunks DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on user/org tables
-- (coaching_companies, coaches, clients, etc. remain protected)
```

This allows search to work without authentication while maintaining isolation for user management.

---

## Git Rollback (Code Changes)

### Rollback to Pre-RLS Commit

```bash
# Find the commit hash before RLS migration
git log --oneline | grep "Row-Level Security"

# Rollback to commit before RLS
git revert <commit-hash>

# Or hard reset (if no one else has pulled changes)
git reset --hard <commit-hash-before-rls>
git push --force origin main
```

### Rollback Specific Files

```bash
# Rollback only the migration script
git checkout HEAD~1 -- scripts/database/006_row_level_security.sql

# Rollback authentication middleware
git checkout HEAD~1 -- api/middleware/auth.js

# Commit the rollback
git commit -m "revert(security): rollback RLS implementation"
```

---

## Vercel Rollback (Deployment)

### Option 1: Redeploy Previous Version

1. Go to Vercel dashboard: https://vercel.com/leadinsideout/unified-data-layer
2. Navigate to "Deployments"
3. Find the deployment before RLS changes
4. Click "..." → "Promote to Production"

### Option 2: Git-based Rollback

```bash
# Rollback git to previous version
git revert <commit-hash>
git push origin main

# Vercel auto-deploys from main branch
# Wait ~2 minutes for deployment to complete
```

---

## Testing After Rollback

### Verify RLS is Disabled

```sql
-- Check RLS status (should show false)
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Verify API Works

```bash
# Test health endpoint
curl https://unified-data-layer.vercel.app/api/health

# Test search endpoint (should work without auth)
curl -X POST https://unified-data-layer.vercel.app/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"leadership","limit":2}'
```

### Verify Data Integrity

```sql
-- Count data_items (should be unchanged)
SELECT COUNT(*) FROM data_items;

-- Count data_chunks (should be unchanged)
SELECT COUNT(*) FROM data_chunks;

-- Verify embeddings intact
SELECT COUNT(*) FROM data_chunks WHERE embedding IS NOT NULL;
```

---

## Rollback Decision Tree

```
Is production broken?
├─ YES → Emergency Rollback (disable RLS)
│         ├─ Test API → Works?
│         │   ├─ YES → Investigate RLS policies, fix, re-enable
│         │   └─ NO → Complete Rollback + Git revert
│         └─ Notify team
│
└─ NO → Is a specific feature broken?
          ├─ YES → Partial Rollback (disable RLS on affected tables)
          │         └─ Fix issue → Re-enable RLS
          └─ NO → Continue with RLS
```

---

## Re-Enabling RLS After Rollback

If you disabled RLS temporarily and fixed the issue:

```sql
-- Re-enable RLS on all tables
ALTER TABLE coaching_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_model_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_organizations ENABLE ROW LEVEL SECURITY;

-- Verify policies still exist
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## Prevention (Future RLS Changes)

### Test in Staging First

1. Apply RLS migration to staging/local database
2. Run full test suite
3. Verify API endpoints work with authentication
4. Verify performance impact < 10%
5. Only then apply to production

### Gradual Rollout

1. Enable RLS on non-critical tables first (coaching_companies, coaches)
2. Test for 24 hours
3. Enable RLS on critical tables (data_items, data_chunks)
4. Monitor performance and errors

### Monitoring After RLS

1. Set up alerts for 403 errors (unauthorized access)
2. Monitor query performance (should be < 10% slower)
3. Check audit_logs for access patterns
4. Review error logs for RLS-related issues

---

## Emergency Contacts

- **Database Issues**: Supabase dashboard → SQL Editor
- **Deployment Issues**: Vercel dashboard → Deployments
- **Code Issues**: GitHub → Revert commits
- **Documentation**: This file + `docs/security/row-level-security-design.md`

---

## Rollback Checklist

When performing rollback:

- [ ] Disable RLS on all tables (emergency SQL)
- [ ] Verify API health endpoint returns 200
- [ ] Test search endpoint without auth
- [ ] Check data integrity (counts unchanged)
- [ ] Git revert RLS commits (if needed)
- [ ] Redeploy to Vercel (if needed)
- [ ] Update CLAUDE.md status
- [ ] Document what went wrong in checkpoint results
- [ ] Plan fix for next attempt

---

## Success Metrics (When NOT to Rollback)

Keep RLS enabled if:
- ✅ API health endpoint returns 200
- ✅ Search queries work with authentication
- ✅ Query performance < 10% slower than baseline
- ✅ Test suite passes (isolation verified)
- ✅ Zero data integrity issues
- ✅ Audit logs capturing access correctly

Only rollback if critical functionality is broken and cannot be fixed within 1 hour.

---

**Last Updated**: 2025-11-20
**Status**: Ready for RLS deployment
**Rollback Tested**: No (to be tested after deployment)
