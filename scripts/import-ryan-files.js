#!/usr/bin/env node
/**
 * Bulk Import Script for Ryan's CLG Documents and Assessments
 *
 * Usage:
 *   node scripts/import-ryan-files.js --clg          Import CLG coaching models
 *   node scripts/import-ryan-files.js --assessments  Import Ryan's assessments
 *   node scripts/import-ryan-files.js --retreat      Import retreat template
 *   node scripts/import-ryan-files.js --all          Import everything
 *   node scripts/import-ryan-files.js --dry-run      Preview without uploading
 */

import { readFile, readdir } from 'fs/promises';
import { resolve, join, extname, basename } from 'path';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config();

const API_URL = process.env.API_URL || 'https://unified-data-layer.vercel.app';
const API_KEY = process.env.RYAN_API_KEY; // Ryan's API key for authenticated uploads
const RYAN_COACH_ID = '9185bd98-a828-414f-b335-c607b4ac3d11';

// Base path for Ryan's new files
const BASE_PATH = '/Users/jjvega/Downloads/new-ryan-files-dec19';

// CLG Document metadata mapping
const CLG_METADATA = {
  source: 'Conscious Leadership Group',
  authors: ['Jim Dethmer', 'Diana Chapman'],
  framework: 'conscious_leadership',
  url: 'https://conscious.is'
};

// Topic mappings for CLG documents
const CLG_TOPICS = {
  'Responsibility Process': ['responsibility', 'accountability', 'ownership'],
  '3-As-Compassion': ['compassion', 'emotional-intelligence', 'empathy'],
  'Appreciations': ['appreciation', 'gratitude', 'culture'],
  '4 Ways of Leading': ['leadership', 'self-awareness', 'leadership-styles'],
  'Allies': ['relationships', 'support', 'alliances'],
  'Being the Resolution': ['conflict', 'resolution', 'harmony'],
  'Best Stuff Exercise': ['strengths', 'self-discovery', 'values'],
  'Checkins': ['meetings', 'presence', 'check-ins'],
  'Clearing Model': ['conflict', 'communication', 'clearing'],
  'Conscious Listening': ['communication', 'listening', 'presence'],
  'Conscious Meeting': ['meetings', 'facilitation', 'agenda'],
  'Creator-Coach-Challenger': ['coaching', 'empowerment', 'drama-triangle'],
  'Compulsions': ['habits', 'self-control', 'awareness'],
  'Energy Audit': ['energy', 'self-care', 'wellbeing'],
  'Decision-Rights': ['decisions', 'accountability', 'authority'],
  'Purpose': ['purpose', 'vision', 'meaning'],
  'Drift': ['focus', 'accountability', 'awareness'],
  'Projections': ['shadow-work', 'self-awareness', 'projection'],
  'Emotional Intelligence': ['emotional-intelligence', 'feelings', 'body-awareness'],
  'Emotional Range': ['emotions', 'expression', 'range'],
  'Drama': ['drama', 'conflict', 'drama-triangle'],
  'Fact Vs. Story': ['thinking', 'stories', 'cognitive'],
  'Genius': ['genius', 'strengths', 'zone-of-genius'],
  'Wellbeing': ['wellness', 'alignment', 'health'],
  'Feedback': ['feedback', 'communication', 'growth'],
  'Threat': ['stress', 'reactions', 'triggers'],
  'Agreements': ['agreements', 'integrity', 'commitments'],
  'The Work': ['inquiry', 'beliefs', 'byron-katie'],
  'Locating Yourself': ['presence', 'awareness', 'self-location'],
  'Commitments': ['commitments', 'leadership', '15-commitments'],
  'Unconscious': ['unconscious', 'awareness', 'hidden-motivations'],
  'Persona': ['identity', 'shadow-work', 'persona'],
  'Play': ['play', 'creativity', 'joy'],
  'No Diet': ['boundaries', 'no', 'assertiveness'],
  'Weaponization': ['conflict', 'safety', 'de-escalation'],
  'Security, Control and Approval': ['attachment', 'letting-go', 'drivers'],
  'Scarcity': ['abundance', 'scarcity', 'mindset'],
  'Unarguably': ['communication', 'truth', 'authenticity'],
  'Teach the Class': ['learning', 'teaching', 'growth'],
  'Change Formula': ['change', 'transformation', 'dynamics'],
  'Integrity': ['integrity', 'values', 'pillars'],
  'Triangle': ['drama', 'empowerment', 'patterns'],
  'Control': ['control', 'influence', 'circles'],
  'Whole Body Yes': ['decisions', 'intuition', 'alignment'],
  'Willingness': ['questions', 'willingness', 'coaching'],
  'Win-For-All': ['negotiation', 'collaboration', 'outcomes']
};

