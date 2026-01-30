#!/usr/bin/env node

/**
 * OpenAI API Timeout Diagnostic Tool
 *
 * Systematically tests OpenAI API with incrementally larger payloads
 * to identify the exact cause of timeout issues with large transcripts.
 *
 * Tests:
 * - 8 payload sizes (1K to 60K characters)
 * - 4 configuration variations
 * - Total: 32 test combinations
 *
 * Usage:
 *   node scripts/diagnose-openai-timeout.js
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Test configuration
const PAYLOAD_SIZES = [1000, 5000, 10000, 20000, 30000, 40000, 50000, 60000];
const TEST_DELAY_MS = 3000; // 3 seconds between tests to avoid rate limits

// Configuration variations to test
const CONFIGURATIONS = [
  {
    id: 'A',
    name: 'Current (AbortController + 60s + JSON)',
    useAbortController: true,
    timeout: 60000,
    useJsonFormat: true,
    model: 'gpt-4o-mini',
    stream: false
  },
  {
    id: 'B',
    name: 'No AbortController (SDK timeout)',
    useAbortController: false,
    timeout: 60000,
    useJsonFormat: true,
    model: 'gpt-4o-mini',
    stream: false
  },
  {
    id: 'C',
    name: 'No JSON format (plain text)',
    useAbortController: true,
    timeout: 60000,
    useJsonFormat: false,
    model: 'gpt-4o-mini',
    stream: false
  },
  {
    id: 'D',
    name: 'GPT-3.5-turbo (comparison)',
    useAbortController: true,
    timeout: 60000,
    useJsonFormat: true,
    model: 'gpt-3.5-turbo',
    stream: false
  }
];

class OpenAIDiagnostic {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.results = [];
  }

  /**
   * Generate realistic coaching transcript content at specified size
   */
  generateTestPayload(targetSize) {
    const speakerTemplate = [
      'JJ Vega',
      'Client Name',
      'Coach Assistant'
    ];

    const conversationSnippets = [
      "This meeting is being recorded. How are you feeling today?",
      "I've been thinking about what we discussed last week regarding work-life balance.",
      "That's a great insight. Can you tell me more about how that made you feel?",
      "I notice you mentioned feeling stressed. What specifically is causing that stress?",
      "Let's explore that further. What would success look like for you in this situation?",
      "I appreciate you sharing that. It takes courage to be vulnerable in this way.",
      "Based on what you're telling me, it sounds like there might be a pattern here.",
      "What steps could you take this week to move closer to your goals?",
      "I'm hearing that you're feeling stuck. What would it look like to be unstuck?",
      "That's really powerful. How does recognizing that shift your perspective?"
    ];

    let content = "\n\nCoaching Transcript - Diagnostic Test\n\n";
    let currentSize = content.length;
    let turnCount = 0;

    while (currentSize < targetSize) {
      const speaker = speakerTemplate[turnCount % speakerTemplate.length];
      const snippet = conversationSnippets[Math.floor(Math.random() * conversationSnippets.length)];
      const timestamp = `${String(Math.floor(turnCount / 2)).padStart(2, '0')}:${String((turnCount * 30) % 60).padStart(2, '0')}`;

      const turn = `\n\n${speaker} - ${timestamp}\n\n${snippet}\n`;
      content += turn;
      currentSize += turn.length;
      turnCount++;

      // Add realistic conversation padding
      if (turnCount % 10 === 0) {
        content += "\n\n[Meeting break - 5 minutes]\n\n";
        currentSize += 30;
      }
    }

    return content.substring(0, targetSize);
  }

  /**
   * Build PII detection prompt (same as production)
   */
  buildPrompt(text) {
    return `You are analyzing coaching transcript data. Identify personally identifiable information (PII).

**PII CATEGORIES TO DETECT:**
- Person names (full names, first name + last name combinations)
- Physical addresses (street addresses, specific locations)
- Dates of birth or ages when combined with names
- Medical information (diagnoses, medications, health conditions)
- Financial details (account numbers, salaries, specific financial status)
- Employer/Company names when mentioned with person context

**RESPONSE FORMAT:**
Return ONLY valid JSON with this exact structure:
{
  "entities": [
    {
      "text": "exact text from input",
      "type": "NAME|ADDRESS|DOB|MEDICAL|FINANCIAL|EMPLOYER",
      "start": number,
      "end": number,
      "confidence": number (0.0-1.0)
    }
  ]
}

**TEXT TO ANALYZE:**
${text}`;
  }

  /**
   * Execute a single API test
   */
  async runTest(payloadSize, config) {
    const testId = `${config.id}-${payloadSize}`;

    console.log(`\n${colors.cyan}[${testId}]${colors.reset} Testing ${(payloadSize / 1000).toFixed(0)}K chars with ${config.name}...`);

    const payload = this.generateTestPayload(payloadSize);
    const prompt = this.buildPrompt(payload);

    const startTime = Date.now();
    let result = {
      testId,
      configId: config.id,
      configName: config.name,
      payloadSize,
      success: false,
      duration: 0,
      error: null,
      errorType: null,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      aborted: false,
      timedOut: false
    };

    try {
      let controller = null;
      let timeoutId = null;
      let requestOptions = {};

      // Setup AbortController if configured
      if (config.useAbortController) {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          result.timedOut = true;
          controller.abort();
        }, config.timeout);
        requestOptions.signal = controller.signal;
      }

      // Build request
      const messages = [
        {
          role: 'system',
          content: 'You are a PII detection assistant specialized in coaching content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const requestConfig = {
        model: config.model,
        messages,
        temperature: 0
      };

      if (config.useJsonFormat) {
        requestConfig.response_format = { type: 'json_object' };
      }

      // Make API call
      const response = await this.openai.chat.completions.create(
        requestConfig,
        requestOptions
      );

      if (timeoutId) clearTimeout(timeoutId);

      // Success - record metrics
      result.success = true;
      result.duration = Date.now() - startTime;
      result.inputTokens = response.usage?.prompt_tokens || 0;
      result.outputTokens = response.usage?.completion_tokens || 0;
      result.totalTokens = response.usage?.total_tokens || 0;

      // Estimate cost (GPT-4o-mini: $0.150/1M input, $0.600/1M output)
      // GPT-3.5-turbo: $0.500/1M input, $1.500/1M output
      const inputCostPer1M = config.model === 'gpt-3.5-turbo' ? 0.50 : 0.15;
      const outputCostPer1M = config.model === 'gpt-3.5-turbo' ? 1.50 : 0.60;

      result.estimatedCost =
        (result.inputTokens / 1000000 * inputCostPer1M) +
        (result.outputTokens / 1000000 * outputCostPer1M);

      console.log(`  ${colors.green}✓ Success${colors.reset} (${result.duration}ms, ${result.totalTokens} tokens, $${result.estimatedCost.toFixed(6)})`);

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.error = error.message;
      result.errorType = error.constructor.name;
      result.aborted = error.name === 'AbortError' || error.constructor.name === 'APIUserAbortError';

      console.log(`  ${colors.red}✗ Failed${colors.reset} (${result.duration}ms)`);
      console.log(`  ${colors.dim}Error: ${error.constructor.name}: ${error.message}${colors.reset}`);
    }

    this.results.push(result);
    return result;
  }

  /**
   * Run full diagnostic battery
   */
  async runDiagnostics() {
    console.log(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║   OpenAI API Timeout Diagnostic Tool                     ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.bold}Test Plan:${colors.reset}`);
    console.log(`  Payload sizes: ${PAYLOAD_SIZES.map(s => `${s/1000}K`).join(', ')}`);
    console.log(`  Configurations: ${CONFIGURATIONS.length}`);
    console.log(`  Total tests: ${PAYLOAD_SIZES.length * CONFIGURATIONS.length}`);
    console.log(`  Estimated duration: ${Math.ceil((PAYLOAD_SIZES.length * CONFIGURATIONS.length * (TEST_DELAY_MS + 20000)) / 60000)} minutes\n`);

    const totalTests = PAYLOAD_SIZES.length * CONFIGURATIONS.length;
    let completedTests = 0;

    for (const payloadSize of PAYLOAD_SIZES) {
      console.log(`\n${colors.bold}${colors.yellow}━━━ Testing ${(payloadSize / 1000).toFixed(0)}K Character Payload ━━━${colors.reset}`);

      for (const config of CONFIGURATIONS) {
        await this.runTest(payloadSize, config);
        completedTests++;

        // Delay between tests to avoid rate limits
        if (completedTests < totalTests) {
          process.stdout.write(`${colors.dim}  Waiting ${TEST_DELAY_MS/1000}s before next test...${colors.reset}`);
          await this.sleep(TEST_DELAY_MS);
          process.stdout.write('\r' + ' '.repeat(50) + '\r');
        }
      }
    }

    console.log(`\n\n${colors.bold}${colors.green}✓ Diagnostic Complete${colors.reset}\n`);
  }

  /**
   * Analyze results and generate diagnostic report
   */
  generateReport() {
    console.log(`${colors.bold}${colors.cyan}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║                 Diagnostic Report                        ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Summary by payload size
    console.log(`${colors.bold}Results by Payload Size:${colors.reset}\n`);

    for (const size of PAYLOAD_SIZES) {
      const sizeResults = this.results.filter(r => r.payloadSize === size);
      const successCount = sizeResults.filter(r => r.success).length;
      const failCount = sizeResults.length - successCount;
      const successRate = (successCount / sizeResults.length * 100).toFixed(0);

      const statusColor = successCount === sizeResults.length ? colors.green :
                         successCount === 0 ? colors.red : colors.yellow;

      console.log(`  ${(size / 1000).toFixed(0).padStart(2)}K chars: ${statusColor}${successCount}/${sizeResults.length} passed${colors.reset} (${successRate}%)`);
    }

    // Summary by configuration
    console.log(`\n${colors.bold}Results by Configuration:${colors.reset}\n`);

    for (const config of CONFIGURATIONS) {
      const configResults = this.results.filter(r => r.configId === config.id);
      const successCount = configResults.filter(r => r.success).length;
      const avgDuration = configResults.reduce((sum, r) => sum + r.duration, 0) / configResults.length;

      const statusColor = successCount === configResults.length ? colors.green :
                         successCount === 0 ? colors.red : colors.yellow;

      console.log(`  ${colors.cyan}[${config.id}]${colors.reset} ${config.name}`);
      console.log(`      ${statusColor}${successCount}/${configResults.length} passed${colors.reset}, avg ${avgDuration.toFixed(0)}ms`);
    }

    // Identify breaking point
    console.log(`\n${colors.bold}Breaking Point Analysis:${colors.reset}\n`);

    let maxWorkingSize = 0;
    let minFailingSize = Infinity;

    for (const config of CONFIGURATIONS) {
      const configResults = this.results.filter(r => r.configId === config.id);

      let configMaxWorking = 0;
      let configMinFailing = Infinity;

      for (const size of PAYLOAD_SIZES) {
        const result = configResults.find(r => r.payloadSize === size);
        if (result.success) {
          configMaxWorking = Math.max(configMaxWorking, size);
        } else {
          configMinFailing = Math.min(configMinFailing, size);
        }
      }

      maxWorkingSize = Math.max(maxWorkingSize, configMaxWorking);
      if (configMinFailing !== Infinity) {
        minFailingSize = Math.min(minFailingSize, configMinFailing);
      }

      if (configMaxWorking > 0) {
        console.log(`  ${colors.cyan}[${config.id}]${colors.reset} Max working: ${colors.green}${(configMaxWorking / 1000).toFixed(0)}K${colors.reset}`);
      }
      if (configMinFailing !== Infinity) {
        console.log(`      Min failing: ${colors.red}${(configMinFailing / 1000).toFixed(0)}K${colors.reset}`);
      }
    }

    // Root cause analysis
    console.log(`\n${colors.bold}Root Cause Analysis:${colors.reset}\n`);

    const allFailed = this.results.filter(r => !r.success);
    const timeoutFailures = allFailed.filter(r => r.timedOut || r.aborted);
    const avgFailDuration = allFailed.length > 0 ?
      allFailed.reduce((sum, r) => sum + r.duration, 0) / allFailed.length : 0;

    if (allFailed.length === this.results.length) {
      console.log(`  ${colors.red}⚠ ALL TESTS FAILED${colors.reset}`);
      console.log(`    This suggests a fundamental API connectivity issue.`);
      console.log(`    Check: API key validity, network connectivity, firewall rules.`);
    } else if (maxWorkingSize === 0) {
      console.log(`  ${colors.red}⚠ NO SUCCESSFUL TESTS${colors.reset}`);
      console.log(`    Even smallest payload (1K) failed.`);
      console.log(`    Issue: Likely API authentication or network problem.`);
    } else if (minFailingSize !== Infinity) {
      console.log(`  ${colors.green}✓ Payload size limit identified${colors.reset}`);
      console.log(`    Working: Up to ${(maxWorkingSize / 1000).toFixed(0)}K characters`);
      console.log(`    Failing: From ${(minFailingSize / 1000).toFixed(0)}K characters`);
      console.log(`    Diagnosis: ${colors.bold}Payload size exceeds practical limits${colors.reset}`);
      console.log(`\n    ${colors.yellow}Recommended Fix:${colors.reset}`);
      console.log(`    Implement chunking strategy - split transcripts into ${(maxWorkingSize / 1000).toFixed(0)}K chunks`);
      console.log(`    Process each chunk separately, merge results before redaction`);
      console.log(`    Estimated effort: 4-6 hours`);
    }

    if (timeoutFailures.length > 0) {
      console.log(`\n  Timeout/Abort failures: ${timeoutFailures.length}/${allFailed.length}`);
      console.log(`  Average failure duration: ${avgFailDuration.toFixed(0)}ms`);

      if (avgFailDuration < 20000) {
        console.log(`  ${colors.yellow}Note:${colors.reset} Failures occur quickly (~${(avgFailDuration/1000).toFixed(0)}s)`);
        console.log(`  This suggests network-level timeout, not OpenAI API processing limit.`);
      }
    }

    // Configuration comparison
    console.log(`\n${colors.bold}Configuration Insights:${colors.reset}\n`);

    const configA = this.results.filter(r => r.configId === 'A');
    const configB = this.results.filter(r => r.configId === 'B');
    const configC = this.results.filter(r => r.configId === 'C');
    const configD = this.results.filter(r => r.configId === 'D');

    const aSuccess = configA.filter(r => r.success).length;
    const bSuccess = configB.filter(r => r.success).length;
    const cSuccess = configC.filter(r => r.success).length;
    const dSuccess = configD.filter(r => r.success).length;

    if (bSuccess > aSuccess) {
      console.log(`  ${colors.green}✓${colors.reset} Removing AbortController improved success rate`);
      console.log(`    Recommendation: Use SDK's built-in timeout handling`);
    } else if (aSuccess === bSuccess) {
      console.log(`  • AbortController has no impact on success rate`);
    }

    if (cSuccess > aSuccess) {
      console.log(`  ${colors.green}✓${colors.reset} Removing JSON format improved success rate`);
      console.log(`    Recommendation: Use plain text response, parse manually`);
    }

    if (dSuccess > aSuccess) {
      console.log(`  ${colors.green}✓${colors.reset} GPT-3.5-turbo performs better than GPT-4o-mini`);
      console.log(`    Recommendation: Consider model switch for large payloads`);
    } else if (dSuccess < aSuccess) {
      console.log(`  • GPT-4o-mini performs better than GPT-3.5-turbo`);
    }

    // Cost analysis
    console.log(`\n${colors.bold}Cost Analysis:${colors.reset}\n`);

    const successfulTests = this.results.filter(r => r.success);
    if (successfulTests.length > 0) {
      const totalCost = successfulTests.reduce((sum, r) => sum + r.estimatedCost, 0);
      const avgCost = totalCost / successfulTests.length;
      const avgTokens = successfulTests.reduce((sum, r) => sum + r.totalTokens, 0) / successfulTests.length;

      console.log(`  Successful tests: ${successfulTests.length}`);
      console.log(`  Total cost: $${totalCost.toFixed(6)}`);
      console.log(`  Average cost per request: $${avgCost.toFixed(6)}`);
      console.log(`  Average tokens per request: ${avgTokens.toFixed(0)}`);

      // Project production costs
      const transcriptsPerDay = 10; // Estimate
      const dailyCost = avgCost * transcriptsPerDay;
      const monthlyCost = dailyCost * 30;

      console.log(`\n  ${colors.cyan}Production Estimates (${transcriptsPerDay} transcripts/day):${colors.reset}`);
      console.log(`    Daily: $${dailyCost.toFixed(2)}`);
      console.log(`    Monthly: $${monthlyCost.toFixed(2)}`);
    } else {
      console.log(`  ${colors.red}No successful tests - cannot estimate costs${colors.reset}`);
    }

    // Final recommendations
    console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}Final Recommendations:${colors.reset}\n`);

    if (maxWorkingSize >= 50000) {
      console.log(`  ${colors.green}✓ System can handle large payloads (up to ${(maxWorkingSize/1000).toFixed(0)}K)${colors.reset}`);
      console.log(`    Your 48-60K transcripts should work in production.`);
      console.log(`    Initial test failures may be transient network issues.`);
    } else if (maxWorkingSize >= 20000) {
      console.log(`  ${colors.yellow}⚠ Partial success - chunking recommended${colors.reset}`);
      console.log(`    1. Split transcripts into ${(maxWorkingSize/1000).toFixed(0)}K chunks with 1K overlap`);
      console.log(`    2. Process each chunk independently`);
      console.log(`    3. Merge detected entities before redaction`);
      console.log(`    4. Estimated implementation: 4-6 hours`);
    } else if (maxWorkingSize > 0) {
      console.log(`  ${colors.red}⚠ Severe payload limitations (max ${(maxWorkingSize/1000).toFixed(0)}K)${colors.reset}`);
      console.log(`    1. Implement aggressive chunking (${(maxWorkingSize/1000).toFixed(0)}K chunks)`);
      console.log(`    2. Consider alternative PII detection (AWS Comprehend, Azure Text Analytics)`);
      console.log(`    3. Or use regex-only mode for large documents`);
    } else {
      console.log(`  ${colors.red}✗ Critical failure - no successful tests${colors.reset}`);
      console.log(`    1. Verify OpenAI API key is valid and has credits`);
      console.log(`    2. Check network connectivity and firewall rules`);
      console.log(`    3. Test with smaller payload (1K) to isolate issue`);
      console.log(`    4. Consider alternative PII detection service`);
    }

    console.log(`\n${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(`${colors.red}Error: OPENAI_API_KEY not set in environment${colors.reset}\n`);
    process.exit(1);
  }

  const diagnostic = new OpenAIDiagnostic();

  try {
    await diagnostic.runDiagnostics();
    diagnostic.generateReport();
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
  }
}

main();
