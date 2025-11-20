# Row-Level Security (RLS) Design

**Checkpoint**: 9
**Phase**: 3 (Data Privacy & Security)
**Status**: Design
**Created**: 2025-11-20

---

## Overview

This document defines the Row-Level Security (RLS) policies for the Unified Data Layer, ensuring data isolation between coaches, clients, and organizations without requiring application-level logic.

### Goals

1. **Multi-tenant isolation**: Coaches can only access their own data and their assigned clients' data
2. **Client privacy**: Clients can only access their own data
3. **Organization visibility**: Coaches can see organization-level data within their scope
4. **Admin access**: Platform admins can access all data for management
5. **Zero application logic**: RLS policies enforce security at database level
6. **Performance**: < 10% query performance degradation

---

## Authentication Architecture

### Identity Mapping

```
API Request with Authorization Header
  ↓
Extract API Key
  ↓
Lookup in api_keys table
  ↓
Map to user identity (coach_id OR client_id OR admin flag)
  ↓
Set Supabase session variables:
  - app.current_user_id (UUID)
  - app.current_user_role (TEXT: 'coach' | 'client' | 'admin')
  - app.current_coach_id (UUID, if role=coach)
  - app.current_client_id (UUID, if role=client)
  ↓
Execute query with RLS enforcement
```

### Session Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `app.current_user_id` | UUID | Primary identity (coach.id or client.id) | `550e8400-e29b-41d4-a716-446655440010` |
| `app.current_user_role` | TEXT | User role | `'coach'`, `'client'`, `'admin'` |
| `app.current_coach_id` | UUID | Coach ID (if role=coach) | `550e8400-e29b-41d4-a716-446655440010` |
| `app.current_client_id` | UUID | Client ID (if role=client) | `550e8400-e29b-41d4-a716-446655440020` |

---

## Permission Matrix

### Data Access Rules

| Resource | Coach (Own) | Coach (Assigned Client) | Client (Own) | Admin | Organization Peer |
|----------|-------------|-------------------------|--------------|-------|-------------------|
| **coaching_companies** | ✅ Read own | ❌ | ❌ | ✅ All | ✅ Read own |
| **coaches** | ✅ Read/Update own | ❌ | ❌ | ✅ All | ✅ Read peers |
| **client_organizations** | ✅ Read assigned | ✅ Read assigned | ✅ Read own | ✅ All | ❌ |
| **clients** | ✅ Read assigned | ✅ Read assigned | ✅ Read/Update own | ✅ All | ❌ |
| **coaching_models** | ✅ Read company models | ✅ Read company models | ❌ | ✅ All | ✅ Read company models |
| **data_items** | ✅ Read/Write own | ✅ Read/Write assigned | ✅ Read own | ✅ All | ❌ |
| **data_chunks** | ✅ Read own | ✅ Read assigned | ✅ Read own | ✅ All | ❌ |
| **api_keys** | ✅ Read/Update own | ❌ | ✅ Read/Update own | ✅ All | ❌ |
| **audit_logs** | ✅ Read own actions | ✅ Read assigned client actions | ❌ | ✅ All | ❌ |

### Visibility Level Rules (data_items)

| visibility_level | Coach (Owner) | Coach (Assigned) | Client (Owner) | Organization Peer | Admin |
|------------------|---------------|------------------|----------------|-------------------|-------|
| `private` | ✅ | ❌ | ✅ | ❌ | ✅ |
| `coach_only` | ✅ | ✅ (if assigned) | ❌ | ❌ | ✅ |
| `org_visible` | ✅ | ✅ (if same org) | ✅ (if own) | ✅ | ✅ |
| `public` | ✅ | ✅ | ✅ (if own) | ✅ | ✅ |

---

## RLS Policy Specifications

### Table 1: coaching_companies

**Policies**:

