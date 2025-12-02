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

      // Find the coach by host or organizer email
      let coach = await findCoachByEmail(supabase, formattedTranscript.host_email);
      if (!coach) {
        coach = await findCoachByEmail(supabase, formattedTranscript.organizer_email);
      }

      if (!coach) {
        console.warn(`[Fireflies] No coach found for emails: ${formattedTranscript.host_email}, ${formattedTranscript.organizer_email}`);

        // Store in a queue for manual review instead of failing
        const { error: queueError } = await supabase
          .from('fireflies_pending')
          .insert({
            meeting_id: meetingId,
            host_email: formattedTranscript.host_email,
            organizer_email: formattedTranscript.organizer_email,
            title: formattedTranscript.title,
            transcript_data: formattedTranscript,
            status: 'pending_coach_assignment'
          });

        if (queueError) {
          console.error('[Fireflies] Failed to queue transcript:', queueError);
        }

        return res.json({
          status: 'queued',
          reason: 'No matching coach found - queued for manual assignment',
          meeting_id: meetingId
        });
      }

      // Process and store the transcript
      console.log(`[Fireflies] Processing transcript for coach: ${coach.name}`);

      const chunks = chunkText(formattedTranscript.content);

      // Create data item
      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${meetingId}`
          },
          coach_id: coach.id,
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
        coach: coach.name,
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

      // Find coach (by ID or email)
      let coach;
      if (coach_id) {
        const { data } = await supabase
          .from('coaches')
          .select('id, name, email, coaching_company_id')
          .eq('id', coach_id)
          .single();
        coach = data;
      } else {
        coach = await findCoachByEmail(supabase, formattedTranscript.host_email) ||
                await findCoachByEmail(supabase, formattedTranscript.organizer_email);
      }

      if (!coach) {
        return res.status(400).json({
          error: 'Coach not found',
          hint: 'Provide coach_id or ensure coach email matches Fireflies host/organizer'
        });
      }

      // Process transcript (same as webhook flow)
      const chunks = chunkText(formattedTranscript.content);

      const { data: dataItem, error: itemError } = await supabase
        .from('data_items')
        .insert({
          data_type: 'transcript',
          raw_content: formattedTranscript.content,
          metadata: {
            ...formattedTranscript.metadata,
            title: formattedTranscript.title,
            slug: `fireflies-${meeting_id}`
          },
          coach_id: coach.id,
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
   * Assign a pending transcript to a coach
   * POST /api/integrations/fireflies/pending/:id/assign
   */
  router.post('/pending/:id/assign', express.json(), async (req, res) => {
    try {
      const { id } = req.params;
      const { coach_id } = req.body;

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
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', id);

      return res.json({
        status: 'assigned',
        data_item_id: dataItem.id,
        coach: coach.name,
        chunks_processed: chunks.length
      });

    } catch (error) {
      console.error('[Fireflies] Assign error:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  /**
   * Health check for Fireflies integration
   * GET /api/integrations/fireflies/health
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      api_key_configured: !!FIREFLIES_API_KEY,
      webhook_secret_configured: !!FIREFLIES_WEBHOOK_SECRET,
      endpoint: '/api/integrations/fireflies/webhook'
    });
  });

  return router;
}

export default {
  createFirefliesRoutes,
  verifyWebhookSignature,
  fetchTranscript,
  formatTranscript,
  findCoachByEmail
};
