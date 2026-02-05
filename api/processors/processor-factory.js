/**
 * Data Processor Factory
 *
 * Factory for creating type-specific data processors.
 * Implements the Factory pattern for clean processor instantiation.
 *
 * Supported Data Types:
 * - transcript: Coaching session transcripts
 * - assessment: Client assessments (personality, 360, skills)
 * - coach_assessment: Coach's own assessments (MBTI, StrengthsFinder, etc.)
 * - coaching_model: Coaching models and frameworks
 * - company_doc: Client organization documents
 * - blog_post: Coach-authored blog posts and newsletter articles
 * - questionnaire: Client intake questionnaires and coaching forms
 *
 * Usage:
 *   const factory = new DataProcessorFactory(openaiClient);
 *   const processor = factory.getProcessor('transcript');
 *   const result = await processor.process(rawContent, metadata);
 */

import { TranscriptProcessor } from './transcript-processor.js';
import { AssessmentProcessor } from './assessment-processor.js';
import { CoachingModelProcessor } from './coaching-model-processor.js';
import { CompanyDocProcessor } from './company-doc-processor.js';
import { CoachAssessmentProcessor } from './coach-assessment-processor.js';
import { BlogPostProcessor } from './blog-post-processor.js';
import { QuestionnaireProcessor } from './questionnaire-processor.js';

export class DataProcessorFactory {
  constructor(openaiClient) {
    if (!openaiClient) {
      throw new Error('OpenAI client is required for DataProcessorFactory');
    }
    this.openai = openaiClient;

    // Processor registry
    this.processors = {
      'transcript': TranscriptProcessor,
      'assessment': AssessmentProcessor,
      'coaching_model': CoachingModelProcessor,
      'company_doc': CompanyDocProcessor,
      'coach_assessment': CoachAssessmentProcessor,
      'blog_post': BlogPostProcessor,
      'questionnaire': QuestionnaireProcessor
    };
  }

  /**
   * Get processor for a specific data type
   *
   * @param {string} dataType - Type of data to process
   * @returns {BaseDataProcessor} Processor instance
   * @throws {Error} if data type is not supported
   */
  getProcessor(dataType) {
    if (!dataType || typeof dataType !== 'string') {
      throw new Error('Data type must be a non-empty string');
    }

    const normalizedType = dataType.toLowerCase().trim();
    const ProcessorClass = this.processors[normalizedType];

    if (!ProcessorClass) {
      const supportedTypes = Object.keys(this.processors).join(', ');
      throw new Error(
        `Unsupported data type: "${dataType}". Supported types: ${supportedTypes}`
      );
    }

    return new ProcessorClass(this.openai);
  }

  /**
   * Get list of supported data types
   *
   * @returns {string[]} Array of supported data type names
   */
  getSupportedTypes() {
    return Object.keys(this.processors);
  }

  /**
   * Check if a data type is supported
   *
   * @param {string} dataType - Type to check
   * @returns {boolean} True if supported
   */
  isTypeSupported(dataType) {
    if (!dataType || typeof dataType !== 'string') {
      return false;
    }

    const normalizedType = dataType.toLowerCase().trim();
    return normalizedType in this.processors;
  }

  /**
   * Register a custom processor (for extensibility)
   *
   * @param {string} dataType - Data type name
   * @param {class} ProcessorClass - Processor class (must extend BaseDataProcessor)
   */
  registerProcessor(dataType, ProcessorClass) {
    if (!dataType || typeof dataType !== 'string') {
      throw new Error('Data type must be a non-empty string');
    }

    if (typeof ProcessorClass !== 'function') {
      throw new Error('ProcessorClass must be a constructor function');
    }

    this.processors[dataType.toLowerCase().trim()] = ProcessorClass;
  }
}
