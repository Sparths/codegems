// lib/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

// Enhanced sanitization function that prevents XSS
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML tags and dangerous content
  let sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  // Additional sanitization
  sanitized = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/&#/g, '') // Remove HTML entities
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, '&#39;') // Escape single quotes
    .replace(/"/g, '&quot;') // Escape double quotes
    .trim();
  
  return sanitized;
}

// Sanitize HTML content (for displaying user content safely)
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target'], // Allow target attribute
    FORBID_TAGS: ['style', 'script', 'iframe', 'form', 'input'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick']
  });
}

// Validate and sanitize URLs
export function sanitizeURL(url: string): string | null {
  if (typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Prevent javascript: and data: URLs
    if (url.match(/^(javascript|data|vbscript|file):/i)) {
      return null;
    }
    
    return parsed.href;
  } catch {
    return null;
  }
}

// Escape for SQL (though you should use parameterized queries)
export function escapeSQLString(str: string): string {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\0')
    .replace(/\x1a/g, '\\Z');
}

// Validate email more securely
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  
  // More comprehensive email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
}

// Validate username more securely
export function isValidUsername(username: string): boolean {
  if (typeof username !== 'string') return false;
  
  // Only allow alphanumeric, underscore, and hyphen
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  
  // Check for common SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)|(-{2})|\/\*|\*\/|;/i;
  
  return usernameRegex.test(username) && !sqlPatterns.test(username);
}