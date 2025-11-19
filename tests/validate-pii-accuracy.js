#!/usr/bin/env node

/**
 * PII Scrubbing Accuracy Validation Script
 *
 * Tests the PII scrubbing pipeline against a comprehensive test dataset.
 * Validates:
 * - Entity detection accuracy (>95% target)
 * - False positive rate (<5% target)
 * - Performance (<500ms per document target)
 * - Redaction completeness
 *
 * Usage:
 *   node tests/validate-pii-accuracy.js
 *   node tests/validate-pii-accuracy.js --verbose
 *   node tests/validate-pii-accuracy.js --test-id 020
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import OpenAI from 'openai';
import { PIIScrubber } from '../api/pii/index.js';
import { APIExpenseTracker } from '../api/utils/api-expense-tracker.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const TEST_DATA_PATH = join(__dirname, 'pii-test-data.json');
const VERBOSE = process.argv.includes('--verbose');
const SPECIFIC_TEST = process.argv.find(arg => arg.startsWith('--test-id'))?.split('=')[1];
const BUDGET_LIMIT = 0.10; // $0.10 budget limit for tests

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

class PIIAccuracyValidator {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Initialize expense tracker
    this.expenseTracker = new APIExpenseTracker({
      sessionId: `pii_validation_${Date.now()}`,
      budgetLimit: BUDGET_LIMIT
    });

    // Initialize scrubber with expense tracking
    this.scrubber = new PIIScrubber(this.openai, {
      expenseTracker: this.expenseTracker
    });

    this.results = [];
  }

  /**
   * Load test data from JSON file
   */
  loadTestData() {
    try {
      const data = fs.readFileSync(TEST_DATA_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`${colors.red}✗ Failed to load test data:${colors.reset}`, error.message);
      process.exit(1);
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    console.log(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║   PII Scrubbing Accuracy Validation      ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

    const testData = this.loadTestData();
    const testCases = SPECIFIC_TEST
      ? testData.test_cases.filter(tc => tc.id === SPECIFIC_TEST)
      : testData.test_cases;

    if (testCases.length === 0) {
      console.error(`${colors.red}✗ No test cases found${colors.reset}`);
      process.exit(1);
    }

    console.log(`Running ${testCases.length} test cases...\n`);

    let passed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase);
      this.results.push(result);

      if (result.passed) {
        passed++;
        console.log(`${colors.green}✓${colors.reset} Test ${testCase.id}: ${testCase.name}`);
      } else {
        failed++;
        console.log(`${colors.red}✗${colors.reset} Test ${testCase.id}: ${testCase.name}`);

        if (VERBOSE || SPECIFIC_TEST) {
          this.printTestDetails(result);
        }
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total: ${testCases.length}`);
    console.log(`  ${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`  Accuracy: ${((passed / testCases.length) * 100).toFixed(2)}%`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Average time: ${(totalTime / testCases.length).toFixed(2)}ms per test\n`);

    // Performance statistics
    this.printPerformanceStats();

    // Category breakdown
    this.printCategoryBreakdown();

    // API Expense Summary
    this.expenseTracker.endSession();

    // Final verdict
    const accuracy = (passed / testCases.length) * 100;
    console.log(`\n${colors.bold}Final Verdict:${colors.reset}`);

    if (accuracy >= 95) {
      console.log(`${colors.green}${colors.bold}✓ PASSED - Accuracy ${accuracy.toFixed(2)}% meets >95% target${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`${colors.red}${colors.bold}✗ FAILED - Accuracy ${accuracy.toFixed(2)}% below 95% target${colors.reset}\n`);
      process.exit(1);
    }
  }

  /**
   * Run a single test case
   */
  async runTestCase(testCase) {
    const startTime = Date.now();

    try {
      // Run PII scrubbing
      const result = await this.scrubber.scrub(testCase.input, 'test');

      const duration = Date.now() - startTime;

      // Validate results
      const validation = this.validateResult(testCase, result);

      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        passed: validation.passed,
        duration,
        input: testCase.input,
        expectedScrubbed: testCase.expected_scrubbed,
        actualScrubbed: result.content,
        expectedEntities: testCase.expected_entities || [],
        actualEntities: result.audit.entities.total,
        detectedEntities: result.audit.entities.by_type || {},
        validation
      };
    } catch (error) {
      return {
        testId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        passed: false,
        duration: Date.now() - startTime,
        error: error.message,
        validation: {
          passed: false,
          errors: [{ type: 'exception', message: error.message }]
        }
      };
    }
  }

  /**
   * Validate test result against expected values
   */
  validateResult(testCase, result) {
    const errors = [];
    let passed = true;

    // Check minimum entity count
    if (testCase.min_entities !== undefined) {
      if (result.audit.entities.total < testCase.min_entities) {
        errors.push({
          type: 'insufficient_entities',
          expected: `>= ${testCase.min_entities}`,
          actual: result.audit.entities.total
        });
        passed = false;
      }
    }

    // Check maximum entity count (for false positive tests)
    if (testCase.max_entities !== undefined) {
      if (result.audit.entities.total > testCase.max_entities) {
        errors.push({
          type: 'excessive_entities',
          expected: `<= ${testCase.max_entities}`,
          actual: result.audit.entities.total,
          message: 'False positive detected'
        });
        passed = false;
      }
    }

    // Check scrubbed text match (if allow_partial_match is false)
    if (!testCase.allow_partial_match && testCase.expected_scrubbed) {
      const normalizedExpected = this.normalizeText(testCase.expected_scrubbed);
      const normalizedActual = this.normalizeText(result.content);

      if (normalizedExpected !== normalizedActual) {
        errors.push({
          type: 'text_mismatch',
          expected: testCase.expected_scrubbed,
          actual: result.content
        });
        passed = false;
      }
    }

    // Check that original PII is not present in scrubbed text
    for (const entity of testCase.expected_entities || []) {
      if (result.content.includes(entity.text)) {
        errors.push({
          type: 'incomplete_redaction',
          entity: entity.text,
          entityType: entity.type
        });
        passed = false;
      }
    }

    return { passed, errors };
  }

  /**
   * Normalize text for comparison (whitespace, punctuation)
   */
  normalizeText(text) {
    return text.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * Print detailed test results
   */
  printTestDetails(result) {
    console.log(`\n  ${colors.yellow}Details:${colors.reset}`);
    console.log(`  Input: ${result.input.substring(0, 100)}...`);
    console.log(`  Expected: ${result.expectedScrubbed?.substring(0, 100)}...`);
    console.log(`  Actual: ${result.actualScrubbed?.substring(0, 100)}...`);
    console.log(`  Entities detected: ${result.actualEntities}`);
    console.log(`  Entity types: ${JSON.stringify(result.detectedEntities)}`);

    if (result.validation.errors.length > 0) {
      console.log(`  ${colors.red}Errors:${colors.reset}`);
      for (const error of result.validation.errors) {
        console.log(`    - ${error.type}: ${JSON.stringify(error)}`);
      }
    }
    console.log('');
  }

  /**
   * Print performance statistics
   */
  printPerformanceStats() {
    const durations = this.results.map(r => r.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const p95 = this.percentile(durations, 95);

    console.log(`\n${colors.bold}Performance:${colors.reset}`);
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Min: ${min}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  P95: ${p95.toFixed(2)}ms`);

    if (avg > 500) {
      console.log(`  ${colors.red}⚠ Warning: Average duration ${avg.toFixed(2)}ms exceeds 500ms target${colors.reset}`);
    } else {
      console.log(`  ${colors.green}✓ Performance meets <500ms target${colors.reset}`);
    }
  }

  /**
   * Print category breakdown
   */
  printCategoryBreakdown() {
    const byCategory = {};

    for (const result of this.results) {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { passed: 0, failed: 0, total: 0 };
      }
      byCategory[result.category].total++;
      if (result.passed) {
        byCategory[result.category].passed++;
      } else {
        byCategory[result.category].failed++;
      }
    }

    console.log(`\n${colors.bold}By Category:${colors.reset}`);
    for (const [category, stats] of Object.entries(byCategory)) {
      const accuracy = ((stats.passed / stats.total) * 100).toFixed(0);
      const color = stats.failed === 0 ? colors.green : colors.yellow;
      console.log(`  ${color}${category}:${colors.reset} ${stats.passed}/${stats.total} (${accuracy}%)`);
    }
  }

  /**
   * Calculate percentile
   */
  percentile(numbers, p) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// Main execution
async function main() {
  // Validate environment
  if (!process.env.OPENAI_API_KEY) {
    console.error(`${colors.red}✗ OPENAI_API_KEY not set in environment${colors.reset}`);
    process.exit(1);
  }

  const validator = new PIIAccuracyValidator();
  await validator.runTests();
}

main().catch(error => {
  console.error(`${colors.red}✗ Validation failed:${colors.reset}`, error);
  process.exit(1);
});
