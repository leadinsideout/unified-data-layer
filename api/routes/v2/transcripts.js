/**
 * V2 Transcripts Routes
 *
 * Provides endpoints for listing transcripts without semantic search.
 * Use this for simple CRUD operations like "show recent transcripts".
 */

import express from 'express';

/**
 * Creates V2 transcript routes
 * @param {Object} supabase - Supabase client instance
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router} Express router
 */
export function createV2TranscriptRoutes(supabase, authMiddleware) {
  const router = express.Router();

  /**
   * GET /api/v2/transcripts/recent
   *
   * Returns recent transcripts for authenticated coach.
   * No semantic search - simple chronological listing.
   *
   * Query Parameters:
   *   - limit: Max results (1-50, default 20)
   *   - start_date: Filter by start date (ISO format)
   *   - end_date: Filter by end date (ISO format)
   *   - client_id: Filter by specific client
   *   - session_type: Filter by session type (default: 'client_coaching')
   *                   Use 'all' to include all transcript types
   *                   Valid types: client_coaching, internal_meeting, networking,
   *                                sales_call, staff_1on1, training, 360_interview, other
   */
  router.get('/recent', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { limit = 20, start_date, end_date, client_id, session_type = 'client_coaching' } = req.query;

      // Validate limit (1-50)
      const resultLimit = Math.min(Math.max(1, parseInt(limit) || 20), 50);

      // Build query - ALWAYS filter by authenticated coach
      let query = supabase
        .from('data_items')
        .select(`
          id,
          session_date,
          metadata,
          created_at,
          client_id,
          clients(id, name)
        `)
        .eq('coach_id', auth.coachId)
        .eq('data_type', 'transcript')
        .order('session_date', { ascending: false, nullsFirst: false })
        .limit(resultLimit);

      // Session type filter - default to client_coaching, use 'all' to get everything
      if (session_type && session_type !== 'all') {
        query = query.eq('metadata->>session_type', session_type);
      }

      // Optional filters
      if (start_date) query = query.gte('session_date', start_date);
      if (end_date) query = query.lte('session_date', end_date);
      if (client_id) query = query.eq('client_id', client_id);

      const { data: items, error } = await query;

      if (error) throw error;

      // Format response
      const transcripts = (items || []).map(item => ({
        id: item.id,
        title: item.metadata?.title || `Transcript - ${item.session_date || 'No date'}`,
        session_date: item.session_date,
        session_type: item.metadata?.session_type || 'unknown',
        client_name: item.clients?.name || null,
        client_id: item.client_id,
        created_at: item.created_at
      }));

      res.json({
        transcripts,
        total: transcripts.length,
        filters_applied: {
          coach_id: auth.coachId,
          session_type: session_type,
          start_date: start_date || null,
          end_date: end_date || null,
          client_id: client_id || null,
          limit: resultLimit
        }
      });

    } catch (error) {
      console.error('Error fetching recent transcripts:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}
