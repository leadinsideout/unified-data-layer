/**
 * Fireflies.ai Integration Module
 *
 * Provides webhook receiver and transcript fetching for automatic
 * coaching session ingestion from Fireflies.ai.
 *
 * Flow:
 * 1. Fireflies sends webhook when transcript is ready
 * 2. We verify the webhook signature (HMAC SHA-256)
 * 3. Fetch full transcript via GraphQL API
 * 4. Match coach by email
 * 5. Process: chunk → PII scrub → embed → store
 */

import crypto from 'crypto';
import express from 'express';

// Fireflies GraphQL endpoint
const FIREFLIES_API_URL = 'https://api.fireflies.ai/graphql';

/**
 * Parse Fireflies API keys from environment
 * Supports both standard key and admin key configurations
 *
 * Environment variables:
 * - FIREFLIES_API_KEY: Standard API key (team-visible transcripts only)
 * - FIREFLIES_ADMIN_API_KEY: Super Admin API key (accesses ALL transcripts including private)
 *   Format: {"coach_id":"api_key"} - Maps the admin key to a specific coach for attribution
 *   Example: {"9185bd98-a828-414f-b335-c607b4ac3d11":"3c08617c-xxxx-yyyy-zzzz-xxxxxxxxxxxx"}
 *
 * @returns {Object} Configuration object with:
 *   - defaultKey: string|null - The standard API key (from FIREFLIES_API_KEY)
 *   - adminKey: {key, coachId}|null - The admin key with associated coach
 *   - allKeys: Array<{key, coachId, label}> - All configured keys for iteration
 */
export function getFirefliesApiKeys() {
  const defaultKey = process.env.FIREFLIES_API_KEY || null;
  const allKeys = [];
  let adminKey = null;

  // Parse FIREFLIES_ADMIN_API_KEY JSON if present
  // Format: {"coach_id":"api_key"} - single admin key mapped to a coach for attribution
  const adminKeyJson = process.env.FIREFLIES_ADMIN_API_KEY;
  if (adminKeyJson) {
    try {
      const parsed = JSON.parse(adminKeyJson);
      const entries = Object.entries(parsed);
      if (entries.length > 0) {
        const [coachId, apiKey] = entries[0];
        if (coachId && apiKey) {
          adminKey = { key: apiKey, coachId };
          allKeys.push({
            key: apiKey,
            coachId,
            label: 'admin'
          });
          console.log(`[Fireflies] Loaded admin API key (attributed to coach ${coachId.substring(0, 8)}...)`);
        }
      }
    } catch (e) {
      console.error('[Fireflies] Failed to parse FIREFLIES_ADMIN_API_KEY JSON:', e.message);
    }
  }

  // Add default key if configured and different from admin key
  if (defaultKey) {
    const defaultAlreadyIncluded = allKeys.some(k => k.key === defaultKey);
    if (!defaultAlreadyIncluded) {
      allKeys.unshift({
        key: defaultKey,
        coachId: null,
        label: 'default'
      });
    }
  }

  return {
    defaultKey,
    adminKey,
    allKeys,
    hasAnyKey: allKeys.length > 0,
    hasAdminKey: !!adminKey
  };
}

/**
 * Send Slack notification for admin alerts
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Main message text
 * @param {Object[]} options.fields - Optional fields for structured data
 * @param {string} options.color - Attachment color (warning, danger, good)
 * @param {string} options.channel - Which webhook to use: 'admin' or 'transcript'
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendSlackNotification({ title, message, fields = [], color = 'warning', channel = 'admin' }) {
  // Select webhook URL based on channel
  const webhookUrl = channel === 'transcript'
    ? process.env.SLACK_TRANSCRIPT_WEBHOOK_URL
    : (process.env.SLACK_ADMIN_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL);
  if (!webhookUrl) {
    console.log('[Fireflies] No Slack webhook URL configured, skipping notification');
    return false;
  }

  try {
    const payload = {
      text: title,
      attachments: [{
        color: color === 'warning' ? '#FFA500' : color === 'danger' ? '#FF0000' : '#36A64F',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: title
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          }
        ]
      }]
    };

    // Add fields if provided
    if (fields.length > 0) {
      payload.attachments[0].blocks.push({
        type: 'section',
        fields: fields.map(f => ({
          type: 'mrkdwn',
          text: `*${f.title}:*\n${f.value}`
        }))
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[Fireflies] Slack notification failed:', response.status);
      return false;
    }

    console.log('[Fireflies] Slack notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Fireflies] Slack notification error:', error.message);
    return false;
  }
}

/**
 * Send notification when a transcript is saved to the database
 * @param {Object} options - Notification options
 * @param {string} options.title - Transcript title
 * @param {string} options.coach - Coach name
 * @param {string} options.client - Client name (or null)
 * @param {string} options.sessionType - Session type tag
 * @param {number} options.chunks - Number of chunks created
 * @param {string} options.syncMethod - How it was synced (webhook, polling, import)
 * @param {string} options.sessionDate - Session date
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendTranscriptSavedNotification({ title, coach, client, sessionType, chunks, syncMethod, sessionDate }) {
  // Use dedicated transcript webhook, or fall back to general webhook
  const webhookUrl = process.env.SLACK_TRANSCRIPT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Fireflies] No Slack webhook URL configured, skipping transcript notification');
    return false;
  }

  try {
    // Determine emoji based on session type
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
    const emoji = typeEmojis[sessionType] || '📝';

    // Build the message
    const clientInfo = client ? `*Client:* ${client}` : '_No client linked_';
    const dateInfo = sessionDate ? new Date(sessionDate).toLocaleDateString() : 'Unknown';

    const payload = {
      text: `${emoji} New Transcript Saved`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} New Transcript Saved`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${title}*`
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Coach:*\n${coach}` },
            { type: 'mrkdwn', text: clientInfo },
            { type: 'mrkdwn', text: `*Type:*\n${sessionType}` },
            { type: 'mrkdwn', text: `*Date:*\n${dateInfo}` },
            { type: 'mrkdwn', text: `*Chunks:*\n${chunks}` },
            { type: 'mrkdwn', text: `*Via:*\n${syncMethod}` }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Synced at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('[Fireflies] Transcript notification failed:', response.status);
      return false;
    }

    console.log('[Fireflies] Transcript saved notification sent');
    return true;
  } catch (error) {
    console.error('[Fireflies] Transcript notification error:', error.message);
    return false;
  }
}

/**
 * Detect session type based on meeting title patterns
 * Used to automatically categorize incoming transcripts
 *
 * @param {string} title - Meeting title from Fireflies
 * @param {boolean} hasClientMatch - Whether a client was matched
 * @returns {string} - Session type identifier
 */
