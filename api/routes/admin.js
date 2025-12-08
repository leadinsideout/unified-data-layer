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
      const { type, email, name, role, metadata } = req.body;

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
          title,
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
          title: item.title,
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

  return router;
}
