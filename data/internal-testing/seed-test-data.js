#!/usr/bin/env node
/**
 * Internal Testing Data Seeder
 *
 * Uploads assessments, company docs, and coaching models for access restriction testing.
 * Uses the /api/data/upload endpoint with admin API key.
 *
 * Usage:
 *   node data/internal-testing/seed-test-data.js
 *
 * Environment Variables:
 *   API_BASE_URL - Base URL for API (default: https://unified-data-layer.vercel.app)
 *   ADMIN_API_KEY - Admin API key for authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('ERROR: ADMIN_API_KEY environment variable is required');
  console.error('Usage: ADMIN_API_KEY=sk_xxx node data/internal-testing/seed-test-data.js');
  process.exit(1);
}

// Data files to upload
const DATA_FILES = {
  assessments: [
    'assessments/sarah-williams-disc.json',
    'assessments/michael-torres-disc.json',
    'assessments/emily-zhang-mbti.json',
    'assessments/david-kim-360.json'
  ],
  company_docs: [
    'company-docs/acme-media-q4-okrs.json',
    'company-docs/techcorp-q4-strategy.json'
  ],
  coaching_models: [
    'coaching-models/alex-rivera-transformational.json',
    'coaching-models/jordan-taylor-strengths.json',
    'coaching-models/sam-chen-adaptive.json'
  ]
};

/**
 * Upload a single data item
 */
async function uploadData(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ File not found: ${filePath}`);
    return { success: false, error: 'File not found' };
  }

  try {
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(fileContent);

    const response = await fetch(`${API_BASE_URL}/api/data/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_API_KEY}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`  ✅ ${filePath}`);
      console.log(`     ID: ${result.data_item_id}, Chunks: ${result.chunks_created}`);
      return { success: true, result };
    } else {
      console.error(`  ❌ ${filePath}: ${result.message || result.error}`);
      return { success: false, error: result.message || result.error };
    }
  } catch (error) {
    console.error(`  ❌ ${filePath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Upload all data in a category
 */
async function uploadCategory(categoryName, files) {
  console.log(`\n📁 ${categoryName.toUpperCase()}`);
  console.log('─'.repeat(40));

  const results = [];
  for (const file of files) {
    const result = await uploadData(file);
    results.push({ file, ...result });
  }

  return results;
}

/**
 * Main execution
 */
async function main() {
  console.log('═'.repeat(50));
  console.log('🌱 Internal Testing Data Seeder');
  console.log('═'.repeat(50));
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Auth: ${ADMIN_API_KEY.substring(0, 10)}...`);

  const allResults = {
    assessments: [],
    company_docs: [],
    coaching_models: []
  };

  // Upload each category
  allResults.assessments = await uploadCategory('Assessments', DATA_FILES.assessments);
  allResults.company_docs = await uploadCategory('Company Documents', DATA_FILES.company_docs);
  allResults.coaching_models = await uploadCategory('Coaching Models', DATA_FILES.coaching_models);

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));

  const totalSuccess = Object.values(allResults).flat().filter(r => r.success).length;
  const totalFailed = Object.values(allResults).flat().filter(r => !r.success).length;

  console.log(`✅ Successful: ${totalSuccess}`);
  console.log(`❌ Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log('\n⚠️  Failed uploads:');
    Object.entries(allResults).forEach(([category, results]) => {
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.file}: ${r.error}`);
      });
    });
  }

  console.log('\n📋 Test Data Ready:');
  console.log('   - 4 assessments (one per client)');
  console.log('   - 2 company docs (one per org)');
  console.log('   - 3 coaching models (one per coach)');
  console.log('\n🧪 Run access restriction tests to verify isolation!');

  return totalFailed === 0 ? 0 : 1;
}

main()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
