/**
 * Questionnaire Data Processor
 *
 * Handles processing of client intake questionnaires and coaching forms.
 *
 * Data Type: 'questionnaire'
 * Visibility Default: 'coach_only' (private to the coach)
 * Chunk Config: 300 words with 30 word overlap (structured Q&A format)
 *
 * Metadata Schema:
 * - questionnaire_type: 'coaching_intake' | 'feedback' | 'self_assessment' | 'custom'
 * - completion_date: string (ISO date) - When client completed the form
 * - respondent_name: string - Client's name (from form)
 * - respondent_email: string - Client's email (from form)
 * - question_count: number - Number of Q&A pairs
 * - word_count: number - Total word count
 * - extracted_from: 'xlsx' | 'csv' | 'manual' - Source format
 * - key_topics: string[] - Extracted coaching topics
 */

import { BaseDataProcessor } from './base-processor.js';

// Common coaching topics for extraction
const COACHING_TOPICS = [
  'leadership',
  'communication',
  'delegation',
  'feedback',
  'conflict',
  'team',
  'strategy',
  'growth',
  'stress',
  'work-life balance',
  'decision-making',
  'accountability',
  'trust',
  'culture',
  'hiring',
  'firing',
  'performance',
  'goals',
  'vision',
  'values',
  'strengths',
  'weaknesses',
  'habits',
  'mindset',
  'executive presence',
  'board',
  'fundraising',
  'scaling'
];

export class QuestionnaireProcessor extends BaseDataProcessor {
  /**
   * Validate questionnaire input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Questionnaire content is required and must be a string');
    }

    if (rawContent.trim().length < 100) {
      throw new Error('Questionnaire must be at least 100 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Client ID is required (questionnaires belong to clients)
    if (!metadata.client_id) {
      throw new Error('client_id is required in metadata');
    }

    // Coach ID is required
    if (!metadata.coach_id) {
      throw new Error('coach_id is required in metadata');
    }

    // Optional: Validate questionnaire_type if provided
    if (metadata.questionnaire_type) {
      const validTypes = ['coaching_intake', 'feedback', 'self_assessment', 'custom'];
      if (!validTypes.includes(metadata.questionnaire_type)) {
        throw new Error(
          `questionnaire_type must be one of: ${validTypes.join(', ')}`
        );
      }
    }

    // Optional: Validate completion_date format if provided
    if (metadata.completion_date) {
      const date = new Date(metadata.completion_date);
      if (isNaN(date.getTime())) {
        throw new Error('completion_date must be a valid date format');
      }
    }
  }

  /**
   * Process questionnaire content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Calculate word count
    const wordCount = rawContent.trim().split(/\s+/).length;

    // Count Q&A pairs (look for patterns like "Q:" or "Question:" or numbered items)
    const questionCount = this.countQuestions(rawContent);

    // Extract key topics from content
    const keyTopics = this.extractKeyTopics(rawContent);

    // Prepare data item for storage
    const dataItem = {
      data_type: 'questionnaire',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id,
      client_id: metadata.client_id,
      client_organization_id: metadata.client_organization_id || null,

      // Access control
      // Default: coach_only (visible only to the coach)
      visibility_level: metadata.visibility_level || 'coach_only',
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Type-specific metadata
      metadata: {
        questionnaire_type: metadata.questionnaire_type || 'coaching_intake',
        completion_date: metadata.completion_date || null,
        respondent_name: metadata.respondent_name || null,
        respondent_email: metadata.respondent_email || null,
        question_count: questionCount,
        word_count: wordCount,
        extracted_from: metadata.extracted_from || 'manual',
        key_topics: keyTopics,
        source_file: metadata.source_file || null,
        batch_tag: metadata.batch_tag || null,
        import_date: now.toISOString()
      },

      // Session date uses completion_date for chronological ordering
      session_date: metadata.completion_date
        ? new Date(metadata.completion_date)
        : now,

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
   * Get chunk configuration for questionnaires
   *
   * Uses 300 words with 30 word overlap.
   * Smaller chunks preserve Q&A boundaries better for structured content.
   * Typical questionnaires are 1000-3000 words, creating 3-10 chunks.
   */
  getChunkConfig() {
    return {
      chunkSize: 300,
      overlap: 30
    };
  }

  /**
   * Count the number of questions in the questionnaire
   *
   * @param {string} content - Questionnaire content
   * @returns {number} Estimated question count
   */
  countQuestions(content) {
    // Common patterns for questions in intake forms
    const patterns = [
      /^Q\d*[:.]/gim, // Q: or Q1: or Q.
      /^Question\s*\d*[:.]/gim, // Question: or Question 1:
      /^\d+[.)]\s+\w/gm, // 1) or 1. followed by text
      /\?\s*$/gm // Lines ending with ?
    ];

    let maxCount = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > maxCount) {
        maxCount = matches.length;
      }
    }

    // If no patterns found, estimate based on line breaks (rough heuristic)
    if (maxCount === 0) {
      const lines = content.split('\n').filter((l) => l.trim().length > 20);
      // Assume ~half the non-empty lines are questions in Q&A format
      maxCount = Math.floor(lines.length / 2);
    }

    return Math.max(maxCount, 1); // At least 1 question
  }

  /**
   * Extract key coaching topics from questionnaire content
   *
   * @param {string} content - Questionnaire content
   * @returns {string[]} Array of detected topic keywords
   */
  extractKeyTopics(content) {
    const lowerContent = content.toLowerCase();
    const foundTopics = [];

    for (const topic of COACHING_TOPICS) {
      // Check for topic or its variants
      const patterns = [
        topic,
        topic.replace(/-/g, ' '), // "work-life" -> "work life"
        topic + 's', // plural
        topic + 'ing' // gerund
      ];

      for (const pattern of patterns) {
        if (lowerContent.includes(pattern)) {
          foundTopics.push(topic);
          break; // Only add each topic once
        }
      }
    }

    // Return unique topics, limited to top 10
    return [...new Set(foundTopics)].slice(0, 10);
  }
}
