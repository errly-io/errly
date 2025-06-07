/**
 * Test setup configuration
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Global test types
interface SecurityLog {
  type: 'error' | 'warn';
  args: unknown[];
}

interface TestGlobal {
  __securityLogs?: SecurityLog[];
  __originalConsole?: {
    error: typeof console.error;
    warn: typeof console.warn;
  };
  __testData?: unknown;
  __mockResponses?: unknown;
}

declare const global: typeof globalThis & TestGlobal;

// Security test environment setup
beforeAll(() => {
  // Note: NODE_ENV is typically set by the test runner
  // Set test environment variables if possible
  if (process.env.NODE_ENV !== 'test') {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'test',
      writable: true,
      configurable: true,
    });
  }

  Object.defineProperty(process.env, 'VITEST', {
    value: 'true',
    writable: true,
    configurable: true,
  });
  
  // Mock console methods for security tests
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Store original methods for restoration
  global.__originalConsole = {
    error: originalConsoleError,
    warn: originalConsoleWarn,
  };

  // Mock console methods to capture security logs
  console.error = (...args: unknown[]) => {
    // Store security-related errors for testing
    if (args.some(arg => typeof arg === 'string' && arg.includes('Security'))) {
      global.__securityLogs = global.__securityLogs || [];
      global.__securityLogs.push({ type: 'error', args });
    }
    originalConsoleError(...args);
  };

  console.warn = (...args: unknown[]) => {
    // Store security-related warnings for testing
    if (args.some(arg => typeof arg === 'string' && arg.includes('Security'))) {
      global.__securityLogs = global.__securityLogs || [];
      global.__securityLogs.push({ type: 'warn', args });
    }
    originalConsoleWarn(...args);
  };
  
  // Mock performance API for performance tests
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
      mark: () => { /* mock implementation */ },
      measure: () => { /* mock implementation */ },
      getEntriesByName: () => [],
      getEntriesByType: () => [],
      clearMarks: () => { /* mock implementation */ },
      clearMeasures: () => { /* mock implementation */ },
    } as unknown as Performance;
  }
  
  // Mock crypto API for security tests
  if (!global.crypto) {
    global.crypto = {
      getRandomValues: (array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
      subtle: {
        digest: async (_algorithm: string, data: ArrayBuffer) => {
          // Simple mock hash for testing
          const view = new Uint8Array(data);
          let hash = 0;
          for (let i = 0; i < view.length; i++) {
            hash = ((hash << 5) - hash + view[i]) & 0xffffffff;
          }
          return new ArrayBuffer(32); // Mock SHA-256 result
        },
      },
    } as unknown as Crypto;
  }
  
  // Mock fetch for API tests
  global.fetch = async (_url: string | URL | Request, _init?: RequestInit) => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      json: async () => ({ success: true }),
      text: async () => 'OK',
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: () => mockResponse,
    };
    
    return mockResponse as Response;
  };
});

// Cleanup after all tests
afterAll(() => {
  // Restore original console methods
  if (global.__originalConsole) {
    console.error = global.__originalConsole.error;
    console.warn = global.__originalConsole.warn;
  }

  // Clear security logs
  delete global.__securityLogs;
  delete global.__originalConsole;
});

// Setup before each test
beforeEach(() => {
  // Clear security logs before each test
  global.__securityLogs = [];

  // Note: process.env.NODE_ENV is read-only in some environments
  // Clear any cached modules that might affect security tests
  // Note: jest is not available in vitest environment
});

// Cleanup after each test
afterEach(() => {
  // Cleanup React Testing Library
  cleanup();

  // Clear any test-specific globals
  delete global.__testData;
  delete global.__mockResponses;
});

// Security test utilities
export const securityTestUtils = {
  /**
   * Get security logs captured during test execution
   */
  getSecurityLogs: () => {
    return global.__securityLogs || [];
  },

  /**
   * Clear security logs
   */
  clearSecurityLogs: () => {
    global.__securityLogs = [];
  },

  /**
   * Check if a security event was logged
   */
  hasSecurityLog: (type: 'error' | 'warn', message: string) => {
    const logs = global.__securityLogs || [];
    return logs.some((log: SecurityLog) =>
      log.type === type &&
      log.args.some((arg: unknown) =>
        typeof arg === 'string' && arg.includes(message)
      )
    );
  },
  
  /**
   * Mock a malicious request for testing
   */
  createMaliciousRequest: (type: 'xss' | 'sql' | 'path_traversal' | 'prototype_pollution') => {
    const payloads = {
      xss: '<script>alert("xss")</script>',
      sql: "'; DROP TABLE users; --",
      path_traversal: '../../../etc/passwd',
      prototype_pollution: '{"__proto__":{"polluted":true}}',
    };
    
    return {
      payload: payloads[type],
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SecurityTest)',
        'content-type': 'application/json',
      },
    };
  },
  
  /**
   * Create a test request with security headers
   */
  createSecureRequest: (url: string, options: RequestInit = {}) => {
    return new Request(url, {
      ...options,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SecurityTest)',
        'content-type': 'application/json',
        'x-csrf-token': 'test-csrf-token',
        ...options.headers,
      },
    });
  },
  
  /**
   * Measure performance of security operations
   */
  measurePerformance: async <T>(operation: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const end = performance.now();
    
    return {
      result,
      duration: end - start,
    };
  },
  
  /**
   * Generate test data with sensitive information
   */
  generateSensitiveTestData: () => {
    return {
      user: {
        id: 123,
        email: 'test@example.com',
        password: 'secret123',
        apiKey: 'key_abc123',
        sessionToken: 'sess_xyz789',
      },
      database: {
        connectionString: 'postgresql://user:pass@localhost:5432/db',
        credentials: {
          username: 'dbuser',
          password: 'dbpass123',
        },
      },
      api: {
        keys: ['sk_live_abc123', 'pk_test_def456'],
        webhookSecret: 'whsec_xyz789',
      },
    };
  },
  
  /**
   * Verify that sensitive data is properly sanitized
   */
  verifySanitization: (data: unknown, sensitiveValues: string[]) => {
    const dataStr = JSON.stringify(data);
    
    for (const sensitive of sensitiveValues) {
      if (dataStr.includes(sensitive)) {
        throw new Error(`Sensitive value "${sensitive}" found in sanitized data`);
      }
    }
    
    // Check for redaction markers
    if (!dataStr.includes('[REDACTED]')) {
      throw new Error('No redaction markers found in sanitized data');
    }
    
    return true;
  },
  
  /**
   * Create a large dataset for performance testing
   */
  createLargeDataset: (size: number) => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      sensitive: `secret${i}`,
      data: `data${i}`,
      nested: {
        level1: {
          level2: {
            secret: `nested_secret${i}`,
          },
        },
      },
    }));
  },
};

// Export test utilities for use in tests
export default securityTestUtils;
