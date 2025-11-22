# Checkpoint 10 Planning Document

**Date**: 2025-11-22
**Status**: Planning Complete - Ready for Implementation
**Estimated Timeline**: 9-12 hours (1.5-2 days)

---

## Executive Summary

Checkpoint 10 implements a comprehensive **admin-managed system** for user and API key management. This includes:

1. **New `admins` table** - For executive assistants and platform administrators
2. **User management endpoints** - Create/update/list coaches, clients, admins
3. **API key management endpoints** - Create/revoke/rotate keys for all user types
4. **Admin web UI** - Single-file HTML dashboard for user + key management

**Key Decision**: Admin-managed approach (not self-service). Admins create users and keys, then distribute pre-configured Custom GPTs to coaches.

---

## Background & Context

### Current State (Post-Checkpoint 9)

**User Tables** (exist):
- `coaching_companies` - Organizations like InsideOut Leadership
- `coaches` - Coaches who provide coaching services
- `clients` - Executives who receive coaching
- `client_organizations` - Client companies

**API Keys** (exist):
- `api_keys` table with foreign keys to coaches/clients
- Admin keys identified by scope only (`scopes: ['admin']`)
- Admin keys have coach_id and client_id as NULL
- 4 test keys: Dave (coach), Emma (coach), Cyril (client), Admin

**Problem Identified**:
- No `admins` table - admin users have no identity
- Cannot track "which admin performed which action"
- Executive assistant cannot be properly represented (not a coach, not a client)
- Audit trail shows "unknown admin" for all admin actions

---

## Scope Definition

### IN SCOPE (Checkpoint 10)

#### 1. Schema Changes
- ✅ Create `admins` table
- ✅ Add `admin_id` column to `api_keys`
- ✅ Update `key_has_single_owner` constraint
- ✅ Seed first admin user (executive assistant)

#### 2. User Management
- ✅ Coach CRUD endpoints
- ✅ Client CRUD endpoints
- ✅ Admin CRUD endpoints (NEW)
- ✅ List all users with filtering

#### 3. API Key Management
- ✅ Create key for any user type
- ✅ List all keys with user details
- ✅ Revoke keys
- ✅ Rotate keys (generate new, expire old)
- ✅ Usage analytics

#### 4. Admin UI
- ✅ Single-file HTML dashboard
- ✅ Users tab (coaches, clients, admins)
- ✅ API Keys tab
- ✅ HTTP Basic Auth protection
- ✅ Served from `/admin` route

#### 5. Documentation
- ✅ Admin user guide
- ✅ API endpoint documentation
- ✅ Schema migration guide

### OUT OF SCOPE

- ❌ Self-service key management by coaches/clients
- ❌ User authentication (login/logout) - only API key auth
- ❌ Complex admin roles/permissions (RBAC) - simple role field only
- ❌ Coach/client-facing dashboards
- ❌ Rate limiting implementation (Phase 4)

---

## Schema Design

### New `admins` Table

```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_company_id UUID NOT NULL
    REFERENCES coaching_companies(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_company ON admins(coaching_company_id);
```

**Fields**:
- `id` - UUID primary key
- `coaching_company_id` - FK to coaching company (e.g., InsideOut Leadership)
- `email` - Unique email address
- `name` - Full name
- `role` - Admin permission level (super_admin > admin > support)
- `metadata` - JSONB for extensibility (department, notes, etc.)
- `created_at`, `updated_at` - Timestamps

**Role Definitions**:
- `super_admin` - Full access (JJ, owners)
- `admin` - User + key management (executive assistant)
- `support` - Read-only access (customer support staff)

---

### Update `api_keys` Table

```sql
-- Add admin_id column
ALTER TABLE api_keys
ADD COLUMN admin_id UUID REFERENCES admins(id) ON DELETE CASCADE;

-- Drop old constraint (if exists)
ALTER TABLE api_keys
DROP CONSTRAINT IF EXISTS key_has_single_owner;

-- Add new constraint: exactly ONE of coach_id, client_id, or admin_id
ALTER TABLE api_keys
ADD CONSTRAINT key_has_single_owner CHECK (
  (coach_id IS NOT NULL AND client_id IS NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NOT NULL AND admin_id IS NULL) OR
  (coach_id IS NULL AND client_id IS NULL AND admin_id IS NOT NULL)
);

CREATE INDEX idx_api_keys_admin ON api_keys(admin_id);
```

**Why This Works**:
- Existing test keys have coach_id or client_id set → constraint satisfied
- New admin keys will have admin_id set → constraint satisfied
- Constraint ensures keys belong to exactly one user type

---

