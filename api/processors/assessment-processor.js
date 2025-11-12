/**
 * Assessment Data Processor
 *
 * Handles processing of client assessments (personality, 360, skills, etc.).
 *
 * Data Type: 'assessment'
 * Visibility Default: 'coach_only'
 * Chunk Config: 300 words with 30 word overlap (shorter for structured data)
 *
 * Metadata Schema:
 * - assessment_type: 'disc' | '360' | 'mbti' | 'strengths_finder' | 'eq' | 'custom'
 * - date_taken: ISO timestamp
 * - scores: object (type-specific scoring data)
 * - profile_summary: string
 * - assessor_name: string (if applicable)
 * - assessment_provider: string (e.g., 'DISC Insights', 'Gallup')
 */

import { BaseDataProcessor } from './base-processor.js';

export class AssessmentProcessor extends BaseDataProcessor {
  /**
   * Validate assessment input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Assessment content is required and must be a string');
    }

    if (rawContent.trim().length < 100) {
      throw new Error('Assessment must be at least 100 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Assessment type is required
    if (!metadata.assessment_type) {
      throw new Error('assessment_type is required in metadata');
    }

    // Client ID is required for assessments
    if (!metadata.client_id) {
      throw new Error('client_id is required in metadata for assessments');
    }

    // Optional: Validate assessment_type
    const validTypes = ['disc', '360', 'mbti', 'strengths_finder', 'eq', 'custom'];
    if (!validTypes.includes(metadata.assessment_type)) {
      throw new Error(`Invalid assessment_type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Process assessment content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Extract structured data if present (type-specific parsing)
    const structuredData = this.extractStructuredData(rawContent, metadata.assessment_type);

    // Prepare data item for storage
    const dataItem = {
      data_type: 'assessment',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id || null,
      client_id: metadata.client_id,
      client_organization_id: metadata.client_organization_id || null,

      // Access control
      visibility_level: metadata.visibility_level || 'coach_only', // Default: coach-only
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Session relationship (optional)
      session_id: metadata.session_id || null,
      session_date: metadata.date_taken ? new Date(metadata.date_taken) : now,

      // Type-specific metadata
      metadata: {
        assessment_type: metadata.assessment_type,
        date_taken: metadata.date_taken || now.toISOString(),
        scores: structuredData.scores || metadata.scores || {},
        profile_summary: structuredData.summary || metadata.profile_summary || '',
        assessor_name: metadata.assessor_name || null,
        assessment_provider: metadata.assessment_provider || null,
        raw_scores: metadata.raw_scores || null,
        percentiles: metadata.percentiles || null,
        interpretation: metadata.interpretation || null,
        recommendations: metadata.recommendations || null
      },

      // Audit fields
      created_at: now,
      updated_at: now,
      created_by: metadata.created_by || null
    };

    return {
      dataItem,
      content: rawContent.trim() // Content to chunk and embed
    };
  }

  /**
   * Extract structured data from assessment content
   *
   * @param {string} rawContent - Raw assessment text
   * @param {string} assessmentType - Type of assessment
   * @returns {{scores: object, summary: string}}
   */
  extractStructuredData(rawContent, assessmentType) {
    // This is a simplified extractor
    // In production, implement type-specific parsing logic

    const result = {
      scores: {},
      summary: ''
    };

    try {
      // Example: Extract DISC scores if present
      if (assessmentType === 'disc') {
        const discPattern = /D:\s*(\d+)[^\d]*I:\s*(\d+)[^\d]*S:\s*(\d+)[^\d]*C:\s*(\d+)/i;
        const match = rawContent.match(discPattern);
        if (match) {
          result.scores = {
            dominance: parseInt(match[1]),
            influence: parseInt(match[2]),
            steadiness: parseInt(match[3]),
            conscientiousness: parseInt(match[4])
          };
        }
      }

      // Example: Extract MBTI type if present
      if (assessmentType === 'mbti') {
        const mbtiPattern = /(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)/;
        const match = rawContent.match(mbtiPattern);
        if (match) {
          result.scores = {
            type: match[1]
          };
        }
      }

      // Extract first paragraph as summary (if not too long)
      const paragraphs = rawContent.split(/\n\n+/);
      if (paragraphs.length > 0) {
        const firstPara = paragraphs[0].trim();
        if (firstPara.length <= 500) {
          result.summary = firstPara;
        }
      }
    } catch (error) {
      console.warn('Error extracting structured data from assessment:', error.message);
    }

    return result;
  }

  /**
   * Get chunk configuration for assessments
   *
   * Uses smaller chunks (300 words, 30 overlap) since assessments
   * tend to be more structured with discrete sections
   */
  getChunkConfig() {
    return {
      chunkSize: 300,
      overlap: 30
    };
  }
}
