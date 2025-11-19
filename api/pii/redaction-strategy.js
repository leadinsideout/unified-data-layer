/**
 * Redaction Strategy
 *
 * Applies redaction to detected PII entities.
 * Supports multiple strategies:
 * - replace: Replace with typed placeholders ([NAME], [EMAIL], etc.)
 * - hash: Replace with cryptographic hash (reversible with key)
 * - remove: Remove entity entirely
 *
 * Default: replace strategy
 */

import crypto from 'crypto';

export class RedactionStrategy {
  constructor(strategy = 'replace', options = {}) {
    this.strategy = strategy;
    this.options = options;
    this.hashKey = options.hashKey || process.env.PII_HASH_KEY || 'default-key';
  }

  /**
   * Apply redaction to text based on detected entities
   *
   * @param {string} text - Original text
   * @param {Array} entities - Detected PII entities
   * @returns {string} Redacted text
   */
  apply(text, entities) {
    if (!entities || entities.length === 0) {
      return text;
    }

    // Find ALL occurrences of each entity (not just the first one)
    const allOccurrences = this.findAllOccurrences(text, entities);

    // Sort by position (descending) to maintain offsets during replacement
    const sorted = allOccurrences.sort((a, b) => b.start - a.start);

    let redactedText = text;

    for (const entity of sorted) {
      const replacement = this.getReplacementText(entity);

      redactedText =
        redactedText.slice(0, entity.start) +
        replacement +
        redactedText.slice(entity.end);
    }

    return redactedText;
  }

  /**
   * Find all occurrences of detected entities in text
   *
   * @param {string} text - Original text
   * @param {Array} entities - Detected PII entities
   * @returns {Array} All occurrences with positions
   */
  findAllOccurrences(text, entities) {
    const allOccurrences = [];
    const textLower = text.toLowerCase();

    for (const entity of entities) {
      const entityTextLower = entity.text.trim().toLowerCase();
      let searchFrom = 0;

      // Find all exact matches
      while (true) {
        const foundIndex = textLower.indexOf(entityTextLower, searchFrom);

        if (foundIndex === -1) {
          break; // No more occurrences
        }

        // Check word boundaries to avoid partial matches
        const isValidMatch = this.isValidOccurrence(text, foundIndex, entityTextLower.length, entity.type);

        if (isValidMatch) {
          allOccurrences.push({
            ...entity,
            start: foundIndex,
            end: foundIndex + entity.text.trim().length
          });
        }

        searchFrom = foundIndex + 1;
      }

      // For names, also find variations (possessive, first/last name only)
      if (entity.type === 'NAME') {
        const variations = this.getNameVariations(entity.text);
        for (const variation of variations) {
          this.findNameVariation(text, textLower, variation, entity, allOccurrences);
        }
      }
    }

    return allOccurrences;
  }

  /**
   * Get variations of a name to search for
   *
   * @param {string} fullName - Full name
   * @returns {Array} List of name variations
   */
  getNameVariations(fullName) {
    const variations = [];
    const parts = fullName.trim().split(/\s+/);

    // If full name (2+ parts), add individual name parts
    if (parts.length >= 2) {
      variations.push(parts[0]); // First name
      variations.push(parts[parts.length - 1]); // Last name
    }

    // Add possessive forms
    variations.push(fullName + "'s");
    variations.push(fullName + "'s");
    for (const part of parts) {
      variations.push(part + "'s");
      variations.push(part + "'s");
    }

    return variations;
  }

  /**
   * Find a name variation in text
   *
   * @param {string} text - Original text
   * @param {string} textLower - Lowercase text
   * @param {string} variation - Name variation to find
   * @param {Object} originalEntity - Original entity
   * @param {Array} allOccurrences - Array to add matches to
   */
  findNameVariation(text, textLower, variation, originalEntity, allOccurrences) {
    const variationLower = variation.toLowerCase();
    let searchFrom = 0;

    while (true) {
      const foundIndex = textLower.indexOf(variationLower, searchFrom);

      if (foundIndex === -1) {
        break;
      }

      // Check if already covered by another match
      const isOverlapping = allOccurrences.some(existing =>
        !(foundIndex >= existing.end || foundIndex + variation.length <= existing.start)
      );

      if (!isOverlapping) {
        // Check word boundaries
        const charBefore = foundIndex > 0 ? text[foundIndex - 1] : ' ';
        const charAfter = foundIndex + variation.length < text.length ? text[foundIndex + variation.length] : ' ';
        const isWordBoundary = /[\s,.\n\t]/.test(charBefore) && /[\s,.\n\t]/.test(charAfter);

        if (isWordBoundary || charBefore === '(' || charAfter === ')') {
          allOccurrences.push({
            ...originalEntity,
            start: foundIndex,
            end: foundIndex + variation.length,
            text: text.substring(foundIndex, foundIndex + variation.length)
          });
        }
      }

      searchFrom = foundIndex + 1;
    }
  }

  /**
   * Check if an occurrence is valid (not a partial match)
   *
   * @param {string} text - Full text
   * @param {number} start - Start position
   * @param {number} length - Length of entity
   * @param {string} type - Entity type
   * @returns {boolean} Whether this is a valid occurrence
   */
  isValidOccurrence(text, start, length, type) {
    // For emails, ensure we're not matching just the domain part
    if (type === 'EMAIL') {
      // Check character before: should be whitespace, start of string, or opening paren
      const charBefore = start > 0 ? text[start - 1] : ' ';
      if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '(' && charBefore !== '\t') {
        return false; // Part of a longer string
      }
    }

