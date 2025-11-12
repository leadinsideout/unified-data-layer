/**
 * Data Processors Module
 *
 * Exports all data processors and the factory for easy importing.
 *
 * Usage:
 *   import { DataProcessorFactory } from './processors/index.js';
 *   const factory = new DataProcessorFactory(openaiClient);
 *   const processor = factory.getProcessor('transcript');
 */

export { BaseDataProcessor } from './base-processor.js';
export { TranscriptProcessor } from './transcript-processor.js';
export { AssessmentProcessor } from './assessment-processor.js';
export { CoachingModelProcessor } from './coaching-model-processor.js';
export { CompanyDocProcessor } from './company-doc-processor.js';
export { DataProcessorFactory } from './processor-factory.js';
