import DOMPurify from 'isomorphic-dompurify';

// HTML sanitization options
const HTML_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'title'],
  ALLOW_DATA_ATTR: false,
  FORBID_SCRIPT: true,
  FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
};

// Sanitize HTML content
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(input, HTML_SANITIZE_OPTIONS);
}

// Sanitize plain text (remove HTML tags completely)
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove all HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
}

// Sanitize email
export function sanitizeEmail(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input.toLowerCase().trim();
}

// Sanitize URL
export function sanitizeURL(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  try {
    const url = new URL(input);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    
    return url.toString();
  } catch {
    return '';
  }
}

// Sanitize filename
export function sanitizeFilename(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove dangerous characters and limit length
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .substring(0, 255);
}

// Sanitize SQL-like input (basic protection)
export function sanitizeSQLInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove common SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi
  ];
  
  let sanitized = input;
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
}

// Sanitize object recursively
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const sanitizedKey = sanitizeText(key);
      if (sanitizedKey) {
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    });
    return sanitized;
  }
  
  return obj;
}

// Validate and sanitize user input based on type
export function sanitizeUserInput(input: any, type: 'text' | 'html' | 'email' | 'url' | 'filename' = 'text'): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  switch (type) {
    case 'html':
      return sanitizeHTML(input);
    case 'email':
      return sanitizeEmail(input);
    case 'url':
      return sanitizeURL(input);
    case 'filename':
      return sanitizeFilename(input);
    case 'text':
    default:
      return sanitizeText(input);
  }
}

// Check for suspicious patterns
export function containsSuspiciousContent(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /eval\(/i,
    /expression\(/i,
    /url\(/i,
    /import\(/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(input));
}

// Rate limit key sanitization
export function sanitizeRateLimitKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9:._-]/g, '').substring(0, 100);
}
