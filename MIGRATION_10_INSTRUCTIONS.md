# Migration 10: Create Admins Table

## Instructions

This migration creates the `admins` table and updates the `api_keys` table to support admin users.

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `scripts/database/10-create-admins-table.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success messages appear

### Option 2: Using psql CLI

If you have `psql` installed and `DATABASE_URL` configured:

```bash
psql $DATABASE_URL < scripts/database/10-create-admins-table.sql
```

### Verification

After running the migration, verify it succeeded:

```sql
-- Check admins table exists
SELECT COUNT(*) as admin_count FROM admins;

-- Check admin_id column was added to api_keys
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'api_keys' AND column_name = 'admin_id';

-- Check RLS is enabled on admins
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'admins';

-- Check policies were created
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('admins', 'api_keys')
ORDER BY tablename, policyname;
```

### Expected Results

- ✅ `admins` table created with 1 admin user
- ✅ `admin_id` column added to `api_keys` table
- ✅ `key_has_single_owner` constraint updated to include admin_id
- ✅ RLS enabled on `admins` table
- ✅ 4 RLS policies created for `admins` table
- ✅ 3 RLS policies updated for `api_keys` table

### Rollback

If you need to rollback this migration, see the rollback instructions at the end of `scripts/database/10-create-admins-table.sql`.

## What This Migration Does

1. **Creates `admins` table**: For platform administrators (executive assistants, etc.)
2. **Adds `admin_id` to `api_keys`**: Links API keys to admin users
3. **Updates ownership constraint**: Ensures each API key has exactly one owner (coach OR client OR admin)
4. **Enables RLS**: Protects admin data with row-level security
5. **Creates policies**: 4 policies for admins table, 3 updated for api_keys
6. **Seeds first admin**: Creates InsideOut admin user

## Time Estimate

- Manual execution via SQL Editor: ~2 minutes
- Verification: ~1 minute
- **Total**: ~3 minutes
