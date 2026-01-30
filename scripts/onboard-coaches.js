/**
 * Onboard New Coaches Script
 *
 * Automates the creation of coaches, organizations, and clients
 * for Matt Thieleman and Jason Pliml using the admin API.
 *
 * Usage:
 *   node scripts/onboard-coaches.js
 *
 * Prerequisites:
 *   - Admin API key in .env as ADMIN_API_KEY
 *   - Excel files with client lists
 */

import fetch from 'node-fetch';
import fs from 'fs';
import XLSX from 'xlsx';
import 'dotenv/config';

const API_BASE = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('❌ ADMIN_API_KEY not found in environment variables');
  console.error('Please add ADMIN_API_KEY to your .env file');
  process.exit(1);
}

// ============================================
// API HELPER FUNCTIONS
// ============================================

async function apiRequest(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ADMIN_API_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${data.error} - ${data.message}`);
  }

  return data;
}

// ============================================
// COACH CREATION
// ============================================

async function createCoach(name, email) {
  console.log(`\n📝 Creating coach: ${name} (${email})`);

  try {
    const result = await apiRequest('POST', '/api/admin/users', {
      type: 'coach',
      name,
      email,
      metadata: {
        onboarded_at: new Date().toISOString(),
        onboarding_source: 'onboard-coaches.js'
      }
    });

    console.log(`✅ Coach created: ${result.user.id}`);
    return result.user;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Coach already exists, fetching existing record...`);
      // Try to get existing coach by email
      const users = await apiRequest('GET', '/api/admin/users');
      const existingCoach = users.coaches.find(c => c.email === email);
      if (existingCoach) {
        console.log(`✅ Found existing coach: ${existingCoach.id}`);
        return existingCoach;
      }
    }
    throw error;
  }
}

// ============================================
// ORGANIZATION CREATION
// ============================================

async function createOrganization(name, industry) {
  console.log(`\n📝 Creating organization: ${name} (${industry})`);

  try {
    const result = await apiRequest('POST', '/api/admin/organizations', {
      name,
      industry
    });

    console.log(`✅ Organization created: ${result.organization.id}`);
    return result.organization;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Organization already exists, fetching existing record...`);
      const orgs = await apiRequest('GET', '/api/admin/organizations');
      const existingOrg = orgs.organizations.find(o => o.name === name);
      if (existingOrg) {
        console.log(`✅ Found existing organization: ${existingOrg.id}`);
        return existingOrg;
      }
    }
    throw error;
  }
}

// ============================================
// CLIENT CREATION
// ============================================

async function createClient(name, email, organizationId) {
  console.log(`\n📝 Creating client: ${name} (${email})`);

  try {
    const result = await apiRequest('POST', '/api/admin/users', {
      type: 'client',
      name,
      email,
      organization_id: organizationId,
      metadata: {
        onboarded_at: new Date().toISOString(),
        onboarding_source: 'onboard-coaches.js'
      }
    });

    console.log(`✅ Client created: ${result.user.id}`);
    return result.user;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Client already exists, fetching existing record...`);
      const users = await apiRequest('GET', '/api/admin/users');
      const existingClient = users.clients.find(c => c.email === email);
      if (existingClient) {
        console.log(`✅ Found existing client: ${existingClient.id}`);
        return existingClient;
      }
    }
    throw error;
  }
}

// ============================================
// COACH-CLIENT RELATIONSHIP
// ============================================

