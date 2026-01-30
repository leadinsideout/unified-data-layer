#!/usr/bin/env node
/**
 * Test session type detection patterns
 * Run: node scripts/test-session-type-detection.js
 */

import { detectSessionType } from '../api/integrations/fireflies.js';

const testCases = [
  // Internal meetings
  { title: 'IO Co-Creation Call', expected: 'internal_meeting' },
  { title: 'IO AI Meeting - December', expected: 'internal_meeting' },
  { title: 'E7 Oppty Review', expected: 'internal_meeting' },
  { title: 'Coach AI Monthly Sync', expected: 'internal_meeting' },
  { title: 'Retro Call- Kelly- Tim - Ryan', expected: 'internal_meeting' },
  { title: 'Ryan-Jason-Matt discuss strategic framework', expected: 'internal_meeting' },
  { title: 'SixTwentySix _ Inside-Out Leadership- Operating System', expected: 'internal_meeting' },
  { title: 'Collab chat with Bamboo Ann Arbor', expected: 'internal_meeting' },

  // Staff 1:1s
  { title: 'Jem - Ryan weekly', expected: 'staff_1on1' },
  { title: 'Ryan - Jem sync', expected: 'staff_1on1' },
  { title: 'Harry - Ryan Connect', expected: 'staff_1on1' },
  { title: 'Scott - Ryan check-in', expected: 'staff_1on1' },
  { title: 'Catch up with Pranab', expected: 'staff_1on1' },

  // Training
  { title: 'Hakomi Practice Session', expected: 'training' },
  { title: 'Facilitator Training Module 3', expected: 'training' },
  { title: 'PEF Workshop', expected: 'training' },
  { title: 'Office Hours - December', expected: 'training' },

  // Sales calls
  { title: 'Barron Caster Fit Call', expected: 'sales_call' },
  { title: 'I-O Fit Call with Sarah', expected: 'sales_call' },
  { title: 'Jonny - I-O coach matching', expected: 'sales_call' },

  // Personal development
  { title: 'Amita IFS Session', expected: 'personal_development' },
  { title: 'IFS Practice with Amita', expected: 'personal_development' },

  // 360 interviews
  { title: '360-Interview-Jameson-Ryan', expected: '360_interview' },
  { title: '360 Review - Client Stakeholder', expected: '360_interview' },

  // Other coach sessions
  { title: 'Andrea-Jason session', expected: 'other_coach_session' },
  { title: 'Andrea - Jason biweekly', expected: 'other_coach_session' },

  // Client coaching (with client match)
  { title: 'Tom - Ryan biweekly session', expected: 'client_coaching', hasClient: true },
  { title: 'Amar and Ryan coaching', expected: 'client_coaching', hasClient: true },
  { title: 'Regular meeting', expected: 'client_coaching', hasClient: true },

  // Unmatched clients (patterns suggest client session but no match)
  { title: 'Tom - Ryan biweekly session', expected: 'unmatched_client', hasClient: false },
  { title: 'Copy of Pete - Ryan session', expected: 'unmatched_client', hasClient: false },

  // Networking
  { title: 'Ryan Vaughn and Amanda Lewan', expected: 'networking' },
  { title: 'Fritz Lensch & Ryan Vaughn', expected: 'networking' },
  { title: 'Ryan Vaughn _ Mike Del Ponte', expected: 'networking' },

  // Untagged (should catch edge cases)
  { title: 'Unknown Random Meeting', expected: 'untagged' },
  { title: 'Quick sync', expected: 'untagged' }
];

console.log('='.repeat(70));
console.log('SESSION TYPE DETECTION TEST');
console.log('='.repeat(70));
console.log('');

let passed = 0;
let failed = 0;

for (const { title, expected, hasClient } of testCases) {
  const result = detectSessionType(title, hasClient || false);
  const status = result === expected ? '✓' : '✗';

  if (result === expected) {
    passed++;
    console.log(`${status} "${title.substring(0, 45).padEnd(45)}" → ${result}`);
  } else {
    failed++;
    console.log(`${status} "${title.substring(0, 45).padEnd(45)}" → ${result} (expected: ${expected})`);
  }
}

console.log('');
console.log('='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);
console.log('='.repeat(70));

if (failed > 0) {
  process.exit(1);
}
