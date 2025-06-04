// Vitest configuration for comprehensive testing
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': resolve(__dirname, '../../web/src'),
    },
  },

  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files
    setupFiles: ['./tools/quality/vitest.setup.ts'],

    // Global setup and teardown
    globalSetup: ['./tools/quality/vitest.global-setup.ts'],
    globalTeardown: ['./tools/quality/vitest.global-teardown.ts'],

    // Test file patterns
    include: [
      'web/src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'web/src/**/*.{test,spec}.{ts,tsx}',
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.next',
      'coverage',
      '**/*.d.ts',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      reportsDirectory: 'coverage',

      // Coverage thresholds
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },

      // Files to include in coverage
      include: [
        'web/src/**/*.{ts,tsx}',
      ],

      // Files to exclude from coverage
      exclude: [
        'web/src/**/*.d.ts',
        'web/src/**/*.stories.{ts,tsx}',
        'web/src/**/*.test.{ts,tsx}',
        'web/src/**/*.spec.{ts,tsx}',
        'web/src/**/index.{ts,tsx}',
        'web/src/app/**/layout.tsx',
        'web/src/app/**/loading.tsx',
        'web/src/app/**/error.tsx',
        'web/src/app/**/not-found.tsx',
      ],
    },

    // Test timeout
    testTimeout: 10000,

    // Globals (for Jest compatibility)
    globals: true,

    // Watch options
    watch: false,

    // Reporter
    reporter: ['verbose', 'json', 'html'],

    // Pool options for performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Mock options
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
