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

  return router;
}
