/**
 * Admin Routes
 *
 * Endpoints for managing users (coaches, clients, admins) and API keys.
 * All routes require admin authentication.
 */

import express from 'express';

const router = express.Router();

/**
 * Create admin routes
 * @param {Object} supabase - Supabase client
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router} Express router with admin routes
 */
export function createAdminRoutes(supabase, authMiddleware) {

  // ============================================
  // CLIENT ORGANIZATION ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/organizations
   * List all client organizations (for client creation dropdown)
   */
  router.get('/organizations', authMiddleware, async (req, res) => {
    try {
      const { data: orgs, error } = await supabase
        .from('client_organizations')
        .select('id, name, industry')
        .order('name');

      if (error) throw error;

      res.json({
        organizations: orgs || [],
        total: orgs?.length || 0
      });
    } catch (error) {
      console.error('Error listing organizations:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/organizations
   * Create a new client organization
   */
  router.post('/organizations', authMiddleware, async (req, res) => {
    try {
      const { name, industry } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Organization name is required'
        });
      }

      const { data: org, error } = await supabase
        .from('client_organizations')
        .insert({ name, industry: industry || null })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        organization: org
      });
    } catch (error) {
      console.error('Error creating organization:', error);
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Organization with this name already exists'
        });
      }
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/users
   * List all users (coaches, clients, admins) in the company
   */
  router.get('/users', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;

      // Verify user is an admin
      const { data: admin, error: adminError} = await supabase
        .from('admins')
        .select('coaching_company_id, role')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Get all coaches in the company
      const { data: coaches, error: coachesError } = await supabase
        .from('coaches')
        .select('id, email, name, created_at')
        .eq('coaching_company_id', admin.coaching_company_id);

      if (coachesError) throw coachesError;

      // Get all clients (via coach relationships)
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          email,
          name,
          created_at,
          coach_clients!inner(
            coach:coaches!inner(
              coaching_company_id
            )
          )
        `)
        .eq('coach_clients.coach.coaching_company_id', admin.coaching_company_id);

      if (clientsError) throw clientsError;

      // Strip nested coach_clients relationships and deduplicate by client ID
      const seen = new Set();
      const cleanClients = (clients || []).filter(client => {
        if (seen.has(client.id)) return false;
        seen.add(client.id);
        return true;
      }).map(({ id, email, name, created_at }) => ({
        id, email, name, created_at
      }));

      // Get all admins in the company
      const { data: admins, error: adminsError } = await supabase
        .from('admins')
        .select('id, email, name, role, created_at')
        .eq('coaching_company_id', admin.coaching_company_id);

      if (adminsError) throw adminsError;

      res.json({
        coaches: coaches || [],
        clients: cleanClients,
        admins: admins || [],
        total: (coaches?.length || 0) + cleanClients.length + (admins?.length || 0)
      });

    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/users/:id
   * Get details for a specific user (coach, client, or admin)
   */
  router.get('/users/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id, role')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Try to find user in coaches table
      const { data: coach } = await supabase
        .from('coaches')
        .select('*, coaching_companies(name)')
        .eq('id', id)
        .eq('coaching_company_id', admin.coaching_company_id)
        .single();

      if (coach) {
        return res.json({
          type: 'coach',
          user: coach
        });
      }

      // Try to find user in clients table
      const { data: client } = await supabase
        .from('clients')
        .select(`
          *,
          coach_clients(
            coach:coaches(id, name, email)
          )
        `)
        .eq('id', id)
        .single();

      if (client) {
        // Verify client belongs to company via coach relationship
        const coachInCompany = client.coach_clients?.some(cc =>
          cc.coach?.coaching_company_id === admin.coaching_company_id
        );

        if (coachInCompany) {
          return res.json({
            type: 'client',
            user: client
          });
        }
      }

      // Try to find user in admins table
      const { data: adminUser } = await supabase
        .from('admins')
        .select('*, coaching_companies(name)')
        .eq('id', id)
        .eq('coaching_company_id', admin.coaching_company_id)
        .single();

      if (adminUser) {
        return res.json({
          type: 'admin',
          user: adminUser
        });
      }

      // User not found
      res.status(404).json({
        error: 'Not found',
        message: 'User not found'
      });

    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/users
   * Create a new user (coach, client, or admin)
   */
  router.post('/users', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { type, email, name, role, metadata, organization_id } = req.body;

      // Validate required fields
      if (!type || !email || !name) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'type, email, and name are required'
        });
      }

      // Validate type
      if (!['coach', 'client', 'admin'].includes(type)) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'type must be coach, client, or admin'
        });
      }

      // Clients require organization_id
      if (type === 'client' && !organization_id) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'organization_id is required for clients'
        });
      }

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id, role')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Only super_admins can create admins
      if (type === 'admin' && admin.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Super admin access required to create admins'
        });
      }

      // Create user based on type
      let newUser;

      if (type === 'coach') {
        const { data, error } = await supabase
          .from('coaches')
          .insert({
            coaching_company_id: admin.coaching_company_id,
            email,
            name,
            metadata: metadata || {}
          })
          .select()
          .single();

        if (error) throw error;
        newUser = data;
      } else if (type === 'client') {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            email,
            name,
            client_organization_id: organization_id,
            metadata: metadata || {}
          })
          .select()
          .single();

        if (error) throw error;
        newUser = data;
      } else if (type === 'admin') {
        const { data, error } = await supabase
          .from('admins')
          .insert({
            coaching_company_id: admin.coaching_company_id,
            email,
            name,
            role: role || 'admin',
            metadata: metadata || {}
          })
          .select()
          .single();

        if (error) throw error;
        newUser = data;
      }

      res.status(201).json({
        type,
        user: newUser
      });

    } catch (error) {
      console.error('Error creating user:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/users/:id
   * Update a user's information
   */
  router.put('/users/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;
      const { name, email, role, metadata } = req.body;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id, role')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Try updating in each table
      // Note: In production, you'd want to know the user type first

      // Try coaches
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .update({ name, email, metadata })
        .eq('id', id)
        .eq('coaching_company_id', admin.coaching_company_id)
        .select()
        .single();

      if (!coachError && coach) {
        return res.json({
          type: 'coach',
          user: coach
        });
      }

      // Try clients
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .update({ name, email, metadata })
        .eq('id', id)
        .select()
        .single();

      if (!clientError && client) {
        return res.json({
          type: 'client',
          user: client
        });
      }

      // Try admins (only super_admins can update admins)
      if (admin.role === 'super_admin') {
        const { data: adminUser, error: adminUpdateError } = await supabase
          .from('admins')
          .update({ name, email, role, metadata })
          .eq('id', id)
          .eq('coaching_company_id', admin.coaching_company_id)
          .select()
          .single();

        if (!adminUpdateError && adminUser) {
          return res.json({
            type: 'admin',
            user: adminUser
          });
        }
      }

      res.status(404).json({
        error: 'Not found',
        message: 'User not found or access denied'
      });

    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/users/:id
   * Delete a user
   */
  router.delete('/users/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id, role')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Prevent self-deletion
      if (id === auth.userId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Cannot delete yourself'
        });
      }

      // Try deleting from each table
      // CASCADE will handle related records

      // Try coaches
      const { error: coachError } = await supabase
        .from('coaches')
        .delete()
        .eq('id', id)
        .eq('coaching_company_id', admin.coaching_company_id);

      if (!coachError) {
        return res.json({
          message: 'User deleted successfully',
          type: 'coach'
        });
      }

      // Try clients
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (!clientError) {
        return res.json({
          message: 'User deleted successfully',
          type: 'client'
        });
      }

      // Try admins (only super_admins can delete admins)
      if (admin.role === 'super_admin') {
        const { error: adminDeleteError } = await supabase
          .from('admins')
          .delete()
          .eq('id', id)
          .eq('coaching_company_id', admin.coaching_company_id);

        if (!adminDeleteError) {
          return res.json({
            message: 'User deleted successfully',
            type: 'admin'
          });
        }
      }

      res.status(404).json({
        error: 'Not found',
        message: 'User not found or access denied'
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // COACH CLIENTS
  // ============================================

  /**
   * GET /api/admin/coaches/:coachId/clients
   * Get clients assigned to a specific coach
   */
  router.get('/coaches/:coachId/clients', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { coachId } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Verify coach belongs to the company
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', coachId)
        .eq('coaching_company_id', admin.coaching_company_id)
        .single();

      if (coachError || !coach) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Coach not found'
        });
      }

      // Get clients for this coach
      const { data: clients, error: clientsError } = await supabase
        .from('coach_clients')
        .select('client:clients(id, name, email, created_at)')
        .eq('coach_id', coachId);

      if (clientsError) throw clientsError;

      res.json({
        clients: (clients || []).map(c => c.client).filter(Boolean)
      });

    } catch (error) {
      console.error('Error getting coach clients:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/coaches/:coachId/clients
   * Link a client to a coach
   * Body: { client_id: string }
   */
  router.post('/coaches/:coachId/clients', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { coachId } = req.params;
      const { client_id } = req.body;

      if (!client_id) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'client_id is required'
        });
      }

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Verify coach belongs to the company
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('id, name')
        .eq('id', coachId)
        .eq('coaching_company_id', admin.coaching_company_id)
        .single();

      if (coachError || !coach) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Coach not found'
        });
      }

      // Verify client exists
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', client_id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Client not found'
        });
      }

      // Check if relationship already exists
      const { data: existing } = await supabase
        .from('coach_clients')
        .select('id')
        .eq('coach_id', coachId)
        .eq('client_id', client_id)
        .single();

      if (existing) {
        return res.status(409).json({
          error: 'Conflict',
          message: `${client.name} is already linked to ${coach.name}`
        });
      }

      // Create the relationship
      const { error: insertError } = await supabase
        .from('coach_clients')
        .insert({
          coach_id: coachId,
          client_id: client_id
        });

      if (insertError) throw insertError;

      res.status(201).json({
        message: `Successfully linked ${client.name} to ${coach.name}`,
        coach: { id: coach.id, name: coach.name },
        client: { id: client.id, name: client.name }
      });

    } catch (error) {
      console.error('Error linking client to coach:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/coaches/:coachId/clients/:clientId
   * Unlink a client from a coach
   */
  router.delete('/coaches/:coachId/clients/:clientId', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { coachId, clientId } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Verify coach belongs to the company
      const { data: coach, error: coachError } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', coachId)
        .eq('coaching_company_id', admin.coaching_company_id)
        .single();

      if (coachError || !coach) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Coach not found'
        });
      }

      // Delete the relationship
      const { error: deleteError } = await supabase
        .from('coach_clients')
        .delete()
        .eq('coach_id', coachId)
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      res.json({
        message: 'Client unlinked from coach successfully'
      });

    } catch (error) {
      console.error('Error unlinking client from coach:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // DASHBOARD STATS
  // ============================================

  /**
   * GET /api/admin/stats
   * Get dashboard statistics
   */
  router.get('/stats', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Get counts by type
      const { data: items, error: itemsError } = await supabase
        .from('data_items')
        .select('data_type, coach_id, client_id');

      if (itemsError) throw itemsError;

      const byType = {};
      const coachIds = new Set();
      const clientIds = new Set();

      (items || []).forEach(item => {
        byType[item.data_type] = (byType[item.data_type] || 0) + 1;
        if (item.coach_id) coachIds.add(item.coach_id);
        if (item.client_id) clientIds.add(item.client_id);
      });

      // Get Fireflies sync info
      const { data: syncState, error: syncError } = await supabase
        .from('fireflies_sync_state')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const today = new Date().toISOString().split('T')[0];
      const { count: syncedToday } = await supabase
        .from('fireflies_sync_state')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today);

      res.json({
        total: items?.length || 0,
        byType,
        coaches: coachIds.size,
        clients: clientIds.size,
        lastSync: syncState?.[0]?.created_at || null,
        syncedToday: syncedToday || 0
      });

    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  /**
   * GET /api/admin/data
   * List data items with optional filters
   */
  router.get('/data', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { type, coach_id, client_id, limit = 50, offset = 0 } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Build query
      let query = supabase
        .from('data_items')
        .select(`
          id,
          data_type,
          metadata,
          session_date,
          created_at,
          coach:coaches(id, name),
          client:clients(id, name)
        `, { count: 'exact' });

      if (type) query = query.eq('data_type', type);
      if (coach_id) query = query.eq('coach_id', coach_id);
      if (client_id) query = query.eq('client_id', client_id);

      query = query
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

      const { data: items, error: itemsError, count } = await query;

      if (itemsError) throw itemsError;

      res.json({
        items: (items || []).map(item => ({
          id: item.id,
          data_type: item.data_type,
          title: item.metadata?.title || item.metadata?.meeting_name || item.metadata?.doc_title || item.metadata?.assessment_type || `${item.data_type} - ${new Date(item.session_date || item.created_at).toLocaleDateString()}`,
          session_date: item.session_date,
          created_at: item.created_at,
          coach_name: item.coach?.name,
          client_name: item.client?.name
        })),
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

    } catch (error) {
      console.error('Error listing data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/data/:id
   * Get a single data item with content
   */
  router.get('/data/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const { data: item, error: itemError } = await supabase
        .from('data_items')
        .select(`
          *,
          coach:coaches(id, name),
          client:clients(id, name)
        `)
        .eq('id', id)
        .single();

      if (itemError || !item) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Data item not found'
        });
      }

      // Add computed title
      item.title = item.metadata?.title || item.metadata?.meeting_name || item.metadata?.doc_title || item.metadata?.assessment_type || `${item.data_type} - ${new Date(item.session_date || item.created_at).toLocaleDateString()}`;
      res.json(item);

    } catch (error) {
      console.error('Error getting data item:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/data/:id
   * Delete a data item and its chunks
   */
  router.delete('/data/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Delete chunks first (cascading should handle this, but being explicit)
      await supabase
        .from('data_chunks')
        .delete()
        .eq('data_item_id', id);

      // Delete the data item
      const { error: deleteError } = await supabase
        .from('data_items')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({
        message: 'Data item deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting data item:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/data/:id
   * Update data item metadata (coach, client, session date, title)
   * Body: { coach_id?, client_id?, session_date?, metadata? }
   */
  router.put('/data/:id', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { id } = req.params;
      const { coach_id, client_id, session_date, metadata } = req.body;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id, coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Get existing item to verify it belongs to admin's company
      const { data: existingItem, error: fetchError } = await supabase
        .from('data_items')
        .select('id, coach_id, data_type, metadata, coaches!inner(coaching_company_id)')
        .eq('id', id)
        .single();

      if (fetchError || !existingItem) {
        return res.status(404).json({ error: 'Data item not found' });
      }

      if (existingItem.coaches.coaching_company_id !== admin.coaching_company_id) {
        return res.status(404).json({ error: 'Data item not found' });
      }

      // Validate new coach belongs to admin's company (if provided)
      if (coach_id !== undefined && coach_id !== null) {
        const { data: coach, error: coachError } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', coach_id)
          .eq('coaching_company_id', admin.coaching_company_id)
          .single();

        if (coachError || !coach) {
          return res.status(400).json({
            error: 'Invalid coach_id',
            message: 'Coach must belong to your company'
          });
        }
      }

      // Validate new client belongs to admin's company (if provided)
      if (client_id !== undefined && client_id !== null) {
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id, primary_coach_id')
          .eq('id', client_id)
          .single();

        if (clientError || !client) {
          return res.status(400).json({ error: 'Invalid client_id' });
        }

        // Verify client's coach belongs to admin's company
        const { data: clientCoach, error: clientCoachError } = await supabase
          .from('coaches')
          .select('coaching_company_id')
          .eq('id', client.primary_coach_id)
          .single();

        if (clientCoachError || clientCoach.coaching_company_id !== admin.coaching_company_id) {
          return res.status(400).json({
            error: 'Invalid client_id',
            message: 'Client must belong to your company'
          });
        }
      }

      // Build update object (only include provided fields)
      const updates = {
        updated_at: new Date()
      };

      if (coach_id !== undefined) {
        updates.coach_id = coach_id;
      }

      if (client_id !== undefined) {
        updates.client_id = client_id;
      }

      if (session_date !== undefined) {
        updates.session_date = session_date;
      }

      // Merge metadata updates with existing metadata
      if (metadata) {
        updates.metadata = { ...existingItem.metadata, ...metadata };
      }

      // Execute update
      const { data: updatedItem, error: updateError } = await supabase
        .from('data_items')
        .update(updates)
        .eq('id', id)
        .select('id, data_type, metadata, coach_id, client_id, session_date, updated_at')
        .single();

      if (updateError) throw updateError;

      res.json({
        message: 'Data item updated successfully',
        item: updatedItem
      });

    } catch (error) {
      console.error('Error updating data item:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/analytics
   * Get API usage analytics
   * Query params: days (default 7), endpoint, method
   */
  router.get('/analytics', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { days = 7, endpoint, method } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Build query
      let query = supabase
        .from('api_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (endpoint) {
        query = query.ilike('endpoint', `%${endpoint}%`);
      }
      if (method) {
        query = query.eq('method', method.toUpperCase());
      }

      const { data: usage, error: usageError } = await query.limit(1000);

      if (usageError) throw usageError;

      // Calculate summary stats
      const totalRequests = usage.length;
      const avgResponseTime = usage.length > 0
        ? Math.round(usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length)
        : 0;
      const successRate = usage.length > 0
        ? Math.round((usage.filter(u => u.status_code < 400).length / usage.length) * 100)
        : 100;

      // Group by endpoint
      const byEndpoint = {};
      usage.forEach(u => {
        const key = `${u.method} ${u.endpoint}`;
        if (!byEndpoint[key]) {
          byEndpoint[key] = { count: 0, totalTime: 0, errors: 0 };
        }
        byEndpoint[key].count++;
        byEndpoint[key].totalTime += u.response_time_ms || 0;
        if (u.status_code >= 400) byEndpoint[key].errors++;
      });

      const endpointStats = Object.entries(byEndpoint)
        .map(([endpoint, stats]) => ({
          endpoint,
          requests: stats.count,
          avgResponseTime: Math.round(stats.totalTime / stats.count),
          errorRate: Math.round((stats.errors / stats.count) * 100)
        }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 20);

      // Group by day
      const byDay = {};
      usage.forEach(u => {
        const day = u.created_at.split('T')[0];
        if (!byDay[day]) {
          byDay[day] = { requests: 0, errors: 0 };
        }
        byDay[day].requests++;
        if (u.status_code >= 400) byDay[day].errors++;
      });

      const dailyStats = Object.entries(byDay)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        summary: {
          totalRequests,
          avgResponseTime,
          successRate,
          period: `${days} days`
        },
        endpointStats,
        dailyStats,
        recentRequests: usage.slice(0, 50).map(u => ({
          endpoint: u.endpoint,
          method: u.method,
          status: u.status_code,
          responseTime: u.response_time_ms,
          timestamp: u.created_at
        }))
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/costs
   * Get cost tracking data
   * Query params: days (default 30)
   */
  router.get('/analytics/costs', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { days = 30 } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const { data: costs, error: costsError } = await supabase
        .from('cost_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (costsError) throw costsError;

      // Calculate totals by service
      const byService = {};
      costs.forEach(c => {
        if (!byService[c.service]) {
          byService[c.service] = { totalCost: 0, count: 0, operations: {} };
        }
        byService[c.service].totalCost += parseFloat(c.cost_usd) || 0;
        byService[c.service].count++;

        if (!byService[c.service].operations[c.operation]) {
          byService[c.service].operations[c.operation] = { cost: 0, count: 0 };
        }
        byService[c.service].operations[c.operation].cost += parseFloat(c.cost_usd) || 0;
        byService[c.service].operations[c.operation].count++;
      });

      const serviceStats = Object.entries(byService)
        .map(([service, stats]) => ({
          service,
          totalCost: Math.round(stats.totalCost * 10000) / 10000,
          operationCount: stats.count,
          operations: Object.entries(stats.operations).map(([op, data]) => ({
            operation: op,
            cost: Math.round(data.cost * 10000) / 10000,
            count: data.count
          }))
        }))
        .sort((a, b) => b.totalCost - a.totalCost);

      // Daily costs
      const byDay = {};
      costs.forEach(c => {
        const day = c.created_at.split('T')[0];
        if (!byDay[day]) {
          byDay[day] = 0;
        }
        byDay[day] += parseFloat(c.cost_usd) || 0;
      });

      const dailyCosts = Object.entries(byDay)
        .map(([date, cost]) => ({ date, cost: Math.round(cost * 10000) / 10000 }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalCost = costs.reduce((sum, c) => sum + (parseFloat(c.cost_usd) || 0), 0);

      res.json({
        summary: {
          totalCost: Math.round(totalCost * 10000) / 10000,
          period: `${days} days`,
          eventCount: costs.length
        },
        serviceStats,
        dailyCosts,
        recentEvents: costs.slice(0, 50).map(c => ({
          service: c.service,
          operation: c.operation,
          cost: c.cost_usd,
          tokens: c.tokens_used,
          timestamp: c.created_at
        }))
      });

    } catch (error) {
      console.error('Error fetching cost data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // ============================================
  // MISSING CLIENT REPORTS
  // ============================================

  /**
   * GET /api/admin/reports/missing-clients
   * Get aggregated report of transcripts with missing client assignments
   * Query params: period ('week' | 'month' | 'custom'), start_date, end_date
   */
  router.get('/reports/missing-clients', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { period = 'week', start_date, end_date } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Calculate date range
      let periodStart, periodEnd;
      periodEnd = new Date();

      if (period === 'custom' && start_date && end_date) {
        periodStart = new Date(start_date);
        periodEnd = new Date(end_date);
      } else if (period === 'month') {
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
      } else {
        // Default to week
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 7);
      }

      // Get all synced transcripts in period
      const { data: syncedItems, error: syncError } = await supabase
        .from('fireflies_sync_state')
        .select('id, fireflies_meeting_id, data_item_id, status, created_at')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .eq('status', 'synced');

      if (syncError) throw syncError;

      const totalSynced = syncedItems?.length || 0;

      // Get transcripts with missing clients (client_id is null)
      const dataItemIds = (syncedItems || [])
        .filter(s => s.data_item_id)
        .map(s => s.data_item_id);

      let transcriptsMissingClient = [];
      if (dataItemIds.length > 0) {
        const { data: missingClientItems, error: missingError } = await supabase
          .from('data_items')
          .select(`
            id,
            metadata,
            session_date,
            created_at,
            coach:coaches(id, name, email),
            client:clients(id, name)
          `)
          .in('id', dataItemIds)
          .is('client_id', null)
          .eq('data_type', 'transcript');

        if (missingError) throw missingError;
        transcriptsMissingClient = missingClientItems || [];
      }

      // Get pending queue items (unprocessed transcripts without coach match)
      const { data: pendingItems, error: pendingError } = await supabase
        .from('fireflies_pending')
        .select('*')
        .eq('status', 'pending_assignment')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (pendingError) throw pendingError;

      // Aggregate by coach
      const byCoach = {};
      transcriptsMissingClient.forEach(item => {
        const coachId = item.coach?.id || 'unknown';
        const coachName = item.coach?.name || 'Unknown Coach';
        const coachEmail = item.coach?.email || '';

        if (!byCoach[coachId]) {
          byCoach[coachId] = {
            coach_id: coachId,
            coach_name: coachName,
            coach_email: coachEmail,
            missing_client_count: 0,
            unmatched_emails: new Set(),
            transcripts: []
          };
        }

        byCoach[coachId].missing_client_count++;

        // Extract unmatched emails from metadata
        const unmatchedEmails = item.metadata?.unmatched_emails || [];
        unmatchedEmails.forEach(email => byCoach[coachId].unmatched_emails.add(email));

        byCoach[coachId].transcripts.push({
          id: item.id,
          title: item.metadata?.title || item.metadata?.meeting_name || 'Untitled',
          date: item.session_date || item.created_at,
          unmatched_emails: unmatchedEmails
        });
      });

      // Convert Sets to arrays
      const byCoachArray = Object.values(byCoach).map(coach => ({
        ...coach,
        unmatched_emails: Array.from(coach.unmatched_emails)
      }));

      // Collect all unique unmatched emails
      const allUnmatchedEmails = new Set();
      byCoachArray.forEach(coach => {
        coach.unmatched_emails.forEach(email => allUnmatchedEmails.add(email));
      });
      (pendingItems || []).forEach(item => {
        (item.unmatched_emails || []).forEach(email => allUnmatchedEmails.add(email));
      });

      const report = {
        period: {
          start: periodStart.toISOString().split('T')[0],
          end: periodEnd.toISOString().split('T')[0]
        },
        summary: {
          total_transcripts_synced: totalSynced,
          transcripts_missing_client: transcriptsMissingClient.length,
          pending_coach_assignment: (pendingItems || []).length,
          unique_unmatched_emails: allUnmatchedEmails.size,
          coaches_affected: byCoachArray.length
        },
        by_coach: byCoachArray.sort((a, b) => b.missing_client_count - a.missing_client_count),
        pending_queue: (pendingItems || []).map(item => ({
          id: item.id,
          meeting_id: item.meeting_id,
          title: item.title,
          unmatched_emails: item.unmatched_emails || [],
          host_email: item.host_email,
          organizer_email: item.organizer_email,
          created_at: item.created_at
        })),
        generated_at: new Date().toISOString()
      };

      res.json(report);

    } catch (error) {
      console.error('Error generating missing clients report:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/reports/missing-clients/send
   * Send the missing clients report via email
   * Body: { period?, start_date?, end_date?, recipients? }
   */
  router.post('/reports/missing-clients/send', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { period = 'week', start_date, end_date, recipients } = req.body;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      // Generate the report by calling the GET endpoint logic
      // (In production, you might want to refactor this into a shared function)
      let periodStart, periodEnd;
      periodEnd = new Date();

      if (period === 'custom' && start_date && end_date) {
        periodStart = new Date(start_date);
        periodEnd = new Date(end_date);
      } else if (period === 'month') {
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 30);
      } else {
        periodStart = new Date();
        periodStart.setDate(periodStart.getDate() - 7);
      }

      // Get synced transcripts
      const { data: syncedItems } = await supabase
        .from('fireflies_sync_state')
        .select('id, data_item_id, status, created_at')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString())
        .eq('status', 'synced');

      const totalSynced = syncedItems?.length || 0;
      const dataItemIds = (syncedItems || []).filter(s => s.data_item_id).map(s => s.data_item_id);

      let transcriptsMissingClient = [];
      if (dataItemIds.length > 0) {
        const { data: missingClientItems } = await supabase
          .from('data_items')
          .select(`
            id, metadata, session_date, created_at,
            coach:coaches(id, name, email)
          `)
          .in('id', dataItemIds)
          .is('client_id', null)
          .eq('data_type', 'transcript');
        transcriptsMissingClient = missingClientItems || [];
      }

      // Get pending items
      const { data: pendingItems } = await supabase
        .from('fireflies_pending')
        .select('*')
        .eq('status', 'pending_assignment')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Build by_coach data
      const byCoach = {};
      transcriptsMissingClient.forEach(item => {
        const coachId = item.coach?.id || 'unknown';
        if (!byCoach[coachId]) {
          byCoach[coachId] = {
            coach_id: coachId,
            coach_name: item.coach?.name || 'Unknown',
            coach_email: item.coach?.email || '',
            missing_client_count: 0,
            unmatched_emails: new Set(),
            transcripts: []
          };
        }
        byCoach[coachId].missing_client_count++;
        const unmatchedEmails = item.metadata?.unmatched_emails || [];
        unmatchedEmails.forEach(email => byCoach[coachId].unmatched_emails.add(email));
        byCoach[coachId].transcripts.push({
          id: item.id,
          title: item.metadata?.title || item.metadata?.meeting_name || 'Untitled',
          date: item.session_date || item.created_at,
          unmatched_emails: unmatchedEmails
        });
      });

      const byCoachArray = Object.values(byCoach).map(coach => ({
        ...coach,
        unmatched_emails: Array.from(coach.unmatched_emails)
      }));

      const allUnmatchedEmails = new Set();
      byCoachArray.forEach(c => c.unmatched_emails.forEach(e => allUnmatchedEmails.add(e)));
      (pendingItems || []).forEach(p => (p.unmatched_emails || []).forEach(e => allUnmatchedEmails.add(e)));

      const reportData = {
        period: { start: periodStart.toISOString().split('T')[0], end: periodEnd.toISOString().split('T')[0] },
        summary: {
          total_transcripts_synced: totalSynced,
          transcripts_missing_client: transcriptsMissingClient.length,
          pending_coach_assignment: (pendingItems || []).length,
          unique_unmatched_emails: allUnmatchedEmails.size,
          coaches_affected: byCoachArray.length
        },
        by_coach: byCoachArray.sort((a, b) => b.missing_client_count - a.missing_client_count),
        pending_queue: (pendingItems || []).map(item => ({
          id: item.id, meeting_id: item.meeting_id, title: item.title,
          unmatched_emails: item.unmatched_emails || [], created_at: item.created_at
        }))
      };

      // Get recipient emails
      let emailRecipients = recipients || [];

      // If no recipients provided, get from environment and coaches
      if (emailRecipients.length === 0) {
        // Get Ryan's email from coaches table
        const { data: ryanCoach } = await supabase
          .from('coaches')
          .select('email')
          .ilike('name', '%ryan%')
          .limit(1)
          .single();

        // Build recipient list
        const envRecipients = process.env.ADMIN_REPORT_EMAILS?.split(',').map(e => e.trim()) || [];
        if (ryanCoach?.email) emailRecipients.push(ryanCoach.email);
        emailRecipients.push('jem@leadinsideout.io');
        emailRecipients = [...new Set([...envRecipients, ...emailRecipients])];
      }

      // Import email service and send
      let emailResult = { success: false, error: 'Email service not configured' };
      try {
        const { sendMissingClientReport } = await import('../services/email.js');
        emailResult = await sendMissingClientReport(reportData, emailRecipients);
      } catch (emailError) {
        console.error('Email service error:', emailError);
        emailResult = { success: false, error: emailError.message };
      }

      // Store report in history
      const { data: storedReport, error: storeError } = await supabase
        .from('missing_client_reports')
        .insert({
          report_date: new Date().toISOString().split('T')[0],
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          total_transcripts_synced: reportData.summary.total_transcripts_synced,
          transcripts_missing_client: reportData.summary.transcripts_missing_client,
          unique_unmatched_emails: reportData.summary.unique_unmatched_emails,
          coaches_affected: reportData.summary.coaches_affected,
          report_data: reportData,
          sent_to: emailRecipients,
          sent_at: emailResult.success ? new Date().toISOString() : null,
          delivery_status: emailResult.success ? 'sent' : 'failed',
          delivery_error: emailResult.error || null
        })
        .select()
        .single();

      if (storeError) {
        console.error('Error storing report:', storeError);
      }

      res.json({
        success: emailResult.success,
        report_id: storedReport?.id,
        recipients: emailRecipients,
        summary: reportData.summary,
        error: emailResult.error || null
      });

    } catch (error) {
      console.error('Error sending missing clients report:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/reports/missing-clients/history
   * Get history of sent reports
   * Query params: limit (default 10)
   */
  router.get('/reports/missing-clients/history', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { limit = 10 } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const { data: reports, error: reportsError } = await supabase
        .from('missing_client_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (reportsError) throw reportsError;

      res.json({
        reports: (reports || []).map(r => ({
          id: r.id,
          report_date: r.report_date,
          period: { start: r.period_start, end: r.period_end },
          summary: {
            total_transcripts_synced: r.total_transcripts_synced,
            transcripts_missing_client: r.transcripts_missing_client,
            unique_unmatched_emails: r.unique_unmatched_emails,
            coaches_affected: r.coaches_affected
          },
          sent_to: r.sent_to,
          sent_at: r.sent_at,
          delivery_status: r.delivery_status,
          created_at: r.created_at
        })),
        total: reports?.length || 0
      });

    } catch (error) {
      console.error('Error fetching report history:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/analytics/performance
   * Get performance metrics (response times by percentile)
   * Query params: days (default 7)
   */
  router.get('/analytics/performance', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { days = 7 } = req.query;

      // Verify user is an admin
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('coaching_company_id')
        .eq('id', auth.userId)
        .single();

      if (adminError || !admin) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Admin access required'
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const { data: usage, error: usageError } = await supabase
        .from('api_usage')
        .select('endpoint, method, response_time_ms, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (usageError) throw usageError;

      if (usage.length === 0) {
        return res.json({
          summary: { p50: 0, p95: 0, p99: 0, max: 0 },
          slowEndpoints: [],
          hourlyLatency: []
        });
      }

      // Calculate percentiles
      const times = usage.map(u => u.response_time_ms).sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      const p99 = times[Math.floor(times.length * 0.99)];
      const max = times[times.length - 1];

      // Slowest endpoints
      const endpointTimes = {};
      usage.forEach(u => {
        const key = `${u.method} ${u.endpoint}`;
        if (!endpointTimes[key]) {
          endpointTimes[key] = [];
        }
        endpointTimes[key].push(u.response_time_ms);
      });

      const slowEndpoints = Object.entries(endpointTimes)
        .map(([endpoint, times]) => {
          const sorted = times.sort((a, b) => a - b);
          return {
            endpoint,
            avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
            p95Time: sorted[Math.floor(sorted.length * 0.95)],
            count: times.length
          };
        })
        .sort((a, b) => b.p95Time - a.p95Time)
        .slice(0, 10);

      // Hourly latency trend
      const byHour = {};
      usage.forEach(u => {
        const hour = u.created_at.substring(0, 13) + ':00';
        if (!byHour[hour]) {
          byHour[hour] = [];
        }
        byHour[hour].push(u.response_time_ms);
      });

      const hourlyLatency = Object.entries(byHour)
        .map(([hour, times]) => ({
          hour,
          avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
          count: times.length
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .slice(-168); // Last 7 days of hours

      res.json({
        summary: { p50, p95, p99, max },
        slowEndpoints,
        hourlyLatency
      });

    } catch (error) {
      console.error('Error fetching performance data:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}
