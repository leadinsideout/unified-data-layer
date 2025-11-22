#!/usr/bin/env node

/**
 * Pre-Checkpoint Consistency Audit Script
 *
 * Purpose: Automated validation of version numbers, status markers, links, and security
 * Usage: node scripts/audit-consistency.js
 * Exit Codes:
 *   0 = All checks passed
 *   1 = Warnings found (non-blocking)
 *   2 = Critical issues found (blocking)
 *
 * Part of the Unified Development Methodology
 * See: docs/development/pre-checkpoint-audit.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

const results = {
  versionConsistency: { status: 'UNKNOWN', issues: [] },
  statusConsistency: { status: 'UNKNOWN', issues: [] },
  linkValidation: { status: 'UNKNOWN', issues: [] },
  securityCheck: { status: 'UNKNOWN', issues: [] },
  gitStatus: { status: 'UNKNOWN', issues: [] },
};

let exitCode = 0; // 0 = pass, 1 = warnings, 2 = critical

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function printHeader(title) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

function printSection(title) {
  console.log(`\n${colors.bold}${title}${colors.reset}`);
  console.log(`${'-'.repeat(70)}`);
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`   ${message}`);
}

function readFile(filePath) {
  const fullPath = path.join(projectRoot, filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

function findLineWithPattern(content, pattern) {
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    if (pattern instanceof RegExp) {
      if (pattern.test(lines[i])) {
        results.push({ line: i + 1, content: lines[i].trim() });
      }
    } else {
      if (lines[i].includes(pattern)) {
        results.push({ line: i + 1, content: lines[i].trim() });
      }
    }
  }

  return results;
}

// ============================================================================
// CHECK 1: VERSION CONSISTENCY
// ============================================================================

async function checkVersionConsistency() {
  printSection('CHECK 1: Version Consistency');

  const issues = [];

  // Read package.json version (source of truth)
  const packageJsonContent = readFile('package.json');
  if (!packageJsonContent) {
    issues.push('CRITICAL: package.json not found');
    results.versionConsistency = { status: 'FAIL', issues };
    printError('package.json not found');
    return;
  }

  const packageJson = JSON.parse(packageJsonContent);
  const canonicalVersion = packageJson.version;

  printInfo(`Canonical version (package.json): ${colors.bold}${canonicalVersion}${colors.reset}`);

  const checks = [
    {
      file: 'README.md',
      patterns: [/Version.*?v?(\d+\.\d+\.\d+)/i],
      name: 'README version reference',
    },
    {
      file: 'CLAUDE.md',
      patterns: [
        /Current Version.*?v?(\d+\.\d+\.\d+)/i,
        /Latest Tags.*?v(\d+\.\d+\.\d+)/i,
      ],
      name: 'CLAUDE.md version references',
    },
    {
      file: 'api/server.js',
      patterns: [
        /version:\s*['"](\d+\.\d+\.\d+)['"]/g,
      ],
      name: 'api/server.js version strings',
      expectedCount: 3, // health endpoint, root endpoint, OpenAPI schema
    },
  ];

  let allMatch = true;

  for (const check of checks) {
    const content = readFile(check.file);
    if (!content) {
      issues.push(`File not found: ${check.file}`);
      printWarning(`${check.file}: File not found (may not exist yet)`);
      continue;
    }

    let foundVersions = [];

    for (const pattern of check.patterns) {
      const matches = [...content.matchAll(pattern)];
      foundVersions.push(...matches.map(m => ({ version: m[1], match: m[0] })));
    }

    if (foundVersions.length === 0) {
      issues.push(`No version found in ${check.file}`);
      printWarning(`${check.file}: No version pattern found`);
      continue;
    }

    // Check if all found versions match canonical
    const mismatches = foundVersions.filter(v => v.version !== canonicalVersion);

    if (mismatches.length > 0) {
      allMatch = false;
      for (const mismatch of mismatches) {
        issues.push(`${check.file}: Found v${mismatch.version}, expected v${canonicalVersion}`);
        printError(`${check.file}: v${mismatch.version} (expected v${canonicalVersion})`);
        printInfo(`  Match: "${mismatch.match}"`);
      }
    } else {
      printSuccess(`${check.name}: v${canonicalVersion} (${foundVersions.length} occurrence${foundVersions.length !== 1 ? 's' : ''})`);
    }

    // Check expected count if specified
    if (check.expectedCount && foundVersions.length !== check.expectedCount) {
      const warningMsg = `${check.file}: Found ${foundVersions.length} version strings, expected ${check.expectedCount}`;
      issues.push(warningMsg);
      printWarning(warningMsg);
    }
  }

  if (allMatch && issues.length === 0) {
    results.versionConsistency = { status: 'PASS', issues: [] };
    printSuccess(`All version numbers match: v${canonicalVersion}`);
  } else {
    results.versionConsistency = { status: 'FAIL', issues };
    exitCode = Math.max(exitCode, 2); // Critical
  }
}

// ============================================================================
// CHECK 2: STATUS CONSISTENCY
// ============================================================================

async function checkStatusConsistency() {
  printSection('CHECK 2: Status Consistency');

  const issues = [];

  // This is a simplified check - in practice, you'd want more sophisticated parsing
  const readmeContent = readFile('README.md');
  const claudeContent = readFile('CLAUDE.md');

  if (!readmeContent || !claudeContent) {
    issues.push('Cannot validate status - README.md or CLAUDE.md missing');
    results.statusConsistency = { status: 'WARN', issues };
    printWarning('README.md or CLAUDE.md not found');
    return;
  }

  // Check for obvious status inconsistencies
  const phaseNotStartedInReadme = /Phase \d+.*Not Started/i.test(readmeContent);
  const phaseInProgressInClaude = /Phase \d+.*In Progress|Phase \d+.*Complete/i.test(claudeContent);

  if (phaseNotStartedInReadme && phaseInProgressInClaude) {
    issues.push('Status inconsistency: README shows phase not started, but CLAUDE.md shows progress');
    printWarning('Possible phase status mismatch between README and CLAUDE.md');
  }

  // Check for "What's Working" section in CLAUDE.md
  if (claudeContent.includes('What\'s Working')) {
    printSuccess('CLAUDE.md "What\'s Working" section found');
  } else {
    issues.push('CLAUDE.md missing "What\'s Working" section');
    printWarning('CLAUDE.md: "What\'s Working" section not found');
  }

  // Check checkpoint index exists
  const checkpointIndexContent = readFile('docs/checkpoints/README.md');
  if (checkpointIndexContent) {
    printSuccess('Checkpoint index (docs/checkpoints/README.md) exists');
  } else {
    issues.push('Checkpoint index (docs/checkpoints/README.md) not found');
    printWarning('Checkpoint index not found');
  }

  if (issues.length === 0) {
    results.statusConsistency = { status: 'PASS', issues: [] };
  } else {
    results.statusConsistency = { status: 'WARN', issues };
    exitCode = Math.max(exitCode, 1); // Warning
  }
}

// ============================================================================
// CHECK 3: LINK VALIDATION
// ============================================================================

async function checkLinkValidation() {
  printSection('CHECK 3: Link Validation');

  const issues = [];

  // Files to check for markdown links
  const filesToCheck = [
    'README.md',
    'CLAUDE.md',
    'docs/checkpoints/README.md',
  ];

  // Pattern to match markdown links: [text](path.md)
  const linkPattern = /\[([^\]]+)\]\(([^)]+\.md[^)]*)\)/g;

  let totalLinks = 0;
  let brokenLinks = 0;

  for (const file of filesToCheck) {
    const content = readFile(file);
    if (!content) {
      printInfo(`${file}: File not found (skipping)`);
      continue;
    }

    const matches = [...content.matchAll(linkPattern)];
    if (matches.length === 0) {
      printInfo(`${file}: No markdown links found`);
      continue;
    }

    for (const match of matches) {
      const linkText = match[1];
      const linkPath = match[2];
      totalLinks++;

      // Remove anchor (#section) from path
      const pathWithoutAnchor = linkPath.split('#')[0];

      // Resolve relative path from file location
      const fileDir = path.dirname(path.join(projectRoot, file));
      const resolvedPath = path.resolve(fileDir, pathWithoutAnchor);

      if (!fs.existsSync(resolvedPath)) {
        brokenLinks++;
        issues.push(`${file}: Broken link to ${linkPath}`);
        printError(`${file}: Broken link "${linkText}" → ${linkPath}`);
      }
    }
  }

  if (totalLinks === 0) {
    printInfo('No markdown links found to validate');
    results.linkValidation = { status: 'PASS', issues: [] };
  } else if (brokenLinks === 0) {
    printSuccess(`All ${totalLinks} markdown links valid`);
    results.linkValidation = { status: 'PASS', issues: [] };
  } else {
    printWarning(`${brokenLinks} of ${totalLinks} links broken`);
    results.linkValidation = { status: 'WARN', issues };
    exitCode = Math.max(exitCode, 1); // Warning
  }
}

// ============================================================================
// CHECK 4: SECURITY CHECK
// ============================================================================

async function checkSecurity() {
  printSection('CHECK 4: Security Check');

  const issues = [];

  try {
    // Check for .env files outside root (excluding node_modules)
    const { stdout: envFiles } = await execAsync('find . -name ".env" -not -path "./node_modules/*" -not -path "./.env"');

    if (envFiles.trim()) {
      const files = envFiles.trim().split('\n');
      for (const file of files) {
        issues.push(`SECURITY: .env file found outside root: ${file}`);
        printError(`Stray .env file: ${file}`);
      }
    } else {
      printSuccess('No stray .env files found');
    }

    // Check for deprecated folders
    const { stdout: deprecatedFolders } = await execAsync('find . -type d \\( -name "*deprecated*" -o -name "*old*" -o -name "*backup*" \\) -not -path "./node_modules/*" 2>/dev/null || true');

    if (deprecatedFolders.trim()) {
      const folders = deprecatedFolders.trim().split('\n');
      for (const folder of folders) {
        issues.push(`WARNING: Deprecated folder found: ${folder}`);
        printWarning(`Deprecated folder: ${folder}`);
        printInfo('  Consider deleting if no longer needed');
      }
    } else {
      printSuccess('No deprecated folders found');
    }

    // Check .gitignore exists
    if (fs.existsSync(path.join(projectRoot, '.gitignore'))) {
      printSuccess('.gitignore file exists');
    } else {
      issues.push('WARNING: .gitignore file not found');
      printWarning('.gitignore not found');
    }

  } catch (error) {
    issues.push(`Error running security checks: ${error.message}`);
    printWarning(`Could not complete all security checks: ${error.message}`);
  }

  if (issues.length === 0) {
    results.securityCheck = { status: 'PASS', issues: [] };
  } else {
    // Determine if any critical security issues
    const criticalIssues = issues.filter(i => i.startsWith('SECURITY:'));
    if (criticalIssues.length > 0) {
      results.securityCheck = { status: 'FAIL', issues };
      exitCode = Math.max(exitCode, 2); // Critical
    } else {
      results.securityCheck = { status: 'WARN', issues };
      exitCode = Math.max(exitCode, 1); // Warning
    }
  }
}

// ============================================================================
// CHECK 5: GIT STATUS
// ============================================================================

async function checkGitStatus() {
  printSection('CHECK 5: Git Status');

  const issues = [];

  try {
    // Check current branch
    const { stdout: branch } = await execAsync('git branch --show-current');
    const currentBranch = branch.trim();

    if (currentBranch === 'main') {
      printSuccess(`Current branch: ${currentBranch}`);
    } else {
      issues.push(`Not on main branch (current: ${currentBranch})`);
      printWarning(`Current branch: ${currentBranch} (expected: main)`);
    }

    // Check working tree status
    const { stdout: status } = await execAsync('git status --porcelain');

    if (status.trim() === '') {
      printSuccess('Working tree clean');
    } else {
      const changedFiles = status.trim().split('\n').length;
      issues.push(`Working tree has ${changedFiles} uncommitted change(s)`);
      printWarning(`Working tree has ${changedFiles} uncommitted change(s)`);
      printInfo('  Run "git status" for details');
    }

  } catch (error) {
    issues.push(`Error checking git status: ${error.message}`);
    printWarning(`Could not check git status: ${error.message}`);
  }

  if (issues.length === 0) {
    results.gitStatus = { status: 'PASS', issues: [] };
  } else {
    results.gitStatus = { status: 'WARN', issues };
    exitCode = Math.max(exitCode, 1); // Warning
  }
}

// ============================================================================
// SUMMARY
// ============================================================================

function printSummary() {
  printHeader('AUDIT SUMMARY');

  const checks = [
    { name: 'Version Consistency', result: results.versionConsistency },
    { name: 'Status Consistency', result: results.statusConsistency },
    { name: 'Link Validation', result: results.linkValidation },
    { name: 'Security Check', result: results.securityCheck },
    { name: 'Git Status', result: results.gitStatus },
  ];

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const statusIcon =
      check.result.status === 'PASS' ? `${colors.green}✅${colors.reset}` :
      check.result.status === 'WARN' ? `${colors.yellow}⚠️${colors.reset}` :
      check.result.status === 'FAIL' ? `${colors.red}❌${colors.reset}` :
      '❓';

    console.log(`${statusIcon} ${check.name}: ${colors.bold}${check.result.status}${colors.reset}`);

    if (check.result.status === 'PASS') passCount++;
    if (check.result.status === 'WARN') warnCount++;
    if (check.result.status === 'FAIL') failCount++;
  }

  console.log('');
  console.log(`${colors.bold}OVERALL: ${passCount}/5 PASS${colors.reset}` +
    (warnCount > 0 ? `, ${warnCount} WARNING${warnCount !== 1 ? 'S' : ''}` : '') +
    (failCount > 0 ? `, ${failCount} FAILURE${failCount !== 1 ? 'S' : ''}` : ''));

  // Print recommended actions
  if (failCount > 0) {
    console.log('');
    printError('Action Required: Fix critical issues before proceeding');
    console.log('');
    console.log('Recommended steps:');
    console.log('1. Review issues above');
    console.log('2. Fix all critical (❌) issues');
    console.log('3. Re-run this script until all checks pass');
    console.log('4. Commit fixes: git commit -m "docs: pre-checkpoint consistency fixes"');
  } else if (warnCount > 0) {
    console.log('');
    printWarning('Warnings found - review and fix if needed');
  } else {
    console.log('');
    printSuccess('All checks passed - ready to proceed with checkpoint!');
  }

  console.log('');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  printHeader('PRE-CHECKPOINT CONSISTENCY AUDIT');

  console.log('Purpose: Validate version numbers, status, links, and security');
  console.log('Part of the Unified Development Methodology');
  console.log('See: docs/development/pre-checkpoint-audit.md');

  await checkVersionConsistency();
  await checkStatusConsistency();
  await checkLinkValidation();
  await checkSecurity();
  await checkGitStatus();

  printSummary();

  process.exit(exitCode);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(2);
});
