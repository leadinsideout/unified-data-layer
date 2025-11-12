/**
 * Company Document Data Processor
 *
 * Handles processing of client organization documents (OKRs, org charts, strategy docs, etc.).
 *
 * Data Type: 'company_doc'
 * Visibility Default: 'org_visible' (configurable per doc)
 * Chunk Config: 400 words with 40 word overlap
 *
 * Metadata Schema:
 * - doc_type: 'okr' | 'org_chart' | 'strategy' | 'values' | 'mission' | 'policy' | 'playbook' | 'other'
 * - doc_title: string
 * - doc_version: string
 * - fiscal_year: string (for OKRs, budgets, etc.)
 * - quarter: string (Q1, Q2, Q3, Q4)
 * - department: string
 * - author: string
 * - last_updated: ISO timestamp
 */

import { BaseDataProcessor } from './base-processor.js';

export class CompanyDocProcessor extends BaseDataProcessor {
  /**
   * Validate company document input
   */
  validate(rawContent, metadata) {
    // Content validation
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Company document content is required and must be a string');
    }

    if (rawContent.trim().length < 100) {
      throw new Error('Company document must be at least 100 characters long');
    }

    // Metadata validation
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata is required');
    }

    // Document type is required
    if (!metadata.doc_type) {
      throw new Error('doc_type is required in metadata');
    }

    // Client organization ID is required
    if (!metadata.client_organization_id) {
      throw new Error('client_organization_id is required in metadata for company documents');
    }

    // Optional: Validate doc_type
    const validTypes = ['okr', 'org_chart', 'strategy', 'values', 'mission', 'policy', 'playbook', 'other'];
    if (!validTypes.includes(metadata.doc_type)) {
      throw new Error(`Invalid doc_type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Process company document content and prepare data item
   */
  async typeSpecificProcessing(rawContent, metadata) {
    const now = new Date();

    // Determine default visibility based on doc type
    const defaultVisibility = this.getDefaultVisibility(metadata.doc_type);

    // Prepare data item for storage
    const dataItem = {
      data_type: 'company_doc',
      raw_content: rawContent.trim(),

      // Ownership
      coach_id: metadata.coach_id || null, // Optional: which coach uploaded it
      client_id: null, // Company docs are org-level, not client-specific
      client_organization_id: metadata.client_organization_id,

      // Access control
      // Default varies by doc type (see getDefaultVisibility)
      visibility_level: metadata.visibility_level || defaultVisibility,
      allowed_roles: metadata.allowed_roles || null,
      access_restrictions: metadata.access_restrictions || null,

      // Type-specific metadata
      metadata: {
        doc_type: metadata.doc_type,
        doc_title: metadata.doc_title || 'Untitled Document',
        doc_version: metadata.doc_version || '1.0',
        fiscal_year: metadata.fiscal_year || null,
        quarter: metadata.quarter || null,
        department: metadata.department || null,
        author: metadata.author || null,
        last_updated: metadata.last_updated || now.toISOString(),
        source_url: metadata.source_url || null,
        file_format: metadata.file_format || 'text',
        tags: metadata.tags || [],
        related_initiatives: metadata.related_initiatives || [],
        confidentiality_level: metadata.confidentiality_level || 'internal'
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
   * Get default visibility based on document type
   *
   * @param {string} docType - Type of document
   * @returns {string} Default visibility level
   */
  getDefaultVisibility(docType) {
    const visibilityMap = {
      'okr': 'org_visible',          // OKRs typically visible to coaches
      'org_chart': 'org_visible',    // Org charts typically visible
      'strategy': 'private',         // Strategy docs more sensitive
      'values': 'org_visible',       // Company values typically shared
      'mission': 'org_visible',      // Mission statements typically shared
      'policy': 'private',           // Policies may be sensitive
      'playbook': 'org_visible',     // Playbooks typically for coaches
      'other': 'private'             // Default to private
    };

    return visibilityMap[docType] || 'private';
  }

  /**
   * Get chunk configuration for company documents
   *
   * Uses 400 words with 40 word overlap for good context retention
   * while handling potentially structured content
   */
  getChunkConfig() {
    return {
      chunkSize: 400,
      overlap: 40
    };
  }
}