### Seed Data (First Admin User)

```sql
-- Insert executive assistant as first admin
INSERT INTO admins (
  id,
  coaching_company_id,
  email,
  name,
  role,
  metadata
) VALUES (
  '550e8400-e29b-41d4-a716-446655440900', -- Admin UUID
  '550e8400-e29b-41d4-a716-446655440100', -- InsideOut Leadership ID
  'assistant@insideoutdev.com',
  'Executive Assistant',
  'admin',
  '{"department": "Operations", "active": true}'::jsonb
);

-- Create API key for admin user
INSERT INTO api_keys (
  admin_id,
  key_hash,
  key_prefix,
  name,
  scopes
) VALUES (
  '550e8400-e29b-41d4-a716-446655440900',
  '$2a$10$[bcrypt_hash_here]', -- Generate via: bcrypt.hash('secret_key', 10)
  'sk_live_',
  'Executive Assistant Live Key',
  '{admin,read,write}'
);
```

---

## API Endpoints

### User Management Endpoints

#### Create Coach
```
POST /api/admin/coaches
Authorization: Basic [base64(admin:password)]

Body:
{
  "name": "New Coach Name",
  "email": "coach@insideoutdev.com",
  "bio": "Bio text",
  "coaching_company_id": "550e8400-e29b-41d4-a716-446655440100",
  "metadata": {"experience_years": 5}
}

Response: 201 Created
{
  "id": "uuid",
  "name": "New Coach Name",
  "email": "coach@insideoutdev.com",
  "created_at": "2025-11-22T..."
}
```

#### List Coaches
```
GET /api/admin/coaches?company_id=xxx&active=true
Authorization: Basic [base64(admin:password)]

Response: 200 OK
[
  {
    "id": "uuid",
    "name": "Alex Rivera",
    "email": "alex@insideoutdev.com",
    "coaching_company": {"id": "...", "name": "InsideOut Leadership"},
    "created_at": "2025-11-12T..."
  },
  ...
]
```

#### Update Coach
```
PUT /api/admin/coaches/:id
Authorization: Basic [base64(admin:password)]

Body:
{
  "name": "Updated Name",
  "bio": "Updated bio"
}

Response: 200 OK
```

#### Similar Endpoints for Clients and Admins
- `POST /api/admin/clients`
- `GET /api/admin/clients`
- `PUT /api/admin/clients/:id`
- `POST /api/admin/admins`
- `GET /api/admin/admins`
- `PUT /api/admin/admins/:id`

---

### API Key Management Endpoints

#### Create API Key
```
POST /api/admin/keys
Authorization: Basic [base64(admin:password)]

Body:
{
  "user_type": "coach",  // or "client" or "admin"
  "user_id": "uuid",
  "name": "Custom GPT Key",
  "scopes": ["read", "write"],
  "expires_at": "2026-11-22T00:00:00Z"  // optional
}

Response: 201 Created
{
  "id": "uuid",
  "api_key": "sk_live_abc123...",  // ⚠️ Shown ONLY ONCE
  "key_prefix": "sk_live_",
  "name": "Custom GPT Key",
  "user_type": "coach",
  "user_name": "Alex Rivera",
  "scopes": ["read", "write"],
  "created_at": "2025-11-22T...",
  "expires_at": "2026-11-22T..."
}
```

#### List API Keys
```
GET /api/admin/keys?user_type=coach&user_id=xxx&is_revoked=false
Authorization: Basic [base64(admin:password)]

Response: 200 OK
[
  {
    "id": "uuid",
    "key_prefix": "sk_live_",
    "name": "Custom GPT Key",
    "user_type": "coach",
    "user_name": "Alex Rivera",
    "user_email": "alex@insideoutdev.com",
    "scopes": ["read", "write"],
    "created_at": "2025-11-22T...",
    "last_used_at": "2025-11-22T...",
    "is_revoked": false
  },
  ...
]
```

#### Revoke API Key
```
POST /api/admin/keys/:id/revoke
Authorization: Basic [base64(admin:password)]

Response: 200 OK
{
  "id": "uuid",
  "is_revoked": true,
  "revoked_at": "2025-11-22T..."
}
```

#### Rotate API Key
```
POST /api/admin/keys/:id/rotate
Authorization: Basic [base64(admin:password)]

Body:
{
  "grace_period_days": 7  // optional, default 7
}

Response: 200 OK
{
  "new_key": {
    "id": "new-uuid",
    "api_key": "sk_live_xyz789...",  // ⚠️ Shown ONLY ONCE
    "created_at": "2025-11-22T..."
  },
  "old_key": {
    "id": "old-uuid",
    "is_revoked": false,
    "expires_at": "2025-11-29T..."  // Grace period
  }
}
```