export function detectSessionType(title, hasClientMatch = false) {
  if (!title) {
    return hasClientMatch ? 'client_coaching' : 'untagged';
  }

  const t = title.toLowerCase();

  // Internal meetings - IO company meetings, strategy, alignment
  if (t.includes('io co-creation') || t.includes('io-co-creation') ||
      t.includes('io ai meeting') || t.includes('io ai ') ||
      t.includes('io vision') || t.includes('new fs thing') ||
      t.includes('hampton') && t.includes('moderator') ||
      t.includes('e7 ') || t.includes('e7-') ||
      t.includes('coach ai') || t.includes('coachgpt') ||
      t.includes('retro call') || t.includes('retro meeting') || t.includes('retro for') ||
      t.includes('strategic framework') || t.includes('align on') ||
      t.includes('touch base') || t.includes('discuss bamboo') ||
      t.includes('structure on embedding') || t.includes('operating system') ||
      t.includes('service delivery') || t.includes('proposal review') ||
      t.includes('copiloting') || t.includes('collab chat')) {
    return 'internal_meeting';
  }

  // Staff 1:1s
  if (t.includes('jem') || t.includes('ryan - jem') || t.includes('jem -') ||
      t.includes('harry - ryan') || t.includes('harry-ryan') ||
      t.includes('derek-ryan') || t.includes('derek - ryan') ||
      t.includes('scott - ryan') || t.includes('scott-ryan') ||
      t.includes('santi and ryan') || t.includes('ryan - santi') ||
      t.includes('pranab')) {
    return 'staff_1on1';
  }

  // Training sessions
  if (t.includes('hakomi') || t.includes('facilitator') || t.includes('pef ') ||
      t.includes('training') || t.includes('office hours')) {
    return 'training';
  }

  // Sales/fit calls
  if (t.includes('fit call') || t.includes('fit-call') ||
      t.includes('i-o fit') || t.includes('io fit') ||
      t.includes('coach matching')) {
    return 'sales_call';
  }

  // Personal development
  if (t.includes('amita') || t.includes('ifs ')) {
    return 'personal_development';
  }

  // 360 interviews
  if (t.includes('360') && (t.includes('interview') || t.includes('review'))) {
    return '360_interview';
  }

  // Other coach sessions (sessions for other coaches' clients)
  if (t.includes('andrea-jason') || t.includes('andrea - jason')) {
    return 'other_coach_session';
  }

  // Client coaching - if we matched a client, it's coaching
  if (hasClientMatch) {
    return 'client_coaching';
  }

  // Check for "Copy of" pattern first - these are always unmatched client copies
  if (t.startsWith('copy of')) {
    return 'unmatched_client';
  }

  // Check for common coaching session patterns that indicate client sessions
  // even if no client match (for future linking)
  if (t.includes('biweekly') || t.includes('bi-weekly') ||
      t.includes('coaching session') || t.includes('session-transcript')) {
    // Look for name patterns that suggest it's a client session
    // Format: "Name - Coach biweekly" or "Name and Coach"
    const namePatterns = [
      /^([a-z]+)\s*[-&]\s*ryan/i,           // "Tom - Ryan", "Nick & Ryan"
      /^([a-z]+\s+[a-z]+)\s*[-&]\s*ryan/i,  // "First Last - Ryan"
      /ryan\s*[-&]\s*([a-z]+)/i             // "Ryan - Tom"
    ];

    for (const pattern of namePatterns) {
      if (pattern.test(title)) {
        return 'unmatched_client';
      }
    }
  }

  // Networking/external calls - named individuals without "session" context
  if (t.match(/ryan\s*(vaughn)?\s*(and|&|_)\s*[a-z]+/i) ||
      t.match(/[a-z]+\s*(and|&|_)\s*ryan\s*vaughn/i)) {
    return 'networking';
  }

  // Default - untagged for manual review
  return 'untagged';
}

/**
 * Chunk text into smaller pieces for embedding
 * Matches base-processor.js chunking logic: 500 words with 50 word overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Words per chunk (default: 500)
 * @param {number} overlap - Overlap words between chunks (default: 50)
 * @returns {string[]} - Array of text chunks
 */
function chunkText(text, chunkSize = 500, overlap = 50) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);

  if (words.length <= chunkSize) {
    return [text.trim()];
  }

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));

    // Move start forward, accounting for overlap
    start += chunkSize - overlap;

    // If we're close to the end, break to avoid tiny final chunks
    if (start + overlap >= words.length) break;
  }

  return chunks;
}

/**
 * Verify Fireflies webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - x-hub-signature header value
 * @param {string} secret - Webhook secret from Fireflies dashboard
 * @returns {boolean} - Whether signature is valid
 */
export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (e) {
    return false;
  }
}

/**
 * Fetch transcript from Fireflies GraphQL API
 * @param {string} meetingId - Fireflies meeting/transcript ID
 * @param {string} apiKey - Fireflies API key
 * @returns {Object} - Transcript data
 */
