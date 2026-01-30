#!/usr/bin/env node

/**
 * Real Transcript PII Scrubbing Test
 *
 * Tests PII scrubbing on real coaching transcripts, then deletes all test data.
 *
 * Usage:
 *   node scripts/test-real-transcripts.js ~/Downloads/real-transcripts
 *
 * Steps:
 * 1. Enable PII scrubbing temporarily
 * 2. Create temporary test coach/client records
 * 3. Upload transcripts with PII scrubbing enabled
 * 4. Display scrubbed content for manual review
 * 5. Delete all test data
 * 6. Disable PII scrubbing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse';
import { TranscriptProcessor } from '../api/processors/transcript-processor.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class RealTranscriptTester {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.processor = new TranscriptProcessor(this.openai);

    // Track test data for cleanup
    this.testDataIds = {
      company: null,
      coach: null,
      client: null,
      organization: null,
      dataItems: [],
      chunks: []
    };
  }

  /**
   * Main test flow
   */
  async run(transcriptDir) {
    console.log(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║   Real Transcript PII Scrubbing Test     ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

    try {
      // Step 1: Load transcripts
      console.log(`${colors.bold}Step 1: Loading transcripts...${colors.reset}`);
      const transcripts = await this.loadTranscripts(transcriptDir);
      console.log(`  ✓ Loaded ${transcripts.length} transcripts\n`);

      // Step 2: Create test user records
      console.log(`${colors.bold}Step 2: Creating test user records...${colors.reset}`);
      await this.createTestUsers();
      console.log(`  ✓ Created test company, coach, client, organization\n`);

      // Step 3: Enable PII scrubbing
      console.log(`${colors.bold}Step 3: Enabling PII scrubbing...${colors.reset}`);
      const originalEnv = process.env.PII_SCRUBBING_ENABLED;
      process.env.PII_SCRUBBING_ENABLED = 'true';
      console.log(`  ✓ PII_SCRUBBING_ENABLED=true\n`);

      // Step 4: Upload and process transcripts
      console.log(`${colors.bold}Step 4: Processing transcripts with PII scrubbing...${colors.reset}`);
      const results = [];
      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i];
        console.log(`\n  Processing transcript ${i + 1}/${transcripts.length}: ${colors.cyan}${transcript.filename}${colors.reset}`);

        const result = await this.processTranscript(transcript);
        results.push(result);

        console.log(`    ✓ Detected ${result.piiAudit.entities.total} PII entities`);
        console.log(`    ✓ Duration: ${result.piiAudit.performance.duration_ms}ms`);
      }

      // Step 5: Display results for manual review
      console.log(`\n${colors.bold}Step 5: Manual Review${colors.reset}\n`);
      this.displayResults(results);

      // Step 6: Prompt for cleanup
      console.log(`\n${colors.bold}Step 6: Cleanup${colors.reset}`);
      console.log(`${colors.yellow}Ready to delete all test data?${colors.reset}`);
      console.log(`This will delete:`);
      console.log(`  - ${this.testDataIds.dataItems.length} data items`);
      console.log(`  - ${this.testDataIds.chunks.length} chunks`);
      console.log(`  - 1 test coach, 1 test client, 1 test organization, 1 test company`);
      console.log(`\nPress Enter to continue with cleanup, or Ctrl+C to cancel...`);

      // Wait for user confirmation
      await this.waitForEnter();

      // Cleanup
      await this.cleanup();

      // Restore environment
      process.env.PII_SCRUBBING_ENABLED = originalEnv;
      console.log(`  ✓ PII_SCRUBBING_ENABLED=${originalEnv}\n`);

      console.log(`${colors.green}${colors.bold}✓ Test complete - all data deleted${colors.reset}\n`);

    } catch (error) {
      console.error(`\n${colors.red}Error during test:${colors.reset}`, error.message);
      console.log(`\n${colors.yellow}Attempting cleanup...${colors.reset}`);

      try {
        await this.cleanup();
        console.log(`${colors.green}✓ Cleanup successful${colors.reset}\n`);
      } catch (cleanupError) {
        console.error(`${colors.red}✗ Cleanup failed:${colors.reset}`, cleanupError.message);
        console.log(`\nManual cleanup required. Test data IDs:`);
        console.log(JSON.stringify(this.testDataIds, null, 2));
      }

      process.exit(1);
    }
  }

  /**
   * Load transcript files from directory
   */
  async loadTranscripts(dir) {
    const files = fs.readdirSync(dir);
    const transcriptFiles = files.filter(f =>
      f.endsWith('.txt') ||
      f.endsWith('.md') ||
      f.endsWith('.pdf')
    );

    if (transcriptFiles.length === 0) {
      throw new Error(`No transcript files found in ${dir}`);
    }

    const transcripts = [];

    for (const filename of transcriptFiles) {
      const filepath = path.join(dir, filename);

      // Handle PDFs vs text files
      if (filename.endsWith('.pdf')) {
        console.log(`  Loading PDF: ${filename}...`);

        // Read PDF and extract text
        const pdfBuffer = fs.readFileSync(filepath);
        const pdfData = await pdfParse(pdfBuffer);
        const content = pdfData.text;

        if (!content || content.trim().length < 50) {
          console.log(`    ⚠️  Skipping ${filename} - insufficient text extracted`);
          continue;
        }

        console.log(`    ✓ Extracted ${content.length} characters from ${pdfData.numpages} pages`);

        transcripts.push({
          filename,
          filepath,
          content,
          pdfPages: pdfData.numpages,
          isPdf: true
        });
      } else {
        // Text files
        const content = fs.readFileSync(filepath, 'utf8');
        transcripts.push({
          filename,
          filepath,
          content,
          isPdf: false
        });
      }
    }

    return transcripts;
  }

  /**
   * Create temporary test users
   */
  async createTestUsers() {
    // Create test company
    const { data: company, error: companyError } = await this.supabase
      .from('companies')
      .insert({
        name: 'TEST_COMPANY_DELETE_ME',
        slug: `test-company-${Date.now()}`,
        domain: 'test-company.example.com'
      })
      .select()
      .single();

    if (companyError) throw companyError;
    this.testDataIds.company = company.id;

    // Create test coach
    const { data: coach, error: coachError } = await this.supabase
      .from('coaches')
      .insert({
        company_id: company.id,
        email: `test-coach-${Date.now()}@example.com`,
        name: 'Test Coach (DELETE ME)',
        slug: `test-coach-${Date.now()}`
      })
      .select()
      .single();

    if (coachError) throw coachError;
    this.testDataIds.coach = coach.id;

    // Create test organization
    const { data: org, error: orgError } = await this.supabase
      .from('organizations')
      .insert({
        company_id: company.id,
        name: 'Test Organization (DELETE ME)',
        slug: `test-org-${Date.now()}`
      })
      .select()
      .single();

    if (orgError) throw orgError;
    this.testDataIds.organization = org.id;

    // Create test client
    const { data: client, error: clientError } = await this.supabase
      .from('clients')
      .insert({
        company_id: company.id,
        email: `test-client-${Date.now()}@example.com`,
        name: 'Test Client (DELETE ME)',
        slug: `test-client-${Date.now()}`
      })
      .select()
      .single();

    if (clientError) throw clientError;
    this.testDataIds.client = client.id;
  }

  /**
   * Process a single transcript
   */
  async processTranscript(transcript) {
    const metadata = {
      company_id: this.testDataIds.company,
      coach_id: this.testDataIds.coach,
      client_id: this.testDataIds.client,
      organization_id: this.testDataIds.organization,
      session_date: new Date().toISOString(),
      is_test_data: true // Mark as test
    };

    // Process with PII scrubbing
    const processed = await this.processor.process(transcript.content, metadata);

    // Insert into database
    const { data: dataItem, error: itemError } = await this.supabase
      .from('data_items')
      .insert(processed.dataItem)
      .select()
      .single();

    if (itemError) throw itemError;
    this.testDataIds.dataItems.push(dataItem.id);

    // Insert chunks
    const chunksWithItemId = processed.chunks.map(chunk => ({
      ...chunk,
      data_item_id: dataItem.id
    }));

    const { data: chunks, error: chunksError } = await this.supabase
      .from('data_chunks')
      .insert(chunksWithItemId)
      .select();

    if (chunksError) throw chunksError;
    this.testDataIds.chunks.push(...chunks.map(c => c.id));

    return {
      filename: transcript.filename,
      originalContent: transcript.content,
      scrubbedContent: processed.dataItem.raw_content,
      piiAudit: processed.dataItem.metadata.pii_scrubbing,
      dataItemId: dataItem.id,
      chunkIds: chunks.map(c => c.id)
    };
  }

  /**
   * Display results for manual review
   */
  displayResults(results) {
    for (let i = 0; i < results.length; i++) {
      const result = results[i];

      console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.bold}Transcript ${i + 1}: ${result.filename}${colors.reset}`);
      console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════${colors.reset}\n`);

      // PII Summary
      console.log(`${colors.bold}PII Detected:${colors.reset}`);
      console.log(`  Total entities: ${result.piiAudit.entities.total}`);
      console.log(`  By type: ${JSON.stringify(result.piiAudit.entities.by_type, null, 2)}`);
      console.log(`  Duration: ${result.piiAudit.performance.duration_ms}ms\n`);

      // Original content (first 500 chars)
      console.log(`${colors.bold}Original Content (first 500 chars):${colors.reset}`);
      console.log(`${colors.dim}${result.originalContent.substring(0, 500)}...${colors.reset}\n`);

      // Scrubbed content (first 500 chars)
      console.log(`${colors.bold}Scrubbed Content (first 500 chars):${colors.reset}`);
      console.log(`${colors.green}${result.scrubbedContent.substring(0, 500)}...${colors.reset}\n`);

      // Entity details
      if (result.piiAudit.entities.details && result.piiAudit.entities.details.length > 0) {
        console.log(`${colors.bold}Detected Entities:${colors.reset}`);
        for (const entity of result.piiAudit.entities.details.slice(0, 10)) {
          console.log(`  - ${colors.yellow}${entity.type}${colors.reset}: "${entity.text}" (confidence: ${entity.confidence})`);
        }
        if (result.piiAudit.entities.details.length > 10) {
          console.log(`  ... and ${result.piiAudit.entities.details.length - 10} more`);
        }
        console.log('');
      }
    }
  }

  /**
   * Delete all test data
   */
  async cleanup() {
    console.log(`\n  Deleting test data...`);

    // Delete chunks
    if (this.testDataIds.chunks.length > 0) {
      const { error: chunksError } = await this.supabase
        .from('data_chunks')
        .delete()
        .in('id', this.testDataIds.chunks);

      if (chunksError) throw chunksError;
      console.log(`    ✓ Deleted ${this.testDataIds.chunks.length} chunks`);
    }

    // Delete data items
    if (this.testDataIds.dataItems.length > 0) {
      const { error: itemsError } = await this.supabase
        .from('data_items')
        .delete()
        .in('id', this.testDataIds.dataItems);

      if (itemsError) throw itemsError;
      console.log(`    ✓ Deleted ${this.testDataIds.dataItems.length} data items`);
    }

    // Delete client
    if (this.testDataIds.client) {
      const { error: clientError } = await this.supabase
        .from('clients')
        .delete()
        .eq('id', this.testDataIds.client);

      if (clientError) throw clientError;
      console.log(`    ✓ Deleted test client`);
    }

    // Delete organization
    if (this.testDataIds.organization) {
      const { error: orgError } = await this.supabase
        .from('organizations')
        .delete()
        .eq('id', this.testDataIds.organization);

      if (orgError) throw orgError;
      console.log(`    ✓ Deleted test organization`);
    }

    // Delete coach
    if (this.testDataIds.coach) {
      const { error: coachError } = await this.supabase
        .from('coaches')
        .delete()
        .eq('id', this.testDataIds.coach);

      if (coachError) throw coachError;
      console.log(`    ✓ Deleted test coach`);
    }

    // Delete company
    if (this.testDataIds.company) {
      const { error: companyError } = await this.supabase
        .from('companies')
        .delete()
        .eq('id', this.testDataIds.company);

      if (companyError) throw companyError;
      console.log(`    ✓ Deleted test company`);
    }

    // Verify cleanup
    const { count } = await this.supabase
      .from('data_items')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', this.testDataIds.company);

    if (count > 0) {
      throw new Error(`Cleanup verification failed: ${count} items remain`);
    }

    console.log(`    ✓ Verified: Zero test records remain\n`);
  }

  /**
   * Wait for user to press Enter
   */
  async waitForEnter() {
    return new Promise(resolve => {
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }
}

// Main execution
async function main() {
  const transcriptDir = process.argv[2];

  if (!transcriptDir) {
    console.error(`${colors.red}Error: No transcript directory provided${colors.reset}`);
    console.log(`\nUsage: node scripts/test-real-transcripts.js <path-to-transcripts>`);
    console.log(`Example: node scripts/test-real-transcripts.js ~/Downloads/real-transcripts\n`);
    process.exit(1);
  }

  if (!fs.existsSync(transcriptDir)) {
    console.error(`${colors.red}Error: Directory not found: ${transcriptDir}${colors.reset}\n`);
    process.exit(1);
  }

  const tester = new RealTranscriptTester();
  await tester.run(transcriptDir);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
