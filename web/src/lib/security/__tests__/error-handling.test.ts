/**
 * Security tests for error handling system
 */

import { describe, it, expect } from 'vitest';
import { Effect } from 'effect';
import {
  SecureError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  DatabaseError,
  createSafeError,
  escapeHtml,
  ErrorHandling,
} from '../error-handling';

describe('SecureError', () => {
  it('should sanitize error messages', () => {
    const error = new SecureError({
      message: 'Database connection failed: password=secret123',
      code: 'DB_ERROR',
    });

    expect(error.message).not.toContain('secret123');
    expect(error.message).toContain('[REDACTED]');
  });

  it('should limit message length', () => {
    const longMessage = 'A'.repeat(1000);
    const error = new SecureError({
      message: longMessage,
      code: 'LONG_ERROR',
    });

    expect(error.message.length).toBeLessThanOrEqual(500);
  });

  it('should remove HTML tags from messages', () => {
    const error = new SecureError({
      message: '<script>alert("xss")</script>Error occurred',
      code: 'XSS_ERROR',
    });

    expect(error.message).not.toContain('<script>');
    expect(error.message).not.toContain('</script>');
    expect(error.message).toContain('Error occurred');
  });

  it('should safely serialize for production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new SecureError({
      message: 'Test error',
      code: 'TEST_ERROR',
      context: { sensitiveData: 'secret' },
      originalError: new Error('Original error with stack'),
    });

    const serialized = error.toJSON();

    expect(serialized).toHaveProperty('message');
    expect(serialized).toHaveProperty('code');
    expect(serialized).toHaveProperty('timestamp');
    expect(serialized).not.toHaveProperty('context');
    expect(serialized).not.toHaveProperty('originalError');
    expect(serialized).not.toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });

  it('should include details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new SecureError({
      message: 'Test error',
      code: 'TEST_ERROR',
      context: { debugInfo: 'useful' },
      originalError: new Error('Original error'),
    });

    const detailed = error.toDetailedJSON();

    expect(detailed).toHaveProperty('context');
    expect(detailed).toHaveProperty('stack');

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Context Sanitization', () => {
  it('should prevent prototype pollution', () => {
    const maliciousContext = JSON.parse('{"__proto__":{"polluted":true}}');
    
    const error = new SecureError({
      message: 'Test error',
      code: 'TEST_ERROR',
      context: maliciousContext,
    });

    // Check that prototype pollution didn't occur
    expect({}.polluted).toBeUndefined();
    expect(error.context).not.toHaveProperty('__proto__');
  });

  it('should sanitize sensitive keys in context', () => {
    const error = new SecureError({
      message: 'Test error',
      code: 'TEST_ERROR',
      context: {
        username: 'john',
        password: 'secret123',
        apiKey: 'key_abc123',
        normalField: 'normal_value',
      },
    });

    expect(error.context?.username).toBe('john');
    expect(error.context?.password).toBe('[REDACTED]');
    expect(error.context?.apiKey).toBe('[REDACTED]');
    expect(error.context?.normalField).toBe('normal_value');
  });

  it('should limit array sizes in context', () => {
    const largeArray = Array.from({ length: 20 }, (_, i) => i);
    
    const error = new SecureError({
      message: 'Test error',
      code: 'TEST_ERROR',
      context: { items: largeArray },
    });

    expect(Array.isArray(error.context?.items)).toBe(true);
    expect((error.context?.items as unknown[]).length).toBeLessThanOrEqual(10);
  });
});

