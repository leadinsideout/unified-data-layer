#!/usr/bin/env node

/**
 * Simplified Real Transcript PII Test
 *
 * Tests PII scrubbing on real transcripts WITHOUT database insertion.
 * Just processes transcripts and displays results for manual review.
 *
 * Usage:
 *   node scripts/test-real-transcripts-simple.js ~/Downloads/real-transcripts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import { PIIScrubber } from '../api/pii/index.js';
import { APIExpenseTracker } from '../api/utils/api-expense-tracker.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

async function main() {
  const transcriptDir = process.argv[2];

  if (!transcriptDir || !fs.existsSync(transcriptDir)) {
    console.error(`${colors.red}Error: Invalid transcript directory${colors.reset}\n`);
    console.log('Usage: node scripts/test-real-transcripts-simple.js <path-to-transcripts>\n');
    process.exit(1);
  }

  console.log(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║   Real Transcript PII Scrubbing Test     ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

  //Step 1: Load transcripts
  console.log(`${colors.bold}Step 1: Loading transcripts...${colors.reset}`);
  const files = fs.readdirSync(transcriptDir).filter(f => f.endsWith('.pdf') || f.endsWith('.txt'));

  if (files.length === 0) {
    console.error(`${colors.red}No transcript files found${colors.reset}\n`);
    process.exit(1);
  }

  const transcripts = [];
  for (const filename of files) {
    const filepath = path.join(transcriptDir, filename);

    if (filename.endsWith('.pdf')) {
      console.log(`  Loading PDF: ${colors.cyan}${filename}${colors.reset}...`);
      const pdfBuffer = fs.readFileSync(filepath);
      const pdfData = await pdfParse(pdfBuffer);
      const content = pdfData.text;

      if (content && content.trim().length >= 50) {
        console.log(`    ✓ Extracted ${content.length} characters from ${pdfData.numpages} pages`);
        transcripts.push({ filename, content, pages: pdfData.numpages });
      } else {
        console.log(`    ⚠️  Skipped - insufficient text`);
      }
    } else {
      const content = fs.readFileSync(filepath, 'utf8');
      transcripts.push({ filename, content });
    }
  }

  console.log(`  ${colors.green}✓ Loaded ${transcripts.length} transcripts${colors.reset}\n`);

  // Step 2: Initialize PII scrubber
  console.log(`${colors.bold}Step 2: Initializing PII scrubber...${colors.reset}`);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const expenseTracker = new APIExpenseTracker({
    sessionId: `real_transcript_test_${Date.now()}`,
    budgetLimit: 0.10
  });

  const scrubber = new PIIScrubber(openai, {
    expenseTracker
  });

  console.log(`  ${colors.green}✓ PII scrubber initialized${colors.reset}\n`);

  // Step 3: Process each transcript
  console.log(`${colors.bold}Step 3: Processing transcripts with PII scrubbing...${colors.reset}\n`);

  const results = [];
  for (let i = 0; i < transcripts.length; i++) {
    const transcript = transcripts[i];
    console.log(`  ${colors.bold}[${i + 1}/${transcripts.length}] ${transcript.filename}${colors.reset}`);

    const startTime = Date.now();
    const result = await scrubber.scrub(transcript.content, 'transcript');
    const duration = Date.now() - startTime;

    console.log(`    ✓ Detected ${result.audit.entities.total} PII entities in ${duration}ms\n`);

    results.push({
      filename: transcript.filename,
      originalContent: transcript.content,
      scrubbedContent: result.content,
      audit: result.audit,
      duration
    });
  }

  // Step 4: Display results for manual review
  console.log(`${colors.bold}Step 4: Manual Review Results${colors.reset}\n`);

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bold}Transcript ${i + 1}/${results.length}: ${result.filename}${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

    // PII Summary
    console.log(`${colors.bold}PII Detection Summary:${colors.reset}`);
    console.log(`  Total entities: ${result.audit.entities.total}`);
    console.log(`  By type: ${JSON.stringify(result.audit.entities.by_type, null, 2)}`);
    console.log(`  Method: ${result.audit.method}`);
    console.log(`  Duration: ${result.audit.performance.duration_ms}ms\n`);

    // Show first 800 characters of original
    console.log(`${colors.bold}Original Content (first 800 chars):${colors.reset}`);
    console.log(`${colors.dim}${result.originalContent.substring(0, 800)}...${colors.reset}\n`);

    // Show first 800 characters of scrubbed
    console.log(`${colors.bold}Scrubbed Content (first 800 chars):${colors.reset}`);
    console.log(`${colors.green}${result.scrubbedContent.substring(0, 800)}...${colors.reset}\n`);

    // Show detected entities
    if (result.audit.entities.details && result.audit.entities.details.length > 0) {
      console.log(`${colors.bold}Detected Entities (first 15):${colors.reset}`);
      const entitiesToShow = result.audit.entities.details.slice(0, 15);
      for (const entity of entitiesToShow) {
        const confidenceColor = entity.confidence >= 0.9 ? colors.green : colors.yellow;
        console.log(`  - ${colors.yellow}${entity.type.padEnd(12)}${colors.reset}: "${entity.text.substring(0, 40)}" (${confidenceColor}${entity.confidence.toFixed(2)}${colors.reset})`);
      }
      if (result.audit.entities.details.length > 15) {
        console.log(`  ${colors.dim}... and ${result.audit.entities.details.length - 15} more${colors.reset}`);
      }
      console.log('');
    }
  }

  // Step 5: API Expense Summary
  console.log(`${colors.bold}Step 5: API Expense Summary${colors.reset}\n`);
  expenseTracker.endSession();

  // Final summary
  console.log(`\n${colors.bold}${colors.green}✓ Test Complete${colors.reset}\n`);
  console.log(`${colors.bold}Summary:${colors.reset}`);
  console.log(`  Transcripts processed: ${results.length}`);
  console.log(`  Total PII entities detected: ${results.reduce((sum, r) => sum + r.audit.entities.total, 0)}`);
  console.log(`  Average processing time: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);
  console.log('');
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
