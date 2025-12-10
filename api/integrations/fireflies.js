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
 * Send Slack notification for admin alerts
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Main message text
 * @param {Object[]} options.fields - Optional fields for structured data
 * @param {string} options.color - Attachment color (warning, danger, good)
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendSlackNotification({ title, message, fields = [], color = 'warning' }) {
  // Use SLACK_ADMIN_WEBHOOK_URL if set, otherwise fall back to SLACK_WEBHOOK_URL
  const webhookUrl = process.env.SLACK_ADMIN_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
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
 * Match participants from Fireflies meeting to our database entities
 * Identifies coach, client, and organization from attendee list
 * @param {Object} supabase - Supabase client
 * @param {Object} transcript - Formatted transcript with host_email, organizer_email
 * @param {Array} attendees - Array of {email, name, displayName} from Fireflies
 * @returns {Object} - { coach, client, organization_id, unmatched_emails }
 */
export async function matchParticipants(supabase, transcript, attendees) {
  const result = {
    coach: null,
    client: null,
    organization_id: null,
    unmatched_emails: []
  };

  // Collect all unique emails from the meeting
  const emailsToCheck = new Set();

  if (transcript.host_email) emailsToCheck.add(transcript.host_email.toLowerCase());
  if (transcript.organizer_email) emailsToCheck.add(transcript.organizer_email.toLowerCase());

  if (attendees && Array.isArray(attendees)) {
    for (const attendee of attendees) {
      if (attendee.email) {
        emailsToCheck.add(attendee.email.toLowerCase());
      }
    }
  }

  // Check each email against coaches and clients
  for (const email of emailsToCheck) {
    // First try to match as coach (host/organizer most likely to be coach)
    if (!result.coach) {
      const coach = await findCoachByEmail(supabase, email);
      if (coach) {
        result.coach = coach;
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
   */
  router.post('/import', express.json(), async (req, res) => {
    try {
      const { meeting_id, coach_id } = req.body;

      if (!meeting_id) {
        return res.status(400).json({ error: 'meeting_id is required' });
      }

      if (!FIREFLIES_API_KEY) {
        return res.status(500).json({ error: 'Fireflies API key not configured' });
      }

      // Fetch transcript
      const transcript = await fetchTranscript(meeting_id, FIREFLIES_API_KEY);
      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      const formattedTranscript = formatTranscript(transcript);

      // Match all participants from the meeting
      const matches = await matchParticipants(
        supabase,
        formattedTranscript,
        transcript.meeting_attendees
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

      // Process transcript with all matched relationships
      const chunks = chunkText(formattedTranscript.content);

      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${meeting_id}`,
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
          metadata: { source: 'fireflies', meeting_id }
        });
        chunksProcessed++;
      }

      return res.json({
        status: 'imported',
        data_item_id: dataItem.id,
        coach: coach.name,
        client: matches.client?.name || null,
        client_id: matches.client?.id || null,
        organization_id: matches.organization_id || null,
        chunks_processed: chunksProcessed
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
      const chunks = chunkText(formattedTranscript.content);

      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${pending.meeting_id}`
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
   * Sync endpoint for GitHub Actions polling
   * POST /api/integrations/fireflies/sync
   *
   * Fetches recent transcripts from Fireflies and imports any that haven't been synced yet.
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

      if (!FIREFLIES_API_KEY) {
        return res.status(500).json({ error: 'Fireflies API key not configured' });
      }

      // Fetch recent transcripts from Fireflies (last 7 days by default)
      const daysBack = req.body.days_back || 7;
      console.log(`[Fireflies Sync] Fetching transcripts from last ${daysBack} days...`);

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
          'Authorization': `Bearer ${FIREFLIES_API_KEY}`
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
      console.log(`[Fireflies Sync] Found ${transcripts.length} transcripts in Fireflies`);

      // Filter to only transcripts within the date range
      const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
      const recentTranscripts = transcripts.filter(t => t.date >= cutoffDate);
      console.log(`[Fireflies Sync] ${recentTranscripts.length} transcripts within last ${daysBack} days`);

      // Check which ones are already synced
      const meetingIds = recentTranscripts.map(t => t.id);
      const { data: existingSyncs } = await supabase
        .from('fireflies_sync_state')
        .select('fireflies_meeting_id')
        .in('fireflies_meeting_id', meetingIds);

      const syncedIds = new Set((existingSyncs || []).map(s => s.fireflies_meeting_id));
      const unsyncedTranscripts = recentTranscripts.filter(t => !syncedIds.has(t.id));

      console.log(`[Fireflies Sync] ${unsyncedTranscripts.length} new transcripts to sync`);

      // Process each unsynced transcript
      const results = {
        synced: [],
        skipped: [],
        failed: []
      };

      for (const transcript of unsyncedTranscripts) {
        try {
          // Fetch full transcript
          const fullTranscript = await fetchTranscript(transcript.id, FIREFLIES_API_KEY);
          if (!fullTranscript) {
            results.skipped.push({ id: transcript.id, title: transcript.title, reason: 'Transcript not found' });
            await supabase.from('fireflies_sync_state').insert({
              fireflies_meeting_id: transcript.id,
              status: 'skipped',
              error_message: 'Transcript not found in Fireflies API'
            });
            continue;
          }

          // Format and match participants
          const formattedTranscript = formatTranscript(fullTranscript);
          const matches = await matchParticipants(
            supabase,
            formattedTranscript,
            fullTranscript.meeting_attendees
          );

          // Skip if no coach found (will be handled by pending queue via webhook if it ever works)
          if (!matches.coach) {
            results.skipped.push({ id: transcript.id, title: transcript.title, reason: 'No coach matched' });
            await supabase.from('fireflies_sync_state').insert({
              fireflies_meeting_id: transcript.id,
              status: 'skipped',
              error_message: `No coach matched. Emails checked: ${matches.unmatched_emails.join(', ')}`
            });
            continue;
          }

          // Process transcript (same logic as webhook/import)
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
                synced_via: 'polling'
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
              metadata: { source: 'fireflies', meeting_id: transcript.id, synced_via: 'polling' }
            });
          }

          // Record successful sync
          await supabase.from('fireflies_sync_state').insert({
            fireflies_meeting_id: transcript.id,
            data_item_id: dataItem.id,
            status: 'synced'
          });

          results.synced.push({
            id: transcript.id,
            title: transcript.title,
            data_item_id: dataItem.id,
            coach: matches.coach.name,
            client: matches.client?.name || null,
            chunks: chunks.length
          });

          console.log(`[Fireflies Sync] Synced: ${transcript.title}`);

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
          console.error(`[Fireflies Sync] Failed to sync ${transcript.id}:`, error);
          results.failed.push({ id: transcript.id, title: transcript.title, error: error.message });

          await supabase.from('fireflies_sync_state').insert({
            fireflies_meeting_id: transcript.id,
            status: 'failed',
            error_message: error.message
          }).catch(() => {}); // Ignore if already exists
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`[Fireflies Sync] Complete in ${elapsed}ms: ${results.synced.length} synced, ${results.skipped.length} skipped, ${results.failed.length} failed`);

      return res.json({
        status: 'ok',
        elapsed_ms: elapsed,
        total_in_fireflies: recentTranscripts.length,
        already_synced: syncedIds.size,
        ...results
      });

    } catch (error) {
      console.error('[Fireflies Sync] Error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Debug endpoint - List all emails from recent Fireflies transcripts
   * GET /api/integrations/fireflies/debug
   * Protected by sync secret header
   */
  router.get('/debug', async (req, res) => {
    const FIREFLIES_SYNC_SECRET = process.env.FIREFLIES_SYNC_SECRET;

    // Verify sync secret
    const syncSecret = req.headers['x-sync-secret'];
    if (!FIREFLIES_SYNC_SECRET || syncSecret !== FIREFLIES_SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!FIREFLIES_API_KEY) {
      return res.status(500).json({ error: 'Fireflies API key not configured' });
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
          'Authorization': `Bearer ${FIREFLIES_API_KEY}`
        },
        body: JSON.stringify({ query: userQuery })
      });

      const userData = await userResponse.json();

      // List recent transcripts
      const listQuery = `
        query {
          transcripts(limit: 100) {
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
          'Authorization': `Bearer ${FIREFLIES_API_KEY}`
        },
        body: JSON.stringify({ query: listQuery })
      });

      const listData = await listResponse.json();

      if (listData.errors) {
        return res.status(500).json({ error: 'Fireflies API error', details: listData.errors });
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

    res.json({
      status: 'ok',
      api_key_configured: !!FIREFLIES_API_KEY,
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
  findClientByEmail,
  matchParticipants
};
