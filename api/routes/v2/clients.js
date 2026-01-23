/**
 * V2 Client Routes
 *
 * Enhanced endpoints for client data and timeline views.
 * Used by MCP server and Custom GPT for coaching data access.
 */

import express from 'express';

/**
 * Create v2 client routes
 * @param {Object} supabase - Supabase client
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router} Express router with v2 client routes
 */
export function createV2ClientRoutes(supabase, authMiddleware) {
  const router = express.Router();

  /**
   * GET /api/v2/clients/:id/timeline
   *
   * Returns chronological history of all data for a specific client.
   * Used by MCP's get_client_timeline tool.
   *
   * Query params:
   * - start_date: ISO date string (optional)
   * - end_date: ISO date string (optional)
   * - types: comma-separated data types (optional)
   * - limit: max results (default 50, max 100)
   */
  router.get('/:id/timeline', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id: clientId } = req.params;
      const { start_date, end_date, types, limit = 50 } = req.query;

      // Validate limit
      const resultLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);

      // Verify access to this client
      const hasAccess = await verifyClientAccess(supabase, auth, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this client'
        });
      }

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Client not found'
        });
      }

      // Build query for data items
      let query = supabase
        .from('data_items')
        .select(`
          id,
          data_type,
          session_date,
          raw_content,
          metadata,
          created_at,
          coaches(id, name)
        `)
        .eq('client_id', clientId)
        .order('session_date', { ascending: false, nullsFirst: false })
        .limit(resultLimit);

      // Apply date filters
      if (start_date) {
        query = query.gte('session_date', start_date);
      }
      if (end_date) {
        query = query.lte('session_date', end_date);
      }

      // Apply type filter
      if (types) {
        const typeArray = types.split(',').map(t => t.trim());
        query = query.in('data_type', typeArray);
      }

      const { data: items, error: itemsError } = await query;

      if (itemsError) {
        throw itemsError;
      }

      // Format timeline entries
      const timeline = (items || []).map(item => ({
        date: item.session_date,
        data_type: item.data_type,
        title: item.metadata?.title || `${item.data_type} - ${item.session_date || 'No date'}`,
        summary: item.raw_content?.substring(0, 300) + (item.raw_content?.length > 300 ? '...' : ''),
        data_item_id: item.id,
        coach: item.coaches ? { id: item.coaches.id, name: item.coaches.name } : null,
        metadata: item.metadata
      }));

      // Calculate summary stats
      const typeStats = {};
      (items || []).forEach(item => {
        typeStats[item.data_type] = (typeStats[item.data_type] || 0) + 1;
      });

      res.json({
        client_id: clientId,
        client_name: client.name,
        timeline,
        total_items: items?.length || 0,
        by_type: typeStats,
        filters_applied: {
          start_date: start_date || null,
          end_date: end_date || null,
          types: types ? types.split(',').map(t => t.trim()) : null
        }
      });

    } catch (error) {
      console.error('Error getting client timeline:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/clients/:id/data
   *
   * Returns all data items for a specific client with full content.
   * More detailed than timeline, includes complete raw_content.
   *
   * Query params:
   * - types: comma-separated data types (optional)
   * - limit: max results (default 50, max 100)
   * - include_chunks: boolean to include chunk data (default false)
   */
  router.get('/:id/data', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id: clientId } = req.params;
      const { types, limit = 50, include_chunks = 'false' } = req.query;

      // Validate limit
      const resultLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);

      // Verify access to this client
      const hasAccess = await verifyClientAccess(supabase, auth, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this client'
        });
      }

      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Client not found'
        });
      }

      // Build query for data items
      let selectFields = `
        id,
        data_type,
        session_date,
        raw_content,
        metadata,
        created_at,
        coaches(id, name, email)
      `;

      // Optionally include chunks
      if (include_chunks === 'true') {
        selectFields += `,
          data_chunks(
            id,
            chunk_index,
            content,
            metadata
          )
        `;
      }

      let query = supabase
        .from('data_items')
        .select(selectFields)
        .eq('client_id', clientId)
        .order('session_date', { ascending: false })
        .limit(resultLimit);

      // Apply type filter
      if (types) {
        const typeArray = types.split(',').map(t => t.trim());
        query = query.in('data_type', typeArray);
      }

      const { data: items, error: itemsError } = await query;

      if (itemsError) {
        throw itemsError;
      }

      // Calculate summary stats
      const typeStats = {};
      (items || []).forEach(item => {
        typeStats[item.data_type] = (typeStats[item.data_type] || 0) + 1;
      });

      res.json({
        client_id: clientId,
        client_name: client.name,
        items: items || [],
        total: items?.length || 0,
        by_type: typeStats,
        filters_applied: {
          types: types ? types.split(',').map(t => t.trim()) : null,
          include_chunks: include_chunks === 'true'
        }
      });

    } catch (error) {
      console.error('Error getting client data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/v2/clients
   *
   * List clients accessible to the authenticated user.
   * Coaches see their assigned clients.
   * Clients see only themselves.
   * Admins see all clients in their company.
   */
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { limit = 50 } = req.query;

      const resultLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);

      let clients = [];

      if (auth.userRole === 'admin' || auth.adminId) {
        // Admin: get all clients in company via coach relationships
        const { data: admin } = await supabase
          .from('admins')
          .select('coaching_company_id')
          .eq('id', auth.adminId || auth.userId)
          .single();

        if (admin) {
          const { data, error } = await supabase
            .from('clients')
            .select(`
              id, name, email, created_at,
              coach_clients!inner(
                coach:coaches!inner(coaching_company_id)
              )
            `)
            .eq('coach_clients.coach.coaching_company_id', admin.coaching_company_id)
            .limit(resultLimit);

          if (!error) {
            // Strip nested coach_clients relationships and deduplicate by client ID
            const seen = new Set();
            clients = (data || []).filter(client => {
              if (seen.has(client.id)) return false;
              seen.add(client.id);
              return true;
            }).map(({ id, name, email, created_at }) => ({
              id, name, email, created_at
            }));
          }
        }
      } else if (auth.coachId) {
        // Coach: get assigned clients
        const { data, error } = await supabase
          .from('clients')
          .select(`
            id, name, email, created_at,
            coach_clients!inner(coach_id)
          `)
          .eq('coach_clients.coach_id', auth.coachId)
          .limit(resultLimit);

        if (!error) {
          // Strip nested coach_clients relationships from response
          clients = (data || []).map(({ id, name, email, created_at }) => ({
            id, name, email, created_at
          }));
        }
      } else if (auth.clientId) {
        // Client: get only themselves
        const { data, error } = await supabase
          .from('clients')
          .select('id, name, email, created_at')
          .eq('id', auth.clientId)
          .single();

        if (!error && data) {
          clients = [data];
        }
      }

      res.json({
        clients,
        total: clients.length
      });

    } catch (error) {
      console.error('Error listing clients:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}

/**
 * Verify that the authenticated user has access to a specific client
 */
async function verifyClientAccess(supabase, auth, clientId) {
  // Admin has access to all clients in their company
  if (auth.userRole === 'admin' || auth.adminId) {
    const { data: admin } = await supabase
      .from('admins')
      .select('coaching_company_id')
      .eq('id', auth.adminId || auth.userId)
      .single();

    if (admin) {
      // Check if client belongs to a coach in this company
      const { data: client } = await supabase
        .from('clients')
        .select(`
          id,
          coach_clients!inner(
            coach:coaches!inner(coaching_company_id)
          )
        `)
        .eq('id', clientId)
        .eq('coach_clients.coach.coaching_company_id', admin.coaching_company_id)
        .single();

      return !!client;
    }
    return false;
  }

  // Coach has access to their assigned clients
  if (auth.coachId) {
    const { data: relationship } = await supabase
      .from('coach_clients')
      .select('id')
      .eq('coach_id', auth.coachId)
      .eq('client_id', clientId)
      .single();

    return !!relationship;
  }

  // Client has access only to themselves
  if (auth.clientId) {
    return auth.clientId === clientId;
  }

  return false;
}