async function assignClientToCoach(coachId, clientId) {
  console.log(`\n📝 Assigning client to coach...`);

  try {
    await apiRequest('POST', `/api/admin/coaches/${coachId}/clients`, {
      client_id: clientId
    });

    console.log(`✅ Client assigned to coach`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Relationship already exists, skipping...`);
    } else {
      throw error;
    }
  }
}

// ============================================
// EXCEL PARSING
// ============================================

function readExcelClients(filePath) {
  console.log(`\n📄 Reading Excel file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log(`✅ Found ${data.length} rows in Excel file`);
  return data;
}

// ============================================
// ORGANIZATION DEFINITIONS
// ============================================

const ORGANIZATIONS = [
  { name: 'Independent / No Organization', industry: 'Independent' }, // Default for clients without a company
  { name: 'BASK', industry: 'Consumer Products' },
  { name: 'E7 Solutions', industry: 'Consulting' },
  { name: 'MATTER Studio', industry: 'Design' },
  { name: 'Prime IV Hydration', industry: 'Healthcare' },
  { name: 'Highmark', industry: 'Healthcare' },
  { name: 'Eloo Designs', industry: 'Design' },
  { name: 'Eco Experience', industry: 'Sustainability' },
  { name: 'Work With Alex', industry: 'Consulting' },
  { name: 'Remote PR Jobs', industry: 'Recruiting' },
  { name: 'Vansary', industry: 'Technology' },
  { name: 'Datawise', industry: 'Technology' }
];

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 ONBOARDING NEW COACHES: Matt Thieleman & Jason Pliml');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // ============================================
    // PHASE 1.1: CREATE COACHES
    // ============================================
    console.log('\n🎯 PHASE 1.1: Creating Coach Records');
    console.log('─────────────────────────────────────');

    const mattCoach = await createCoach('Matt Thieleman', 'matt@leadinsideout.io');
    const jasonCoach = await createCoach('Jason Pliml', 'jason@leadinsideout.io');

    console.log('\n✅ Phase 1.1 Complete: Coaches created');
    console.log(`   Matt Thieleman: ${mattCoach.id}`);
    console.log(`   Jason Pliml: ${jasonCoach.id}`);

    // ============================================
    // PHASE 1.2: CREATE ORGANIZATIONS
    // ============================================
    console.log('\n\n🎯 PHASE 1.2: Creating Client Organizations');
    console.log('─────────────────────────────────────');

    const orgMap = {};
    for (const org of ORGANIZATIONS) {
      const created = await createOrganization(org.name, org.industry);
      orgMap[org.name] = created;
    }

    console.log('\n✅ Phase 1.2 Complete: Organizations created');
    console.log(`   Total organizations: ${Object.keys(orgMap).length}`);

    // ============================================
    // PHASE 1.3: CREATE MATT'S CLIENTS
    // ============================================
    console.log('\n\n🎯 PHASE 1.3A: Creating Matt\'s Clients');
    console.log('─────────────────────────────────────');

    const mattExcelPath = '/Users/jjvega/Downloads/Matt Thieleman/Matt Thieleman Client List.xlsx';

    if (!fs.existsSync(mattExcelPath)) {
      console.error(`❌ Excel file not found: ${mattExcelPath}`);
      process.exit(1);
    }

    const mattClientsData = readExcelClients(mattExcelPath);
    const mattClients = [];

    for (const row of mattClientsData) {
      const name = row['Name'];
      const email = row['Email'];
      const company = row['Company'];
      const status = row['Active/Inactive'];

      // Find organization ID (use default "Independent" org if no company)
      let orgId;
      if (company && company !== '-') {
        orgId = orgMap[company]?.id;
      }
      if (!orgId) {
        orgId = orgMap['Independent / No Organization']?.id;
      }

      // Create client
      const client = await createClient(name, email, orgId);

      // Assign to Matt
      await assignClientToCoach(mattCoach.id, client.id);

      mattClients.push({ ...client, status, company });
    }

    console.log('\n✅ Phase 1.3A Complete: Matt\'s clients created');
    console.log(`   Total clients: ${mattClients.length}`);
    console.log(`   Active: ${mattClients.filter(c => c.status === 'Active').length}`);
    console.log(`   Inactive: ${mattClients.filter(c => c.status === 'Inactive').length}`);

    // ============================================
    // PHASE 1.3: CREATE JASON'S CLIENTS
    // ============================================
    console.log('\n\n🎯 PHASE 1.3B: Creating Jason\'s Clients');
    console.log('─────────────────────────────────────');

    const jasonExcelPath = '/Users/jjvega/Downloads/Jason Pliml/Client List.xlsx';

    if (!fs.existsSync(jasonExcelPath)) {
      console.error(`❌ Excel file not found: ${jasonExcelPath}`);
      process.exit(1);
    }

    const jasonClientsData = readExcelClients(jasonExcelPath);
    const jasonClients = [];

    for (const row of jasonClientsData) {
      const name = row['Client Name'];
      const email = row['Client Email'];

      // Match organization by email domain
      let orgId = null;
      const emailDomain = email.split('@')[1];

      // Try to match org by email domain
      if (emailDomain === 'eloodesigns.com') orgId = orgMap['Eloo Designs']?.id;
      else if (emailDomain === 'eco-experience.com') orgId = orgMap['Eco Experience']?.id;
      else if (emailDomain === 'workwithalex.com') orgId = orgMap['Work With Alex']?.id;
      else if (emailDomain === 'remoteprjobs.com') orgId = orgMap['Remote PR Jobs']?.id;
      else if (emailDomain === 'vansary.com') orgId = orgMap['Vansary']?.id;
      else if (emailDomain === 'wearedatawise.com') orgId = orgMap['Datawise']?.id;

      // Use default "Independent" org if no match
      if (!orgId) {
        orgId = orgMap['Independent / No Organization']?.id;
      }

      // Create client
      const client = await createClient(name, email, orgId);

      // Assign to Jason
      await assignClientToCoach(jasonCoach.id, client.id);

      jasonClients.push({ ...client, emailDomain });
    }

    console.log('\n✅ Phase 1.3B Complete: Jason\'s clients created');
    console.log(`   Total clients: ${jasonClients.length}`);
    console.log(`   ⚠️  Note: Phyllip Hall and Heath O\'Leary not in Excel, will need manual linking`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n═══════════════════════════════════════════════════════════');
    console.log('✅ PHASE 1 COMPLETE: Database Setup Finished');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   Coaches: 2 (Matt, Jason)`);
    console.log(`   Organizations: ${Object.keys(orgMap).length}`);
    console.log(`   Matt's Clients: ${mattClients.length}`);
    console.log(`   Jason's Clients: ${jasonClients.length}`);
    console.log(`   Total Clients: ${mattClients.length + jasonClients.length}`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Run transcript import script (Phase 2)');
    console.log('   2. Import profile documents (Phase 3)');
    console.log('   3. Generate API keys (Phase 5)');
    console.log('   4. Create Custom GPTs (Phase 6)');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
