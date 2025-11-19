/**
 * API Expense Tracker
 *
 * Tracks and logs OpenAI API costs in real-time.
 * Provides visibility into spending patterns and rate of spend.
 *
 * Features:
 * - Real-time cost calculation
 * - Session-based tracking
 * - Rate of spend monitoring
 * - Cost breakdown by operation type
 * - Budget alerts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAI Pricing (as of November 2025)
// Source: https://openai.com/pricing
const PRICING = {
  // GPT-4o-mini (chat completion)
  'gpt-4o-mini': {
    input: 0.150 / 1_000_000,  // $0.150 per 1M tokens
    output: 0.600 / 1_000_000  // $0.600 per 1M tokens
  },
  // GPT-4o (chat completion)
  'gpt-4o': {
    input: 2.50 / 1_000_000,   // $2.50 per 1M tokens
    output: 10.00 / 1_000_000  // $10.00 per 1M tokens
  },
  // Embeddings
  'text-embedding-3-small': {
    input: 0.020 / 1_000_000,  // $0.020 per 1M tokens
    output: 0                   // No output tokens
  },
  'text-embedding-3-large': {
    input: 0.130 / 1_000_000,  // $0.130 per 1M tokens
    output: 0
  }
};

export class APIExpenseTracker {
  constructor(options = {}) {
    this.sessionId = options.sessionId || this.generateSessionId();
    this.logFile = options.logFile || path.join(process.cwd(), 'logs', 'api-expenses.jsonl');
    this.sessionStartTime = Date.now();
    this.sessionCosts = [];
    this.budgetLimit = options.budgetLimit || null; // Optional budget limit in USD

    // Ensure logs directory exists
    this.ensureLogDirectory();

    // Start session
    this.logSessionStart();
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure logs directory exists
   */
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Log session start
   */
  logSessionStart() {
    const entry = {
      type: 'session_start',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      budget_limit: this.budgetLimit
    };
    this.appendLog(entry);
  }

  /**
   * Track OpenAI API call
   *
   * @param {Object} params - API call parameters
   * @returns {Object} Cost information
   */
  track(params) {
    const {
      model,
      operation,  // 'embedding', 'chat', 'pii_detection'
      inputTokens,
      outputTokens = 0,
      metadata = {}
    } = params;

    // Calculate cost
    const pricing = PRICING[model];
    if (!pricing) {
      console.warn(`[Expense] Unknown model: ${model}`);
      return { cost: 0, warning: 'Unknown model pricing' };
    }

    const inputCost = inputTokens * pricing.input;
    const outputCost = outputTokens * pricing.output;
    const totalCost = inputCost + outputCost;

    // Track in session
    this.sessionCosts.push({
      timestamp: Date.now(),
      cost: totalCost
    });

    // Create log entry
    const entry = {
      type: 'api_call',
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      model,
      operation,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      cost: {
        input: Number(inputCost.toFixed(6)),
        output: Number(outputCost.toFixed(6)),
        total: Number(totalCost.toFixed(6))
      },
      metadata
    };

    // Append to log file
    this.appendLog(entry);

    // Check budget
    const sessionTotal = this.getSessionTotal();
    if (this.budgetLimit && sessionTotal > this.budgetLimit) {
      console.warn(`[Expense] ⚠️  Budget limit exceeded: $${sessionTotal.toFixed(4)} > $${this.budgetLimit}`);
    }

    return {
      cost: totalCost,
      inputCost,
      outputCost,
      sessionTotal,
      ratePerHour: this.getRatePerHour()
    };
  }

  /**
   * Append entry to log file
   */
  appendLog(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line);
    } catch (error) {
      console.error('[Expense] Failed to write log:', error.message);
    }
  }

  /**
   * Get total cost for current session
   */
  getSessionTotal() {
    return this.sessionCosts.reduce((sum, item) => sum + item.cost, 0);
  }

  /**
   * Get rate of spend per hour
   */
  getRatePerHour() {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000 / 60 / 60; // hours
    if (sessionDuration === 0) return 0;
    return this.getSessionTotal() / sessionDuration;
  }

  /**
   * Get current spend summary
   */
  getSummary() {
    const total = this.getSessionTotal();
    const ratePerHour = this.getRatePerHour();
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000; // seconds

    return {
      session_id: this.sessionId,
      session_duration_seconds: Math.round(sessionDuration),
      total_calls: this.sessionCosts.length,
      total_cost: Number(total.toFixed(6)),
      rate_per_hour: Number(ratePerHour.toFixed(6)),
      budget_limit: this.budgetLimit,
      budget_remaining: this.budgetLimit ? Number((this.budgetLimit - total).toFixed(6)) : null,
      budget_status: this.budgetLimit ? (total > this.budgetLimit ? 'exceeded' : 'within_budget') : 'no_limit'
    };
  }

  /**
   * Print formatted summary to console
   */
  printSummary() {
    const summary = this.getSummary();
    const colors = {
      reset: '\x1b[0m',
      green: '\x1b[32m',
      red: '\x1b[31m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
      bold: '\x1b[1m'
    };

    console.log(`\n${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║       OpenAI API Expense Summary         ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`Session ID: ${summary.session_id}`);
    console.log(`Duration: ${this.formatDuration(summary.session_duration_seconds)}`);
    console.log(`Total API Calls: ${summary.total_calls}`);
    console.log(`\n${colors.bold}Cost Breakdown:${colors.reset}`);
    console.log(`  Total Spend: ${colors.green}$${summary.total_cost.toFixed(6)}${colors.reset}`);
    console.log(`  Rate/Hour: ${colors.cyan}$${summary.rate_per_hour.toFixed(6)}/hr${colors.reset}`);

    if (this.budgetLimit) {
      const statusColor = summary.budget_status === 'exceeded' ? colors.red : colors.green;
      console.log(`\n${colors.bold}Budget:${colors.reset}`);
      console.log(`  Limit: $${this.budgetLimit.toFixed(2)}`);
      console.log(`  Remaining: ${statusColor}$${summary.budget_remaining.toFixed(6)}${colors.reset}`);
      console.log(`  Status: ${statusColor}${summary.budget_status}${colors.reset}`);
    }

    console.log(`\nLog file: ${this.logFile}\n`);
  }

  /**
   * Format duration in seconds to human-readable string
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.round(seconds % 60);
      return `${mins}m ${secs}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
  }

  /**
   * End session and log final summary
   */
  endSession() {
    const summary = this.getSummary();
    const entry = {
      type: 'session_end',
      ...summary,
      timestamp: new Date().toISOString()
    };
    this.appendLog(entry);
    this.printSummary();
  }

  /**
   * Read all expense logs
   */
  static readLogs(logFile) {
    try {
      if (!fs.existsSync(logFile)) {
        return [];
      }
      const content = fs.readFileSync(logFile, 'utf8');
      return content
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => JSON.parse(line));
    } catch (error) {
      console.error('[Expense] Failed to read logs:', error.message);
      return [];
    }
  }

  /**
   * Get expense summary for date range
   */
  static getSummaryForDateRange(logFile, startDate, endDate) {
    const logs = APIExpenseTracker.readLogs(logFile);
    const apiCalls = logs.filter(entry =>
      entry.type === 'api_call' &&
      new Date(entry.timestamp) >= startDate &&
      new Date(entry.timestamp) <= endDate
    );

    const totalCost = apiCalls.reduce((sum, call) => sum + call.cost.total, 0);
    const byModel = {};
    const byOperation = {};

    for (const call of apiCalls) {
      // By model
      if (!byModel[call.model]) {
        byModel[call.model] = { calls: 0, cost: 0, tokens: 0 };
      }
      byModel[call.model].calls++;
      byModel[call.model].cost += call.cost.total;
      byModel[call.model].tokens += call.tokens.total;

      // By operation
      if (!byOperation[call.operation]) {
        byOperation[call.operation] = { calls: 0, cost: 0 };
      }
      byOperation[call.operation].calls++;
      byOperation[call.operation].cost += call.cost.total;
    }

    return {
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      total_calls: apiCalls.length,
      total_cost: Number(totalCost.toFixed(6)),
      by_model: byModel,
      by_operation: byOperation
    };
  }

  /**
   * Get today's expenses
   */
  static getTodaySummary(logFile) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return APIExpenseTracker.getSummaryForDateRange(logFile, today, tomorrow);
  }
}

/**
 * Convenience function to estimate token count
 * (rough estimate: ~4 characters per token)
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Convenience function to calculate cost for operation
 */
export function calculateCost(model, inputTokens, outputTokens = 0) {
  const pricing = PRICING[model];
  if (!pricing) return 0;

  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;
  return inputCost + outputCost;
}