// Assessment type mappings with providers
const ASSESSMENT_TYPES = {
  'ENTP': { type: 'mbti', name: 'MBTI', provider: 'Myers-Briggs Foundation', key_results: { type: 'ENTP' } },
  'Strengthsfinder': { type: 'cliftonstrengths', name: 'CliftonStrengths 34', provider: 'Gallup' },
  'Working Genius': { type: 'working_genius', name: 'Working Genius', provider: 'The Table Group' },
  'Via Total24': { type: 'via_strengths', name: 'VIA Character Strengths', provider: 'VIA Institute' },
  'Interoceptive': { type: 'interoception', name: 'Interoceptive Assessment', provider: null },
  'Human Design': { type: 'human_design', name: 'Human Design', provider: 'Human Design System' }
};

/**
 * Extract topics from CLG filename
 */
function extractTopics(filename) {
  for (const [key, topics] of Object.entries(CLG_TOPICS)) {
    if (filename.toLowerCase().includes(key.toLowerCase())) {
      return topics;
    }
  }
  return ['coaching', 'conscious-leadership'];
}

/**
 * Clean and format title from filename
 */
function formatTitle(filename, prefix = '') {
  let title = basename(filename, extname(filename));

  // Remove CLG- prefix for cleaner titles
  title = title.replace(/^CLG[-_]?/, '');

  // Replace underscores and hyphens with spaces
  title = title.replace(/[-_]/g, ' ');

  // Clean up extra spaces
  title = title.replace(/\s+/g, ' ').trim();

  if (prefix) {
    return `${prefix} - ${title}`;
  }
  return title;
}

/**
 * Parse PDF file and return text content
 */
async function parsePdf(filePath) {
  const buffer = await readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Upload a single document to the API
 */
async function uploadDocument(doc, dryRun = false) {
  if (dryRun) {
    console.log(`  [DRY RUN] Would upload: ${doc.title}`);
    console.log(`    Type: ${doc.data_type}`);
    console.log(`    Content length: ${doc.content.length} chars`);
    return { success: true, dry_run: true };
  }

  try {
    // Build headers - include API key if available
    const headers = {
      'Content-Type': 'application/json'
    };
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    // Merge coach_id into metadata (required by processors)
    const metadata = {
      ...doc.metadata,
      coach_id: RYAN_COACH_ID,
      title: doc.title
    };

    const response = await fetch(`${API_URL}/api/data/upload`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data_type: doc.data_type,
        content: doc.content,
        metadata: metadata
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || response.statusText };
    }

    const result = await response.json();
    return { success: true, data_item_id: result.data_item_id, chunks: result.chunks_created };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetch already imported model names to avoid duplicates
 */
async function getExistingModelNames() {
  try {
    const response = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'CLG conscious leadership',
        types: ['coaching_model'],
        threshold: 0.1,
        limit: 100
      })
    });

    if (!response.ok) return new Set();

    const data = await response.json();
    const names = new Set();
    (data.results || []).forEach(r => {
      if (r.metadata?.model_name) {
        names.add(r.metadata.model_name);
      }
    });
    return names;
  } catch (e) {
    console.log('  ⚠️  Could not check for existing models');
    return new Set();
  }
}

/**
 * Import CLG Coaching Models (56 PDFs)
 */
