/**
 * Transcript Data Processor
 *
 * Handles processing of coaching session transcripts.
 *
 * Data Type: 'transcript'
 * Visibility Default: 'coach_only'
 * Chunk Config: 500 words with 50 word overlap
 *
 * Metadata Schema:
 * - meeting_date: ISO timestamp
 * - session_type: 'regular' | 'intake' | 'closure' | 'check-in'
 * - duration_minutes: number
 * - topics: string[]
 * - fireflies_meeting_id: string (if from Fireflies)
 */

import { BaseDataProcessor } from './base-processor.js';

export class TranscriptProcessor extends BaseDataProcessor {
  /**
   * Validate transcript input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Transcript content is required and must be a string');
    }

    if (rawContent.trim().length < 50) {
      throw new Error('Transcript must be at least 50 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Coach and client IDs are required for transcripts
    if (!metadata.coach_id) {
      throw new Error('coach_id is required in metadata for transcripts');
    }

    if (!metadata.client_id) {
      throw new Error('client_id is required in metadata for transcripts');
    }

    // Optional: Validate session_type if provided
    const validSessionTypes = ['regular', 'intake', 'closure', 'check-in'];
    if (metadata.session_type && !validSessionTypes.includes(metadata.session_type)) {
      throw new Error(`Invalid session_type. Must be one of: ${validSessionTypes.join(', ')}`);
    }
  }

  /**
   * Process transcript content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Prepare data item for storage
    const dataItem = {
      data_type: 'transcript',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id,
      client_id: metadata.client_id,
      client_organization_id: metadata.client_organization_id || null,

      // Access control
      visibility_level: metadata.visibility_level || 'coach_only', // Default: coach-only
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Session metadata
      session_id: metadata.session_id || null,
      session_date: metadata.meeting_date ? new Date(metadata.meeting_date) : now,

      // Type-specific metadata
      metadata: {
        session_type: metadata.session_type || 'regular',
        duration_minutes: metadata.duration_minutes || null,
        topics: metadata.topics || [],
        fireflies_meeting_id: metadata.fireflies_meeting_id || null,
        source: metadata.source || 'manual_upload',
        notes: metadata.notes || null
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
   * Get chunk configuration for transcripts
   *
   * Uses default 500 words with 50 word overlap for good context retention
   */
  getChunkConfig() {
    return {
      chunkSize: 500,
      overlap: 50
    };
  }
}