#### Key Usage Analytics
```
GET /api/admin/analytics/key-usage?start_date=2025-11-01&end_date=2025-11-30
Authorization: Basic [base64(admin:password)]

Response: 200 OK
{
  "total_keys": 15,
  "active_keys": 12,
  "revoked_keys": 3,
  "keys_by_user_type": {
    "coach": 8,
    "client": 4,
    "admin": 3
  },
  "usage_stats": [
    {
      "key_id": "uuid",
      "key_name": "Custom GPT Key",
      "user_name": "Alex Rivera",
      "total_requests": 1234,
      "last_used_at": "2025-11-22T..."
    },
    ...
  ],
  "unused_keys": [
    {
      "key_id": "uuid",
      "key_name": "Old Test Key",
      "user_name": "Sam Chen",
      "days_since_use": 45
    }
  ]
}
```

---

## Admin UI Design

### Technology: Single-File HTML

**File**: `api/public/admin.html`

**Why Single-File**:
- ✅ No build step (zero dependencies)
- ✅ Fast development (3 hours)
- ✅ Easy deployment (static file on Vercel)
- ✅ Simple maintenance (no framework updates)

**Authentication**: HTTP Basic Auth
- Username: `admin`
- Password: `process.env.ADMIN_PASSWORD`
- Set in Vercel environment variables

---

### UI Structure

```
┌─────────────────────────────────────────────┐
│  API Key & User Management                 │
│  Logged in as: admin                    [?] │
└─────────────────────────────────────────────┘

  [Users] [API Keys] [Analytics]

┌───── Users Tab ─────────────────────────────┐
│                                             │
│  Filter: [All ▼] Search: [_______] [🔍]    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Coaches (8)                         │   │
│  │  Name            Email         [+]  │   │
│  │  Alex Rivera     alex@...     [✏️]  │   │
│  │  Sam Chen        sam@...      [✏️]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Clients (4)                         │   │
│  │  Name            Email         [+]  │   │
│  │  Sarah Williams  sarah@...    [✏️]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Admins (1)                          │   │
│  │  Name            Role          [+]  │   │
│  │  Exec Assistant  admin        [✏️]  │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

┌───── API Keys Tab ──────────────────────────┐
│                                             │
│  Filter: [All Users ▼] [Active ▼] [🔍]     │
│                                             │
│  [+ Create Key]                             │
│                                             │
│  Key Name         User        Created  Actions│
│  ─────────────────────────────────────────── │
│  Custom GPT Key   Alex Rivera 11/22   [❌] [🔄]│
│  Test Key         Sam Chen    11/12   [❌] [🔄]│
│  Admin Live Key   Exec Asst   11/22   [❌] [🔄]│
│  Old Key (revoked) Sarah W.   10/15   Revoked │
│                                             │
└─────────────────────────────────────────────┘

Legend:
[+] = Create new
[✏️] = Edit
[❌] = Revoke
[🔄] = Rotate
```

---

### UI Features

#### Users Tab
- **Sections**: Coaches, Clients, Admins (collapsible)
- **Actions**: Create, Edit (modal form)
- **Search**: Filter by name or email
- **Display**: Name, email, company, created date

#### API Keys Tab
- **Create Key**:
  - Select user from dropdown (coach/client/admin)
  - Enter key name
  - Select scopes (checkboxes: read, write, admin)
  - Set expiration (optional)
  - Submit → Show key ONCE with copy button
- **List Keys**:
  - Table with: name, user, created, last used, status
  - Actions: Revoke (one-click), Rotate (confirm modal)
  - Filter: By user, status (active/revoked), date range
- **Copy to Clipboard**: One-time display of new keys

#### Analytics Tab (Optional/Stretch)
- **Key Usage**: Requests per day (simple bar chart)
- **Unused Keys**: Alert for keys not used in 30+ days
- **User Activity**: Which coaches/clients are active

---

## Authentication Middleware Update

### Current (Checkpoint 9)

```javascript
// api/middleware/auth.js
if (matchedKey.scopes && matchedKey.scopes.includes('admin')) {
  userRole = 'admin';
  userId = null;  // ❌ No user identity
  coachId = null;
  clientId = null;
}
```

### Updated (Checkpoint 10)

