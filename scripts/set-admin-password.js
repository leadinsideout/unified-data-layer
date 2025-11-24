/**
 * Set Admin Password
 *
 * Usage: node scripts/set-admin-password.js <email> <password>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setAdminPassword(email, password) {
  if (!email || !password) {
    console.error('Usage: node scripts/set-admin-password.js <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  console.log(`Setting password for admin: ${email}`);

  // Find admin
  const { data: admin, error: findError } = await supabase
    .from('admins')
    .select('id, email, name')
    .eq('email', email.toLowerCase())
    .single();

  if (findError || !admin) {
    console.error('Admin not found:', email);
    process.exit(1);
  }

  console.log(`Found admin: ${admin.name} (${admin.email})`);

  // Hash password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Update admin
  const { error: updateError } = await supabase
    .from('admins')
    .update({ password_hash: passwordHash })
    .eq('id', admin.id);

  if (updateError) {
    console.error('Failed to update password:', updateError);
    process.exit(1);
  }

  console.log('✅ Password set successfully!');
  console.log(`\nYou can now login at /admin.html with:`);
  console.log(`  Email: ${admin.email}`);
  console.log(`  Password: (the password you just set)`);
}

const [,, email, password] = process.argv;
setAdminPassword(email, password);
