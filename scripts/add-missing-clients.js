/**
 * Add Phyllip Hall and Heath O'Leary to Jason's client list
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const API_BASE = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

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

async function main() {
  console.log('🔧 Adding Missing Clients for Jason Pliml\n');

  // Get Jason's coach ID
  const users = await apiRequest('GET', '/api/admin/users');
  const jason = users.coaches.find(c => c.email === 'jason@leadinsideout.io');

  if (!jason) {
    throw new Error('Jason Pliml not found');
  }

  console.log(`✅ Found Jason: ${jason.id}\n`);

  // Get Independent organization ID
  const orgs = await apiRequest('GET', '/api/admin/organizations');
  const independentOrg = orgs.organizations.find(o => o.name === 'Independent / No Organization');

  if (!independentOrg) {
    throw new Error('Independent organization not found');
  }

  console.log(`✅ Found Independent org: ${independentOrg.id}\n`);

  // Add Phyllip Hall
  console.log('📝 Creating client: Phyllip Hall');
  try {
    const phyllip = await apiRequest('POST', '/api/admin/users', {
      type: 'client',
      name: 'Phyllip Hall',
      email: 'phyllip.hall@example.com',  // Placeholder email
      organization_id: independentOrg.id,
      metadata: {
        status: 'inactive',
        onboarding_source: 'add-missing-clients.js',
        note: 'Inactive client - email is placeholder, update with real email'
      }
    });
    console.log(`✅ Client created: ${phyllip.user.id}`);

    // Assign to Jason
    console.log('📝 Assigning to Jason...');
    await apiRequest('POST', `/api/admin/coaches/${jason.id}/clients`, {
      client_id: phyllip.user.id
    });
    console.log('✅ Assigned to Jason\n');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Phyllip Hall already exists\n');
    } else {
      throw error;
    }
  }

  // Add Heath O'Leary
  console.log('📝 Creating client: Heath O\'Leary');
  try {
    const heath = await apiRequest('POST', '/api/admin/users', {
      type: 'client',
      name: 'Heath O\'Leary',
      email: 'heath.oleary@example.com',  // Placeholder email
      organization_id: independentOrg.id,
      metadata: {
        status: 'inactive',
        onboarding_source: 'add-missing-clients.js',
        note: 'Inactive client - email is placeholder, update with real email'
      }
    });
    console.log(`✅ Client created: ${heath.user.id}`);

    // Assign to Jason
    console.log('📝 Assigning to Jason...');
    await apiRequest('POST', `/api/admin/coaches/${jason.id}/clients`, {
      client_id: heath.user.id
    });
    console.log('✅ Assigned to Jason\n');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Heath O\'Leary already exists\n');
    } else {
      throw error;
    }
  }

  console.log('✅ Complete: Missing clients added');
  console.log('   Phyllip Hall (inactive)');
  console.log('   Heath O\'Leary (inactive)\n');
}

main().catch(console.error);