    return true; // Valid occurrence
  }

  /**
   * Get replacement text for an entity based on strategy
   *
   * @param {Object} entity - PII entity
   * @returns {string} Replacement text
   */
  getReplacementText(entity) {
    switch (this.strategy) {
      case 'replace':
        return this.getReplaceText(entity);

      case 'hash':
        return this.getHashText(entity);

      case 'remove':
        return '';

      case 'mask':
        return this.getMaskText(entity);

      default:
        return this.getReplaceText(entity);
    }
  }

  /**
   * Replace strategy: Use typed placeholders
   *
   * @param {Object} entity - PII entity
   * @returns {string} Placeholder text
   */
  getReplaceText(entity) {
    const placeholders = {
      NAME: '[NAME]',
      EMAIL: '[EMAIL]',
      PHONE: '[PHONE]',
      SSN: '[SSN]',
      CREDIT_CARD: '[CREDIT_CARD]',
      ADDRESS: '[ADDRESS]',
      DOB: '[DOB]',
      MEDICAL: '[MEDICAL_INFO]',
      FINANCIAL: '[FINANCIAL_INFO]',
      EMPLOYER: '[EMPLOYER]',
      IP_ADDRESS: '[IP]',
      ZIP_CODE: '[ZIP]'
    };

    return placeholders[entity.type] || '[REDACTED]';
  }

  /**
   * Hash strategy: Cryptographic hash of entity
   *
   * @param {Object} entity - PII entity
   * @returns {string} Hashed text
   */
  getHashText(entity) {
    const hash = crypto
      .createHmac('sha256', this.hashKey)
      .update(entity.text)
      .digest('hex')
      .substring(0, 8); // Use first 8 chars

    return `[${entity.type}_${hash}]`;
  }

  /**
   * Mask strategy: Partially mask entity
   * Example: "john@example.com" -> "j***@e***.com"
   *
   * @param {Object} entity - PII entity
   * @returns {string} Masked text
   */
  getMaskText(entity) {
    const text = entity.text;

    switch (entity.type) {
      case 'EMAIL': {
        const [local, domain] = text.split('@');
        if (!domain) return this.getReplaceText(entity);

        const maskedLocal = local[0] + '*'.repeat(Math.min(local.length - 1, 3));
        const [domainName, tld] = domain.split('.');
        const maskedDomain = domainName[0] + '*'.repeat(Math.min(domainName.length - 1, 3));

        return `${maskedLocal}@${maskedDomain}.${tld}`;
      }

      case 'PHONE': {
        // Show only last 4 digits
        const digits = text.replace(/\D/g, '');
        return `***-***-${digits.slice(-4)}`;
      }

      case 'NAME': {
        // Show first letter of each word
        return text
          .split(' ')
          .map(word => word[0] + '*'.repeat(Math.min(word.length - 1, 3)))
          .join(' ');
      }

      case 'SSN':
      case 'CREDIT_CARD': {
        // Show only last 4 characters
        return '*'.repeat(text.length - 4) + text.slice(-4);
      }

      default:
        return '*'.repeat(Math.min(text.length, 8));
    }
  }

  /**
   * Apply redaction preserving character count (for alignment)
   *
   * @param {string} text - Original text
   * @param {Array} entities - Detected PII entities
   * @returns {string} Redacted text with preserved length
   */
  applyPreserveLength(text, entities) {
    if (!entities || entities.length === 0) {
      return text;
    }

    const sorted = [...entities].sort((a, b) => b.start - a.start);

    let redactedText = text;

    for (const entity of sorted) {
      const originalLength = entity.end - entity.start;
      const replacement = '*'.repeat(originalLength);

      redactedText =
        redactedText.slice(0, entity.start) +
        replacement +
        redactedText.slice(entity.end);
    }

    return redactedText;
  }

  /**
   * Get redaction summary statistics
   *
   * @param {Array} entities - Detected PII entities
   * @returns {Object} Summary statistics
   */
  getSummary(entities) {
    const summary = {
      total: entities.length,
      byType: {},
      byMethod: {},
      totalCharactersRedacted: 0
    };

    for (const entity of entities) {
      // Count by type
      summary.byType[entity.type] = (summary.byType[entity.type] || 0) + 1;

      // Count by method
      summary.byMethod[entity.method] = (summary.byMethod[entity.method] || 0) + 1;

      // Total characters
      summary.totalCharactersRedacted += entity.end - entity.start;
    }

    return summary;
  }

  /**
   * Validate redaction was successful
   *
   * @param {string} originalText - Original text
   * @param {string} redactedText - Redacted text
   * @param {Array} entities - Entities that should be redacted
   * @returns {Object} Validation result
   */
  validate(originalText, redactedText, entities) {
    const result = {
      valid: true,
      errors: []
    };

    // Check that all entity texts are no longer in redacted text
    for (const entity of entities) {
      if (redactedText.includes(entity.text)) {
        result.valid = false;
        result.errors.push({
          type: 'incomplete_redaction',
          entity: entity.text,
          entityType: entity.type
        });
      }
    }

    // Check that redacted text is not empty (sanity check)
    if (!redactedText || redactedText.trim().length === 0) {
      result.valid = false;
      result.errors.push({
        type: 'empty_output',
        message: 'Redacted text is empty'
      });
    }

    return result;
  }
}