```javascript
// api/middleware/auth.js
if (matchedKey.admin_id) {
  // Fetch admin user record
  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('id', matchedKey.admin_id)
    .single();

  if (error || !admin) {
    return res.status(401).json({ error: 'Invalid admin user' });
  }

  req.auth = {
    userId: matchedKey.admin_id,  // ✅ Specific admin user
    userRole: 'admin',
    adminId: matchedKey.admin_id,
    adminEmail: admin.email,
    adminName: admin.name,
    adminRole: admin.role,  // super_admin/admin/support
    coachId: null,
    clientId: null,
    apiKeyId: matchedKey.id,
    scopes: matchedKey.scopes
  };

  // Set RLS session variables
  await supabase.rpc('set_current_user', {
    user_id: matchedKey.admin_id,
    user_role: 'admin'
  });

  return next();
}
```

---

## RLS Policy Updates

**Good News**: No RLS policy changes needed!

**Why**: All RLS policies already use `is_admin()` helper function:

```sql
-- Example policy (no changes needed)
CREATE POLICY coaches_see_own_data ON data_items FOR SELECT
  USING (is_admin() OR coach_id = get_current_coach_id());

-- Helper function (no changes needed)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

**Result**: Admins bypass all RLS policies automatically

---

## Audit Logging

### Before (Checkpoint 9)

```sql
INSERT INTO audit_logs (user_id, user_role, action, metadata)
VALUES (NULL, 'admin', 'DELETE_CLIENT', ...);
-- ❌ user_id is NULL, can't track which admin
```

### After (Checkpoint 10)

```sql
INSERT INTO audit_logs (user_id, user_role, user_email, action, metadata)
VALUES (
  '550e8400-admin-uuid',  -- ✅ Specific admin user
  'admin',
  'assistant@insideoutdev.com',
  'DELETE_CLIENT',
  '{"client_id": "...", "reason": "duplicate"}'::jsonb
);
```

**Benefit**: Full audit trail with admin attribution

---

## Implementation Plan

### Step 1: Schema Migration (2-3 hours)

**File**: `scripts/database/007_add_admins_table.sql`

Tasks:
1. Create `admins` table with indexes
2. Add `admin_id` column to `api_keys`
3. Update `key_has_single_owner` constraint
4. Seed first admin user (executive assistant)
5. Create API key for admin user
6. Test constraint with sample inserts
7. Verify RLS policies still work

**Testing**:
```sql
-- Test constraint
INSERT INTO api_keys (coach_id, admin_id, ...) VALUES (...); -- Should FAIL
INSERT INTO api_keys (admin_id, ...) VALUES (...); -- Should SUCCEED

