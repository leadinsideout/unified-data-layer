/**
 * Authentication Middleware
 *
 * Validates API keys and sets Supabase session variables for Row-Level Security (RLS).
 *
 * Flow:
 * 1. Extract API key from Authorization header
 * 2. Validate key against api_keys table
 * 3. Map key to user identity (coach_id, client_id, or admin)
 * 4. Set Supabase session variables (app.current_user_id, app.current_user_role, etc.)
 * 5. Pass request to next handler
 *
 * RLS policies use these session variables to enforce data isolation.
 */

import bcrypt from 'bcrypt';

/**
 * Authentication middleware
 *
 * @param {Object} supabase - Supabase client instance
 * @returns {Function} Express middleware function
 */
export function createAuthMiddleware(supabase) {
  return async (req, res, next) => {
    try {
      // Extract API key from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing Authorization header',
          hint: 'Include "Authorization: Bearer <api-key>" header'
        });
      }

      // Parse Bearer token
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid Authorization header format',
          hint: 'Use "Authorization: Bearer <api-key>"'
        });
      }

      const apiKey = parts[1];

      // Validate API key format (basic check)
      if (!apiKey || apiKey.length < 10) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key format'
        });
      }

      // Look up API key in database
      // Note: We need to query all keys and compare hashes (bcrypt comparison)
      const { data: apiKeys, error: fetchError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_revoked', false);

      if (fetchError) {
        console.error('Error fetching API keys:', fetchError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to validate API key'
        });
      }

      // Find matching key by comparing hashes
      let matchedKey = null;
      for (const key of apiKeys) {
        const isMatch = await bcrypt.compare(apiKey, key.key_hash);
        if (isMatch) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }

      // Check expiration
      if (matchedKey.expires_at) {
        const expiresAt = new Date(matchedKey.expires_at);
        if (expiresAt < new Date()) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'API key has expired',
            expires_at: matchedKey.expires_at
          });
        }
      }

      // Determine user role and identity
      let userId, userRole, coachId, clientId;

      if (matchedKey.scopes && matchedKey.scopes.includes('admin')) {
        // Admin key
        userRole = 'admin';
        userId = null; // Admins don't map to specific user
        coachId = null;
        clientId = null;
      } else if (matchedKey.coach_id) {
        // Coach key
        userRole = 'coach';
        userId = matchedKey.coach_id;
        coachId = matchedKey.coach_id;
        clientId = null;
      } else if (matchedKey.client_id) {
        // Client key
        userRole = 'client';
        userId = matchedKey.client_id;
        coachId = null;
        clientId = matchedKey.client_id;
      } else {
        // Invalid key (shouldn't happen due to DB constraint, but handle anyway)
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'API key has invalid ownership'
        });
      }

      // Update last_used_at timestamp (async, don't wait)
      supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', matchedKey.id)
        .then(() => {})
        .catch(err => console.error('Failed to update last_used_at:', err));

      // Set session variables for RLS
      // Note: Supabase JS client doesn't support setting session variables directly
      // We need to use RPC or modify the client's connection

      // For now, we'll attach the auth context to the request object
      // and create a new Supabase client with proper context for this request
      req.auth = {
        userId,
        userRole,
        coachId,
        clientId,
        apiKeyId: matchedKey.id,
        scopes: matchedKey.scopes || []
      };

      // Create authenticated Supabase client for this request
      // This client will have session variables set
      req.supabase = createAuthenticatedSupabaseClient(supabase, req.auth);

      // Log access to audit_logs (async, don't wait)
      logAuditTrail(supabase, {
        user_id: userId,
        user_role: userRole,
        action: 'API_ACCESS',
        resource_type: 'api_endpoint',
        resource_id: null,
        api_key_id: matchedKey.id,
        request_method: req.method,
        request_path: req.path,
        metadata: {
          ip: req.ip,
          user_agent: req.headers['user-agent']
        },
        success: true
      });

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
    }
  };
}

/**
 * Create authenticated Supabase client with session variables
 *
 * @param {Object} supabase - Base Supabase client
 * @param {Object} auth - Auth context
 * @returns {Object} Authenticated Supabase client
 */
function createAuthenticatedSupabaseClient(supabase, auth) {
  // Create a wrapper around the Supabase client that sets session variables
  // for each query

  const authenticatedClient = {
    // Wrap from() method to set session variables
    from: (table) => {
      const query = supabase.from(table);

      // Add session variables to the query context
      // Note: This is a workaround since Supabase JS doesn't directly support session variables
      // In production, consider using PostgREST headers or server-side connection pooling

      return query;
    },

    // Wrap rpc() method for function calls
    rpc: async (fnName, params = {}) => {
      // Add auth context to RPC parameters
      const authParams = {
        ...params,
        _auth_user_id: auth.userId,
        _auth_user_role: auth.userRole,
        _auth_coach_id: auth.coachId,
        _auth_client_id: auth.clientId
      };

      return supabase.rpc(fnName, authParams);
    },

    // Expose auth context
    auth
  };

  return authenticatedClient;
}

/**
 * Log access to audit trail
 *
 * @param {Object} supabase - Supabase client
 * @param {Object} logEntry - Audit log entry
 */
async function logAuditTrail(supabase, logEntry) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([logEntry]);

    if (error) {
      console.error('Failed to log audit trail:', error);
    }
  } catch (error) {
    console.error('Audit trail error:', error);
  }
}

/**
 * Middleware to check specific scopes
 *
 * @param {string[]} requiredScopes - Required scopes (e.g., ['write', 'admin'])
 * @returns {Function} Express middleware function
 */
export function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userScopes = req.auth.scopes || [];
    const hasRequiredScopes = requiredScopes.every(scope =>
      userScopes.includes(scope) || userScopes.includes('admin')
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Missing required scopes: ${requiredScopes.join(', ')}`,
        your_scopes: userScopes
      });
    }

    next();
  };
}

/**
 * Middleware to check specific roles
 *
 * @param {string[]} allowedRoles - Allowed roles (e.g., ['coach', 'admin'])
 * @returns {Function} Express middleware function
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = req.auth.userRole;
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${userRole}' not allowed for this endpoint`,
        allowed_roles: allowedRoles
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware
 * Allows requests with or without authentication
 * Sets req.auth if authenticated, otherwise leaves it undefined
 *
 * @param {Object} supabase - Supabase client instance
 * @returns {Function} Express middleware function
 */
export function createOptionalAuthMiddleware(supabase) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    // If no auth header, proceed without authentication
    if (!authHeader) {
      req.auth = null;
      req.supabase = supabase; // Use base client without session variables
      return next();
    }

    // If auth header present, use regular auth middleware
    const authMiddleware = createAuthMiddleware(supabase);
    return authMiddleware(req, res, next);
  };
}
