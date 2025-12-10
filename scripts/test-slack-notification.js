#!/usr/bin/env node
/**
 * Test Slack notification for saved transcripts
 * Run: node scripts/test-slack-notification.js
 *
 * Requires: SLACK_WEBHOOK_URL or SLACK_TRANSCRIPT_WEBHOOK_URL in .env
 */

import 'dotenv/config';

const webhookUrl = process.env.SLACK_TRANSCRIPT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
  console.error('❌ No Slack webhook URL configured');
  console.error('   Set SLACK_WEBHOOK_URL or SLACK_TRANSCRIPT_WEBHOOK_URL in .env');
  process.exit(1);
}

// Test notification payload (simulates a real transcript save)
const testData = {
  title: 'Tom-Ryan-biweekly-session (TEST)',
  coach: 'Ryan Vaughn',
  client: 'Thomas Mumford',
  sessionType: 'client_coaching',
  chunks: 15,
  syncMethod: 'test',
  sessionDate: new Date().toISOString().split('T')[0]
};

const typeEmojis = {
  client_coaching: '🎯',
  internal_meeting: '🏢',
  staff_1on1: '👥',
  training: '📚',
  sales_call: '💼',
  personal_development: '🌱',
  '360_interview': '🔄',
  networking: '🤝',
  unmatched_client: '❓',
  untagged: '📝'
};

const emoji = typeEmojis[testData.sessionType] || '📝';
const clientInfo = testData.client ? `*Client:* ${testData.client}` : '_No client linked_';
const dateInfo = new Date(testData.sessionDate).toLocaleDateString();

const payload = {
  text: `${emoji} New Transcript Saved (TEST)`,
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} New Transcript Saved (TEST)`,
        emoji: true
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${testData.title}*`
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Coach:*\n${testData.coach}` },
        { type: 'mrkdwn', text: clientInfo },
        { type: 'mrkdwn', text: `*Type:*\n${testData.sessionType}` },
        { type: 'mrkdwn', text: `*Date:*\n${dateInfo}` },
        { type: 'mrkdwn', text: `*Chunks:*\n${testData.chunks}` },
        { type: 'mrkdwn', text: `*Via:*\n${testData.syncMethod}` }
      ]
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🧪 This is a test notification sent at ${new Date().toLocaleString()}`
        }
      ]
    }
  ]
};

console.log('📤 Sending test notification to Slack...');
console.log(`   Webhook: ${webhookUrl.substring(0, 50)}...`);

try {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log('✅ Test notification sent successfully!');
    console.log('   Check #unified-data-layer channel');
  } else {
    console.error(`❌ Failed: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(`   Response: ${text}`);
  }
} catch (error) {
  console.error('❌ Error sending notification:', error.message);
}
