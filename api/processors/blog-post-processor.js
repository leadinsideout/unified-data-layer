/**
 * Blog Post Data Processor
 *
 * Handles processing of coach-authored blog posts and newsletter articles.
 *
 * Data Type: 'blog_post'
 * Visibility Default: 'coach_only' (private to the author coach)
 * Chunk Config: 400 words with 50 word overlap
 *
 * Metadata Schema:
 * - title: string (required) - Blog post title
 * - publish_date: string (ISO date) - Original publication date
 * - author: string - Author name
 * - source: string - Source (e.g., 'newsletter', 'website', 'substack')
 * - word_count: number - Word count of the post
 * - topics: string[] - Topic tags
 * - source_url: string - Original URL if available
 */

import { BaseDataProcessor } from './base-processor.js';

export class BlogPostProcessor extends BaseDataProcessor {
  /**
   * Validate blog post input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Blog post content is required and must be a string');
    }

    if (rawContent.trim().length < 200) {
      throw new Error('Blog post must be at least 200 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Title is required
    if (!metadata.title) {
      throw new Error('title is required in metadata');
    }

    // Coach ID is required (blog post owner)
    if (!metadata.coach_id) {
      throw new Error('coach_id is required in metadata');
    }

    // Optional: Validate publish_date format if provided
    if (metadata.publish_date) {
      const date = new Date(metadata.publish_date);
      if (isNaN(date.getTime())) {
        throw new Error('publish_date must be a valid date format');
      }
    }
  }

  /**
   * Process blog post content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Calculate word count
    const wordCount = rawContent.trim().split(/\s+/).length;

    // Prepare data item for storage
    const dataItem = {
      data_type: 'blog_post',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id,
      client_id: null, // Blog posts are not client-specific
      client_organization_id: null,

      // Access control
      // Default: coach_only (visible only to the author coach and their GPT)
      visibility_level: metadata.visibility_level || 'coach_only',
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Type-specific metadata
      metadata: {
        title: metadata.title,
        publish_date: metadata.publish_date || null,
        author: metadata.author || null,
        source: metadata.source || 'newsletter',
        word_count: wordCount,
        topics: metadata.topics || [],
        source_url: metadata.source_url || null,
        batch_tag: metadata.batch_tag || null,
        import_date: now.toISOString()
      },

      // Session date uses publish_date for chronological ordering
      session_date: metadata.publish_date ? new Date(metadata.publish_date) : now,

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
   * Get chunk configuration for blog posts
   *
   * Uses 400 words with 50 word overlap.
   * Blog posts are typically 500-2000 words, so this creates 1-5 chunks per post.
   * This balances context preservation with search granularity.
   */
  getChunkConfig() {
    return {
      chunkSize: 400,
      overlap: 50
    };
  }
}
