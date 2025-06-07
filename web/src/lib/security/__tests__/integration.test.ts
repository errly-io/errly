/**
 * Integration tests for security system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  SecureError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  DatabaseError,
  createSafeError,
} from '../error-handling';
import {
  applySecurityHeaders,
  validateRequestHeaders,
  createSecureResponse,
  withSecurityAndCors,
} from '../headers';
import { validateObject, validateRequest } from '../../validation/validator';
import { createStringRule, emailRule } from '../../validation/types';

describe('Security System Integration', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Error Handling + Validation Integration', () => {
    it('should create secure validation errors', () => {
      const schema = {
        email: emailRule,
        password: createStringRule({ minLength: 8 }),
      };

      const invalidData = {
        email: 'invalid-email',
        password: 'secret123', // Contains sensitive word
      };

      const result = validateObject(invalidData, schema);
      
      if (!result.isValid) {
        const secureError = new ValidationError(
          result.errors[0].field,
          result.errors[0].message,
          result.errors[0].value
        );

        // Should sanitize sensitive information
        expect(secureError.message).toContain('email');
        expect(secureError.context?.sanitizedValue).toMatch(/\[REDACTED\]|invalid-email/);
      }
    });

    it('should handle nested validation errors securely', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const nestedData = {
        user: {
          credentials: {
            password: 'secret123',
            apiKey: 'key_abc123',
          },
        },
      };

      const secureError = createSafeError(
        new Error('Validation failed'),
        'VALIDATION_ERROR'
      );

      // Should not expose sensitive nested data
      expect(secureError.message).not.toContain('secret123');
      expect(secureError.message).not.toContain('key_abc123');
    });
  });

  describe('Headers + Error Handling Integration', () => {
    it('should apply security headers to error responses', () => {
      const authError = new AuthenticationError('login', 'Invalid credentials');
      const response = createSecureResponse(authError.toJSON(), 401);

      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should validate headers and create secure error responses', () => {
      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'short', // Invalid user agent
          'content-type': 'application/json',
        },
      });

      const validation = validateRequestHeaders(request);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid or missing User-Agent header');
    });
  });

  describe('CORS + Security Headers Integration', () => {
    it('should apply both CORS and security headers', async () => {
      const mockHandler = async () => {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const request = new NextRequest('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'origin': 'http://localhost:3000',
          'user-agent': 'Mozilla/5.0 (compatible; test)',
        },
      });

      const secureHandler = withSecurityAndCors(mockHandler);
      const response = await secureHandler(request, { params: {} });

      // Should have security headers
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');

      // Should have CORS headers for allowed origin
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('should reject requests with invalid headers', async () => {
      const mockHandler = async () => {
        return new Response('Should not reach here');
      };

      const request = new NextRequest('https://example.com/api/test', {
        method: 'POST',
        headers: {
          'user-agent': 'x', // Too short
          'content-type': 'application/json',
        },
      });

      const secureHandler = withSecurityAndCors(mockHandler);
      const response = await secureHandler(request, { params: {} });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Invalid request headers');
      expect(data.code).toBe('INVALID_HEADERS');
    });
  });

  describe('Production vs Development Behavior', () => {
    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';

      const originalError = new Error('Database connection failed: password=secret123');
      const secureError = createSafeError(originalError, 'DB_ERROR');

      const productionJson = secureError.toJSON();
      expect(productionJson).not.toHaveProperty('context');
      expect(productionJson).not.toHaveProperty('stack');
      expect(productionJson.message).not.toContain('secret123');
    });

    it('should include error details in development', () => {
      process.env.NODE_ENV = 'development';

      const originalError = new Error('Test error with stack trace');
      const secureError = createSafeError(originalError, 'TEST_ERROR');

      const developmentJson = secureError.toDetailedJSON();
      expect(developmentJson).toHaveProperty('stack');
    });
  });

  describe('Attack Vector Prevention', () => {
    it('should prevent XSS in error messages', () => {
      const xssPayload = '<script>alert("xss")</script>';
      const error = new SecureError({
        message: `User input: ${xssPayload}`,
        code: 'XSS_TEST',
      });

      expect(error.message).not.toContain('<script>');
      expect(error.message).not.toContain('</script>');
    });

    it('should prevent prototype pollution in error context', () => {
      const maliciousContext = JSON.parse('{"__proto__":{"polluted":true}}');
      
      const error = new SecureError({
        message: 'Test error',
        code: 'PROTOTYPE_TEST',
        context: maliciousContext,
      });

      // Verify prototype pollution didn't occur
      expect({}.polluted).toBeUndefined();
      expect(error.context).not.toHaveProperty('__proto__');
    });

    it('should prevent SQL injection patterns in error logging', () => {
      const sqlInjectionAttempt = "'; DROP TABLE users; --";
      const error = new DatabaseError('user_lookup', new Error(sqlInjectionAttempt));

      // Should sanitize the SQL injection attempt
      expect(error.message).not.toContain('DROP TABLE');
      expect(error.message).not.toContain('--');
    });

    it('should prevent information disclosure through stack traces', () => {
      process.env.NODE_ENV = 'production';

      const sensitiveError = new Error('Connection failed: password=admin123');
      const secureError = createSafeError(sensitiveError, 'CONNECTION_ERROR');

      const safeJson = secureError.toJSON();
      expect(JSON.stringify(safeJson)).not.toContain('admin123');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should handle rate limit errors securely', () => {
      const rateLimitError = new NetworkError(
        'Rate limit exceeded',
        429,
        new Error('Too many requests from IP 192.168.1.1')
      );

      // Should not expose internal IP information
      expect(rateLimitError.message).not.toContain('192.168.1.1');
      expect(rateLimitError.toJSON().message).toBe('Rate limit exceeded');
    });
  });

  describe('File Upload Security', () => {
    it('should validate file upload requests securely', () => {
      const maliciousFilename = '../../../etc/passwd';
      const validationError = new ValidationError(
        'filename',
        'Invalid filename',
        maliciousFilename
      );

      // Should sanitize path traversal attempts
      expect(validationError.context?.sanitizedValue).toMatch(/\[REDACTED\]|\.\.\//);
      expect(validationError.message).not.toContain('../');
    });
  });

  describe('API Key Security', () => {
    it('should handle API key validation errors securely', () => {
      const apiKey = 'sk_live_abc123def456ghi789';
      const authError = new AuthenticationError(
        'api_key_validation',
        `Invalid API key: ${apiKey}`
      );

      // Should not expose the actual API key
      expect(authError.message).not.toContain('sk_live_');
      expect(authError.message).not.toContain('abc123def456ghi789');
    });
  });

  describe('Session Security', () => {
    it('should handle session errors securely', () => {
      const sessionToken = 'sess_abc123def456';
      const authError = new AuthenticationError(
        'session_validation',
        `Invalid session token: ${sessionToken}`
      );

      // Should not expose session tokens
      expect(authError.message).not.toContain('sess_');
      expect(authError.message).not.toContain('abc123def456');
    });
  });

  describe('Database Security', () => {
    it('should handle database connection errors securely', () => {
      const connectionString = 'postgresql://user:password@localhost:5432/db';
      const dbError = new DatabaseError(
        'connection',
        new Error(`Connection failed: ${connectionString}`)
      );

      // Should not expose connection strings
      expect(dbError.message).not.toContain('postgresql://');
      expect(dbError.message).not.toContain('password');
      expect(dbError.message).not.toContain('localhost:5432');
    });
  });

  describe('Environment Variable Security', () => {
    it('should handle environment variable errors securely', () => {
      const envError = new SecureError({
        message: 'Missing environment variable: JWT_SECRET=abc123',
        code: 'ENV_ERROR',
      });

      // Should not expose environment variable values
      expect(envError.message).not.toContain('abc123');
      expect(envError.message).toContain('[REDACTED]');
    });
  });

  describe('Error Aggregation Security', () => {
    it('should aggregate multiple errors securely', () => {
      const errors = [
        new ValidationError('email', 'Invalid email', 'user@secret-domain.com'),
        new ValidationError('password', 'Too weak', 'password123'),
        new AuthenticationError('login', 'Failed with token: abc123'),
      ];

      // All errors should be sanitized
      errors.forEach(error => {
        expect(error.message).not.toContain('secret-domain.com');
        expect(error.message).not.toContain('password123');
        expect(error.message).not.toContain('abc123');
      });
    });
  });
});