1. **coaches_see_own_company** (SELECT)
   ```sql
   USING (
     id = (
       SELECT coaching_company_id FROM coaches
       WHERE id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **admins_see_all_companies** (SELECT)
   ```sql
   USING (current_setting('app.current_user_role', true) = 'admin');
   ```

---

### Table 2: coaches

**Policies**:

1. **coaches_see_own_profile** (SELECT)
   ```sql
   USING (
     id = current_setting('app.current_coach_id', true)::uuid
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **coaches_see_company_peers** (SELECT)
   ```sql
   USING (
     coaching_company_id = (
       SELECT coaching_company_id FROM coaches
       WHERE id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

3. **coaches_update_own_profile** (UPDATE)
   ```sql
   USING (id = current_setting('app.current_coach_id', true)::uuid);
   ```

---

### Table 3: client_organizations

**Policies**:

1. **coaches_see_assigned_orgs** (SELECT)
   ```sql
   USING (
     id IN (
       SELECT DISTINCT client_organization_id
       FROM clients c
       JOIN coach_clients cc ON c.id = cc.client_id
       WHERE cc.coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **clients_see_own_org** (SELECT)
   ```sql
   USING (
     id = (
       SELECT client_organization_id FROM clients
       WHERE id = current_setting('app.current_client_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

### Table 4: clients

**Policies**:

1. **coaches_see_assigned_clients** (SELECT)
   ```sql
   USING (
     id IN (
       SELECT client_id FROM coach_clients
       WHERE coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **clients_see_own_profile** (SELECT, UPDATE)
   ```sql
   USING (
     id = current_setting('app.current_client_id', true)::uuid
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

### Table 5: coaching_models

**Policies**:

1. **coaches_see_company_models** (SELECT)
   ```sql
   USING (
     coaching_company_id = (
       SELECT coaching_company_id FROM coaches
       WHERE id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **coaches_manage_own_associations** (INSERT, UPDATE, DELETE on coach_model_associations)
   ```sql
   USING (coach_id = current_setting('app.current_coach_id', true)::uuid);
   ```

---

### Table 6: data_items (CRITICAL - Core Data Security)

**Policies**:

1. **coaches_see_own_data** (SELECT)
   ```sql
   USING (
     coach_id = current_setting('app.current_coach_id', true)::uuid
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **coaches_see_assigned_client_data** (SELECT)
   ```sql
   USING (
     client_id IN (
       SELECT client_id FROM coach_clients
       WHERE coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     AND visibility_level IN ('coach_only', 'org_visible', 'public')
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

3. **clients_see_own_data** (SELECT)
   ```sql
   USING (
     client_id = current_setting('app.current_client_id', true)::uuid
     AND visibility_level IN ('private', 'org_visible', 'public')
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

4. **coaches_write_data** (INSERT, UPDATE, DELETE)
   ```sql
   USING (
     coach_id = current_setting('app.current_coach_id', true)::uuid
     OR client_id IN (
       SELECT client_id FROM coach_clients
       WHERE coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

### Table 7: data_chunks (Inherits from data_items)

**Policies**:

1. **chunks_follow_data_item_access** (SELECT)
   ```sql
   USING (
     data_item_id IN (
       SELECT id FROM data_items
       -- RLS policies from data_items automatically apply
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **coaches_write_chunks** (INSERT, UPDATE, DELETE)
   ```sql
   USING (
     data_item_id IN (
       SELECT id FROM data_items
       WHERE coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

### Table 8: api_keys

**Policies**:

1. **users_see_own_keys** (SELECT)
   ```sql
   USING (
     (coach_id = current_setting('app.current_coach_id', true)::uuid AND coach_id IS NOT NULL)
     OR (client_id = current_setting('app.current_client_id', true)::uuid AND client_id IS NOT NULL)
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **users_manage_own_keys** (INSERT, UPDATE, DELETE)
   ```sql
   USING (
     (coach_id = current_setting('app.current_coach_id', true)::uuid AND coach_id IS NOT NULL)
     OR (client_id = current_setting('app.current_client_id', true)::uuid AND client_id IS NOT NULL)
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

### Table 9: audit_logs

**Policies**:

1. **coaches_see_own_audit_trail** (SELECT)
   ```sql
   USING (
     user_id = current_setting('app.current_coach_id', true)::uuid
     OR user_id IN (
       SELECT client_id FROM coach_clients
       WHERE coach_id = current_setting('app.current_coach_id', true)::uuid
     )
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **admins_see_all_audit_logs** (SELECT)
   ```sql
   USING (current_setting('app.current_user_role', true) = 'admin');
   ```

---

## Join Tables

### coach_clients (Many-to-Many: Coaches ↔ Clients)

**Policies**:

1. **coaches_see_own_assignments** (SELECT)
   ```sql
   USING (
     coach_id = current_setting('app.current_coach_id', true)::uuid
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

2. **admins_manage_assignments** (INSERT, UPDATE, DELETE)
   ```sql
   USING (current_setting('app.current_user_role', true) = 'admin');
   ```

### coach_organizations (Many-to-Many: Coaches ↔ Client Organizations)

**Policies**:

1. **coaches_see_own_org_assignments** (SELECT)
   ```sql
   USING (
     coach_id = current_setting('app.current_coach_id', true)::uuid
     OR current_setting('app.current_user_role', true) = 'admin'
   );
   ```

---

## Implementation Strategy

### Phase 1: Preparation (Day 1)

1. **Create authentication tables**
   ```sql
   CREATE TABLE api_keys (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
     client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
     key_hash TEXT NOT NULL,
     scopes TEXT[] DEFAULT '{read,write}',
     created_at TIMESTAMP NOT NULL DEFAULT NOW(),
     expires_at TIMESTAMP,
     last_used_at TIMESTAMP,
     is_revoked BOOLEAN DEFAULT false,
     CONSTRAINT key_has_owner CHECK (
       (coach_id IS NOT NULL AND client_id IS NULL) OR
       (coach_id IS NULL AND client_id IS NOT NULL)
     )
   );

   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL,
     user_role TEXT NOT NULL CHECK (user_role IN ('coach', 'client', 'admin')),
     action TEXT NOT NULL,
     resource_type TEXT NOT NULL,
     resource_id UUID,
     metadata JSONB DEFAULT '{}'::jsonb,
     created_at TIMESTAMP NOT NULL DEFAULT NOW()
   );
   ```

2. **Create session variable helper functions**
   ```sql
   CREATE OR REPLACE FUNCTION get_current_user_id()
   RETURNS UUID AS $$
   BEGIN
     RETURN current_setting('app.current_user_id', true)::uuid;
   EXCEPTION WHEN OTHERS THEN
     RETURN NULL;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE FUNCTION get_current_user_role()
   RETURNS TEXT AS $$
   BEGIN
     RETURN current_setting('app.current_user_role', true);
   EXCEPTION WHEN OTHERS THEN
     RETURN NULL;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

### Phase 2: Enable RLS (Day 2)

1. **Enable RLS on all tables**
   ```sql
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
   ```

2. **Create policies systematically**
   - Start with read-only policies (SELECT)
   - Test each policy before adding write policies
   - Add write policies (INSERT, UPDATE, DELETE) last

3. **Test policy enforcement**
   - Create test API keys for different roles
   - Verify isolation between coaches
   - Verify isolation between clients
   - Verify admin access

### Phase 3: API Integration (Day 2-3)

1. **Create authentication middleware** (`api/middleware/auth.js`)
2. **Update Express app** to use middleware on protected routes
3. **Add error handling** for unauthorized requests (403)
4. **Update API documentation** with authentication requirements

---

## Performance Considerations

### Index Requirements

```sql
-- Optimize coach_clients lookups
CREATE INDEX IF NOT EXISTS idx_coach_clients_coach_id
  ON coach_clients(coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_clients_client_id
  ON coach_clients(client_id);

-- Optimize data_items access
CREATE INDEX IF NOT EXISTS idx_data_items_coach_id
  ON data_items(coach_id);

CREATE INDEX IF NOT EXISTS idx_data_items_client_id
  ON data_items(client_id);

CREATE INDEX IF NOT EXISTS idx_data_items_visibility
  ON data_items(visibility_level);

-- Optimize data_chunks lookups
CREATE INDEX IF NOT EXISTS idx_data_chunks_data_item_id
  ON data_chunks(data_item_id);
```

### Query Optimization

- Use `get_current_user_id()` function to cache session variable lookups
- Minimize subquery complexity in RLS policies
- Test with EXPLAIN ANALYZE to measure RLS overhead
- Target: < 10% performance degradation vs non-RLS queries

---

## Testing Strategy

### Unit Tests (Per Policy)

For each RLS policy:
1. Create test users (coach, client, admin)
2. Set session variables
3. Attempt SELECT
4. Verify correct data returned (or 403)

### Integration Tests (End-to-End)

1. **Test: Coach A cannot see Coach B's data**
   - Create Coach A, Coach B
   - Coach A creates data_item
   - Authenticate as Coach B
   - Query data_items → should NOT see Coach A's data

2. **Test: Client X cannot see Client Y's data**
   - Similar to above

3. **Test: Coach can see assigned client's data**
   - Create Coach, Client
   - Assign Client to Coach (coach_clients)
   - Client creates data_item with visibility='coach_only'
   - Authenticate as Coach
   - Query data_items → should see Client's data

4. **Test: Admin can see all data**
   - Authenticate as admin
   - Query all tables → should see everything

### Security Tests

1. **SQL injection with session variables**
   - Attempt to manipulate session variables via crafted API keys
   - Verify policies still enforce

2. **Token expiration**
   - Use expired API key
   - Verify 401 Unauthorized

3. **Revoked keys**
   - Revoke API key
   - Verify 401 Unauthorized

4. **Performance regression**
   - Run search query without RLS (baseline)
   - Enable RLS, run same query
   - Measure overhead (target < 10%)

---

## Success Criteria

- ✅ Coach A cannot access Coach B's data (verified via tests)
- ✅ Client X cannot access Client Y's data (verified via tests)
- ✅ Admin can access all data (verified via tests)
- ✅ Coaches can access assigned clients' data (verified via tests)
- ✅ RLS policies enforce without application logic (verified via direct DB queries)
- ✅ Query performance degradation < 10% (measured in tests)
- ✅ All access attempts logged to audit_logs (verified via tests)
- ✅ API returns 403 for unauthorized requests (verified via integration tests)
- ✅ Authentication middleware validates API keys correctly (unit tested)

---

## Rollback Plan

If RLS causes critical issues:

1. **Disable RLS temporarily**
   ```sql
   ALTER TABLE data_items DISABLE ROW LEVEL SECURITY;
   ALTER TABLE data_chunks DISABLE ROW LEVEL SECURITY;
   ```

2. **Investigate issue** using audit_logs

3. **Fix policy** or adjust approach

4. **Re-enable RLS**

5. **If unfixable**, defer to Phase 4 and implement application-level access control

---

## Next Steps

1. ✅ Review and approve this design
2. 🔴 Create migration script: `006_row_level_security.sql`
3. 🔴 Implement authentication middleware: `api/middleware/auth.js`
4. 🔴 Create test suite: `tests/rls/`
5. 🔴 Document Checkpoint 9 results

---

**Design Status**: Ready for Implementation
**Estimated Implementation Time**: 16-22 hours (2-3 days)
**Risk Level**: Medium (complex permission matrix, but well-defined)
