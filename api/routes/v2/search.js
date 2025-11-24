/**
 * V2 Search Routes
 *
 * Enhanced search endpoints with better filtering and response structure.
 * Used by MCP server and Custom GPT for coaching data access.
 */

import express from 'express';
import OpenAI from 'openai';

/**
 * Create v2 search routes
 * @param {Object} supabase - Supabase client
 * @param {Function} authMiddleware - Authentication middleware
 * @returns {express.Router} Express router with v2 search routes
 */
export function createV2SearchRoutes(supabase, authMiddleware) {
  const router = express.Router();

  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  /**
   * POST /api/v2/search/unified
   *
   * Enhanced search with unified response structure.
   * Adds pagination info, timing metadata, and better organization.
   */
  router.post('/unified', authMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
      const { auth } = req;
      const {
        query,
        types,
        client_id,
        coach_id,
        organization_id,
        threshold = 0.3,
        limit = 10
      } = req.body;

      // Validate required fields
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Bad request',
          message: 'query is required and must be a string'
        });
      }

      // Validate threshold
      const validThreshold = Math.max(0, Math.min(1, parseFloat(threshold) || 0.3));

      // Validate limit
      const validLimit = Math.min(Math.max(1, parseInt(limit) || 10), 50);

      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;
      const embeddingText = `[${queryEmbedding.map(n => n.toPrecision(10)).join(',')}]`;

      // Build RPC parameters
      const rpcParams = {
        query_embedding_text: embeddingText,
        match_threshold: validThreshold,
        match_count: validLimit
      };

      // Apply type filter
      if (types && Array.isArray(types) && types.length > 0) {
        rpcParams.filter_types = types;
      }

      // Apply scope filters based on auth
      // Coach sees their own data and their clients' data
      if (auth.coachId && !coach_id) {
        rpcParams.filter_coach_id = auth.coachId;
      } else if (coach_id) {
        rpcParams.filter_coach_id = coach_id;
      }

      // Client filter
      if (client_id) {
        rpcParams.filter_client_id = client_id;
      } else if (auth.clientId) {
        // Client can only see their own data
        rpcParams.filter_client_id = auth.clientId;
      }

      // Organization filter
      if (organization_id) {
        rpcParams.filter_org_id = organization_id;
      }

      // Execute search
      const { data: chunks, error: searchError } = await supabase
        .rpc('match_data_chunks', rpcParams);

      if (searchError) {
        throw searchError;
      }

      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Group results by data type
      const resultsByType = {};
      (chunks || []).forEach(chunk => {
        if (!resultsByType[chunk.data_type]) {
          resultsByType[chunk.data_type] = [];
        }
        resultsByType[chunk.data_type].push(chunk);
      });

      res.json({
        query,
        results: chunks || [],
        count: chunks?.length || 0,
        results_by_type: resultsByType,
        type_counts: Object.fromEntries(
          Object.entries(resultsByType).map(([type, items]) => [type, items.length])
        ),
        search_params: {
          threshold: validThreshold,
          limit: validLimit,
          types: types || null,
          client_id: client_id || null,
          coach_id: coach_id || auth.coachId || null
        },
        metadata: {
          response_time_ms: responseTime,
          embedding_model: 'text-embedding-3-small',
          user_role: auth.userRole
        }
      });

    } catch (error) {
      console.error('Error in unified search:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  /**
   * POST /api/v2/search/filtered
   *
   * Search with explicit filter object structure.
   * Better for complex filter combinations.
   */
  router.post('/filtered', authMiddleware, async (req, res) => {
    const startTime = Date.now();

    try {
      const { auth } = req;
      const { query, filters = {}, options = {} } = req.body;

      // Validate required fields
      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          error: 'Bad request',
          message: 'query is required and must be a string'
        });
      }

      // Extract filters
      const {
        types,
        date_range,
        clients,
        coaches,
        organizations
      } = filters;

      // Extract options
      const {
        threshold = 0.3,
        limit = 10,
        include_metadata = true,
        include_content = true
      } = options;

      // Validate threshold and limit
      const validThreshold = Math.max(0, Math.min(1, parseFloat(threshold) || 0.3));
      const validLimit = Math.min(Math.max(1, parseInt(limit) || 10), 50);

      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;
      const embeddingText = `[${queryEmbedding.map(n => n.toPrecision(10)).join(',')}]`;

      // Build RPC parameters
      const rpcParams = {
        query_embedding_text: embeddingText,
        match_threshold: validThreshold,
        match_count: validLimit
      };

      // Apply type filter
      if (types && Array.isArray(types) && types.length > 0) {
        rpcParams.filter_types = types;
      }

      // Apply client filter (first client in array, or auth scope)
      if (clients && Array.isArray(clients) && clients.length > 0) {
        rpcParams.filter_client_id = clients[0];
      } else if (auth.clientId) {
        rpcParams.filter_client_id = auth.clientId;
      }

      // Apply coach filter
      if (coaches && Array.isArray(coaches) && coaches.length > 0) {
        rpcParams.filter_coach_id = coaches[0];
      } else if (auth.coachId) {
        rpcParams.filter_coach_id = auth.coachId;
      }

      // Apply organization filter
      if (organizations && Array.isArray(organizations) && organizations.length > 0) {
        rpcParams.filter_org_id = organizations[0];
      }

      // Execute search
      let { data: chunks, error: searchError } = await supabase
        .rpc('match_data_chunks', rpcParams);

      if (searchError) {
        throw searchError;
      }

      // Apply date range filter (post-query since RPC doesn't support it)
      if (date_range && chunks) {
        if (date_range.start) {
          chunks = chunks.filter(c => c.session_date >= date_range.start);
        }
        if (date_range.end) {
          chunks = chunks.filter(c => c.session_date <= date_range.end);
        }
      }

      // Format results based on options
      const formattedResults = (chunks || []).map(chunk => {
        const result = {
          id: chunk.id,
          data_item_id: chunk.data_item_id,
          similarity: chunk.similarity,
          data_type: chunk.data_type
        };

        if (include_content) {
          result.content = chunk.content;
        }

        if (include_metadata) {
          result.metadata = chunk.metadata;
          result.coach_id = chunk.coach_id;
          result.client_id = chunk.client_id;
          result.session_date = chunk.session_date;
        }

        return result;
      });

      // Calculate response time
      const responseTime = Date.now() - startTime;

      res.json({
        query,
        results: formattedResults,
        count: formattedResults.length,
        filters_applied: {
          types,
          date_range,
          clients,
          coaches,
          organizations
        },
        options_applied: {
          threshold: validThreshold,
          limit: validLimit,
          include_metadata,
          include_content
        },
        metadata: {
          response_time_ms: responseTime,
          user_role: auth.userRole
        }
      });

    } catch (error) {
      console.error('Error in filtered search:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  return router;
}
