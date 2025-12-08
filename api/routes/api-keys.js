/**
 * API Key Management Routes
 *
 * Endpoints for managing API keys for coaches, clients, and admins.
 * All routes require admin authentication.
 */

import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const router = express.Router();

/**
 * Create API key routes
 * @param {Object} supabase - Supabase client
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router} Express router with API key routes
 */
export function createApiKeyRoutes(supabase, authMiddleware) {

  // ============================================
  // API KEY MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/api-keys
   * List all API keys in the company
   */
  router.get('/', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;

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

      // Get all API keys in the company
      // We need to join through coaches to get company-scoped keys
      const { data: apiKeys, error: keysError } = await supabase
        .from('api_keys')
        .select(`
          id,
          name,
          key_hash,
          key_prefix,
          is_revoked,
          last_used_at,
          created_at,
          coach_id,
          client_id,
          admin_id,
          coaches(id, name, email, coaching_company_id),
          clients(id, name, email),
          admins(id, name, email, coaching_company_id)
        `);

      if (keysError) throw keysError;

      // Filter keys to only those belonging to the admin's company
      const companyKeys = apiKeys.filter(key => {
        if (key.coaches && key.coaches.coaching_company_id === admin.coaching_company_id) {
          return true;
        }
        if (key.admins && key.admins.coaching_company_id === admin.coaching_company_id) {
          return true;
        }
        // For client keys, check if any of their coaches belong to the company
        if (key.clients) {
          // We'll need to verify this via coach_clients relationship
          return true; // For now, include all client keys (will be refined)
        }
        return false;
      });

      // Format response
      const formattedKeys = companyKeys.map(key => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix || 'sk_',
        is_revoked: key.is_revoked,
        last_used_at: key.last_used_at,
        created_at: key.created_at,
        owner: {
          type: key.coach_id ? 'coach' : key.client_id ? 'client' : 'admin',
          id: key.coach_id || key.client_id || key.admin_id,
          name: key.coaches?.name || key.clients?.name || key.admins?.name,
          email: key.coaches?.email || key.clients?.email || key.admins?.email
        }
      }));

      res.json({
        api_keys: formattedKeys,
        total: formattedKeys.length
      });

    } catch (error) {
      console.error('Error listing API keys:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * GET /api/admin/api-keys/:id
   * Get details for a specific API key
   */
  router.get('/:id', authMiddleware, async (req, res) => {
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

      // Get API key details
      const { data: apiKey, error: keyError } = await supabase
        .from('api_keys')
        .select(`
          id,
          name,
          key_hash,
          is_revoked,
          last_used_at,
          created_at,
          coach_id,
          client_id,
          admin_id,
          coaches(id, name, email, coaching_company_id),
          clients(id, name, email),
          admins(id, name, email, coaching_company_id)
        `)
        .eq('id', id)
        .single();

      if (keyError || !apiKey) {
        return res.status(404).json({
          error: 'Not found',
          message: 'API key not found'
        });
      }

      // Verify key belongs to admin's company
      const belongsToCompany =
        (apiKey.coaches && apiKey.coaches.coaching_company_id === admin.coaching_company_id) ||
        (apiKey.admins && apiKey.admins.coaching_company_id === admin.coaching_company_id);

      if (!belongsToCompany) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this API key'
        });
      }

      res.json({
        id: apiKey.id,
        name: apiKey.name,
        is_revoked: apiKey.is_revoked,
        last_used_at: apiKey.last_used_at,
        created_at: apiKey.created_at,
        owner: {
          type: apiKey.coach_id ? 'coach' : apiKey.client_id ? 'client' : 'admin',
          id: apiKey.coach_id || apiKey.client_id || apiKey.admin_id,
          name: apiKey.coaches?.name || apiKey.clients?.name || apiKey.admins?.name,
          email: apiKey.coaches?.email || apiKey.clients?.email || apiKey.admins?.email
        }
      });

    } catch (error) {
      console.error('Error getting API key:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/admin/api-keys
   * Create a new API key for a user
   *
   * Body: {
   *   name: string,
   *   owner_type: 'coach' | 'client' | 'admin',
   *   owner_id: string
   * }
   */
  router.post('/', authMiddleware, async (req, res) => {
    try {
      const { auth } = req;
      const { name, owner_type, owner_id } = req.body;

      // Validate required fields
      if (!name || !owner_type || !owner_id) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'name, owner_type, and owner_id are required'
        });
      }

      // Validate owner_type
      if (!['coach', 'client', 'admin'].includes(owner_type)) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'owner_type must be coach, client, or admin'
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

      // Verify owner exists and belongs to admin's company
      let ownerExists = false;

      if (owner_type === 'coach') {
        const { data: coach } = await supabase
          .from('coaches')
          .select('id')
          .eq('id', owner_id)
          .eq('coaching_company_id', admin.coaching_company_id)
          .single();
        ownerExists = !!coach;
      } else if (owner_type === 'client') {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('id', owner_id)
          .single();
        ownerExists = !!client;
        // TODO: Verify client belongs to company via coach_clients
      } else if (owner_type === 'admin') {
        // Only super_admins can create API keys for admins
        if (admin.role !== 'super_admin') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Super admin access required to create admin API keys'
          });
        }
        const { data: adminUser } = await supabase
          .from('admins')
          .select('id')
          .eq('id', owner_id)
          .eq('coaching_company_id', admin.coaching_company_id)
          .single();
        ownerExists = !!adminUser;
      }

      if (!ownerExists) {
        return res.status(404).json({
          error: 'Not found',
          message: `${owner_type} not found or access denied`
        });
      }

      // Generate API key with sk_test_ or sk_live_ prefix to match constraint
      const environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
      const apiKey = `sk_${environment}_` + crypto.randomBytes(32).toString('hex');

      // Hash the key for storage
      const saltRounds = 10;
      const keyHash = await bcrypt.hash(apiKey, saltRounds);

      // Insert API key
      const insertData = {
        name,
        key_hash: keyHash,
        
      };

      // Set owner field
      if (owner_type === 'coach') {
        insertData.coach_id = owner_id;
      } else if (owner_type === 'client') {
        insertData.client_id = owner_id;
      } else if (owner_type === 'admin') {
        insertData.admin_id = owner_id;
      }

      // Set is_revoked to false (active) and key_prefix for identification
      insertData.is_revoked = false;
      insertData.key_prefix = apiKey.substring(0, apiKey.indexOf('_', 3) + 1); // sk_test_ or sk_live_

      const { data: newKey, error: insertError } = await supabase
        .from('api_keys')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({
        message: 'API key created successfully',
        api_key: apiKey, // Return plain text key (only shown once!)
        key_id: newKey.id,
        name: newKey.name,
        owner_type,
        owner_id,
        warning: 'Save this API key now. You will not be able to see it again.'
      });

    } catch (error) {
      console.error('Error creating API key:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/api-keys/:id/revoke
   * Revoke (deactivate) an API key
   */
  router.put('/:id/revoke', authMiddleware, async (req, res) => {
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

      // Get API key to verify company access
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select(`
          id,
          coach_id,
          admin_id,
          coaches(coaching_company_id),
          admins(coaching_company_id)
        `)
        .eq('id', id)
        .single();

      if (!apiKey) {
        return res.status(404).json({
          error: 'Not found',
          message: 'API key not found'
        });
      }

      // Verify key belongs to admin's company
      const belongsToCompany =
        (apiKey.coaches && apiKey.coaches.coaching_company_id === admin.coaching_company_id) ||
        (apiKey.admins && apiKey.admins.coaching_company_id === admin.coaching_company_id);

      if (!belongsToCompany) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this API key'
        });
      }

      // Revoke the key
      const { data: revokedKey, error: updateError } = await supabase
        .from('api_keys')
        .update({ is_revoked: true })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({
        message: 'API key revoked successfully',
        key_id: revokedKey.id,
        is_revoked: revokedKey.is_revoked
      });

    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/admin/api-keys/:id/activate
   * Activate a previously revoked API key
   */
  router.put('/:id/activate', authMiddleware, async (req, res) => {
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

      // Get API key to verify company access
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select(`
          id,
          coach_id,
          admin_id,
          coaches(coaching_company_id),
          admins(coaching_company_id)
        `)
        .eq('id', id)
        .single();

      if (!apiKey) {
        return res.status(404).json({
          error: 'Not found',
          message: 'API key not found'
        });
      }

      // Verify key belongs to admin's company
      const belongsToCompany =
        (apiKey.coaches && apiKey.coaches.coaching_company_id === admin.coaching_company_id) ||
        (apiKey.admins && apiKey.admins.coaching_company_id === admin.coaching_company_id);

      if (!belongsToCompany) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this API key'
        });
      }

      // Activate the key
      const { data: activatedKey, error: updateError } = await supabase
        .from('api_keys')
        .update({ is_revoked: false })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.json({
        message: 'API key activated successfully',
        key_id: activatedKey.id,
        is_revoked: activatedKey.is_revoked
      });

    } catch (error) {
      console.error('Error activating API key:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/admin/api-keys/:id
   * Permanently delete an API key
   */
  router.delete('/:id', authMiddleware, async (req, res) => {
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

      // Get API key to verify company access
      const { data: apiKey } = await supabase
        .from('api_keys')
        .select(`
          id,
          coach_id,
          admin_id,
          coaches(coaching_company_id),
          admins(coaching_company_id)
        `)
        .eq('id', id)
        .single();

      if (!apiKey) {
        return res.status(404).json({
          error: 'Not found',
          message: 'API key not found'
        });
      }

      // Verify key belongs to admin's company
      const belongsToCompany =
        (apiKey.coaches && apiKey.coaches.coaching_company_id === admin.coaching_company_id) ||
        (apiKey.admins && apiKey.admins.coaching_company_id === admin.coaching_company_id);

      if (!belongsToCompany) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this API key'
        });
      }

      // Delete the key
      const { error: deleteError } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({
        message: 'API key deleted successfully',
        key_id: id
      });

    } catch (error) {
      console.error('Error deleting API key:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}
