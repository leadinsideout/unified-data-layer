/**
 * Coach Assessment Data Processor
 *
 * Handles processing of coach's personal assessments (personality, strengths, etc.).
 * These are the coach's OWN assessments for self-awareness and professional development,
 * NOT client assessments.
 *
 * Data Type: 'coach_assessment'
 * Visibility Default: 'coach_only' (private to the coach)
 * Chunk Config: 300 words with 30 word overlap (structured data)
 *
 * Use Cases:
 * - Coach's MBTI/personality type for self-awareness
 * - CliftonStrengths for leveraging strengths in coaching
 * - Human Design for understanding working style
 * - 360 feedback on the coach's own performance
 * - Any assessment the coach takes about themselves
 *
 * Metadata Schema:
 * - assessment_type: 'mbti' | 'cliftonstrengths' | 'disc' | 'enneagram' | 'eq' |
 *                    'human_design' | 'via_strengths' | 'working_genius' | 'interoception' | 'custom'
 * - assessment_date: ISO timestamp when assessment was taken
 * - assessment_provider: string (e.g., 'Gallup', 'MBTI Foundation')
 * - key_results: object (type-specific results like top 5 strengths, MBTI type)
 * - insights: string[] (key insights from the assessment)
 * - development_areas: string[] (areas for growth identified)
 */

import { BaseDataProcessor } from './base-processor.js';

export class CoachAssessmentProcessor extends BaseDataProcessor {
  /**
   * Validate coach assessment input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Coach assessment content is required and must be a string');
    }

    if (rawContent.trim().length < 100) {
      throw new Error('Coach assessment must be at least 100 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Assessment type is required
    if (!metadata.assessment_type) {
      throw new Error('assessment_type is required in metadata');
    }

    // Coach ID is required (this is the coach's own assessment)
    if (!metadata.coach_id) {
      throw new Error('coach_id is required in metadata for coach assessments');
    }

    // Validate assessment_type
    const validTypes = [
      'mbti',
      'cliftonstrengths',
      'disc',
      'enneagram',
      'eq',
      'human_design',
      'via_strengths',
      'working_genius',
      'interoception',
      '360_feedback',
      'custom'
    ];

    if (!validTypes.includes(metadata.assessment_type)) {
      throw new Error(`Invalid assessment_type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Process coach assessment content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Extract structured data if present (type-specific parsing)
    const structuredData = this.extractStructuredData(rawContent, metadata.assessment_type);

    // Prepare data item for storage
    const dataItem = {
      data_type: 'coach_assessment',
      raw_content: rawContent.trim(),

      // Ownership - this is the COACH's assessment (about themselves)
      coach_id: metadata.coach_id,
      client_id: null, // Not a client assessment
      client_organization_id: null,

      // Access control - private to the coach by default
      visibility_level: metadata.visibility_level || 'coach_only',
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Session date represents when assessment was taken
      session_date: metadata.assessment_date ? new Date(metadata.assessment_date) : now,

      // Type-specific metadata
      metadata: {
        assessment_type: metadata.assessment_type,
        assessment_date: metadata.assessment_date || now.toISOString(),
        assessment_provider: metadata.assessment_provider || null,
        title: metadata.title || `Coach Assessment - ${metadata.assessment_type.toUpperCase()}`,

        // Results and insights
        key_results: structuredData.key_results || metadata.key_results || {},
        profile_summary: structuredData.summary || metadata.profile_summary || '',
        insights: metadata.insights || [],
        development_areas: metadata.development_areas || [],

        // Additional context
        raw_scores: metadata.raw_scores || null,
        percentiles: metadata.percentiles || null,
        interpretation: metadata.interpretation || null,
        recommendations: metadata.recommendations || null,

        // Source tracking
        original_filename: metadata.original_filename || null,
        tags: metadata.tags || ['coach-assessment', metadata.assessment_type]
      },

      // Audit fields
      created_at: now,
      updated_at: now,
      created_by: metadata.coach_id // Coach created their own assessment
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
   * @returns {{key_results: object, summary: string}}
   */
  extractStructuredData(rawContent, assessmentType) {
    const result = {
      key_results: {},
      summary: ''
    };

    try {
      // Extract MBTI type if present
      if (assessmentType === 'mbti') {
        const mbtiPattern = /(INTJ|INTP|ENTJ|ENTP|INFJ|INFP|ENFJ|ENFP|ISTJ|ISFJ|ESTJ|ESFJ|ISTP|ISFP|ESTP|ESFP)/;
        const match = rawContent.match(mbtiPattern);
        if (match) {
          result.key_results = {
            type: match[1],
            dimensions: {
              E_I: match[1][0],
              S_N: match[1][1],
              T_F: match[1][2],
              J_P: match[1][3]
            }
          };
        }
      }

      // Extract CliftonStrengths top 5
      if (assessmentType === 'cliftonstrengths') {
        // Look for numbered list of strengths (1. Achiever, 2. Strategic, etc.)
        const strengthPattern = /(?:1\.|top\s*1)[:\s]+(\w+)/i;
        const match = rawContent.match(strengthPattern);
        if (match) {
          // Try to find top 5
          const top5Pattern = /(\d)\.\s*(\w+)/g;
          const strengths = [];
          let m;
          while ((m = top5Pattern.exec(rawContent)) !== null && strengths.length < 5) {
            if (parseInt(m[1]) <= 5) {
              strengths.push(m[2]);
            }
          }
          if (strengths.length > 0) {
            result.key_results = { top_strengths: strengths };
          }
        }
      }

      // Extract DISC scores if present
      if (assessmentType === 'disc') {
        const discPattern = /D:\s*(\d+)[^\d]*I:\s*(\d+)[^\d]*S:\s*(\d+)[^\d]*C:\s*(\d+)/i;
        const match = rawContent.match(discPattern);
        if (match) {
          result.key_results = {
            dominance: parseInt(match[1]),
            influence: parseInt(match[2]),
            steadiness: parseInt(match[3]),
            conscientiousness: parseInt(match[4])
          };
        }
      }

      // Extract first substantive paragraph as summary
      const paragraphs = rawContent.split(/\n\n+/).filter(p => p.trim().length > 50);
      if (paragraphs.length > 0) {
        const firstPara = paragraphs[0].trim();
        if (firstPara.length <= 500) {
          result.summary = firstPara;
        }
      }
    } catch (error) {
      console.warn('Error extracting structured data from coach assessment:', error.message);
    }

    return result;
  }

  /**
   * Get chunk configuration for coach assessments
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
