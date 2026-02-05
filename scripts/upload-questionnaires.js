#!/usr/bin/env node
/**
 * Questionnaire Upload Script
 *
 * Uploads coaching intake questionnaires from XLSX/CSV files to the database.
 * Automatically matches clients by name and creates placeholder clients for unknowns.
 *
 * Usage:
 *   node scripts/upload-questionnaires.js [input-folder] --coach-id <UUID> [--dry-run]
 *
 * Options:
 *   --coach-id UUID   Coach ID who owns these questionnaires (required)
 *   --dry-run         Preview uploads without making changes
 *   --limit N         Only upload first N files (for testing)
 *   --skip-existing   Skip files that already have a questionnaire uploaded
 *
 * Defaults:
 *   input: /Users/jjvega/Downloads/Ryan Vaughn Coaching Intake Questionnaires
 *
 * Requirements:
 *   - SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 *   - OPENAI_API_KEY in .env
 *   - questionnaire data type added to database (migration 019)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import XLSX from 'xlsx';
import { QuestionnaireProcessor } from '../api/processors/questionnaire-processor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_INPUT = '/Users/jjvega/Downloads/Ryan Vaughn Coaching Intake Questionnaires';
const BATCH_TAG = 'questionnaires-2026-02';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Format embedding for PostgreSQL vector type
 */
function formatEmbeddingForDB(embedding) {
  const formatted = embedding.map((val) => {
    const str = val.toPrecision(10);
    return parseFloat(str);
  });
  return '[' + formatted.join(',') + ']';
}

/**
 * Extract client name from filename
 * Examples:
 *   "Amar Kumar - Coaching Intake Questionnaire with notes.xlsx" → "Amar Kumar"
 *   "Coaching Intake Questionnaire -- Chris Fredericks with notes.xlsx" → "Chris Fredericks"
 *   "George Pallis -- Coaching Intake Questionnaire 121222.xlsx" → "George Pallis"
 *   "Nick Neuman -- Coaching Intake Questionnaire with notes.xlsx" → "Nick Neuman"
 *   "Pete Martin Coaching Intake Questionnaire -- with notes.xlsx" → "Pete Martin"
 *   "Fred - Coaching Intake Questionnaire -- with notes.xlsx" → "Fred"
 *   "Coaching Intake Questionnaire -- Sept 2020 33.csv" → null (anonymous)
 */
function extractClientNameFromFilename(filename) {
  // Remove extension
  const base = path.basename(filename, path.extname(filename));

  // Pattern 1: "Name - Coaching Intake..." or "Name - Intake..."
  const pattern1 = /^([A-Za-z\s]+)\s*-\s*(?:Coaching\s*)?Intake/i;
  let match = base.match(pattern1);
  if (match) {
    return match[1].trim();
  }

  // Pattern 2: "Name -- Coaching Intake..." (double dash before Coaching)
  const pattern2 = /^([A-Za-z\s]+)\s*--\s*Coaching\s*Intake/i;
  match = base.match(pattern2);
  if (match) {
    return match[1].trim();
  }

  // Pattern 3: "Name Coaching Intake Questionnaire..."  (no separator)
  const pattern3 = /^([A-Za-z]+\s+[A-Za-z]+)\s+Coaching\s+Intake/i;
  match = base.match(pattern3);
  if (match) {
    return match[1].trim();
  }

  // Pattern 4: "Coaching Intake Questionnaire -- Name..." or "...Questionnaire -- Name..."
  const pattern4 = /Questionnaire\s*--?\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(?:with|w\s|$|\d)/i;
  match = base.match(pattern4);
  if (match) {
    const name = match[1].trim();
    // Filter out date-like patterns (Sept 2020, etc.) and "with"
    if (!/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|with)/i.test(name)) {
      // Clean up trailing "w" from "w notes"
      return name.replace(/\s+w$/i, '').trim();
    }
  }

  // Pattern 5: "Coaching Intake Questionnaire - Name..."
  const pattern5 = /Questionnaire\s*-\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i;
  match = base.match(pattern5);
  if (match) {
    const name = match[1].trim();
    if (!/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec|Coaching)/i.test(name)) {
      return name;
    }
  }

  // Pattern 6: "Name Intake Questionnaire..." (but not "Coaching Intake")
  const pattern6 = /^([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+Intake\s+Questionnaire/i;
  match = base.match(pattern6);
  if (match) {
    const name = match[1].trim();
    // Filter out "Coaching" which appears in "Coaching Intake Questionnaire"
    if (!/^Coaching$/i.test(name)) {
      return name;
    }
  }

  return null; // Anonymous
}

/**
 * Parse XLSX file into Q&A text format
 */
function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  return convertToQuestionnaireText(data, filePath);
}

