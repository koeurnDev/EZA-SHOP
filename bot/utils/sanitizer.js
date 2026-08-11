/**
 * 🛡️ Security Sanitization Utility
 * Strips dangerous HTML script tags and executable inline handlers while preserving raw punctuation (' " &) for clean DB storage.
 */

const sanitize = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip <script> blocks
    .replace(/<[^>]*>?/gm, '') // Strip remaining HTML tags
    .replace(/javascript:/gi, '') // Strip inline JS protocols
    .replace(/on\w+\s*=/gi, '') // Strip inline event handlers
    .trim();
};

/**
 * Sanitize an entire object of string values recursively
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === 'string') {
        sanitized[key] = sanitize(val);
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = sanitizeObject(val);
      } else {
        sanitized[key] = val;
      }
    }
  }
  return sanitized;
};

module.exports = { sanitize, sanitizeObject };
