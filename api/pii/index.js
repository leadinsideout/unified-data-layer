/**
 * PII Scrubbing Module
 *
 * Universal PII detection and redaction for coaching data.
 *
 * Main export: PIIScrubber
 *
 * Usage:
 *   import { PIIScrubber } from './pii/index.js';
 *
 *   const scrubber = new PIIScrubber(openaiClient);
 *   const result = await scrubber.scrub(text, 'transcript');
 *   console.log(result.content); // Scrubbed text
 *   console.log(result.audit);   // Audit trail
 */

export { PIIScrubber } from './pii-scrubber.js';
export { RegexDetector } from './regex-detector.js';
export { GPTDetector } from './gpt-detector.js';
export { RedactionStrategy } from './redaction-strategy.js';
export { AuditLogger } from './audit-logger.js';
