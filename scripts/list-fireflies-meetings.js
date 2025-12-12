#!/usr/bin/env node
/**
 * List all Fireflies meetings from this week
 * Run: node scripts/list-fireflies-meetings.js
 */

import 'dotenv/config';

const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY;
if (!FIREFLIES_API_KEY) {
  console.error('No FIREFLIES_API_KEY in .env');
  process.exit(1);
}

const query = `
  query {
    transcripts(limit: 50) {
      id
      title
      date
      dateString
      duration
      organizer_email
      host_email
      participants
    }
  }
`;

const response = await fetch('https://api.fireflies.ai/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${FIREFLIES_API_KEY}`
  },
  body: JSON.stringify({ query })
});

const data = await response.json();
if (data.errors) {
  console.error('GraphQL errors:', JSON.stringify(data.errors, null, 2));
  process.exit(1);
}

// Filter by days (default 30, can pass as arg)
const daysBack = parseInt(process.argv[2]) || 30;
const cutoff = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
const filtered = data.data.transcripts.filter(t => t.date >= cutoff);

console.log(`\nMeetings from last ${daysBack} days (${filtered.length} total, API returned ${data.data.transcripts.length}):`);
console.log('='.repeat(80));

filtered.sort((a, b) => b.date - a.date).forEach(t => {
  const date = new Date(t.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const duration = Math.round(t.duration / 60);
  console.log(`${date} | ${duration}min | ${t.title}`);
  console.log(`         Organizer: ${t.organizer_email || 'N/A'}`);
  console.log('');
});
