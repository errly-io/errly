/**
 * Secure Error Handling System
 * 
 * This module provides secure error handling utilities that prevent:
 * - Information disclosure through error messages
 * - Prototype pollution attacks
 * - XSS through error serialization
 * - Stack trace exposure in production
 */

import { Effect, Data } from 'effect';
import { ERROR_CONFIG } from './config';

// Base secure error class
export class SecureError extends Data.TaggedError('SecureError')<{
  readonly message: string;
  readonly code: string;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
  readonly originalError?: Error;
}> {
  constructor(params: {
    message: string;
    code: string;
    context?: Record<string, unknown>;
    originalError?: Error;
  }) {
    const baseParams: {
      message: string;
      code: string;
      timestamp: number;
      context?: Record<string, unknown>;
      originalError?: Error;
    } = {
      message: sanitizeErrorMessage(params.message),
      code: params.code,
      timestamp: Date.now(),
    };

    if (params.context) {
      const sanitizedContext = sanitizeContext(params.context);
      if (sanitizedContext) {
        baseParams.context = sanitizedContext;
      }
    }

    if (params.originalError) {
      baseParams.originalError = params.originalError;
    }

    super(baseParams);
  }

  // Safe serialization for logging/transmission
  toJSON(): Record<string, unknown> {
    return {
      name: this._tag,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      // context and originalError intentionally excluded for security
    };
  }

  // Development-only detailed info
  toDetailedJSON(): Record<string, unknown> {
    if (process.env.NODE_ENV === 'production') {
      return this.toJSON();
    }

    return {
      ...this.toJSON(),
      context: this.context,
      stack: this.originalError?.stack?.substring(0, ERROR_CONFIG.MAX_STACK_TRACE_LENGTH),
    };
  }
}

// Specific error types
export class ValidationError extends SecureError {
  constructor(field: string, message: string, value?: unknown) {
    super({
      message: `Validation failed for field '${field}': ${message}`,
      code: 'VALIDATION_ERROR',
      context: { field, sanitizedValue: sanitizeValue(value) },
    });
  }
}

export class AuthenticationError extends SecureError {
  constructor(action: string, details?: string) {
    super({
      message: details || 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
      context: { action },
    });
  }
}

export class AuthorizationError extends SecureError {
  constructor(resource: string, action: string) {
    super({
      message: `Access denied to ${resource}`,
      code: 'AUTHORIZATION_ERROR',
      context: { resource, action },
    });
  }
}

export class NetworkError extends SecureError {
  constructor(message: string, statusCode?: number, originalError?: Error) {
    super({
      message,
      code: 'NETWORK_ERROR',
      ...(statusCode !== undefined && { context: { statusCode } }),
      ...(originalError && { originalError }),
    });
  }
}

export class DatabaseError extends SecureError {
  constructor(operation: string, originalError?: Error) {
    super({
      message: `Database operation failed: ${operation}`,
      code: 'DATABASE_ERROR',
      context: { operation },
      ...(originalError && { originalError }),
    });
  }
}

// Utility functions for secure error handling

/**
 * Sanitizes error messages to prevent information disclosure
 */
function sanitizeErrorMessage(message: unknown): string {
  if (typeof message !== 'string') {
    return 'Invalid error message type';
  }

  let sanitized = message
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .substring(0, ERROR_CONFIG.MAX_ERROR_MESSAGE_LENGTH)
    .trim();

  // Remove sensitive information - only replace if it looks like sensitive data
  for (const pattern of ERROR_CONFIG.SENSITIVE_PATTERNS) {
    // Only replace if it's in a key=value or key: value format
    const keyValuePattern = new RegExp(`(${pattern.source})[=:]\\s*\\S+`, 'gi');
    sanitized = sanitized.replace(keyValuePattern, '$1=[REDACTED]');
  }

  return sanitized || 'An error occurred';
}

/**
 * Sanitizes context objects to prevent prototype pollution and data leakage
 */
function sanitizeContext(context?: Record<string, unknown>, visited = new WeakSet()): Record<string, unknown> | undefined {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  // Prevent circular references
  if (visited.has(context)) {
    return { '[CIRCULAR]': true };
  }
  visited.add(context);

  const sanitized = Object.create(null);

  for (const [key, value] of Object.entries(context)) {
    // Skip dangerous properties
    if (ERROR_CONFIG.DANGEROUS_PROPERTIES.includes(key as '__proto__' | 'constructor' | 'prototype')) {
      continue;
    }

    // Skip sensitive keys
    const isSensitive = ERROR_CONFIG.SENSITIVE_PATTERNS.some((pattern: RegExp) =>
      pattern.test(key)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeValueWithVisited(value, visited);
    }
  }

  return sanitized;
}

/**
 * Sanitizes individual values
 */
function sanitizeValue(value: unknown): unknown {
  return sanitizeValueWithVisited(value, new WeakSet());
}

/**
 * Sanitizes individual values with circular reference protection
 */
function sanitizeValueWithVisited(value: unknown, visited: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Check if string contains sensitive patterns
    const sensitivePatterns = [
      /password/i, /secret/i, /key/i, /token/i, /auth/i, /credential/i,
      /api[_-]?key/i, /sess/i, /jwt/i, /bearer/i
    ];

    const isSensitive = sensitivePatterns.some(pattern => pattern.test(value));
    if (isSensitive) {
      return '[REDACTED]';
    }

    return sanitizeErrorMessage(value);
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (visited.has(value)) {
        return '[CIRCULAR_ARRAY]';
      }
      visited.add(value);
      return value.slice(0, 10).map(item => sanitizeValueWithVisited(item, visited)); // Limit array size
    }
    return sanitizeContext(value as Record<string, unknown>, visited);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  return '[COMPLEX_VALUE]';
}

/**
 * Escapes HTML to prevent XSS in error display
 */
export function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char);
}

/**
 * Creates a safe error from any unknown error
 */
export function createSafeError(error: unknown, code = 'UNKNOWN_ERROR'): SecureError {
  if (error instanceof SecureError) {
    return error;
  }

  if (error instanceof Error) {
    return new SecureError({
      message: error.message,
      code,
      originalError: error,
    });
  }

  return new SecureError({
    message: 'An unexpected error occurred',
    code,
    context: { originalType: typeof error },
  });
}

/**
 * Effect-based error handling utilities
 */
export const ErrorHandling = {
  /**
   * Wraps a function in secure error handling
   */
  tryCatch: <T>(fn: () => T, code = 'OPERATION_ERROR'): Effect.Effect<T, SecureError> =>
    Effect.try({
      try: fn,
      catch: (error) => createSafeError(error, code),
    }),

  /**
   * Wraps an async function in secure error handling
   */
  tryPromise: <T>(fn: () => Promise<T>, code = 'ASYNC_ERROR'): Effect.Effect<T, SecureError> =>
    Effect.tryPromise({
      try: fn,
      catch: (error) => createSafeError(error, code),
    }),

  /**
   * Maps errors to secure errors
   */
  mapError: <E>(error: E, code = 'MAPPED_ERROR'): SecureError =>
    createSafeError(error, code),

  /**
   * Validates and sanitizes input
   */
  validateInput: <T>(
    input: unknown,
    validator: (input: unknown) => input is T,
    fieldName: string
  ): Effect.Effect<T, ValidationError> =>
    validator(input)
      ? Effect.succeed(input)
      : Effect.fail(new ValidationError(fieldName, 'Invalid input format', input)),
};

// Note: ErrorPool was removed as it provided no performance benefit
// Error objects are lightweight and don't need pooling in JavaScript
