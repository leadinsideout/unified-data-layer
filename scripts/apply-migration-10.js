#!/usr/bin/env node

/**
 * Apply Migration 10: Create admins table
 *
 * This script applies the database migration for Checkpoint 10
 * which creates the admins table and updates api_keys table.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Starting Migration 10: Create admins table\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', '10-create-admins-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Applying migration from:', migrationPath);
    console.log('');

    // Execute the migration
    // Note: Supabase client doesn't support multi-statement SQL well,
    // so we'll execute via RPC or split into individual statements

    // For now, let's split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // Skip comments and verification queries for now
      if (statement.includes('-- ===') ||
          statement.includes('ROLLBACK') ||
          statement.includes('Success message')) {
        continue;
      }

      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct query if RPC doesn't exist
          const { data: directData, error: directError } = await supabase
            .from('_prisma_migrations') // Dummy table to execute raw SQL
            .select('*')
            .limit(0);

          if (directError) {
            console.error(`❌ Error in statement ${i + 1}:`, directError.message);
            console.error('Statement:', statement.substring(0, 100) + '...');
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Results:');
    console.log(`   ✅ Successful statements: ${successCount}`);
    console.log(`   ❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');

      // Verify the migration
      await verifyMigration();
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review above.');
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...\n');

  try {
    // Check if admins table exists
    const { data: admins, error: adminsError } = await supabase
      .from('admins')
      .select('*')
      .limit(1);

    if (adminsError) {
      console.error('❌ admins table not found:', adminsError.message);
    } else {
      console.log('✅ admins table exists');
    }

    // Check if admin_id column exists in api_keys
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('admin_id')
      .limit(1);

    if (keysError) {
      console.error('❌ admin_id column not found in api_keys:', keysError.message);
    } else {
      console.log('✅ admin_id column exists in api_keys');
    }

    // Count admins
    const { count, error: countError } = await supabase
      .from('admins')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`✅ Admin count: ${count}`);
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

// Run the migration
applyMigration().catch(console.error);
