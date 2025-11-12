/**
 * Coaching Model Data Processor
 *
 * Handles processing of coaching models, frameworks, and methodologies.
 *
 * Data Type: 'coaching_model'
 * Visibility Default: 'private' (can be shared explicitly)
 * Chunk Config: 400 words with 50 word overlap
 *
 * Metadata Schema:
 * - model_name: string (e.g., 'Theory of Change')
 * - model_type: 'theory_of_change' | 'framework' | 'evaluation_rubric' | 'competency_model'
 * - version: string (e.g., '1.0', '2.0')
 * - key_principles: string[]
 * - evaluation_criteria: string[]
 * - author: string
 * - coaching_company_id: UUID (for company-owned models)
 */

import { BaseDataProcessor } from './base-processor.js';

export class CoachingModelProcessor extends BaseDataProcessor {
  /**
   * Validate coaching model input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Coaching model content is required and must be a string');
    }

    if (rawContent.trim().length < 200) {
      throw new Error('Coaching model must be at least 200 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Model name is required
    if (!metadata.model_name) {
      throw new Error('model_name is required in metadata');
    }

    // Coach ID is required (model owner)
    if (!metadata.coach_id && !metadata.coaching_company_id) {
      throw new Error('Either coach_id or coaching_company_id is required in metadata');
    }

    // Optional: Validate model_type
    const validTypes = ['theory_of_change', 'framework', 'evaluation_rubric', 'competency_model'];
    if (metadata.model_type && !validTypes.includes(metadata.model_type)) {
      throw new Error(`Invalid model_type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Process coaching model content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Prepare data item for storage
    const dataItem = {
      data_type: 'coaching_model',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id || null,
      client_id: null, // Models are not client-specific
      client_organization_id: null,

      // Access control
      // Default: private (only visible to owner/company)
      // Can be shared explicitly via visibility_level and allowed_roles
      visibility_level: metadata.visibility_level || 'private',
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Type-specific metadata
      metadata: {
        model_name: metadata.model_name,
        model_type: metadata.model_type || 'framework',
        version: metadata.version || '1.0',
        key_principles: metadata.key_principles || [],
        evaluation_criteria: metadata.evaluation_criteria || [],
        author: metadata.author || null,
        coaching_company_id: metadata.coaching_company_id || null,
        source_url: metadata.source_url || null,
        publication_date: metadata.publication_date || null,
        last_reviewed: metadata.last_reviewed || now.toISOString(),
        tags: metadata.tags || [],
        related_models: metadata.related_models || [],
        use_cases: metadata.use_cases || []
      },

      // Audit fields
      created_at: now,
      updated_at: now,
      created_by: metadata.created_by || metadata.coach_id || null
    };

    return {
      dataItem,
      content: rawContent.trim() // Content to chunk and embed
    };
  }

  /**
   * Get chunk configuration for coaching models
   *
   * Uses 400 words with 50 word overlap to balance context and granularity
   */
  getChunkConfig() {
    return {
      chunkSize: 400,
      overlap: 50
    };
  }
}
