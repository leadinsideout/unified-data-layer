/**
 * Base Data Processor
 *
 * Abstract base class for type-specific data processors.
 * Implements the Template Method pattern for consistent processing flow.
 *
 * Processing Flow:
 * 1. Validate input (type-specific)
 * 2. Process content (type-specific)
 * 3. Chunk content (configurable per type)
 * 4. Generate embeddings (shared)
 *
 * Subclasses must implement:
 * - validate(rawContent, metadata)
 * - typeSpecificProcessing(rawContent, metadata)
 * - getChunkConfig() [optional]
 */

export class BaseDataProcessor {
  constructor(openaiClient) {
    if (new.target === BaseDataProcessor) {
      throw new Error('Cannot instantiate abstract class BaseDataProcessor');
    }
    this.openai = openaiClient;
  }

  /**
   * Main processing method (Template Method)
   *
   * @param {string} rawContent - Raw input content
   * @param {object} metadata - Type-specific metadata
   * @returns {Promise<{dataItem: object, chunks: object[]}>}
   */
  async process(rawContent, metadata) {
    // Step 1: Validate input
    this.validate(rawContent, metadata);

    // Step 2: Type-specific processing
    const processed = await this.typeSpecificProcessing(rawContent, metadata);

    // Step 3: Chunk content
    const chunks = this.chunkContent(processed.content, this.getChunkConfig());

    // Step 4: Generate embeddings
    const embeddedChunks = await this.generateEmbeddings(chunks);

    return {
      dataItem: processed.dataItem,
      chunks: embeddedChunks
    };
  }

  /**
   * Validate raw content and metadata (must be implemented by subclasses)
   *
   * @param {string} rawContent
   * @param {object} metadata
   * @throws {Error} if validation fails
   */
  validate(rawContent, metadata) {
    throw new Error('validate() must be implemented by subclass');
  }

  /**
   * Type-specific processing logic (must be implemented by subclasses)
   *
   * @param {string} rawContent
   * @param {object} metadata
   * @returns {Promise<{dataItem: object, content: string}>}
   */
  async typeSpecificProcessing(rawContent, metadata) {
    throw new Error('typeSpecificProcessing() must be implemented by subclass');
  }

  /**
   * Get chunk configuration for this data type
   *
   * @returns {{chunkSize: number, overlap: number}}
   */
  getChunkConfig() {
    return { chunkSize: 500, overlap: 50 }; // Default config
  }

  /**
   * Chunk text into overlapping segments
   *
   * @param {string} text - Full text to chunk
   * @param {{chunkSize: number, overlap: number}} config - Chunking config
   * @returns {string[]} Array of text chunks
   */
  chunkContent(text, config) {
    const { chunkSize, overlap } = config;
    const words = text.split(/\s+/);
    const chunks = [];
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunk = words.slice(start, end).join(' ');
      chunks.push(chunk);

      // Move start pointer (accounting for overlap)
      start += chunkSize - overlap;

      // Prevent infinite loop
      if (start + overlap >= words.length) break;
    }

    return chunks;
  }

  /**
   * Generate embeddings for all chunks
   *
   * @param {string[]} chunks - Array of text chunks
   * @returns {Promise<Array<{content: string, embedding: number[]}>>}
   */
  async generateEmbeddings(chunks) {
    const embeddedChunks = [];

    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      embeddedChunks.push({
        content: chunk,
        embedding: embedding
      });
    }

    return embeddedChunks;
  }

  /**
   * Generate embedding for a single text chunk
   *
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} 1536-dimensional embedding vector
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.trim()
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error.message);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Format embedding array for PostgreSQL vector storage
   *
   * @param {number[]} embedding - Array of numbers
   * @returns {string} Formatted as "[0.1,0.2,...]"
   */
  formatEmbeddingForDB(embedding) {
    // PostgreSQL vector type stores floats with ~10 decimal places of precision
    // Round to match this to ensure query embeddings match stored embeddings
    const formatted = embedding.map(val => {
      const str = val.toPrecision(10);
      return parseFloat(str);
    });
    return '[' + formatted.join(',') + ']';
  }
}