export async function fetchTranscript(meetingId, apiKey) {
  const query = `
    query Transcript($transcriptId: String!) {
      transcript(id: $transcriptId) {
        id
        title
        date
        dateString
        duration
        host_email
        organizer_email
        participants
        transcript_url
        sentences {
          index
          speaker_id
          speaker_name
          text
          raw_text
          start_time
          end_time
        }
        speakers {
          id
          name
        }
        summary {
          keywords
          action_items
          outline
          shorthand_bullet
          overview
        }
        meeting_attendees {
          displayName
          email
          name
        }
      }
    }
  `;

  const response = await fetch(FIREFLIES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query,
      variables: { transcriptId: meetingId }
    })
  });

  if (!response.ok) {
    throw new Error(`Fireflies API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`Fireflies GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data.transcript;
}

/**
 * Convert Fireflies transcript to our format
 * @param {Object} transcript - Fireflies transcript object
 * @returns {Object} - Formatted transcript for our system
 */
export function formatTranscript(transcript) {
  // Build the transcript text from sentences
  const transcriptText = transcript.sentences
    .map(s => `${s.speaker_name}: ${s.text}`)
    .join('\n');

  // Extract participant names
  const participants = transcript.meeting_attendees
    ?.map(a => a.displayName || a.name || a.email)
    .filter(Boolean) || transcript.participants || [];

  // Build metadata
  const metadata = {
    source: 'fireflies',
    fireflies_id: transcript.id,
    duration_seconds: transcript.duration,
    transcript_url: transcript.transcript_url,
    speakers: transcript.speakers,
    summary: transcript.summary,
    participants: participants
  };

  return {
    title: transcript.title || `Coaching Session - ${transcript.dateString}`,
    content: transcriptText,
    session_date: transcript.date ? new Date(transcript.date).toISOString().split('T')[0] : null,
    host_email: transcript.host_email,
    organizer_email: transcript.organizer_email,
    metadata
  };
}

/**
 * Find coach by email address
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email to search for
 * @returns {Object|null} - Coach record or null
 */
export async function findCoachByEmail(supabase, email) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('coaches')
    .select('id, name, email, coaching_company_id')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Find client by email address
 * @param {Object} supabase - Supabase client
 * @param {string} email - Email to search for
 * @returns {Object|null} - Client record with organization or null
 */
export async function findClientByEmail(supabase, email) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, client_organization_id, primary_coach_id')
    .eq('email', email.toLowerCase())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Find coach by ID
 * @param {Object} supabase - Supabase client
 * @param {string} coachId - Coach UUID
 * @returns {Object|null} - Coach record or null
 */
export async function findCoachById(supabase, coachId) {
  if (!coachId) return null;

  const { data, error } = await supabase
    .from('coaches')
    .select('id, name, email, coaching_company_id')
    .eq('id', coachId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Match participants from Fireflies meeting to our database entities
 * Identifies coach, client, and organization from attendee list
 *
 * PRIORITY ORDER for coach matching:
 * 1. Organizer email (meeting owner is most likely the coach)
 * 2. Host email (if different from organizer)
 * 3. Other attendees
 * 4. Fallback coach ID (if provided, used when email matching fails)
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} transcript - Formatted transcript with host_email, organizer_email
 * @param {Array} attendees - Array of {email, name, displayName} from Fireflies
 * @param {Object} options - Optional settings
 * @param {string} options.fallbackCoachId - Coach ID to use if no email match (e.g., API key owner)
 * @returns {Object} - { coach, client, organization_id, unmatched_emails, matched_via }
 */
export async function matchParticipants(supabase, transcript, attendees, options = {}) {
  const { fallbackCoachId } = options;
  const result = {
    coach: null,
    client: null,
    organization_id: null,
    unmatched_emails: [],
    matched_via: null  // 'email', 'primary_coach', or 'api_key_owner'
  };

  // Build ordered list of emails to check - organizer first, then host, then attendees
  // Use array to preserve priority order (Set iteration order is not guaranteed)
  const emailsToCheck = [];
  const seenEmails = new Set();

  // Priority 1: Organizer (meeting creator - most likely to be the coach)
  if (transcript.organizer_email) {
    const email = transcript.organizer_email.toLowerCase();
    if (!seenEmails.has(email)) {
      emailsToCheck.push(email);
      seenEmails.add(email);
    }
  }

  // Priority 2: Host (if different from organizer)
  if (transcript.host_email) {
    const email = transcript.host_email.toLowerCase();
    if (!seenEmails.has(email)) {
      emailsToCheck.push(email);
      seenEmails.add(email);
    }
  }

  // Priority 3: Other attendees
  if (attendees && Array.isArray(attendees)) {
    for (const attendee of attendees) {
      if (attendee.email) {
        const email = attendee.email.toLowerCase();
        if (!seenEmails.has(email)) {
          emailsToCheck.push(email);
          seenEmails.add(email);
        }
      }
    }
  }

  // Check each email in priority order - organizer first
  for (const email of emailsToCheck) {
    // First try to match as coach (organizer most likely to be coach)
    if (!result.coach) {
      const coach = await findCoachByEmail(supabase, email);
      if (coach) {
        result.coach = coach;
        result.matched_via = 'email';
        continue;
      }
    }

    // Then try to match as client
    if (!result.client) {
      const client = await findClientByEmail(supabase, email);
      if (client) {
        result.client = client;
        result.organization_id = client.client_organization_id;
        continue;
      }
    }

    // Track unmatched emails for debugging/manual assignment
    result.unmatched_emails.push(email);
  }

  // If we found a client but no coach, try to use the client's primary coach
  if (result.client && !result.coach && result.client.primary_coach_id) {
    const { data: primaryCoach } = await supabase
      .from('coaches')
      .select('id, name, email, coaching_company_id')
      .eq('id', result.client.primary_coach_id)
      .single();

    if (primaryCoach) {
      result.coach = primaryCoach;
      result.matched_via = 'primary_coach';
    }
  }

  // Fallback to API key owner if provided and still no coach match
  // This handles "Only Me" transcripts where the coach's email isn't in attendee list
  if (!result.coach && fallbackCoachId) {
    const fallbackCoach = await findCoachById(supabase, fallbackCoachId);
    if (fallbackCoach) {
      result.coach = fallbackCoach;
      result.matched_via = 'api_key_owner';
      console.log(`[Fireflies] Coach matched via API key owner fallback: ${fallbackCoach.name}`);
    }
  }

  return result;
}

/**
 * Create Express routes for Fireflies integration
 * @param {Object} supabase - Supabase client
 * @param {Object} openai - OpenAI client
 * @returns {express.Router} - Express router
 */
export function createFirefliesRoutes(supabase, openai) {
  const router = express.Router();

  // Get config from environment
  const FIREFLIES_API_KEY = process.env.FIREFLIES_API_KEY;
  const FIREFLIES_WEBHOOK_SECRET = process.env.FIREFLIES_WEBHOOK_SECRET;

  /**
   * Webhook endpoint for Fireflies notifications
   * POST /api/integrations/fireflies/webhook
   *
   * Note: We use express.raw() to get the raw body for signature verification
   */
  router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const startTime = Date.now();

    try {
      // Get raw body for signature verification
      const rawBody = req.body.toString('utf8');

      // Verify webhook signature if secret is configured
      if (FIREFLIES_WEBHOOK_SECRET) {
        const signature = req.headers['x-hub-signature'];

        if (!verifyWebhookSignature(rawBody, signature, FIREFLIES_WEBHOOK_SECRET)) {
          console.error('[Fireflies] Invalid webhook signature');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // Parse the webhook payload
      const payload = JSON.parse(rawBody);
      const { meetingId, eventType, clientReferenceId } = payload;

      console.log(`[Fireflies] Webhook received: ${eventType} for meeting ${meetingId}`);

      // Only process transcription complete events
      if (eventType !== 'Transcription completed') {
        return res.json({
          status: 'ignored',
          reason: `Event type '${eventType}' not processed`
        });
      }

      if (!FIREFLIES_API_KEY) {
        console.error('[Fireflies] FIREFLIES_API_KEY not configured');
        return res.status(500).json({ error: 'Fireflies API key not configured' });
      }

      // Fetch the full transcript
      console.log(`[Fireflies] Fetching transcript ${meetingId}...`);
      const transcript = await fetchTranscript(meetingId, FIREFLIES_API_KEY);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      // Format transcript for our system
      const formattedTranscript = formatTranscript(transcript);

      // Match all participants (coach, client, organization) from attendee emails
      const matches = await matchParticipants(
        supabase,
        formattedTranscript,
        transcript.meeting_attendees
      );

      if (!matches.coach) {
        console.warn(`[Fireflies] No coach found for meeting ${meetingId}`);
        console.warn(`[Fireflies] Checked emails: ${formattedTranscript.host_email}, ${formattedTranscript.organizer_email}`);
        if (matches.unmatched_emails.length > 0) {
          console.warn(`[Fireflies] Unmatched attendee emails: ${matches.unmatched_emails.join(', ')}`);
        }

        // Store in a queue for manual review instead of failing
        const { error: queueError } = await supabase
          .from('fireflies_pending')
          .insert({
            meeting_id: meetingId,
            host_email: formattedTranscript.host_email,
            organizer_email: formattedTranscript.organizer_email,
            title: formattedTranscript.title,
            transcript_data: {
              ...formattedTranscript,
              attendees: transcript.meeting_attendees,
              unmatched_emails: matches.unmatched_emails
            },
            status: 'pending_coach_assignment'
          });

        if (queueError) {
          console.error('[Fireflies] Failed to queue transcript:', queueError);
        }

        return res.json({
          status: 'queued',
          reason: 'No matching coach found - queued for manual assignment',
          meeting_id: meetingId,
          unmatched_emails: matches.unmatched_emails
        });
      }

      // Process and store the transcript with all matched relationships
      console.log(`[Fireflies] Processing transcript for coach: ${matches.coach.name}`);
      if (matches.client) {
        console.log(`[Fireflies] Matched client: ${matches.client.name}`);
      }
      if (matches.organization_id) {
        console.log(`[Fireflies] Matched organization: ${matches.organization_id}`);
      }

      // Detect session type based on title and client match
      const sessionType = detectSessionType(formattedTranscript.title, !!matches.client);
      console.log(`[Fireflies] Detected session type: ${sessionType}`);

      const chunks = chunkText(formattedTranscript.content);

      // Create data item with all relationship fields populated
      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${meetingId}`,
            session_type: sessionType,
            unmatched_emails: matches.unmatched_emails
          },
          coach_id: matches.coach.id,
          client_id: matches.client?.id || null,
          client_organization_id: matches.organization_id || null,
          session_date: formattedTranscript.session_date
        })
        .select()
        .single();

      if (itemError) {
        throw new Error(`Failed to create data item: ${itemError.message}`);
      }

      // Generate embeddings and store chunks
      let chunksProcessed = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Generate embedding
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk
        });
        const embedding = embeddingResponse.data[0].embedding;

        // Store chunk with embedding
        const { error: chunkError } = await supabase
          .from('data_chunks')
          .insert({
            data_item_id: dataItem.id,
            chunk_index: i,
            content: chunk,
            embedding,
            metadata: { source: 'fireflies', meeting_id: meetingId }
          });

        if (chunkError) {
          console.error(`[Fireflies] Failed to store chunk ${i}:`, chunkError);
        } else {
          chunksProcessed++;
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Fireflies] Processed ${chunksProcessed}/${chunks.length} chunks in ${elapsed}ms`);

      // Send notification about saved transcript
      await sendTranscriptSavedNotification({
        title: formattedTranscript.title,
        coach: matches.coach.name,
        client: matches.client?.name || null,
        sessionType,
        chunks: chunksProcessed,
        syncMethod: 'webhook',
        sessionDate: formattedTranscript.session_date
      });

      return res.json({
        status: 'processed',
        data_item_id: dataItem.id,
        coach: matches.coach.name,
        client: matches.client?.name || null,
        client_id: matches.client?.id || null,
        organization_id: matches.organization_id || null,
        chunks_processed: chunksProcessed,
        elapsed_ms: elapsed
      });

    } catch (error) {
      console.error('[Fireflies] Webhook error:', error);
      return res.status(500).json({
        error: 'Failed to process webhook',
        message: error.message
      });
    }
  });

  /**
   * Manual import endpoint - for testing or re-processing
   * POST /api/integrations/fireflies/import
   *
   * Body params:
   * - meeting_id: Required - Fireflies meeting ID
   * - coach_id: Optional - Override coach assignment
   * - api_key_label: Optional - Which API key to use (e.g., 'default', 'coach-9185bd98')
   */
  router.post('/import', express.json(), async (req, res) => {
    try {
      const { meeting_id, coach_id, api_key_label } = req.body;

      if (!meeting_id) {
        return res.status(400).json({ error: 'meeting_id is required' });
      }

      // Get API key configuration
      const apiKeyConfig = getFirefliesApiKeys();
      if (!apiKeyConfig.hasAnyKey) {
        return res.status(500).json({ error: 'No Fireflies API keys configured' });
      }

      // Select which API key to use
      let selectedKey = apiKeyConfig.allKeys[0]; // Default to first key
      let fallbackCoachId = null;

      if (api_key_label) {
        const foundKey = apiKeyConfig.allKeys.find(k => k.label === api_key_label);
        if (!foundKey) {
          return res.status(400).json({
            error: `API key '${api_key_label}' not found`,
            available_keys: apiKeyConfig.allKeys.map(k => k.label)
          });
        }
        selectedKey = foundKey;
      }

      // If using a coach-specific key, set up fallback coach matching
      if (selectedKey.coachId) {
        fallbackCoachId = selectedKey.coachId;
      }

      console.log(`[Fireflies Import] Using API key: ${selectedKey.label}`);

      // Fetch transcript using selected API key
      const transcript = await fetchTranscript(meeting_id, selectedKey.key);
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      const formattedTranscript = formatTranscript(transcript);

      // Match all participants from the meeting (with optional coach fallback)
      const matches = await matchParticipants(
        supabase,
        formattedTranscript,
        transcript.meeting_attendees,
        { fallbackCoachId }
      );

      // If coach_id is explicitly provided, use that instead of auto-match
      let coach = matches.coach;
      if (coach_id) {
        const { data } = await supabase
          .from('coaches')
          .select('id, name, email, coaching_company_id')
          .eq('id', coach_id)
          .single();
        coach = data;
      }

      if (!coach) {
        return res.status(400).json({
          error: 'Coach not found',
          hint: 'Provide coach_id or ensure coach email matches Fireflies host/organizer',
          unmatched_emails: matches.unmatched_emails
        });
      }

      // Detect session type based on title and client match
      const sessionType = detectSessionType(formattedTranscript.title, !!matches.client);

      // Process transcript with all matched relationships
      const chunks = chunkText(formattedTranscript.content);

      // Determine matched_via - if coach_id was explicitly provided, note that
      const matchedVia = coach_id ? 'explicit_override' : (matches.matched_via || 'unknown');

      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${meeting_id}`,
            session_type: sessionType,
            synced_via: 'manual_import',
            api_key_label: selectedKey.label,
            matched_via: matchedVia,
            unmatched_emails: matches.unmatched_emails
          },
          coach_id: coach.id,
          client_id: matches.client?.id || null,
          client_organization_id: matches.organization_id || null,
          session_date: formattedTranscript.session_date
        })
        .select()
        .single();

      if (itemError) {
        throw new Error(`Failed to create data item: ${itemError.message}`);
      }

      // Generate embeddings
      let chunksProcessed = 0;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk
        });

        await supabase.from('data_chunks').insert({
          data_item_id: dataItem.id,
          chunk_index: i,
          content: chunk,
          embedding: embeddingResponse.data[0].embedding,
          metadata: { source: 'fireflies', meeting_id, api_key_label: selectedKey.label }
        });
        chunksProcessed++;
      }

      // Send notification about saved transcript
      await sendTranscriptSavedNotification({
        title: formattedTranscript.title,
        coach: coach.name,
        client: matches.client?.name || null,
        sessionType,
        chunks: chunksProcessed,
        syncMethod: 'manual_import',
        sessionDate: formattedTranscript.session_date
      });

      return res.json({
        status: 'imported',
        data_item_id: dataItem.id,
        coach: coach.name,
        client: matches.client?.name || null,
        client_id: matches.client?.id || null,
        organization_id: matches.organization_id || null,
        session_type: sessionType,
        chunks_processed: chunksProcessed,
        api_key_used: selectedKey.label,
        matched_via: matchedVia
      });

    } catch (error) {
      console.error('[Fireflies] Import error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * List pending transcripts (no coach match)
   * GET /api/integrations/fireflies/pending
   */
  router.get('/pending', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('fireflies_pending')
        .select('*')
        .eq('status', 'pending_coach_assignment')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return res.json({ pending: data || [] });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Assign a pending transcript to a coach (and optionally a client)
   * POST /api/integrations/fireflies/pending/:id/assign
   * Body: { coach_id: required, client_id: optional }
   */
  router.post('/pending/:id/assign', express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { coach_id, client_id } = req.body;

      if (!coach_id) {
        return res.status(400).json({ error: 'coach_id is required' });
      }

      // Get pending transcript
      const { data: pending, error: fetchError } = await supabase
        .from('fireflies_pending')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !pending) {
        return res.status(404).json({ error: 'Pending transcript not found' });
      }

      // Get coach
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('id, name, coaching_company_id')
        .eq('id', coach_id)
        .single();

      if (coachError || !coach) {
        return res.status(404).json({ error: 'Coach not found' });
      }

      // Get client if provided
      let client = null;
      let organizationId = null;
      if (client_id) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('id, name, client_organization_id')
          .eq('id', client_id)
          .single();

        if (clientError || !clientData) {
          return res.status(404).json({ error: 'Client not found' });
        }
        client = clientData;
        organizationId = client.client_organization_id;
      }

      // Process the transcript
      const formattedTranscript = pending.transcript_data;

      // Detect session type based on title and client match
      const sessionType = detectSessionType(formattedTranscript.title, !!client);

      const chunks = chunkText(formattedTranscript.content);

      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${pending.meeting_id}`,
            session_type: sessionType
          },
          coach_id: coach.id,
          client_id: client?.id || null,
          client_organization_id: organizationId,
          session_date: formattedTranscript.session_date
        })
        .select()
        .single();

      if (itemError) {
        throw new Error(`Failed to create data item: ${itemError.message}`);
      }

      // Generate embeddings
      for (let i = 0; i < chunks.length; i++) {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunks[i]
        });

        await supabase.from('data_chunks').insert({
          data_item_id: dataItem.id,
          chunk_index: i,
          content: chunks[i],
          embedding: embeddingResponse.data[0].embedding,
          metadata: { source: 'fireflies', meeting_id: pending.meeting_id }
        });
      }

      // Update pending status
      await supabase
        .from('fireflies_pending')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          assigned_coach_id: coach.id,
          assigned_client_id: client?.id || null
        })
        .eq('id', id);

      // Send notification about saved transcript
      await sendTranscriptSavedNotification({
        title: formattedTranscript.title,
        coach: coach.name,
        client: client?.name || null,
        sessionType,
        chunks: chunks.length,
        syncMethod: 'pending_assignment',
        sessionDate: formattedTranscript.session_date
      });

      return res.json({
        status: 'assigned',
        data_item_id: dataItem.id,
        coach: coach.name,
        client: client?.name || null,
        client_id: client?.id || null,
        organization_id: organizationId,
        chunks_processed: chunks.length
      });

    } catch (error) {
      console.error('[Fireflies] Assign error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Helper function to sync transcripts using a specific API key
   * Extracted for multi-key support
   *
   * @param {Object} options - Sync options
   * @param {string} options.apiKey - Fireflies API key to use
   * @param {string|null} options.coachId - Coach ID associated with this key (for fallback matching)
   * @param {string} options.keyLabel - Label for logging (e.g., 'default', 'coach-9185bd98')
   * @param {number} options.daysBack - Days to look back for transcripts
   * @param {Set} options.seenMeetingIds - Set of meeting IDs already processed (for deduplication)
   * @returns {Object} - Results { synced, skipped, failed, transcriptsFound, keyLabel }
   */
  async function syncWithApiKey({ apiKey, coachId, keyLabel, daysBack, seenMeetingIds }) {
    const results = {
      synced: [],
      skipped: [],
      failed: [],
      transcriptsFound: 0,
      keyLabel
    };

    console.log(`[Fireflies Sync] Processing key: ${keyLabel}`);

    const listQuery = `
      query RecentTranscripts($limit: Int) {
        transcripts(limit: $limit) {
          id
          title
          date
          organizer_email
        }
      }
    `;

    const listResponse = await fetch(FIREFLIES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query: listQuery,
        variables: { limit: 50 }
      })
    });

    if (!listResponse.ok) {
      throw new Error(`Fireflies API error: ${listResponse.status}`);
    }

    const listData = await listResponse.json();
    if (listData.errors) {
      throw new Error(`Fireflies GraphQL error: ${JSON.stringify(listData.errors)}`);
    }

    const transcripts = listData.data.transcripts || [];
    results.transcriptsFound = transcripts.length;
    console.log(`[Fireflies Sync] [${keyLabel}] Found ${transcripts.length} transcripts`);

    // Filter to only transcripts within the date range
    const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const recentTranscripts = transcripts.filter(t => t.date >= cutoffDate);

    // Check which ones are already synced OR already seen from another key
    const meetingIds = recentTranscripts.map(t => t.id);
    const { data: existingSyncs } = await supabase
      .from('fireflies_sync_state')
      .select('fireflies_meeting_id')
      .in('fireflies_meeting_id', meetingIds);

    const syncedIds = new Set((existingSyncs || []).map(s => s.fireflies_meeting_id));

    // Filter out already-synced and already-seen-this-run transcripts
    const unsyncedTranscripts = recentTranscripts.filter(t => {
      if (syncedIds.has(t.id)) return false;
      if (seenMeetingIds.has(t.id)) return false;
      return true;
    });

    console.log(`[Fireflies Sync] [${keyLabel}] ${unsyncedTranscripts.length} new transcripts to sync`);

    for (const transcript of unsyncedTranscripts) {
      // Mark as seen to prevent duplicate processing by other keys
      seenMeetingIds.add(transcript.id);

      try {
        // Fetch full transcript using this specific API key
        const fullTranscript = await fetchTranscript(transcript.id, apiKey);
        if (!fullTranscript) {
          results.skipped.push({ id: transcript.id, title: transcript.title, reason: 'Transcript not found', key: keyLabel });
          // Record skip in sync state (ignore errors if already exists)
          const { error: skipError } = await supabase.from('fireflies_sync_state').insert({
            fireflies_meeting_id: transcript.id,
            status: 'skipped',
            error_message: 'Transcript not found in Fireflies API'
          });
          if (skipError && !skipError.message?.includes('duplicate')) {
            console.error(`[Fireflies Sync] [${keyLabel}] Failed to record skip state:`, skipError.message);
          }
          continue;
        }

        // Format and match participants (with coach fallback for private transcripts)
        const formattedTranscript = formatTranscript(fullTranscript);
        const matches = await matchParticipants(
          supabase,
          formattedTranscript,
          fullTranscript.meeting_attendees,
          { fallbackCoachId: coachId }  // Use API key owner as fallback
        );

        // Skip if no coach found
        if (!matches.coach) {
          results.skipped.push({ id: transcript.id, title: transcript.title, reason: 'No coach matched', key: keyLabel });
          // Record skip in sync state (ignore errors if already exists)
          const { error: noCoachError } = await supabase.from('fireflies_sync_state').insert({
            fireflies_meeting_id: transcript.id,
            status: 'skipped',
            error_message: `No coach matched. Emails checked: ${matches.unmatched_emails.join(', ')}`
          });
          if (noCoachError && !noCoachError.message?.includes('duplicate')) {
            console.error(`[Fireflies Sync] [${keyLabel}] Failed to record skip state:`, noCoachError.message);
          }
          continue;
        }

        // Detect session type based on title and client match
        const sessionType = detectSessionType(formattedTranscript.title, !!matches.client);

        // Process transcript
        const chunks = chunkText(formattedTranscript.content);

        const { data: dataItem, error: itemError } = await supabase
          .from('data_items')
          .insert({
            data_type: 'transcript',
            raw_content: formattedTranscript.content,
            metadata: {
              ...formattedTranscript.metadata,
              title: formattedTranscript.title,
              slug: `fireflies-${transcript.id}`,
              session_type: sessionType,
              synced_via: 'polling',
              api_key_label: keyLabel,
              matched_via: matches.matched_via
            },
            coach_id: matches.coach.id,
            client_id: matches.client?.id || null,
            client_organization_id: matches.organization_id || null,
            session_date: formattedTranscript.session_date
          })
          .select()
          .single();

        if (itemError) {
          throw new Error(`Failed to create data item: ${itemError.message}`);
        }

        // Generate embeddings
        for (let i = 0; i < chunks.length; i++) {
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunks[i]
          });

          await supabase.from('data_chunks').insert({
            data_item_id: dataItem.id,
            chunk_index: i,
            content: chunks[i],
            embedding: embeddingResponse.data[0].embedding,
            metadata: { source: 'fireflies', meeting_id: transcript.id, synced_via: 'polling', api_key_label: keyLabel }
          });
        }

        // Record successful sync (ignore errors if already exists)
        const { error: syncError } = await supabase.from('fireflies_sync_state').insert({
          fireflies_meeting_id: transcript.id,
          data_item_id: dataItem.id,
          status: 'synced'
        });
        if (syncError && !syncError.message?.includes('duplicate')) {
          console.error(`[Fireflies Sync] [${keyLabel}] Failed to record sync state:`, syncError.message);
        }

        results.synced.push({
          id: transcript.id,
          title: transcript.title,
          data_item_id: dataItem.id,
          coach: matches.coach.name,
          client: matches.client?.name || null,
          session_type: sessionType,
          chunks: chunks.length,
          key: keyLabel,
          matched_via: matches.matched_via
        });

        console.log(`[Fireflies Sync] [${keyLabel}] Synced: ${transcript.title} (matched via ${matches.matched_via})`);

        // Send notification about saved transcript
        await sendTranscriptSavedNotification({
          title: formattedTranscript.title,
          coach: matches.coach.name,
          client: matches.client?.name || null,
          sessionType,
          chunks: chunks.length,
          syncMethod: 'polling',
          sessionDate: formattedTranscript.session_date
        });

        // Send Slack notification if coach matched but no client
        if (!matches.client && matches.unmatched_emails && matches.unmatched_emails.length > 0) {
          await sendSlackNotification({
            title: 'New Transcript - Client Not Found',
            message: `A coaching transcript was synced but the client wasn't found in the database. Consider adding the client so future transcripts are properly linked.`,
            fields: [
              { title: 'Meeting Title', value: transcript.title },
              { title: 'Coach', value: matches.coach.name },
              { title: 'Unmatched Emails', value: matches.unmatched_emails.join(', ') },
              { title: 'Session Date', value: new Date(fullTranscript.date).toLocaleDateString() }
            ],
            color: 'warning'
          });
        }

      } catch (error) {
        console.error(`[Fireflies Sync] [${keyLabel}] Failed to sync ${transcript.id}:`, error);
        results.failed.push({ id: transcript.id, title: transcript.title, error: error.message, key: keyLabel });

        // Record failure in sync state (ignore errors if already exists)
        const { error: failError } = await supabase.from('fireflies_sync_state').insert({
          fireflies_meeting_id: transcript.id,
          status: 'failed',
          error_message: error.message
        });
        if (failError && !failError.message?.includes('duplicate')) {
          console.error(`[Fireflies Sync] [${keyLabel}] Failed to record fail state:`, failError.message);
        }
      }
    }

    return results;
  }

  /**
   * Sync endpoint for GitHub Actions polling
   * POST /api/integrations/fireflies/sync
   *
   * Fetches recent transcripts from Fireflies and imports any that haven't been synced yet.
   * Supports multiple API keys for accessing private transcripts.
   * Protected by x-sync-secret header.
   */
  router.post('/sync', express.json(), async (req, res) => {
    const startTime = Date.now();
    const FIREFLIES_SYNC_SECRET = process.env.FIREFLIES_SYNC_SECRET;

    try {
      // Verify sync secret
      const syncSecret = req.headers['x-sync-secret'];
      if (!FIREFLIES_SYNC_SECRET || syncSecret !== FIREFLIES_SYNC_SECRET) {
        console.error('[Fireflies Sync] Invalid or missing sync secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get all configured API keys
      const apiKeyConfig = getFirefliesApiKeys();
      if (!apiKeyConfig.hasAnyKey) {
        return res.status(500).json({ error: 'No Fireflies API keys configured' });
      }

      const daysBack = req.body.days_back || 7;
      console.log(`[Fireflies Sync] Starting multi-key sync for last ${daysBack} days with ${apiKeyConfig.allKeys.length} key(s)`);

      // Track seen meeting IDs across all keys for deduplication
      const seenMeetingIds = new Set();

      // Aggregate results from all keys
      const aggregatedResults = {
        synced: [],
        skipped: [],
        failed: [],
        per_key: []
      };

      // Process each API key sequentially (with delay to respect rate limits)
      for (let i = 0; i < apiKeyConfig.allKeys.length; i++) {
        const keyConfig = apiKeyConfig.allKeys[i];

        if (i > 0) {
          // 1-second delay between keys to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        try {
          const keyResults = await syncWithApiKey({
            apiKey: keyConfig.key,
            coachId: keyConfig.coachId,
            keyLabel: keyConfig.label,
            daysBack,
            seenMeetingIds
          });

          aggregatedResults.synced.push(...keyResults.synced);
          aggregatedResults.skipped.push(...keyResults.skipped);
          aggregatedResults.failed.push(...keyResults.failed);
          aggregatedResults.per_key.push({
            key: keyConfig.label,
            transcripts_found: keyResults.transcriptsFound,
            synced: keyResults.synced.length,
            skipped: keyResults.skipped.length,
            failed: keyResults.failed.length
          });

        } catch (keyError) {
          console.error(`[Fireflies Sync] Key ${keyConfig.label} failed:`, keyError);
          aggregatedResults.per_key.push({
            key: keyConfig.label,
            error: keyError.message
          });
          // Continue to next key - don't let one key failure stop others
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Fireflies Sync] Complete in ${elapsed}ms: ${aggregatedResults.synced.length} synced, ${aggregatedResults.skipped.length} skipped, ${aggregatedResults.failed.length} failed`);

      return res.json({
        status: 'ok',
        elapsed_ms: elapsed,
        keys_processed: apiKeyConfig.allKeys.length,
        total_unique_meetings: seenMeetingIds.size,
        synced: aggregatedResults.synced,
        skipped: aggregatedResults.skipped,
        failed: aggregatedResults.failed,
        per_key: aggregatedResults.per_key
      });

    } catch (error) {
      console.error('[Fireflies Sync] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Debug endpoint - List all emails from recent Fireflies transcripts
   * GET /api/integrations/fireflies/debug
   * Query params:
   * - key: Optional API key label to use (e.g., 'default', 'coach-9185bd98')
   * Protected by sync secret header
   */
  router.get('/debug', async (req, res) => {
    const FIREFLIES_SYNC_SECRET = process.env.FIREFLIES_SYNC_SECRET;

    // Verify sync secret
    const syncSecret = req.headers['x-sync-secret'];
    if (!FIREFLIES_SYNC_SECRET || syncSecret !== FIREFLIES_SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get API key configuration
    const apiKeyConfig = getFirefliesApiKeys();
    if (!apiKeyConfig.hasAnyKey) {
      return res.status(500).json({ error: 'No Fireflies API keys configured' });
    }

    // Select which API key to use
    const keyLabel = req.query.key;
    let selectedKey = apiKeyConfig.allKeys[0]; // Default to first key

    if (keyLabel) {
      const foundKey = apiKeyConfig.allKeys.find(k => k.label === keyLabel);
      if (!foundKey) {
        return res.status(400).json({
          error: `API key '${keyLabel}' not found`,
          available_keys: apiKeyConfig.allKeys.map(k => k.label)
        });
      }
      selectedKey = foundKey;
    }

    try {
      // First get user info
      const userQuery = `
        query {
          user {
            user_id
            email
            name
            is_admin
          }
        }
      `;

      const userResponse = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedKey.key}`
        },
        body: JSON.stringify({ query: userQuery })
      });

      const userData = await userResponse.json();

      // List recent transcripts (max 50 per Fireflies API limit)
      const listQuery = `
        query {
          transcripts(limit: 50) {
            id
            title
            date
            dateString
            host_email
            organizer_email
            meeting_attendees {
              email
              name
              displayName
            }
          }
        }
      `;

      const listResponse = await fetch(FIREFLIES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selectedKey.key}`
        },
        body: JSON.stringify({ query: listQuery })
      });

      const listData = await listResponse.json();

      if (listData.errors) {
        return res.status(500).json({ error: 'Fireflies API error', details: listData.errors, api_key_used: selectedKey.label });
      }

      const transcripts = listData.data?.transcripts || [];

      // Collect all unique emails and their counts
      const emailCounts = {};
      const ryanEmail = 'ryan@leadinsideout.io';
      const ryanTranscripts = [];

      for (const t of transcripts) {
        const emails = new Set();
        if (t.host_email) emails.add(t.host_email.toLowerCase());
        if (t.organizer_email) emails.add(t.organizer_email.toLowerCase());
        if (t.meeting_attendees) {
          for (const a of t.meeting_attendees) {
            if (a.email) emails.add(a.email.toLowerCase());
          }
        }

        for (const email of emails) {
          emailCounts[email] = (emailCounts[email] || 0) + 1;
          if (email === ryanEmail) {
            ryanTranscripts.push({
              id: t.id,
              title: t.title,
              date: t.dateString,
              host_email: t.host_email,
              organizer_email: t.organizer_email
            });
          }
        }
      }

      // Sort emails by count
      const sortedEmails = Object.entries(emailCounts)
        .sort((a, b) => b[1] - a[1]);

      // Get registered coaches for comparison
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, name, email');

      return res.json({
        api_key_used: selectedKey.label,
        api_key_coach_id: selectedKey.coachId,
        available_keys: apiKeyConfig.allKeys.map(k => k.label),
        api_user: userData.data?.user || null,
        total_transcripts: transcripts.length,
        unique_emails: sortedEmails.length,
        email_breakdown: sortedEmails.slice(0, 30), // Top 30
        leadinsideout_emails: sortedEmails.filter(([e]) => e.includes('leadinsideout')),
        ryan_transcripts: ryanTranscripts,
        ryan_found: ryanTranscripts.length > 0,
        registered_coaches: coaches,
        diagnosis: ryanTranscripts.length === 0
          ? 'Ryan email NOT found in any Fireflies transcripts. Check if Ryan uses different email or different Fireflies workspace.'
          : `Found ${ryanTranscripts.length} transcripts with Ryan's email`
      });

    } catch (error) {
      console.error('[Fireflies Debug] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Health check for Fireflies integration
   * GET /api/integrations/fireflies/health
   */
  router.get('/health', async (req, res) => {
    const FIREFLIES_SYNC_SECRET = process.env.FIREFLIES_SYNC_SECRET;
    const apiKeyConfig = getFirefliesApiKeys();

    // Get last sync info
    let lastSync = null;
    let syncedToday = 0;
    try {
      const { data: lastSyncData } = await supabase
        .from('fireflies_sync_state')
        .select('created_at')
        .eq('status', 'synced')
        .order('created_at', { ascending: false })
        .limit(1);

      if (lastSyncData && lastSyncData.length > 0) {
        lastSync = lastSyncData[0].created_at;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('fireflies_sync_state')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'synced')
        .gte('created_at', todayStart.toISOString());

      syncedToday = count || 0;
    } catch (e) {
      // Table might not exist yet
    }

    // Build API keys status (without exposing actual keys)
    const apiKeysStatus = {
      default_configured: !!apiKeyConfig.defaultKey,
      admin_key_configured: apiKeyConfig.hasAdminKey,
      total_keys: apiKeyConfig.allKeys.length,
      keys: apiKeyConfig.allKeys.map(k => ({
        label: k.label,
        coach_id: k.coachId,
        key_prefix: k.key.substring(0, 8) + '...'
      }))
    };

    res.json({
      status: 'ok',
      api_keys: apiKeysStatus,
      webhook_secret_configured: !!FIREFLIES_WEBHOOK_SECRET,
      sync_secret_configured: !!FIREFLIES_SYNC_SECRET,
      endpoint: '/api/integrations/fireflies/webhook',
      sync_endpoint: '/api/integrations/fireflies/sync',
      last_sync: lastSync,
      synced_today: syncedToday
    });
  });

  return router;
}

export default {
  createFirefliesRoutes,
  verifyWebhookSignature,
  fetchTranscript,
  formatTranscript,
  findCoachByEmail,
  findCoachById,
  findClientByEmail,
  matchParticipants,
  detectSessionType,
  getFirefliesApiKeys
};