describe('Specific Error Types', () => {
  it('should create ValidationError with sanitized value', () => {
    const error = new ValidationError('password', 'Too weak', 'secret123');
    
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toContain('password');
    expect(error.context?.field).toBe('[REDACTED]');
    expect(error.context?.sanitizedValue).toBe('[REDACTED]');
  });

  it('should create AuthenticationError', () => {
    const error = new AuthenticationError('login', 'Invalid credentials');
    
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.message).toBe('Invalid credentials');
    expect(error.context?.action).toBe('login');
  });

  it('should create AuthorizationError', () => {
    const error = new AuthorizationError('admin_panel', 'view');
    
    expect(error.code).toBe('AUTHORIZATION_ERROR');
    expect(error.message).toContain('admin_panel');
    expect(error.context?.resource).toBe('admin_panel');
    expect(error.context?.action).toBe('view');
  });

  it('should create NetworkError with status code', () => {
    const originalError = new Error('Connection failed');
    const error = new NetworkError('Request failed', 500, originalError);
    
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.context?.statusCode).toBe(500);
    expect(error.originalError).toBe(originalError);
  });

  it('should create DatabaseError', () => {
    const originalError = new Error('Connection timeout');
    const error = new DatabaseError('SELECT users', originalError);
    
    expect(error.code).toBe('DATABASE_ERROR');
    expect(error.message).toContain('SELECT users');
    expect(error.originalError).toBe(originalError);
  });
});

describe('Utility Functions', () => {
  it('should escape HTML properly', () => {
    const input = '<script>alert("xss")</script>';
    const escaped = escapeHtml(input);
    
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should create safe error from unknown input', () => {
    const unknownError = { message: 'Unknown error type' };
    const safeError = createSafeError(unknownError, 'UNKNOWN');
    
    expect(safeError).toBeInstanceOf(SecureError);
    expect(safeError.code).toBe('UNKNOWN');
  });

  it('should preserve SecureError when creating safe error', () => {
    const originalError = new SecureError({
      message: 'Original error',
      code: 'ORIGINAL',
    });
    
    const safeError = createSafeError(originalError);
    
    expect(safeError).toBe(originalError);
  });

  it('should handle Error objects', () => {
    const originalError = new Error('Standard error');
    const safeError = createSafeError(originalError, 'WRAPPED');
    
    expect(safeError).toBeInstanceOf(SecureError);
    expect(safeError.code).toBe('WRAPPED');
    expect(safeError.originalError).toBe(originalError);
  });
});

describe('ErrorHandling utilities', () => {
  it('should wrap synchronous functions safely', () => {
    const result = ErrorHandling.tryCatch(() => {
      throw new Error('Test error');
    }, 'SYNC_ERROR').pipe(
      // Handle the error case
      Effect.catchAll(() => Effect.succeed({ caught: true }))
    );

    const outcome = Effect.runSync(result);
    expect(outcome).toEqual({ caught: true });
  });

  it('should wrap async functions safely', async () => {
    const result = ErrorHandling.tryPromise(async () => {
      throw new Error('Async error');
    }, 'ASYNC_ERROR').pipe(
      Effect.catchAll(() => Effect.succeed({ caught: true }))
    );

    const outcome = await Effect.runPromise(result);
    expect(outcome).toEqual({ caught: true });
  });
});

describe('Security Edge Cases', () => {
  it('should handle null and undefined messages', () => {
    const error1 = new SecureError({
      message: null as unknown as string,
      code: 'NULL_MESSAGE',
    });

    const error2 = new SecureError({
      message: undefined as unknown as string,
      code: 'UNDEFINED_MESSAGE',
    });

    expect(error1.message).toBe('Invalid error message type');
    expect(error2.message).toBe('Invalid error message type');
  });

  it('should handle circular references in context', () => {
    const circular: Record<string, unknown> = { name: 'test' };
    circular.self = circular;

    expect(() => {
      new SecureError({
        message: 'Test error',
        code: 'CIRCULAR_ERROR',
        context: circular,
      });
    }).not.toThrow();
  });

  it('should handle very deep object nesting', () => {
    const deep: Record<string, unknown> = {};
    let current = deep;
    
    // Create a deeply nested object
    for (let i = 0; i < 100; i++) {
      current.next = {};
      current = current.next;
    }

    expect(() => {
      new SecureError({
        message: 'Test error',
        code: 'DEEP_ERROR',
        context: { deep },
      });
    }).not.toThrow();
  });
});
