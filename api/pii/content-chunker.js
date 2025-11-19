/**
 * Content Chunker
 *
 * Intelligently splits large text documents into optimal chunks
 * for PII detection while preserving context boundaries.
 *
 * Features:
 * - Natural boundary detection (paragraphs, sentences, words)
 * - Configurable chunk size and overlap
 * - Context preservation for accurate PII detection
 * - Offset tracking for entity position mapping
 */

export class ContentChunker {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 5000; // 5K chars per diagnostic results
    this.overlapSize = options.overlapSize || 500; // 10% overlap for context
    this.preserveBoundaries = options.preserveBoundaries !== false; // Enabled by default
  }

  /**
   * Split text into optimal chunks preserving context boundaries
   *
   * @param {string} text - Text to chunk
   * @param {Object} metadata - Optional metadata to include with each chunk
   * @returns {Array} Array of chunk objects with content, offsets, and metadata
   */
  chunk(text, metadata = {}) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Short text doesn't need chunking
    if (text.length <= this.maxChunkSize) {
      return [{
        content: text,
        startOffset: 0,
        endOffset: text.length,
        chunkIndex: 0,
        totalChunks: 1,
        metadata
      }];
    }

    const chunks = [];
    let currentPosition = 0;

    while (currentPosition < text.length) {
      const chunkEnd = Math.min(
        currentPosition + this.maxChunkSize,
        text.length
      );

      // Find natural boundary if not at end of document
      let boundaryEnd = chunkEnd;
      if (this.preserveBoundaries && chunkEnd < text.length) {
        boundaryEnd = this.findNaturalBoundary(text, chunkEnd, currentPosition);
      }

      const chunk = {
        content: text.substring(currentPosition, boundaryEnd),
        startOffset: currentPosition,
        endOffset: boundaryEnd,
        chunkIndex: chunks.length,
        totalChunks: 0, // Will be set after all chunks created
        metadata
      };

      chunks.push(chunk);

      // Move forward with overlap (but not past end)
      const nextPosition = boundaryEnd - this.overlapSize;
      currentPosition = Math.max(nextPosition, boundaryEnd); // Ensure progress

      // Safety: prevent infinite loop
      if (currentPosition === 0 && chunks.length > 1) {
        console.warn('Content chunking stuck at position 0, forcing progress');
        currentPosition = chunkEnd;
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Find natural text boundary near target position
   *
   * Priority: paragraph > sentence > word
   *
   * @param {string} text - Full text
   * @param {number} targetPosition - Desired chunk end position
   * @param {number} chunkStart - Start of current chunk
   * @returns {number} Adjusted position at natural boundary
   */
  findNaturalBoundary(text, targetPosition, chunkStart) {
    // Look back up to 500 chars for natural boundary
    const lookbackDistance = Math.min(500, targetPosition - chunkStart);
    const searchStart = targetPosition - lookbackDistance;
    const searchEnd = Math.min(targetPosition + 100, text.length);
    const searchText = text.substring(searchStart, searchEnd);

    // Define boundaries in priority order
    const boundaries = [
      { pattern: /\n\n+/g, weight: 3, name: 'paragraph' },      // Double newline (paragraph)
      { pattern: /[.!?]\s+/g, weight: 2, name: 'sentence' },   // Sentence end
      { pattern: /\s+/g, weight: 1, name: 'word' }             // Word boundary
    ];

    // Try each boundary type
    for (const { pattern, name } of boundaries) {
      const matches = [...searchText.matchAll(pattern)];

      if (matches.length > 0) {
        // Find match closest to target position
        let bestMatch = null;
        let bestDistance = Infinity;

        for (const match of matches) {
          const matchPosition = searchStart + match.index + match[0].length;
          const distance = Math.abs(matchPosition - targetPosition);

          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = matchPosition;
          }
        }

        if (bestMatch !== null) {
          return bestMatch;
        }
      }
    }

    // Fallback: use target position (hard cutoff)
    return targetPosition;
  }

  /**
   * Get chunk statistics for logging/debugging
   *
   * @param {Array} chunks - Array of chunks
   * @returns {Object} Statistics about chunking
   */
  getChunkStats(chunks) {
    if (!chunks || chunks.length === 0) {
      return { count: 0, avgSize: 0, totalSize: 0 };
    }

    const sizes = chunks.map(c => c.content.length);
    const totalSize = sizes.reduce((sum, size) => sum + size, 0);
    const avgSize = totalSize / chunks.length;
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    return {
      count: chunks.length,
      avgSize: Math.round(avgSize),
      minSize,
      maxSize,
      totalSize,
      overlapSize: this.overlapSize,
      maxChunkSize: this.maxChunkSize
    };
  }

  /**
   * Validate chunks (for testing/debugging)
   *
   * @param {Array} chunks - Array of chunks
   * @param {string} originalText - Original text
   * @returns {Object} Validation result
   */
  validateChunks(chunks, originalText) {
    const errors = [];

    // Check all chunks are contiguous and overlapping correctly
    for (let i = 0; i < chunks.length - 1; i++) {
      const current = chunks[i];
      const next = chunks[i + 1];

      // Check offsets are valid
      if (current.startOffset >= current.endOffset) {
        errors.push(`Chunk ${i}: Invalid offsets (start >= end)`);
      }

      // Check content matches offsets
      const expectedContent = originalText.substring(
        current.startOffset,
        current.endOffset
      );

      if (current.content !== expectedContent) {
        errors.push(`Chunk ${i}: Content doesn't match offsets`);
      }

      // Check overlap exists
      const gap = next.startOffset - current.endOffset;
      const overlap = current.endOffset - next.startOffset;

      if (gap > 0) {
        errors.push(`Chunk ${i}-${i+1}: Gap of ${gap} chars (should overlap)`);
      }

      if (overlap < 0) {
        errors.push(`Chunk ${i}-${i+1}: Negative overlap ${overlap}`);
      }
    }

    // Check last chunk
    if (chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      if (lastChunk.endOffset !== originalText.length) {
        errors.push(`Last chunk doesn't reach end of text (${lastChunk.endOffset} vs ${originalText.length})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
