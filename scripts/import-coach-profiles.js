/**
 * Import Coach Profile Documents & Assessments
 *
 * Imports Word documents, PDFs, and images (with manual text extraction)
 * for coach profile documents and psychological assessments.
 *
 * Usage:
 *   node scripts/import-coach-profiles.js
 *
 * Prerequisites:
 *   - Admin API key in .env as ADMIN_API_KEY
 *   - Coach records created in database
 */

import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import 'dotenv/config';

const API_BASE = process.env.API_BASE_URL || 'https://unified-data-layer.vercel.app';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.error('❌ ADMIN_API_KEY not found in environment variables');
  process.exit(1);
}

// Coach IDs
let MATT_COACH_ID = null;
let JASON_COACH_ID = null;

// ============================================
// API HELPER FUNCTIONS
// ============================================

async function apiRequest(method, endpoint, body = null, retries = 3) {
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

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();

      if (response.status === 429 && attempt < retries) {
        const waitTime = Math.pow(2, attempt) * 5000;
        console.log(`   ⏳ Rate limited. Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API Error (${response.status}): ${data.error} - ${data.message}`);
      }

      return data;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }
  }
}

// ============================================
// SETUP FUNCTIONS
// ============================================

async function setup() {
  console.log('\n📋 Setup: Fetching coach data...\n');

  const users = await apiRequest('GET', '/api/admin/users');

  const matt = users.coaches.find(c => c.email === 'matt@leadinsideout.io');
  const jason = users.coaches.find(c => c.email === 'jason@leadinsideout.io');

  if (!matt || !jason) {
    throw new Error('Could not find Matt or Jason in database');
  }

  MATT_COACH_ID = matt.id;
  JASON_COACH_ID = jason.id;

  console.log(`✅ Matt Thieleman: ${MATT_COACH_ID}`);
  console.log(`✅ Jason Pliml: ${JASON_COACH_ID}\n`);
}

// ============================================
// FILE EXTRACTION FUNCTIONS
// ============================================

