/**
 * Security Configuration
 * 
 * Centralized security settings and constants for the application
 */

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isTest = process.env.NODE_ENV === 'test';

// Security headers configuration
export const SECURITY_HEADERS = {
  // Content Security Policy
  CSP: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  },
  
  // HTTP Strict Transport Security
  HSTS: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  FRAME_OPTIONS: 'DENY',
  
  // X-Content-Type-Options
  CONTENT_TYPE_OPTIONS: 'nosniff',
  
  // Referrer Policy
  REFERRER_POLICY: 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  PERMISSIONS_POLICY: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
  },
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  // API endpoints
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many API requests, please try again later',
  },
  
  // Authentication endpoints
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  },
  
  // File upload endpoints
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    message: 'Too many upload requests, please try again later',
  },
  
  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts, please try again later',
  },
} as const;

// Input validation limits
export const VALIDATION_LIMITS = {
  // String lengths
  MAX_STRING_LENGTH: 1000,
  MAX_TEXT_LENGTH: 10000,
  MAX_EMAIL_LENGTH: 254,
  MAX_USERNAME_LENGTH: 50,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  
  // File uploads
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json',
  ],
  
  // Arrays and objects
  MAX_ARRAY_LENGTH: 100,
  MAX_OBJECT_DEPTH: 10,
  MAX_OBJECT_KEYS: 50,
} as const;

// Session and authentication configuration
export const AUTH_CONFIG = {
  // Session settings
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  REMEMBER_ME_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Token settings
  JWT_EXPIRY: '1h',
  REFRESH_TOKEN_EXPIRY: '7d',
  
  // Password requirements
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxConsecutiveChars: 3,
    preventCommonPasswords: true,
  },
  
  // Account lockout
  LOCKOUT_CONFIG: {
    maxAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    resetTime: 60 * 60 * 1000, // 1 hour
  },
} as const;

// CSRF protection configuration
export const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  COOKIE_NAME: '__csrf_token',
  HEADER_NAME: 'X-CSRF-Token',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24, // 24 hours
  },
} as const;

// Error handling configuration
export const ERROR_CONFIG = {
  // Error message limits
  MAX_ERROR_MESSAGE_LENGTH: 500,
  MAX_STACK_TRACE_LENGTH: 2000,
  
  // Sensitive patterns to redact
  SENSITIVE_PATTERNS: [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /session/i,
    /cookie/i,
    /bearer/i,
    /api[_-]?key/i,
    /database/i,
    /connection/i,
    /env/i,
    /config/i,
  ],
  
  // Properties to exclude from error context
  DANGEROUS_PROPERTIES: ['__proto__', 'constructor', 'prototype'],
  
  // Error reporting settings
  REPORT_ERRORS_IN_PRODUCTION: true,
  INCLUDE_STACK_TRACES_IN_DEV: true,
  LOG_ERROR_DETAILS: true,
} as const;

// Content filtering configuration
export const CONTENT_FILTER = {
  // HTML sanitization
  ALLOWED_HTML_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_HTML_ATTRIBUTES: {},
  
  // XSS prevention
  ESCAPE_HTML_IN_ERRORS: true,
  SANITIZE_USER_INPUT: true,
  
  // Content limits
  MAX_CONTENT_LENGTH: 50000,
  MAX_NESTED_DEPTH: 5,
} as const;

// API security configuration
export const API_SECURITY = {
  // Request validation
  VALIDATE_CONTENT_TYPE: true,
  REQUIRE_HTTPS_IN_PRODUCTION: true,
  
  // Response headers
  INCLUDE_SECURITY_HEADERS: true,
  HIDE_SERVER_INFO: true,
  
  // CORS settings
  CORS_CONFIG: {
    origin: isProduction 
      ? ['https://yourdomain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
  },
  
  // API versioning
  CURRENT_API_VERSION: 'v1',
  SUPPORTED_VERSIONS: ['v1'],
} as const;

// Monitoring and alerting configuration
export const MONITORING_CONFIG = {
  // Error thresholds
  ERROR_RATE_THRESHOLD: 0.05, // 5%
  RESPONSE_TIME_THRESHOLD: 2000, // 2 seconds
  
  // Security event monitoring
  MONITOR_FAILED_LOGINS: true,
  MONITOR_RATE_LIMIT_HITS: true,
  MONITOR_SUSPICIOUS_PATTERNS: true,
  
  // Alerting
  ALERT_ON_SECURITY_EVENTS: true,
  ALERT_EMAIL: process.env.SECURITY_ALERT_EMAIL,
} as const;

// Note: DEV_OVERRIDES was removed as it was not used in the codebase
// Development overrides are now handled directly in SECURITY_CONFIG

// Export combined configuration
export const SECURITY_CONFIG = {
  HEADERS: SECURITY_HEADERS,
  RATE_LIMITS: isDevelopment ? {
    API: { ...RATE_LIMITS.API, maxRequests: 1000 },
    AUTH: { ...RATE_LIMITS.AUTH, maxRequests: 50 },
  } : RATE_LIMITS,
  VALIDATION: VALIDATION_LIMITS,
  AUTH: AUTH_CONFIG,
  CSRF: CSRF_CONFIG,
  ERRORS: isDevelopment ? {
    ...ERROR_CONFIG,
    INCLUDE_STACK_TRACES_IN_DEV: true,
    LOG_ERROR_DETAILS: true,
  } : ERROR_CONFIG,
  CONTENT: CONTENT_FILTER,
  API: API_SECURITY,
  MONITORING: MONITORING_CONFIG,
} as const;

// Type exports for TypeScript
export type SecurityConfig = typeof SECURITY_CONFIG;
export type RateLimitConfig = typeof RATE_LIMITS;
export type ValidationConfig = typeof VALIDATION_LIMITS;
export type AuthConfig = typeof AUTH_CONFIG;
