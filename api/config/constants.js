/**
 * Centralized Constants
 *
 * Single source of truth for magic numbers and configuration values.
 * Update this file when changing system-wide defaults.
 *
 * Usage:
 *   import { CHUNK_SIZE, DEFAULT_SEARCH_LIMIT } from './config/constants.js';
 */

// Text chunking configuration
export const CHUNK_SIZE = 500;           // Words per chunk (default for transcripts)
export const CHUNK_OVERLAP = 50;         // Word overlap between chunks

// Search defaults
export const DEFAULT_SEARCH_THRESHOLD = 0.3;  // Minimum similarity score
export const DEFAULT_SEARCH_LIMIT = 10;       // Default results returned
export const MAX_SEARCH_LIMIT = 50;           // Maximum results allowed

// Upload limits
export const MAX_BULK_UPLOAD = 50;            // Maximum items per bulk upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max file size

// Embedding configuration
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const RATE_LIMIT_MAX_REQUESTS = 100;         // Requests per window

// Fireflies sync
export const FIREFLIES_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
