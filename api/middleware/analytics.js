/**
 * Analytics Middleware
 *
 * Tracks API usage metrics for performance monitoring and analytics.
 * Logs requests asynchronously to avoid impacting response times.
 */

/**
 * Creates analytics middleware
 * @param {Object} supabase - Supabase client
 * @returns {Function} Express middleware
 */
export function createAnalyticsMiddleware(supabase) {
  return async (req, res, next) => {
    const startTime = Date.now();

    // Capture original end function
    const originalEnd = res.end;

    res.end = function(...args) {
      const responseTime = Date.now() - startTime;

      // Log asynchronously - don't await to avoid blocking response
      logApiUsage(supabase, {
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        apiKeyId: req.auth?.keyId || null,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
        userAgent: req.headers['user-agent'] || null,
        coachId: req.auth?.coachId || null,
        clientId: req.auth?.clientId || null,
      }).catch(err => {
        // Log error but don't crash - analytics is non-critical
        console.error('Analytics logging error:', err.message);
      });

      // Call original end
      originalEnd.apply(res, args);
    };

    next();
  };
}

/**
 * Log API usage to database
 * @param {Object} supabase - Supabase client
 * @param {Object} data - Usage data to log
 */
async function logApiUsage(supabase, data) {
  // Skip logging for health checks and static files
  if (data.endpoint === '/api/health' ||
      data.endpoint === '/' ||
      data.endpoint.startsWith('/admin') ||
      !data.endpoint.startsWith('/api')) {
    return;
  }

  const { error } = await supabase
    .from('api_usage')
    .insert({
      endpoint: data.endpoint,
      method: data.method,
      status_code: data.statusCode,
      response_time_ms: data.responseTimeMs,
      api_key_id: data.apiKeyId,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      coach_id: data.coachId,
      client_id: data.clientId,
    });

  if (error) {
    throw error;
  }
}

/**
 * Log cost event for external service usage
 * @param {Object} supabase - Supabase client
 * @param {Object} data - Cost event data
 */
export async function logCostEvent(supabase, {
  service,
  operation,
  units,
  unitType,
  costUsd = null,
  apiKeyId = null,
  dataItemId = null,
  metadata = {}
}) {
  try {
    const { error } = await supabase
      .from('cost_events')
      .insert({
        service,
        operation,
        units,
        unit_type: unitType,
        cost_usd: costUsd,
        api_key_id: apiKeyId,
        data_item_id: dataItemId,
        metadata
      });

    if (error) {
      console.error('Cost logging error:', error.message);
    }
  } catch (err) {
    console.error('Cost logging error:', err.message);
  }
}

// OpenAI pricing (as of Dec 2025)
const OPENAI_PRICING = {
  'text-embedding-3-small': 0.00002 / 1000, // $0.00002 per 1K tokens
  'text-embedding-3-large': 0.00013 / 1000, // $0.00013 per 1K tokens
  'gpt-4o-mini': {
    input: 0.00015 / 1000,  // $0.15 per 1M input tokens
    output: 0.0006 / 1000   // $0.60 per 1M output tokens
  }
};

/**
 * Calculate cost for OpenAI embedding tokens
 * @param {number} tokens - Number of tokens
 * @param {string} model - Model name
 * @returns {number} - Cost in USD
 */
export function calculateEmbeddingCost(tokens, model = 'text-embedding-3-small') {
  const pricePerToken = OPENAI_PRICING[model];
  if (!pricePerToken) return null;
  return tokens * pricePerToken;
}