async function extractFromWord(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function extractFromPDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function getImagePlaceholder(filename) {
  // For images, create a text placeholder describing what should be manually transcribed
  return `[IMAGE FILE: ${filename}]

This is an image file that requires manual transcription or OCR processing.
The assessment results should be manually extracted and added to the coach's metadata.

Original file: ${filename}`;
}

// ============================================
// UPLOAD FUNCTION
// ============================================

async function uploadDocument(data) {
  const response = await apiRequest('POST', '/api/data/upload', {
    content: data.content,
    data_type: 'coach_assessment',
    metadata: {
      coach_id: data.coach_id,
      title: data.title,
      source: 'coach_profile_import',
      original_filename: data.filename,
      document_type: data.documentType,
      assessment_type: data.assessmentType || null
    }
  });

  return response;
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📄 IMPORT COACH PROFILES & ASSESSMENTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  await setup();

  const results = [];

  // ============================================
  // MATT'S PROFILE DOCUMENTS
  // ============================================
  console.log('\n🎯 Processing Matt Thieleman Profile Documents');
  console.log('─────────────────────────────────────────────────\n');

  const mattDocs = [
    {
      path: '/Users/jjvega/Downloads/Matt Thieleman/Coach Profile/Coaching Evaluation & Development Framework for Matt Thieleman.docx',
      title: 'Coaching Evaluation & Development Framework',
      documentType: 'framework',
      assessmentType: 'custom'
    },
    {
      path: '/Users/jjvega/Downloads/Matt Thieleman/Coach Profile/Marketing & Content Voice Overview for Matt Thieleman.docx',
      title: 'Marketing & Content Voice Overview',
      documentType: 'marketing_profile',
      assessmentType: 'custom'
    },
    {
      path: '/Users/jjvega/Downloads/Matt Thieleman/Coach Profile/Personal Coaching Style Profile - Matt Thieleman.docx',
      title: 'Personal Coaching Style Profile',
      documentType: 'style_profile',
      assessmentType: 'custom'
    }
  ];

  for (const doc of mattDocs) {
    const filename = path.basename(doc.path);
    console.log(`📄 ${filename}`);

    try {
      const content = await extractFromWord(doc.path);
      const wordCount = content.split(/\s+/).length;

      console.log(`   📝 Words: ${wordCount.toLocaleString()}`);

      const uploadResult = await uploadDocument({
        content,
        coach_id: MATT_COACH_ID,
        title: doc.title,
        filename,
        documentType: doc.documentType,
        assessmentType: doc.assessmentType
      });

      console.log(`   🆔 Data Item: ${uploadResult.data_item_id}`);
      console.log(`   ✅ Uploaded successfully\n`);

      results.push({ coach: 'Matt', filename, status: 'success', id: uploadResult.data_item_id });

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({ coach: 'Matt', filename, status: 'error', error: error.message });
    }
  }

  // ============================================
  // JASON'S ASSESSMENTS
  // ============================================
  console.log('\n🎯 Processing Jason Pliml Assessments');
  console.log('─────────────────────────────────────\n');

  const jasonDocs = [
    {
      path: '/Users/jjvega/Downloads/Jason Pliml/Psych Analysis-Tests/My Personality Test Result _ Personality Path.pdf',
      title: 'Personality Path Assessment Results',
      documentType: 'personality_test',
      assessmentType: 'custom'
    },
    {
      path: '/Users/jjvega/Downloads/Jason Pliml/Psych Analysis-Tests/Personality MBTI ENFP September 2018.png',
      title: 'MBTI Assessment - ENFP',
      documentType: 'mbti_assessment',
      assessmentType: 'mbti',
      isImage: true
    },
    {
      path: '/Users/jjvega/Downloads/Jason Pliml/Psych Analysis-Tests/Enneagram March 2023.png',
      title: 'Enneagram Assessment',
      documentType: 'enneagram_assessment',
      assessmentType: 'enneagram',
      isImage: true
    }
  ];

  for (const doc of jasonDocs) {
    const filename = path.basename(doc.path);
    console.log(`📄 ${filename}`);

    try {
      let content;

      if (doc.isImage) {
        content = getImagePlaceholder(filename);
        console.log(`   ℹ️  Image file - placeholder created`);
      } else if (doc.path.endsWith('.pdf')) {
        content = await extractFromPDF(doc.path);
        const wordCount = content.split(/\s+/).length;
        console.log(`   📝 Words: ${wordCount.toLocaleString()}`);
      }

      const uploadResult = await uploadDocument({
        content,
        coach_id: JASON_COACH_ID,
        title: doc.title,
        filename,
        documentType: doc.documentType,
        assessmentType: doc.assessmentType
      });

      console.log(`   🆔 Data Item: ${uploadResult.data_item_id}`);
      console.log(`   ✅ Uploaded successfully\n`);

      results.push({ coach: 'Jason', filename, status: 'success', id: uploadResult.data_item_id });

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({ coach: 'Jason', filename, status: 'error', error: error.message });
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  const mattSuccess = results.filter(r => r.coach === 'Matt' && r.status === 'success').length;
  const jasonSuccess = results.filter(r => r.coach === 'Jason' && r.status === 'success').length;
  const totalErrors = results.filter(r => r.status === 'error').length;

  console.log(`Matt Thieleman: ${mattSuccess}/3 documents uploaded`);
  console.log(`Jason Pliml: ${jasonSuccess}/3 assessments uploaded`);
  console.log(`\nTotal: ${mattSuccess + jasonSuccess}/6 files processed`);

  if (totalErrors > 0) {
    console.log(`\n⚠️  ${totalErrors} errors encountered`);
  } else {
    console.log('\n✅ ALL FILES IMPORTED SUCCESSFULLY');
  }

  console.log('');
}

main().catch(error => {
  console.error('\n❌ FATAL ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});
