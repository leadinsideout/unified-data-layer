#!/usr/bin/env node

/**
 * API Expense Viewer
 *
 * View OpenAI API expenses from log files.
 *
 * Usage:
 *   node scripts/view-api-expenses.js               # Today's expenses
 *   node scripts/view-api-expenses.js --yesterday   # Yesterday's expenses
 *   node scripts/view-api-expenses.js --week        # Last 7 days
 *   node scripts/view-api-expenses.js --month       # Last 30 days
 *   node scripts/view-api-expenses.js --all         # All time
 */

import { APIExpenseTracker } from '../api/utils/api-expense-tracker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(process.cwd(), 'logs', 'api-expenses.jsonl');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function getDateRange() {
  const now = new Date();
  const args = process.argv.slice(2);

  if (args.includes('--yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    return { start: yesterday, end: endOfYesterday, label: 'Yesterday' };
  }

  if (args.includes('--week')) {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { start: weekAgo, end: now, label: 'Last 7 Days' };
  }

  if (args.includes('--month')) {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    return { start: monthAgo, end: now, label: 'Last 30 Days' };
  }

  if (args.includes('--all')) {
    return { start: new Date(0), end: now, label: 'All Time' };
  }

  // Default: today
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return { start: today, end: now, label: 'Today' };
}

function printSummary(summary) {
  console.log(`\n${colors.bold}${colors.cyan}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}║       OpenAI API Expense Report          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}╚══════════════════════════════════════════╝${colors.reset}\n`);

  console.log(`${colors.bold}Period:${colors.reset} ${summary.date_range.label}`);
  console.log(`${colors.bold}From:${colors.reset} ${new Date(summary.date_range.start).toLocaleString()}`);
  console.log(`${colors.bold}To:${colors.reset} ${new Date(summary.date_range.end).toLocaleString()}\n`);

  console.log(`${colors.bold}Overall:${colors.reset}`);
  console.log(`  Total API Calls: ${summary.total_calls}`);
  console.log(`  Total Cost: ${colors.green}$${summary.total_cost.toFixed(6)}${colors.reset}\n`);

  if (Object.keys(summary.by_model).length > 0) {
    console.log(`${colors.bold}By Model:${colors.reset}`);
    for (const [model, stats] of Object.entries(summary.by_model)) {
      console.log(`  ${colors.cyan}${model}${colors.reset}`);
      console.log(`    Calls: ${stats.calls}`);
      console.log(`    Tokens: ${stats.tokens.toLocaleString()}`);
      console.log(`    Cost: $${stats.cost.toFixed(6)}`);
    }
    console.log('');
  }

  if (Object.keys(summary.by_operation).length > 0) {
    console.log(`${colors.bold}By Operation:${colors.reset}`);
    for (const [operation, stats] of Object.entries(summary.by_operation)) {
      console.log(`  ${colors.yellow}${operation}${colors.reset}`);
      console.log(`    Calls: ${stats.calls}`);
      console.log(`    Cost: $${stats.cost.toFixed(6)}`);
    }
    console.log('');
  }

  console.log(`${colors.bold}Log File:${colors.reset} ${LOG_FILE}\n`);
}

function main() {
  const { start, end, label } = getDateRange();

  try {
    const summary = APIExpenseTracker.getSummaryForDateRange(LOG_FILE, start, end);
    summary.date_range = { start, end, label };

    if (summary.total_calls === 0) {
      console.log(`\n${colors.yellow}No API calls found for ${label.toLowerCase()}.${colors.reset}\n`);
      process.exit(0);
    }

    printSummary(summary);
  } catch (error) {
    console.error(`${colors.red}Error reading expense logs:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
