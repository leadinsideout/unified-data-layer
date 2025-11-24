/**
 * Admin Authentication Routes
 *
 * Handles email/password login for admin dashboard
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const SALT_ROUNDS = 10;
const SESSION_DURATION_HOURS = 24;

export function createAdminAuthRoutes(supabase) {
  const router = Router();

  /**
   * POST /api/admin/auth/login
   *
   * Login with email and password
   */
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email and password are required'
        });
      }

      // Find admin by email
      const { data: admin, error: findError } = await supabase
        .from('admins')
        .select('id, email, name, role, password_hash')
        .eq('email', email.toLowerCase())
        .single();

      if (findError || !admin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Check if admin has a password set
      if (!admin.password_hash) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Password not set. Contact system administrator.'
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, admin.password_hash);
      if (!passwordValid) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password'
        });
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(sessionToken, SALT_ROUNDS);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

      // Store session
      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({
          admin_id: admin.id,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          ip_address: req.ip || req.headers['x-forwarded-for'],
          user_agent: req.headers['user-agent']
        });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create session'
        });
      }

      res.json({
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Login failed'
      });
    }
  });

  /**
   * POST /api/admin/auth/logout
   *
   * Logout and invalidate session
   */
  router.post('/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(200).json({ message: 'Logged out' });
      }

      const token = authHeader.slice(7);

      // Find and delete matching session
      const { data: sessions } = await supabase
        .from('admin_sessions')
        .select('id, token_hash');

      if (sessions) {
        for (const session of sessions) {
          const matches = await bcrypt.compare(token, session.token_hash);
          if (matches) {
            await supabase
              .from('admin_sessions')
              .delete()
              .eq('id', session.id);
            break;
          }
        }
      }

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(200).json({ message: 'Logged out' });
    }
  });

  /**
   * GET /api/admin/auth/me
   *
   * Get current admin info (validates session)
   */
  router.get('/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No session token provided'
        });
      }

      const token = authHeader.slice(7);

      // Find valid session
      const { data: sessions } = await supabase
        .from('admin_sessions')
        .select('id, admin_id, token_hash, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (!sessions || sessions.length === 0) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired or invalid'
        });
      }

      let validSession = null;
      for (const session of sessions) {
        const matches = await bcrypt.compare(token, session.token_hash);
        if (matches) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired or invalid'
        });
      }

      // Get admin info
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('id, email, name, role')
        .eq('id', validSession.admin_id)
        .single();

      if (adminError || !admin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin not found'
        });
      }

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        },
        expiresAt: validSession.expires_at
      });
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate session'
      });
    }
  });

  /**
   * POST /api/admin/auth/set-password
   *
   * Set password for an admin (requires valid session or first-time setup)
   */
  router.post('/set-password', async (req, res) => {
    try {
      const { email, currentPassword, newPassword, setupToken } = req.body;

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Password must be at least 8 characters'
        });
      }

      // Find admin
      const { data: admin, error: findError } = await supabase
        .from('admins')
        .select('id, email, password_hash')
        .eq('email', email.toLowerCase())
        .single();

      if (findError || !admin) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Admin not found'
        });
      }

      // If admin has existing password, require current password
      if (admin.password_hash) {
        if (!currentPassword) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Current password required'
          });
        }

        const passwordValid = await bcrypt.compare(currentPassword, admin.password_hash);
        if (!passwordValid) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Current password is incorrect'
          });
        }
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

      // Update admin
      const { error: updateError } = await supabase
        .from('admins')
        .update({ password_hash: passwordHash })
        .eq('id', admin.id);

      if (updateError) {
        console.error('Password update error:', updateError);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to update password'
        });
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to set password'
      });
    }
  });

  return router;
}

/**
 * Middleware to validate admin session or API key
 */
export function createAdminSessionMiddleware(supabase) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'No session token provided'
        });
      }

      const token = authHeader.slice(7);

      // Check if it's an API key (starts with sk_)
      if (token.startsWith('sk_')) {
        // Validate API key for admin access
        const { data: apiKeys } = await supabase
          .from('api_keys')
          .select('id, key_hash, admin_id, is_revoked')
          .not('admin_id', 'is', null)
          .eq('is_revoked', false);

        if (!apiKeys || apiKeys.length === 0) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
          });
        }

        let matchedKey = null;
        for (const key of apiKeys) {
          const matches = await bcrypt.compare(token, key.key_hash);
          if (matches) {
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

        // Get admin info
        const { data: admin } = await supabase
          .from('admins')
          .select('id, email, name, role')
          .eq('id', matchedKey.admin_id)
          .single();

        if (!admin) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Admin not found'
          });
        }

        // Set auth context for API key
        req.auth = {
          userId: admin.id,
          userRole: 'admin',
          adminId: admin.id,
          coachId: null,
          clientId: null,
          apiKeyId: matchedKey.id
        };

        return next();
      }

      // Find valid session
      const { data: sessions } = await supabase
        .from('admin_sessions')
        .select('id, admin_id, token_hash, expires_at')
        .gt('expires_at', new Date().toISOString());

      if (!sessions || sessions.length === 0) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired or invalid'
        });
      }

      let validSession = null;
      for (const session of sessions) {
        const matches = await bcrypt.compare(token, session.token_hash);
        if (matches) {
          validSession = session;
          break;
        }
      }

      if (!validSession) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session expired or invalid'
        });
      }

      // Get admin info
      const { data: admin } = await supabase
        .from('admins')
        .select('id, email, name, role')
        .eq('id', validSession.admin_id)
        .single();

      if (!admin) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin not found'
        });
      }

      // Set auth context
      req.auth = {
        userId: admin.id,
        userRole: 'admin',
        adminId: admin.id,
        coachId: null,
        clientId: null,
        sessionId: validSession.id
      };

      next();
    } catch (error) {
      console.error('Session middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed'
      });
    }
  };
}
