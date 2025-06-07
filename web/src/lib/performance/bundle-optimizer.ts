/**
 * Bundle Optimization System
 * 
 * Automatic code splitting, tree shaking, and bundle analysis
 */

import { performanceMonitor } from './monitor';

// Bundle analysis types
export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  dependencies: DependencyInfo[];
  recommendations: OptimizationRecommendation[];
  timestamp: number;
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isAsync: boolean;
  isEntry: boolean;
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  usedExports: string[];
  unusedExports: string[];
  treeshakeable: boolean;
}

export interface OptimizationRecommendation {
  type: 'code-split' | 'tree-shake' | 'lazy-load' | 'preload' | 'remove-unused';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSavings: number; // bytes
  implementation: string;
}

// Bundle size thresholds
const BUNDLE_THRESHOLDS = {
  warning: 1024 * 1024, // 1MB
  critical: 5 * 1024 * 1024, // 5MB
  chunkWarning: 512 * 1024, // 512KB
  chunkCritical: 2 * 1024 * 1024, // 2MB
};

// Dynamic import utilities
class DynamicImportManager {
  private static importCache = new Map<string, Promise<unknown>>();
  private static loadingStates = new Map<string, boolean>();

  /**
   * Dynamic import with caching and error handling
   */
  static async import<T = unknown>(
    importFn: () => Promise<T>,
    moduleName: string
  ): Promise<T> {
    if (this.importCache.has(moduleName)) {
      const cached = this.importCache.get(moduleName);
      if (cached) return cached as Promise<T>;
    }

    if (this.loadingStates.get(moduleName)) {
      // Wait for existing import to complete
      while (this.loadingStates.get(moduleName)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      const cached = this.importCache.get(moduleName);
      if (cached) return cached as Promise<T>;
    }

    this.loadingStates.set(moduleName, true);
    const startTime = performance.now();

    try {
      const modulePromise = importFn();
      this.importCache.set(moduleName, modulePromise);
      const module = await modulePromise;
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'dynamic-import',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'network',
        tags: {
          module: moduleName,
          success: 'true',
        },
      });

      return module;
    } catch (error) {
      // Record error metric
      performanceMonitor.recordMetric({
        name: 'dynamic-import',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'network',
        tags: {
          module: moduleName,
          success: 'false',
          error: error instanceof Error ? error.message : 'unknown',
        },
      });

      throw error;
    } finally {
      this.loadingStates.set(moduleName, false);
    }
  }

  /**
   * Preload module for faster subsequent imports
   */
  static preload(importFn: () => Promise<unknown>, moduleName: string): void {
    if (this.importCache.has(moduleName) || this.loadingStates.get(moduleName)) {
      return;
    }

    // Use requestIdleCallback for low-priority preloading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.import(importFn, moduleName).catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      setTimeout(() => {
        this.import(importFn, moduleName).catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  }

  /**
   * Clear import cache
   */
  static clearCache(): void {
    this.importCache.clear();
    this.loadingStates.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    cachedModules: number;
    loadingModules: number;
    totalSize: number;
  } {
    return {
      cachedModules: this.importCache.size,
      loadingModules: Array.from(this.loadingStates.values()).filter(Boolean).length,
      totalSize: 0, // Would need actual size calculation
    };
  }
}

// Note: CodeSplitter was removed as it was not used in the codebase
// Next.js handles code splitting automatically through dynamic imports

// Note: TreeShakingAnalyzer was removed as it was not used in the codebase
// Modern bundlers like Webpack and Vite handle tree shaking automatically

// Bundle analyzer
class BundleAnalyzer {
  /**
   * Analyze current bundle performance
   */
  static async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    const startTime = performance.now();

    // Get performance entries for scripts
    const scriptEntries = performance.getEntriesByType('resource')
      .filter(entry => entry.name.endsWith('.js') || entry.name.endsWith('.mjs')) as PerformanceResourceTiming[];

    const chunks: ChunkInfo[] = scriptEntries.map(entry => ({
      name: this.extractChunkName(entry.name),
      size: entry.transferSize ?? 0,
      gzippedSize: entry.encodedBodySize ?? 0,
      modules: [], // Would need build tool integration
      isAsync: entry.name.includes('chunk'),
      isEntry: entry.name.includes('main') || entry.name.includes('index'),
    }));

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzippedSize = chunks.reduce((sum, chunk) => sum + chunk.gzippedSize, 0);

    const recommendations = this.generateRecommendations(chunks, totalSize);

    // Record analysis performance
    performanceMonitor.recordMetric({
      name: 'bundle-analysis',
      value: performance.now() - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'computation',
      tags: {
        totalSize: totalSize.toString(),
        chunkCount: chunks.length.toString(),
      },
    });

    return {
      totalSize,
      gzippedSize,
      chunks,
      dependencies: [], // Would need package.json analysis
      recommendations,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract chunk name from URL
   */
  private static extractChunkName(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(
    chunks: ChunkInfo[],
    totalSize: number
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Check total bundle size
    if (totalSize > BUNDLE_THRESHOLDS.critical) {
      recommendations.push({
        type: 'code-split',
        priority: 'high',
        description: 'Bundle size is critically large. Implement aggressive code splitting.',
        estimatedSavings: totalSize * 0.3,
        implementation: 'Use dynamic imports for routes and features',
      });
    } else if (totalSize > BUNDLE_THRESHOLDS.warning) {
      recommendations.push({
        type: 'code-split',
        priority: 'medium',
        description: 'Bundle size is large. Consider code splitting.',
        estimatedSavings: totalSize * 0.2,
        implementation: 'Split large components and vendor libraries',
      });
    }

    // Check individual chunk sizes
    const largeChunks = chunks.filter(chunk => chunk.size > BUNDLE_THRESHOLDS.chunkCritical);
    if (largeChunks.length > 0) {
      recommendations.push({
        type: 'code-split',
        priority: 'high',
        description: `${largeChunks.length} chunks are critically large`,
        estimatedSavings: largeChunks.reduce((sum, chunk) => sum + chunk.size * 0.4, 0),
        implementation: 'Split large chunks into smaller modules',
      });
    }

    // Check for synchronous chunks that could be lazy loaded
    const syncChunks = chunks.filter(chunk => !chunk.isAsync && !chunk.isEntry);
    if (syncChunks.length > 3) {
      recommendations.push({
        type: 'lazy-load',
        priority: 'medium',
        description: 'Many synchronous chunks could be lazy loaded',
        estimatedSavings: syncChunks.reduce((sum, chunk) => sum + chunk.size * 0.8, 0),
        implementation: 'Convert non-critical components to lazy loading',
      });
    }

    return recommendations;
  }

  /**
   * Monitor bundle performance in real-time
   */
  static startPerformanceMonitoring(): void {
    // Monitor script loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource' && 
            (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
          
          performanceMonitor.recordMetric({
            name: 'script-load-time',
            value: entry.duration,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'network',
            tags: {
              script: this.extractChunkName(entry.name),
              size: (entry as PerformanceResourceTiming).transferSize?.toString() || '0',
            },
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }
}

// Note: OptimizationUtils was removed as it was not used in the codebase
// Next.js handles resource optimization automatically

// Export main classes and utilities
export {
  DynamicImportManager,
  BundleAnalyzer,
  BUNDLE_THRESHOLDS,
};

// Auto-start bundle monitoring in development
if (process.env.NODE_ENV === 'development') {
  BundleAnalyzer.startPerformanceMonitoring();
}
