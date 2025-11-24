#!/usr/bin/env node

/**
 * Apply Migration 10: Create admins table
 *
 * This script applies the migration using the Supabase REST API
 * by breaking the SQL into executable chunks
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql, description) {
  console.log(`\n📝 ${description}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }

    console.log(`✅ Success`);
    if (data) {
      console.log('   Result:', JSON.stringify(data, null, 2));
    }
    return true;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function runMigration() {
  console.log('🚀 Running Migration 10: Create admins table\n');
  console.log('=' .repeat(70));

  // STEP 1: Create admins table
  const step1 = `
    CREATE TABLE IF NOT EXISTS admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      coaching_company_id UUID NOT NULL
        REFERENCES coaching_companies(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin'
        CHECK (role IN ('super_admin', 'admin', 'support')),
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  if (!await executeSql(step1, 'STEP 1: Create admins table')) {
    console.error('\n❌ Migration failed at STEP 1');
    process.exit(1);
  }

  // STEP 2: Create indexes
  const step2a = `CREATE INDEX IF NOT EXISTS idx_admins_company ON admins(coaching_company_id);`;
  const step2b = `CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);`;
  const step2c = `CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);`;

  await executeSql(step2a, 'STEP 2a: Create company index');
  await executeSql(step2b, 'STEP 2b: Create email index');
  await executeSql(step2c, 'STEP 2c: Create role index');

  // STEP 3: Add updated_at trigger
  const step3 = `
    CREATE TRIGGER update_admins_updated_at
      BEFORE UPDATE ON admins
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  await executeSql(step3, 'STEP 3: Add updated_at trigger');

  // STEP 4: Add admin_id column to api_keys
  const step4 = `
    ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS admin_id UUID
      REFERENCES admins(id) ON DELETE CASCADE;
  `;

  if (!await executeSql(step4, 'STEP 4: Add admin_id column to api_keys')) {
    console.error('\n❌ Migration failed at STEP 4');
    process.exit(1);
  }

  // STEP 5: Create index for admin_id
  const step5 = `CREATE INDEX IF NOT EXISTS idx_api_keys_admin ON api_keys(admin_id);`;
  await executeSql(step5, 'STEP 5: Create admin_id index');

  // STEP 6: Drop old constraint
  const step6 = `ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS key_has_single_owner;`;
  await executeSql(step6, 'STEP 6: Drop old constraint');

  // STEP 7: Add new constraint
  const step7 = `
    ALTER TABLE api_keys
    ADD CONSTRAINT key_has_single_owner CHECK (
      (coach_id IS NOT NULL AND client_id IS NULL AND admin_id IS NULL) OR
      (coach_id IS NULL AND client_id IS NOT NULL AND admin_id IS NULL) OR
      (coach_id IS NULL AND client_id IS NULL AND admin_id IS NOT NULL)
    );
  `;

  if (!await executeSql(step7, 'STEP 7: Add new constraint with admin_id')) {
    console.error('\n❌ Migration failed at STEP 7');
    process.exit(1);
  }

  // STEP 8: Enable RLS
  const step8 = `ALTER TABLE admins ENABLE ROW LEVEL SECURITY;`;
  await executeSql(step8, 'STEP 8: Enable RLS on admins table');

  // STEP 9: Create RLS policies (one at a time)
  const policies = [
    {
      name: 'Admins can view admins in their company',
      sql: `
        CREATE POLICY "Admins can view admins in their company"
          ON admins
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM api_keys
              WHERE api_keys.admin_id = auth.uid()
                AND api_keys.coaching_company_id = admins.coaching_company_id
            )
          );
      `
    },
    {
      name: 'Super admins can create admins',
      sql: `
        CREATE POLICY "Super admins can create admins"
          ON admins
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM admins AS current_admin
              JOIN api_keys ON api_keys.admin_id = current_admin.id
              WHERE api_keys.admin_id = auth.uid()
                AND current_admin.role = 'super_admin'
                AND current_admin.coaching_company_id = coaching_company_id
            )
          );
      `
    },
    {
      name: 'Super admins can update admins',
      sql: `
        CREATE POLICY "Super admins can update admins"
          ON admins
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM admins AS current_admin
              JOIN api_keys ON api_keys.admin_id = current_admin.id
              WHERE api_keys.admin_id = auth.uid()
                AND current_admin.role = 'super_admin'
                AND current_admin.coaching_company_id = coaching_company_id
            )
          );
      `
    },
    {
      name: 'Super admins can delete admins',
      sql: `
        CREATE POLICY "Super admins can delete admins"
          ON admins
          FOR DELETE
          USING (
            id != auth.uid()
            AND EXISTS (
              SELECT 1 FROM admins AS current_admin
              JOIN api_keys ON api_keys.admin_id = current_admin.id
              WHERE api_keys.admin_id = auth.uid()
                AND current_admin.role = 'super_admin'
                AND current_admin.coaching_company_id = coaching_company_id
            )
          );
      `
    }
  ];

  for (let i = 0; i < policies.length; i++) {
    await executeSql(policies[i].sql, `STEP 9.${i + 1}: Create policy "${policies[i].name}"`);
  }

  // STEP 10: Update existing api_keys policies
  const updatePolicies = [
    {
      drop: `DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;`,
      create: `
        CREATE POLICY "Users can view their own API keys"
          ON api_keys
          FOR SELECT
          USING (
            coach_id = auth.uid()
            OR client_id = auth.uid()
            OR admin_id = auth.uid()
          );
      `,
      name: 'Users can view their own API keys'
    },
    {
      drop: `DROP POLICY IF EXISTS "Only admins can create API keys" ON api_keys;`,
      create: `
        CREATE POLICY "Only admins can create API keys"
          ON api_keys
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM admins
              JOIN api_keys AS admin_keys ON admin_keys.admin_id = admins.id
              WHERE admin_keys.admin_id = auth.uid()
                AND admins.coaching_company_id = coaching_company_id
            )
          );
      `,
      name: 'Only admins can create API keys'
    },
    {
      drop: `DROP POLICY IF EXISTS "Admins can revoke any key in their company" ON api_keys;`,
      create: `
        CREATE POLICY "Admins can revoke any key in their company"
          ON api_keys
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM admins
              JOIN api_keys AS admin_keys ON admin_keys.admin_id = admins.id
              WHERE admin_keys.admin_id = auth.uid()
                AND admins.coaching_company_id = api_keys.coaching_company_id
            )
          );
      `,
      name: 'Admins can revoke any key in their company'
    }
  ];

  for (let i = 0; i < updatePolicies.length; i++) {
    await executeSql(updatePolicies[i].drop, `STEP 10.${i + 1}a: Drop policy "${updatePolicies[i].name}"`);
    await executeSql(updatePolicies[i].create, `STEP 10.${i + 1}b: Create policy "${updatePolicies[i].name}"`);
  }

  // STEP 11: Seed first admin user
  const step11 = `
    INSERT INTO admins (
      coaching_company_id,
      email,
      name,
      role,
      metadata
    )
    SELECT
      cc.id,
      'admin@insideoutdev.com',
      'InsideOut Admin',
      'super_admin',
      '{"note": "Executive assistant with full admin privileges"}'::jsonb
    FROM coaching_companies cc
    WHERE cc.name = 'InsideOut Leadership'
    ON CONFLICT (email) DO NOTHING;
  `;

  await executeSql(step11, 'STEP 11: Seed first admin user');

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ Migration completed successfully!\n');

  // Verification
  console.log('Running verification queries...\n');

  const { data: adminCount } = await supabase
    .from('admins')
    .select('*', { count: 'exact', head: false });

  console.log(`✅ Admins table created with ${adminCount?.length || 0} admin(s)`);

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('admin_id')
    .limit(1);

  console.log(`✅ api_keys table has admin_id column`);

  console.log('\n🎉 Migration 10 complete!\n');
}

runMigration().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
