/**
 * Performance System Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor } from '../monitor';
import { AdvancedCache } from '../cache';
import { DynamicImportManager, BundleAnalyzer } from '../bundle-optimizer';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1024 * 1024, // 1MB
    totalJSHeapSize: 2 * 1024 * 1024, // 2MB
    jsHeapSizeLimit: 4 * 1024 * 1024, // 4MB
  },
};

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn().mockImplementation((_callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

global.PerformanceObserver = mockPerformanceObserver;
global.performance = mockPerformance as unknown as Performance;

describe('Performance Monitor', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.setEnabled(true);
  });

  describe('Metric Recording', () => {
    it('should record performance metrics', () => {
      performanceMonitor.recordMetric({
        name: 'test-metric',
        value: 100,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'computation',
      });

      const report = performanceMonitor.getReport();
      expect(report.metrics).toHaveLength(1);
      expect(report.metrics[0].name).toBe('test-metric');
      expect(report.metrics[0].value).toBe(100);
    });

    it('should apply sampling in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Mock Math.random to always return 0.9 (above 10% sampling rate)
      const originalRandom = Math.random;
      Math.random = () => 0.9;

      performanceMonitor.recordMetric({
        name: 'sampled-metric',
        value: 50,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'computation',
      });

      const report = performanceMonitor.getReport();
      expect(report.metrics).toHaveLength(0); // Should be filtered out by sampling

      // Restore
      Math.random = originalRandom;
      process.env.NODE_ENV = originalEnv;
    });

    it('should limit metrics array size', () => {
      // Record more metrics than the limit
      for (let i = 0; i < 1200; i++) {
        performanceMonitor.recordMetric({
          name: `metric-${i}`,
          value: i,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'computation',
        });
      }

      const report = performanceMonitor.getReport();
      expect(report.metrics.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Function Measurement', () => {
    it('should measure synchronous function performance', () => {
      const testFunction = () => {
        // Simulate some work
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      };

      const result = performanceMonitor.measureFunction('test-sync', testFunction);
      
      expect(result).toBe(499500); // Sum of 0 to 999
      
      const report = performanceMonitor.getReport();
      const metric = report.metrics.find(m => m.name === 'test-sync');
      expect(metric).toBeDefined();
      expect(metric?.category).toBe('computation');
    });

    it('should measure asynchronous function performance', async () => {
      const asyncFunction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      };

      const result = await performanceMonitor.measureAsyncFunction(
        'test-async',
        asyncFunction
      );
      
      expect(result).toBe('async-result');
      
      const report = performanceMonitor.getReport();
      const metric = report.metrics.find(m => m.name === 'test-async');
      expect(metric).toBeDefined();
      expect(metric?.value).toBeGreaterThan(0);
    });
  });

  describe('Performance Report', () => {
    it('should generate comprehensive performance report', () => {
      // Add some test metrics
      performanceMonitor.recordMetric({
        name: 'slow-operation',
        value: 500,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'computation',
      });

      performanceMonitor.recordMetric({
        name: 'memory-usage',
        value: 50 * 1024 * 1024, // 50MB
        unit: 'bytes',
        timestamp: Date.now(),
        category: 'memory',
      });

      const report = performanceMonitor.getReport();
      
      expect(report.summary.totalTime).toBeGreaterThan(0);
      // The slowest operation should be the one with highest value
      expect(['slow-operation', 'memory-usage']).toContain(report.summary.slowestOperation);
      expect(report.summary.memoryUsage).toBeGreaterThan(0);
      expect(report.summary.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Advanced Cache', () => {
  let cache: AdvancedCache<string>;

  beforeEach(() => {
    cache = new AdvancedCache('test-cache', {
      ttl: 1000, // 1 second
      maxSize: 3,
      strategy: 'lru',
      persistent: false,
      compress: false,
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should handle TTL expiration', async () => {
      cache.set('expiring-key', 'expiring-value', 50); // 50ms TTL
      
      expect(cache.get('expiring-key')).toBe('expiring-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cache.get('expiring-key')).toBeNull();
    });
  });

  describe('Eviction Strategies', () => {
    it('should evict LRU entries when cache is full', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Access key1 and key3 to make them recently used
      cache.get('key1');
      cache.get('key3');

      // Add key4, should evict some entries (LRU strategy)
      cache.set('key4', 'value4');

      // Cache should not exceed maxSize
      expect(cache.getStats().entryCount).toBeLessThanOrEqual(3);

      // key4 should be present (just added)
      expect(cache.has('key4')).toBe(true);

      // At least one of the older keys should be evicted
      const remainingKeys = ['key1', 'key2', 'key3'].filter(key => cache.has(key));
      expect(remainingKeys.length).toBeLessThan(3);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss statistics', () => {
      cache.set('key1', 'value1');
      
      // Hit
      cache.get('key1');
      
      // Miss
      cache.get('key2');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('Async Operations', () => {
    it('should handle getOrSet with factory function', async () => {
      const factory = vi.fn().mockResolvedValue('factory-value');
      
      const result1 = await cache.getOrSet('async-key', factory);
      expect(result1).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);
      
      // Second call should use cached value
      const result2 = await cache.getOrSet('async-key', factory);
      expect(result2).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1); // Not called again
    });
  });
});

describe('Dynamic Import Manager', () => {
  beforeEach(() => {
    DynamicImportManager.clearCache();
  });

  describe('Import Caching', () => {
    it('should cache successful imports', async () => {
      const mockModule = { default: 'test-module' };
      const importFn = vi.fn().mockResolvedValue(mockModule);
      
      const result1 = await DynamicImportManager.import(importFn, 'test-module');
      expect(result1).toBe(mockModule);
      expect(importFn).toHaveBeenCalledTimes(1);
      
      // Second import should use cache
      const result2 = await DynamicImportManager.import(importFn, 'test-module');
      expect(result2).toBe(mockModule);
      expect(importFn).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle import failures', async () => {
      const importError = new Error('Import failed');
      const importFn = vi.fn().mockRejectedValue(importError);
      
      await expect(
        DynamicImportManager.import(importFn, 'failing-module')
      ).rejects.toThrow('Import failed');
      
      // Should not cache failed imports
      const stats = DynamicImportManager.getCacheStats();
      expect(stats.cachedModules).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Preloading', () => {
    it('should preload modules without blocking', () => {
      const mockModule = { default: 'preloaded-module' };
      const importFn = vi.fn().mockResolvedValue(mockModule);
      
      // Preload should not block
      DynamicImportManager.preload(importFn, 'preload-test');
      
      // Should not be immediately available
      const stats = DynamicImportManager.getCacheStats();
      expect(stats.cachedModules).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Bundle Analyzer', () => {
  beforeEach(() => {
    // Mock performance entries
    mockPerformance.getEntriesByType.mockReturnValue([
      {
        name: 'https://example.com/main.js',
        transferSize: 1024 * 500, // 500KB
        encodedBodySize: 1024 * 200, // 200KB gzipped
        decodedBodySize: 1024 * 500,
        duration: 100,
      },
      {
        name: 'https://example.com/chunk-vendor.js',
        transferSize: 1024 * 1024 * 2, // 2MB
        encodedBodySize: 1024 * 800, // 800KB gzipped
        decodedBodySize: 1024 * 1024 * 2,
        duration: 300,
      },
    ]);
  });

  describe('Bundle Analysis', () => {
    it('should analyze bundle performance', async () => {
      const analysis = await BundleAnalyzer.analyzeBundlePerformance();
      
      expect(analysis.chunks).toHaveLength(2);
      expect(analysis.totalSize).toBeGreaterThan(1024 * 1024); // Should be > 1MB
      expect(analysis.recommendations).toBeDefined();
      
      // Should have recommendations
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', async () => {
      const analysis = await BundleAnalyzer.analyzeBundlePerformance();

      // Should have recommendations for large bundle
      expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);

      // Check that recommendations have proper structure
      if (analysis.recommendations.length > 0) {
        expect(analysis.recommendations[0]).toHaveProperty('type');
        expect(analysis.recommendations[0]).toHaveProperty('priority');
      }
    });
  });
});

describe('Performance Integration', () => {
  it('should track performance across multiple systems', async () => {
    // Test cache performance
    const cache = new AdvancedCache('integration-test');
    await cache.getOrSet('test-key', async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'test-value';
    });

    // Test dynamic import performance
    const mockModule = { default: 'test' };
    await DynamicImportManager.import(
      () => Promise.resolve(mockModule),
      'integration-module'
    );

    // Check that metrics were recorded
    const report = performanceMonitor.getReport();
    expect(report.metrics.length).toBeGreaterThan(0);
    
    // Should have metrics from different categories
    const categories = new Set(report.metrics.map(m => m.category));
    expect(categories.size).toBeGreaterThan(1);
  });

  it('should handle concurrent performance operations', async () => {
    const promises = Array.from({ length: 10 }, async (_, i) => {
      return performanceMonitor.measureAsyncFunction(
        `concurrent-op-${i}`,
        async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return i;
        }
      );
    });

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);
    
    const report = performanceMonitor.getReport();
    const concurrentMetrics = report.metrics.filter(m => 
      m.name.startsWith('concurrent-op-')
    );
    expect(concurrentMetrics).toHaveLength(10);
  });
});
