#!/usr/bin/env node

/**
 * Run Migration 10: Create admins table
 *
 * This script reads and executes the migration SQL file
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
// Support both naming conventions
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running Migration 10: Create admins table\n');

  // Read migration file
  const migrationPath = path.join(__dirname, 'database', '10-create-admins-table.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration...\n');

  // Since Supabase doesn't have a direct SQL execution method in the JS client,
  // we'll need to execute this via the Supabase dashboard or psql
  // For now, let's verify we can read the tables

  console.log('✅ Migration file loaded successfully');
  console.log('\nTo apply this migration, run:');
  console.log('  psql $DATABASE_URL < scripts/database/10-create-admins-table.sql');
  console.log('\nOr copy the SQL from scripts/database/10-create-admins-table.sql');
  console.log('and paste it into the Supabase SQL Editor.\n');

  // Try to verify tables exist
  console.log('Checking current database state...\n');

  const { data: companies, error: companiesError } = await supabase
    .from('coaching_companies')
    .select('id, name')
    .limit(1);

  if (!companiesError) {
    console.log('✅ coaching_companies table accessible');
    if (companies && companies.length > 0) {
      console.log(`   Company: ${companies[0].name}`);
    }
  }

  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('count');

  if (adminsError) {
    console.log('⚠️  admins table does not exist yet (expected before migration)');
  } else {
    console.log('✅ admins table already exists!');
  }
}

runMigration().catch(console.error);