async function importCLGDocs(dryRun = false) {
  console.log('\n📚 Importing CLG Coaching Models...\n');

  const clgPath = join(BASE_PATH, 'CLG Docs');
  const files = await readdir(clgPath);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));

  console.log(`Found ${pdfFiles.length} PDF files`);

  // Check for already imported models
  console.log('Checking for already imported models...\n');
  const existingModels = dryRun ? new Set() : await getExistingModelNames();
  if (existingModels.size > 0) {
    console.log(`Found ${existingModels.size} already imported CLG models\n`);
  }

  let successful = 0;
  let failed = 0;
  let skipped = 0;
  const results = [];

  for (const file of pdfFiles) {
    const filePath = join(clgPath, file);
    const title = formatTitle(file, 'CLG');
    const topics = extractTopics(file);

    // Skip if already imported
    if (existingModels.has(title)) {
      console.log(`Skipping (already imported): ${title}`);
      skipped++;
      results.push({ file, success: true, skipped: true });
      continue;
    }

    console.log(`Processing: ${file}`);

    try {
      const content = await parsePdf(filePath);

      if (!content || content.trim().length < 100) {
        console.log(`  ⚠️  Skipped (empty or too short)\n`);
        failed++;
        results.push({ file, success: false, error: 'Empty or too short' });
        continue;
      }

      const doc = {
        data_type: 'coaching_model',
        title: title,
        content: content,
        metadata: {
          ...CLG_METADATA,
          model_name: title, // Required by processor
          model_type: 'framework',
          topics: topics,
          tags: topics,
          original_filename: file
        }
      };

      const result = await uploadDocument(doc, dryRun);

      if (result.success) {
        successful++;
        console.log(`  ✅ ${dryRun ? 'Would upload' : 'Uploaded'}: ${title}`);
        if (result.chunks) {
          console.log(`     Chunks: ${result.chunks}\n`);
        }
      } else {
        failed++;
        console.log(`  ❌ Failed: ${result.error}\n`);
      }

      results.push({ file, ...result });

      // Rate limiting - wait 500ms between uploads
      if (!dryRun) {
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      failed++;
      console.log(`  ❌ Error: ${error.message}\n`);
      results.push({ file, success: false, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`CLG Import Complete: ${successful} new, ${skipped} skipped, ${failed} failed`);
  console.log('='.repeat(50) + '\n');

  return results;
}

/**
 * Import Ryan's Assessments (8 files)
 */
async function importAssessments(dryRun = false) {
  console.log('\n📊 Importing Ryan\'s Assessments...\n');

  const assessmentPath = join(BASE_PATH, 'Ryan_s assessments');
  const files = await readdir(assessmentPath);

  console.log(`Found ${files.length} assessment files\n`);

  let successful = 0;
  let failed = 0;
  const results = [];

  for (const file of files) {
    const filePath = join(assessmentPath, file);
    const ext = extname(file).toLowerCase();

    // Determine assessment type
    let assessmentType = null;
    for (const [key, value] of Object.entries(ASSESSMENT_TYPES)) {
      if (file.includes(key)) {
        assessmentType = value;
        break;
      }
    }

    if (!assessmentType) {
      assessmentType = { type: 'other', name: 'Assessment' };
    }

    console.log(`Processing: ${file}`);

    try {
      let content;

      if (ext === '.pdf') {
        content = await parsePdf(filePath);
      } else if (ext === '.md' || ext === '.txt') {
        content = await readFile(filePath, 'utf-8');
      } else if (ext === '.docx') {
        // For docx, we'll need to handle differently or skip
        console.log(`  ⚠️  Skipped (DOCX not supported yet)\n`);
        failed++;
        results.push({ file, success: false, error: 'DOCX not supported' });
        continue;
      } else {
        console.log(`  ⚠️  Skipped (unsupported format: ${ext})\n`);
        failed++;
        results.push({ file, success: false, error: `Unsupported format: ${ext}` });
        continue;
      }

      if (!content || content.trim().length < 50) {
        console.log(`  ⚠️  Skipped (empty or too short)\n`);
        failed++;
        results.push({ file, success: false, error: 'Empty or too short' });
        continue;
      }

      const title = `Ryan Vaughn - ${assessmentType.name}`;

      // Use the new coach_assessment type for coach's personal assessments
      const doc = {
        data_type: 'coach_assessment',
        title: title,
        content: content,
        metadata: {
          title: title,
          assessment_type: assessmentType.type,
          assessment_provider: assessmentType.provider || null,
          tags: ['coach-assessment', 'personality', assessmentType.type],
          original_filename: file,
          ...(assessmentType.key_results && { key_results: assessmentType.key_results })
        }
      };

      const result = await uploadDocument(doc, dryRun);

      if (result.success) {
        successful++;
        console.log(`  ✅ ${dryRun ? 'Would upload' : 'Uploaded'}: ${title}`);
        if (result.chunks) {
          console.log(`     Chunks: ${result.chunks}\n`);
        }
      } else {
        failed++;
        console.log(`  ❌ Failed: ${result.error}\n`);
      }

      results.push({ file, ...result });

      // Rate limiting
      if (!dryRun) {
        await new Promise(r => setTimeout(r, 500));
      }

    } catch (error) {
      failed++;
      console.log(`  ❌ Error: ${error.message}\n`);
      results.push({ file, success: false, error: error.message });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Assessment Import Complete: ${successful} successful, ${failed} failed`);
  console.log('='.repeat(50) + '\n');

  return results;
}

/**
 * Import Retreat Template (1 PDF)
 */
async function importRetreat(dryRun = false) {
  console.log('\n🏔️  Importing Retreat Template...\n');

  const filePath = join(BASE_PATH, '1_1 Retreat Agendas.pdf');

  try {
    const content = await parsePdf(filePath);

    const doc = {
      data_type: 'coaching_model',
      title: 'Vision Weekend Workshop - 1:1 Retreat Agenda',
      content: content,
      metadata: {
        model_name: 'Vision Weekend Workshop', // Required by processor
        model_type: 'framework',
        template_type: 'retreat_agenda',
        duration: '2 days (6 hours)',
        topics: ['vision', 'goals', 'planning', 'life-design'],
        tags: ['vision', 'goals', 'planning', 'life-design', 'retreat'],
        source: 'Ryan Vaughn',
        author: 'Ryan Vaughn',
        original_filename: '1_1 Retreat Agendas.pdf'
      }
    };

    const result = await uploadDocument(doc, dryRun);

    if (result.success) {
      console.log(`✅ ${dryRun ? 'Would upload' : 'Uploaded'}: ${doc.title}`);
      if (result.chunks) {
        console.log(`   Chunks: ${result.chunks}`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }

    return [{ file: '1_1 Retreat Agendas.pdf', ...result }];

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return [{ file: '1_1 Retreat Agendas.pdf', success: false, error: error.message }];
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Ryan Files Import Script - Unified Data Layer             ║
╚═══════════════════════════════════════════════════════════════╝

Usage:
  node scripts/import-ryan-files.js [options]

Options:
  --clg           Import CLG coaching models (56 PDFs)
  --assessments   Import Ryan's personal assessments (8 files)
  --retreat       Import retreat template (1 PDF)
  --all           Import all files
  --dry-run       Preview without uploading

Environment:
  API_URL: ${API_URL}
  API_KEY: ${API_KEY ? '✓ Set' : '○ Not set (optional)'}
  COACH_ID: ${RYAN_COACH_ID}

Examples:
  node scripts/import-ryan-files.js --dry-run --all
  node scripts/import-ryan-files.js --clg
  node scripts/import-ryan-files.js --assessments --dry-run
    `);
    process.exit(0);
  }

  if (!API_KEY) {
    console.log('ℹ️  Note: RYAN_API_KEY not set - uploads will use public endpoint');
  }

  const dryRun = args.includes('--dry-run');
  const importAll = args.includes('--all');

  console.log('\n' + '═'.repeat(60));
  console.log('  📦 Ryan Files Import Script');
  console.log('═'.repeat(60));
  console.log(`  API: ${API_URL}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no uploads)' : 'LIVE UPLOAD'}`);
  console.log('═'.repeat(60));

  const allResults = {
    clg: [],
    assessments: [],
    retreat: []
  };

  if (importAll || args.includes('--clg')) {
    allResults.clg = await importCLGDocs(dryRun);
  }

  if (importAll || args.includes('--retreat')) {
    allResults.retreat = await importRetreat(dryRun);
  }

  if (importAll || args.includes('--assessments')) {
    allResults.assessments = await importAssessments(dryRun);
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('  📊 FINAL SUMMARY');
  console.log('═'.repeat(60));

  const total = allResults.clg.length + allResults.assessments.length + allResults.retreat.length;
  const successful = [...allResults.clg, ...allResults.assessments, ...allResults.retreat]
    .filter(r => r.success).length;
  const failed = total - successful;

  console.log(`  Total files processed: ${total}`);
  console.log(`  ✅ Successful: ${successful}`);
  console.log(`  ❌ Failed: ${failed}`);

  if (dryRun) {
    console.log('\n  ⚠️  DRY RUN - No files were actually uploaded');
    console.log('  Run without --dry-run to upload files');
  }

  console.log('═'.repeat(60) + '\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