-- Test admin data access
SELECT * FROM data_items; -- Should return ALL rows (admin bypass)
```

---

### Step 2: Backend Endpoints (5-6 hours)

#### User Management (3 hours)
1. Create `POST /api/admin/coaches` endpoint
2. Create `POST /api/admin/clients` endpoint
3. Create `POST /api/admin/admins` endpoint
4. Create `GET /api/admin/{coaches|clients|admins}` endpoints
5. Create `PUT /api/admin/{coaches|clients|admins}/:id` endpoints
6. Add validation (email format, required fields)
7. Test with curl/Postman

#### API Key Management (2-3 hours)
1. Create `POST /api/admin/keys` endpoint
   - Generate random 32-char key
   - Hash with bcrypt
   - Store with user_id mapping
2. Create `GET /api/admin/keys` endpoint
   - Join with users tables
   - Filter by user_type, status
3. Create `POST /api/admin/keys/:id/revoke` endpoint
   - Set `is_revoked = true`
   - Log to audit_logs
4. Create `POST /api/admin/keys/:id/rotate` endpoint
   - Generate new key
   - Expire old key with grace period
5. Create `GET /api/admin/analytics/key-usage` endpoint
   - Query audit_logs for usage stats
6. Test key creation, revocation, rotation

---

### Step 3: Admin UI (2-3 hours)

#### HTML Structure (1 hour)
1. Create `api/public/admin.html`
2. Add tab navigation (Users | API Keys | Analytics)
3. Create user tables (coaches, clients, admins)
4. Create API keys table
5. Add forms (create user, create key)

#### JavaScript Logic (1 hour)
1. Implement HTTP Basic Auth prompt
2. Fetch data from API endpoints
3. Render tables dynamically
4. Handle form submissions
5. Copy-to-clipboard for new keys
6. Modal dialogs for edit/confirm

#### Styling (30 min)
1. Clean, minimal CSS
2. Responsive layout
3. Form validation styling
4. Loading states

#### Integration (30 min)
1. Add `/admin` route to `api/server.js`
2. Add `adminAuth` middleware
3. Test authentication flow
4. Deploy to Vercel preview

---

### Step 4: Documentation (1.5 hours)

#### Admin Guide
- How to create users (coaches, clients, admins)
- How to create API keys
- How to distribute keys to coaches
- How to revoke compromised keys
- How to monitor key usage

#### API Documentation
- Endpoint reference (request/response examples)
- Authentication requirements
- Error codes and handling

#### Schema Documentation
- `admins` table structure
- `api_keys` relationships
- Constraint explanations

---

### Step 5: Testing & Validation (1 hour)

#### Backend Tests
- Create 5 coaches, 3 clients, 2 admins via API
- Create 10 API keys (mix of coach/client/admin)
- Revoke 2 keys, verify they fail authentication
- Rotate 1 key, verify grace period works
- Test user search/filtering

#### UI Tests
- Test all forms (create user, create key)
- Test table filtering and sorting
- Test copy-to-clipboard
- Test authentication (valid/invalid password)
- Test on mobile (responsive layout)

#### Integration Tests
- Admin creates coach → creates key → key authenticates
- Admin revokes key → key fails authentication
- Admin user performs action → audit_logs has correct user_id

---

## Deployment

### Environment Variables

Add to Vercel:
```
ADMIN_PASSWORD=your-secure-password-here
```

Generate secure password:
```bash
openssl rand -base64 32
```

---

### Migration Checklist

1. ✅ Run migration `007_add_admins_table.sql` in Supabase
2. ✅ Verify `admins` table created
3. ✅ Verify `api_keys.admin_id` column added
4. ✅ Verify constraint updated
5. ✅ Verify first admin user seeded
6. ✅ Test admin API key authentication
7. ✅ Deploy to Vercel
8. ✅ Add `ADMIN_PASSWORD` to Vercel env vars
9. ✅ Test admin UI at https://unified-data-layer.vercel.app/admin

---

## Success Criteria

### Schema
- ✅ `admins` table exists with correct structure
- ✅ `api_keys.admin_id` column exists
- ✅ Constraint allows exactly one user type per key
- ✅ First admin user seeded successfully

### Backend
- ✅ All user management endpoints work (create, list, update)
- ✅ All key management endpoints work (create, revoke, rotate, list)
- ✅ Admin authentication properly sets user_id
- ✅ Audit logs track admin actions with user_id

### UI
- ✅ Admin dashboard loads at `/admin`
- ✅ HTTP Basic Auth protects dashboard
- ✅ Can create users (coaches, clients, admins)
- ✅ Can create API keys for users
- ✅ Can revoke/rotate keys
- ✅ Copy-to-clipboard works for new keys

### Integration
- ✅ Admin creates coach → key → key authenticates → data access works
- ✅ RLS policies allow admin to see all data
- ✅ Audit logs show which admin performed actions

---

## Risk Mitigation

### Risk 1: Migration Breaks Existing Keys
**Mitigation**:
- Test migration on local database first
- Backup production database before migration
- Constraint allows NULL admin_id (existing keys unaffected)

### Risk 2: Authentication Middleware Breaks
**Mitigation**:
- Fallback to coach_id/client_id if admin_id is NULL
- Test with existing test keys
- Gradual rollout (test keys → production keys)

### Risk 3: UI Doesn't Work in Production
**Mitigation**:
- Test on Vercel preview deployment first
- Use vanilla JS (no build dependencies)
- Test HTTP Basic Auth locally before deploying

---

## Related Documentation

- [Checkpoint 9 Results](checkpoint-9-results.md) - RLS implementation
- [Production Costs](../cost-analysis/production-costs.md) - Cost analysis approved
- [Roadmap](../project/roadmap.md) - Phase 3 overview
- [Row-Level Security Design](../security/row-level-security-design.md) - RLS architecture

---

## Questions & Decisions Log

### Q1: Is an admin a distinct user type from coach/client?
**A**: YES - Added `admins` table. Executive assistants are not coaches.

### Q2: Should Checkpoint 10 include user management?
**A**: YES - Admin needs to create users before creating keys (foreign key dependency).

### Q3: Should we build an admin UI?
**A**: YES - Single-file HTML for minimal overhead.

### Q4: What UI framework to use?
**A**: Vanilla HTML/CSS/JS - No build step, fastest development.

### Q5: Self-service or admin-managed?
**A**: ADMIN-MANAGED - Admins create everything, coaches receive pre-configured GPTs.

---

## Next Steps (When Implementation Begins)

1. Create checkpoint branch: `phase-3-checkpoint-10`
2. Implement migration script
3. Test migration locally
4. Implement backend endpoints
5. Build admin UI
6. Deploy to preview
7. Final testing
8. Merge to main
9. Run release process
10. Complete checkpoint documentation

**Estimated Timeline**: 9-12 hours total (1.5-2 days)