/**
 * Parse CSV file into Q&A text format
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Parse CSV (handle quoted values with commas)
  const data = lines.map((line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  });

  return convertToQuestionnaireText(data, filePath);
}

/**
 * Convert spreadsheet data to readable Q&A text
 */
function convertToQuestionnaireText(data, filePath) {
  const result = {
    content: '',
    metadata: {
      respondent_name: null,
      respondent_email: null,
      completion_date: null,
      question_count: 0
    }
  };

  if (!data || data.length < 2) {
    return result;
  }

  // First row is usually headers (questions)
  // Second row is usually answers
  const headers = data[0];
  const answers = data[1] || [];

  const qaPairs = [];

  for (let i = 0; i < headers.length; i++) {
    const question = String(headers[i] || '').trim();
    const answer = String(answers[i] || '').trim();

    if (!question || question.length < 3) continue;

    // Extract metadata from common fields
    const qLower = question.toLowerCase();
    if (qLower.includes('timestamp') || qLower.includes('date')) {
      if (answer && !result.metadata.completion_date) {
        // Try to parse date
        const parsed = new Date(answer);
        if (!isNaN(parsed.getTime())) {
          result.metadata.completion_date = parsed.toISOString();
        }
      }
      continue; // Don't include timestamp in Q&A
    }

    if (qLower.includes('email') || qLower.includes('e-mail')) {
      result.metadata.respondent_email = answer;
      continue;
    }

    if (
      (qLower.includes('name') && !qLower.includes('company')) ||
      qLower.includes('your name')
    ) {
      result.metadata.respondent_name = answer;
      continue;
    }

    // Include in Q&A text
    if (answer && answer.length > 0) {
      qaPairs.push(`Question: ${question}\nAnswer: ${answer}`);
    }
  }

  result.metadata.question_count = qaPairs.length;
  result.content =
    `Coaching Intake Questionnaire\n` +
    `Source: ${path.basename(filePath)}\n\n` +
    qaPairs.join('\n\n');

  return result;
}

/**
 * Find client by name in database
 */
async function findClientByName(name, coachId) {
  if (!name) return null;

  // Normalize name for comparison
  const normalizedName = name.toLowerCase().trim();

  // Get coach's clients
  const { data: coachClients, error } = await supabase
    .from('coach_clients')
    .select('client:clients(id, name, email)')
    .eq('coach_id', coachId);

  if (error || !coachClients) {
    console.error('Error fetching clients:', error);
    return null;
  }

  // Try exact match first
  for (const cc of coachClients) {
    if (cc.client && cc.client.name.toLowerCase().trim() === normalizedName) {
      return cc.client;
    }
  }

  // Try fuzzy match (first name + last name in either order)
  const nameParts = normalizedName.split(/\s+/);
  if (nameParts.length >= 2) {
    for (const cc of coachClients) {
      if (!cc.client) continue;
      const clientNameLower = cc.client.name.toLowerCase();

      // Check if all name parts exist in client name
      const allPartsMatch = nameParts.every((part) =>
        clientNameLower.includes(part)
      );
      if (allPartsMatch) {
        return cc.client;
      }
    }
  }

  return null;
}

/**
 * Create a placeholder client for anonymous questionnaires
 */
// Placeholder organization for unknown clients
const PLACEHOLDER_ORG_ID = '6c799e2f-ebf0-4364-8a74-11069895ca90';

async function createPlaceholderClient(placeholderName, coachId) {
  // Create client with coach as primary_coach_id and placeholder org
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: placeholderName,
      email: `${placeholderName.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`,
      primary_coach_id: coachId,
      client_organization_id: PLACEHOLDER_ORG_ID
    })
    .select('id, name, email')
    .single();

  if (clientError) {
    throw new Error(`Failed to create placeholder client: ${clientError.message}`);
  }

  // Link to coach via coach_clients table
  const { error: linkError } = await supabase.from('coach_clients').insert({
    coach_id: coachId,
    client_id: client.id
  });

  if (linkError) {
    throw new Error(`Failed to link client to coach: ${linkError.message}`);
  }

  return client;
}

/**
 * Check if questionnaire already exists
 */
