/**
 * Audit Logger
 *
 * Generates audit trails for PII scrubbing operations.
 * Stores metadata about what was detected and redacted.
 *
 * Audit trail includes:
 * - Timestamp
 * - Method used (hybrid, regex, gpt)
 * - Entity counts by type
 * - Confidence scores
 * - Performance metrics
 * - Version information
 */

export class AuditLogger {
  constructor(options = {}) {
    this.version = options.version || '1.0.0';
    this.includeEntityDetails = options.includeEntityDetails !== false;
  }

  /**
   * Generate audit trail for PII scrubbing operation
   *
   * @param {Object} params - Audit parameters
   * @returns {Object} Audit trail object
   */
  log(params) {
    const {
      entities = [],
      method = 'unknown',
      dataType = 'unknown',
      duration = 0,
      originalTextLength = 0,
      redactedTextLength = 0
    } = params;

    const audit = {
      scrubbed: entities.length > 0,
      timestamp: new Date().toISOString(),
      method,
      version: this.version,
      dataType,
      performance: {
        duration_ms: duration,
        entities_detected: entities.length
      },
      entities: {
        total: entities.length,
        by_type: this.groupByType(entities),
        by_method: this.groupByMethod(entities),
        by_confidence: this.getConfidenceStats(entities)
      }
    };

    // Add entity details if enabled (for debugging/review)
    if (this.includeEntityDetails && entities.length > 0) {
      audit.entity_details = entities.map(e => ({
        type: e.type,
        method: e.method,
        confidence: e.confidence,
        length: e.end - e.start,
        // Don't include actual text for security
        position: { start: e.start, end: e.end }
      }));
    }

    // Add text statistics
    if (originalTextLength > 0) {
      audit.text_stats = {
        original_length: originalTextLength,
        redacted_length: redactedTextLength,
        characters_redacted: this.getTotalCharactersRedacted(entities),
        redaction_percentage: this.getRedactionPercentage(entities, originalTextLength)
      };
    }

    return audit;
  }

  /**
   * Group entities by type
   *
   * @param {Array} entities - Detected entities
   * @returns {Object} Count by type
   */
  groupByType(entities) {
    const byType = {};

    for (const entity of entities) {
      const type = entity.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    return byType;
  }

  /**
   * Group entities by detection method
   *
   * @param {Array} entities - Detected entities
   * @returns {Object} Count by method
   */
  groupByMethod(entities) {
    const byMethod = {};

    for (const entity of entities) {
      const method = entity.method || 'unknown';
      byMethod[method] = (byMethod[method] || 0) + 1;
    }

    return byMethod;
  }

  /**
   * Calculate confidence statistics
   *
   * @param {Array} entities - Detected entities
   * @returns {Object} Confidence stats
   */
  getConfidenceStats(entities) {
    if (entities.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0
      };
    }

    const confidences = entities.map(e => e.confidence || 0);

    return {
      average: this.average(confidences),
      min: Math.min(...confidences),
      max: Math.max(...confidences),
      distribution: this.getConfidenceDistribution(confidences)
    };
  }

  /**
   * Get confidence distribution buckets
   *
   * @param {Array} confidences - Array of confidence scores
   * @returns {Object} Distribution by range
   */
  getConfidenceDistribution(confidences) {
    const distribution = {
      'high (0.9-1.0)': 0,
      'medium (0.7-0.9)': 0,
      'low (<0.7)': 0
    };

    for (const conf of confidences) {
      if (conf >= 0.9) {
        distribution['high (0.9-1.0)']++;
      } else if (conf >= 0.7) {
        distribution['medium (0.7-0.9)']++;
      } else {
        distribution['low (<0.7)']++;
      }
    }

    return distribution;
  }

  /**
   * Calculate total characters redacted
   *
   * @param {Array} entities - Detected entities
   * @returns {number} Total character count
   */
  getTotalCharactersRedacted(entities) {
    return entities.reduce((sum, entity) => sum + (entity.end - entity.start), 0);
  }

  /**
   * Calculate percentage of text redacted
   *
   * @param {Array} entities - Detected entities
   * @param {number} originalLength - Original text length
   * @returns {number} Percentage (0-100)
   */
  getRedactionPercentage(entities, originalLength) {
    if (originalLength === 0) return 0;

    const redactedChars = this.getTotalCharactersRedacted(entities);
    return Number(((redactedChars / originalLength) * 100).toFixed(2));
  }

  /**
   * Calculate average of array
   *
   * @param {Array} numbers - Array of numbers
   * @returns {number} Average
   */
  average(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return Number((sum / numbers.length).toFixed(3));
  }

  /**
   * Create summary report for multiple scrubbing operations
   *
   * @param {Array} audits - Array of audit trails
   * @returns {Object} Summary report
   */
  createSummary(audits) {
    if (audits.length === 0) {
      return {
        total_operations: 0,
        items_with_pii: 0,
        average_duration_ms: 0
      };
    }

    const itemsWithPII = audits.filter(a => a.scrubbed).length;
    const totalEntities = audits.reduce((sum, a) => sum + a.entities.total, 0);
    const durations = audits.map(a => a.performance.duration_ms);

    return {
      total_operations: audits.length,
      items_with_pii: itemsWithPII,
      items_without_pii: audits.length - itemsWithPII,
      percentage_with_pii: Number(((itemsWithPII / audits.length) * 100).toFixed(2)),
      total_entities_detected: totalEntities,
      average_entities_per_item: Number((totalEntities / audits.length).toFixed(2)),
      performance: {
        average_duration_ms: this.average(durations),
        min_duration_ms: Math.min(...durations),
        max_duration_ms: Math.max(...durations)
      },
      entity_types: this.aggregateTypes(audits),
      methods: this.aggregateMethods(audits)
    };
  }

  /**
   * Aggregate entity types across multiple audits
   *
   * @param {Array} audits - Array of audit trails
   * @returns {Object} Aggregated type counts
   */
  aggregateTypes(audits) {
    const types = {};

    for (const audit of audits) {
      for (const [type, count] of Object.entries(audit.entities.by_type)) {
        types[type] = (types[type] || 0) + count;
      }
    }

    return types;
  }

  /**
   * Aggregate detection methods across multiple audits
   *
   * @param {Array} audits - Array of audit trails
   * @returns {Object} Aggregated method counts
   */
  aggregateMethods(audits) {
    const methods = {};

    for (const audit of audits) {
      for (const [method, count] of Object.entries(audit.entities.by_method)) {
        methods[method] = (methods[method] || 0) + count;
      }
    }

    return methods;
  }

  /**
   * Format audit trail for human-readable output
   *
   * @param {Object} audit - Audit trail
   * @returns {string} Formatted string
   */
  format(audit) {
    const lines = [];

    lines.push('=== PII Scrubbing Audit ===');
    lines.push(`Timestamp: ${audit.timestamp}`);
    lines.push(`Scrubbed: ${audit.scrubbed ? 'Yes' : 'No'}`);
    lines.push(`Method: ${audit.method}`);
    lines.push(`Duration: ${audit.performance.duration_ms}ms`);

    if (audit.entities.total > 0) {
      lines.push(`\nEntities Detected: ${audit.entities.total}`);
      lines.push('By Type:');
      for (const [type, count] of Object.entries(audit.entities.by_type)) {
        lines.push(`  - ${type}: ${count}`);
      }

      lines.push('\nConfidence:');
      lines.push(`  - Average: ${audit.entities.by_confidence.average}`);
      lines.push(`  - Range: ${audit.entities.by_confidence.min} - ${audit.entities.by_confidence.max}`);
    }

    return lines.join('\n');
  }
}