async function checkExists(clientId, coachId, sourceFile) {
  const { data, error } = await supabase
    .from('data_items')
    .select('id')
    .eq('data_type', 'questionnaire')
    .eq('coach_id', coachId)
    .eq('client_id', clientId)
    .eq('metadata->>source_file', sourceFile)
    .limit(1);

  if (error) {
    console.error('Error checking existence:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * Upload a single questionnaire
 */
async function uploadQuestionnaire(
  parsedData,
  clientId,
  coachId,
  sourceFile,
  processor,
  dryRun = false
) {
  const metadata = {
    coach_id: coachId,
    client_id: clientId,
    questionnaire_type: 'coaching_intake',
    completion_date: parsedData.metadata.completion_date,
    respondent_name: parsedData.metadata.respondent_name,
    respondent_email: parsedData.metadata.respondent_email,
    source_file: sourceFile,
    extracted_from: sourceFile.endsWith('.csv') ? 'csv' : 'xlsx',
    batch_tag: BATCH_TAG
    // PII scrubbing enabled by default (no skipPIIScrubbing flag)
  };

  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      source_file: sourceFile,
      word_count: parsedData.content.split(/\s+/).length
    };
  }

  try {
    // Process the questionnaire (validate, chunk, embed)
    const result = await processor.process(parsedData.content, metadata);

    // Insert data_item
    const { data: dataItem, error: itemError } = await supabase
      .from('data_items')
      .insert({
        data_type: result.dataItem.data_type,
        coach_id: result.dataItem.coach_id,
        client_id: result.dataItem.client_id,
        client_organization_id: result.dataItem.client_organization_id,
        visibility_level: result.dataItem.visibility_level,
        allowed_roles: result.dataItem.allowed_roles,
        raw_content: result.dataItem.raw_content,
        metadata: result.dataItem.metadata,
        session_date: result.dataItem.session_date,
        created_at: result.dataItem.created_at,
        updated_at: result.dataItem.updated_at,
        created_by: result.dataItem.created_by
      })
      .select('id')
      .single();

    if (itemError) {
      throw new Error(`Failed to insert data_item: ${itemError.message}`);
    }

    // Insert chunks
    const chunkInserts = result.chunks.map((chunk, index) => ({
      data_item_id: dataItem.id,
      chunk_index: index,
      content: chunk.content,
      embedding: formatEmbeddingForDB(chunk.embedding),
      metadata: {
        questionnaire_type: 'coaching_intake',
        source_file: sourceFile,
        chunk_number: index + 1,
        total_chunks: result.chunks.length
      }
    }));

    const { error: chunksError } = await supabase
      .from('data_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      // Rollback: delete the data_item
      await supabase.from('data_items').delete().eq('id', dataItem.id);
      throw new Error(`Failed to insert chunks: ${chunksError.message}`);
    }

    return {
      success: true,
      data_item_id: dataItem.id,
      chunks_created: result.chunks.length,
      source_file: sourceFile
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      source_file: sourceFile
    };
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipExisting = args.includes('--skip-existing');

  // Parse coach-id
  const coachIdIndex = args.indexOf('--coach-id');
  const coachId = coachIdIndex !== -1 ? args[coachIdIndex + 1] : null;

  // Parse limit
  const limitIndex = args.indexOf('--limit');
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : null;

  // Get input folder
  const inputFolder =
    args.find((a) => !a.startsWith('--') && fs.existsSync(a) && fs.statSync(a).isDirectory()) ||
    DEFAULT_INPUT;

  console.log('Questionnaire Upload Script');
  console.log('===========================');
  console.log(`Input:       ${inputFolder}`);
  console.log(`Coach ID:    ${coachId || 'NOT PROVIDED'}`);
  console.log(`Batch:       ${BATCH_TAG}`);
  console.log(`Dry run:     ${dryRun ? 'YES' : 'NO'}`);
  console.log(`Skip exist:  ${skipExisting ? 'YES' : 'NO'}`);
  if (limit) console.log(`Limit:       ${limit} files`);
  console.log('');

  if (!coachId) {
    console.error('Error: --coach-id is required');
    console.error('Usage: node scripts/upload-questionnaires.js --coach-id <UUID> [--dry-run]');
    process.exit(1);
  }

  // Verify coach exists
  const { data: coach, error: coachError } = await supabase
    .from('coaches')
    .select('id, name')
    .eq('id', coachId)
    .single();

  if (coachError || !coach) {
    console.error(`Error: Coach not found with ID: ${coachId}`);
    process.exit(1);
  }

  console.log(`Coach:       ${coach.name}`);
  console.log('');

  // Find questionnaire files
  if (!fs.existsSync(inputFolder)) {
    console.error(`Error: Input folder not found: ${inputFolder}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(inputFolder)
    .filter((f) => f.endsWith('.xlsx') || f.endsWith('.csv'))
    .map((f) => path.join(inputFolder, f));

  const filesToProcess = limit ? files.slice(0, limit) : files;

  console.log(`Total files found: ${files.length}`);
  console.log(`Files to process: ${filesToProcess.length}`);
  console.log('');

  // Initialize processor
  const processor = new QuestionnaireProcessor(openai);

  // Process files
  const results = {
    success: [],
    failed: [],
    skipped: [],
    clientsCreated: []
  };

  let totalChunks = 0;
  const anonymousCounter = {};

  for (let i = 0; i < filesToProcess.length; i++) {
    const filePath = filesToProcess[i];
    const fileName = path.basename(filePath);
    const progress = `[${i + 1}/${filesToProcess.length}]`;

    process.stdout.write(`${progress} ${fileName.substring(0, 50)}... `);

    try {
      // Parse file
      const parsedData = filePath.endsWith('.csv')
        ? parseCSV(filePath)
        : parseXLSX(filePath);

      if (!parsedData.content || parsedData.content.length < 100) {
        results.skipped.push({ file: fileName, reason: 'Empty or too short' });
        console.log('SKIPPED (empty)');
        continue;
      }

      // Extract client name from filename
      let clientName = extractClientNameFromFilename(fileName);

      // Try to find existing client
      let client = await findClientByName(clientName, coachId);

      // If no match, create placeholder
      if (!client) {
        if (!clientName) {
          // Anonymous file - extract identifier from filename
          // For "Sept 2020 33.csv" or "Sept 2020 49 (1).xlsx" → want "33" or "49", not "(1)"
          const allNumbers = fileName.match(/\d+/g);
          let identifier = String(i + 1);
          if (allNumbers && allNumbers.length > 0) {
            // Filter out years (2020, 2021, etc.) and version numbers in parentheses like (1)
            // Look for 2-digit numbers that aren't years
            const twoDigitNums = allNumbers.filter(n => n.length === 2 && parseInt(n) < 60);
            if (twoDigitNums.length > 0) {
              identifier = twoDigitNums[twoDigitNums.length - 1];
            } else {
              identifier = allNumbers[allNumbers.length - 1];
            }
          }
          clientName = `Unknown Client ${identifier}`;
        }

        if (!dryRun) {
          client = await createPlaceholderClient(clientName, coachId);
          results.clientsCreated.push(clientName);
          process.stdout.write(`(created "${clientName}") `);
        } else {
          client = { id: 'placeholder-' + i, name: clientName };
          process.stdout.write(`(would create "${clientName}") `);
        }
      } else {
        process.stdout.write(`(${client.name}) `);
      }

      // Check if exists
      if (skipExisting && !dryRun) {
        const exists = await checkExists(client.id, coachId, fileName);
        if (exists) {
          results.skipped.push({ file: fileName, reason: 'Already exists' });
          console.log('SKIPPED (exists)');
          continue;
        }
      }

      // Upload
      const result = await uploadQuestionnaire(
        parsedData,
        client.id,
        coachId,
        fileName,
        processor,
        dryRun
      );

      if (result.success) {
        results.success.push(result);
        totalChunks += result.chunks_created || 0;
        console.log(dryRun ? '(dry run)' : `OK (${result.chunks_created} chunks)`);
      } else {
        results.failed.push(result);
        console.log(`FAILED: ${result.error}`);
      }
    } catch (error) {
      results.failed.push({ source_file: fileName, error: error.message });
      console.log(`ERROR: ${error.message}`);
    }

    // Small delay to avoid rate limiting
    if (!dryRun && i < filesToProcess.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  // Summary
  console.log('');
  console.log('Upload Summary');
  console.log('==============');
  console.log(`Successful: ${results.success.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Total chunks created: ${totalChunks}`);

  if (results.clientsCreated.length > 0) {
    console.log('');
    console.log('Placeholder clients created:');
    results.clientsCreated.forEach((name) => {
      console.log(`  - ${name}`);
    });
  }

  if (results.failed.length > 0) {
    console.log('');
    console.log('Failed files:');
    results.failed.forEach((f) => {
      console.log(`  - ${f.source_file}: ${f.error}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('');
    console.log('Skipped files:');
    results.skipped.forEach((s) => {
      console.log(`  - ${s.file}: ${s.reason}`);
    });
  }

  // Write report
  const reportPath = path.join(
    __dirname,
    '..',
    'data',
    'questionnaire-upload-report.json'
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        dry_run: dryRun,
        batch_tag: BATCH_TAG,
        coach_id: coachId,
        coach_name: coach.name,
        results
      },
      null,
      2
    )
  );

  console.log('');
  console.log(`Report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
