/**
 * Performance Monitoring System
 * 
 * Comprehensive performance tracking and optimization utilities
 */

// Extended performance interfaces
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

interface WindowWithGC extends Window {
  gc?: () => void;
}

// Performance metrics types
interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  category: 'render' | 'network' | 'memory' | 'computation' | 'database';
  tags?: Record<string, string>;
}

interface PerformanceThresholds {
  warning: number;
  critical: number;
  unit: string;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  summary: {
    totalTime: number;
    slowestOperation: string;
    memoryUsage: number;
    recommendations: string[];
  };
  timestamp: number;
}

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  // Thresholds for different operations
  thresholds: {
    apiRequest: { warning: 1000, critical: 3000, unit: 'ms' },
    databaseQuery: { warning: 500, critical: 2000, unit: 'ms' },
    componentRender: { warning: 16, critical: 100, unit: 'ms' },
    bundleSize: { warning: 1024 * 1024, critical: 5 * 1024 * 1024, unit: 'bytes' },
    memoryUsage: { warning: 50 * 1024 * 1024, critical: 100 * 1024 * 1024, unit: 'bytes' },
  },
  
  // Sampling configuration
  sampling: {
    enabled: true,
    rate: 0.1, // 10% sampling in production
    maxMetrics: 1000, // Maximum metrics to store
  },
  
  // Auto-optimization settings
  autoOptimization: {
    enabled: true,
    lazyLoadThreshold: 100, // ms
    cacheThreshold: 50, // ms
    preloadThreshold: 200, // ms
  },
} as const;

// Performance monitor class
class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled = true;

  constructor() {
    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: entry.name,
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'network',
              tags: { type: entry.entryType },
            });
          }
        });
        
        navObserver.observe({ entryTypes: ['navigation', 'resource'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Failed to initialize navigation observer:', error);
      }

      // Long task observer
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric({
              name: 'long-task',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'computation',
              tags: { 
                type: 'long-task',
                startTime: entry.startTime.toString(),
              },
            });
          }
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Failed to initialize long task observer:', error);
      }
    }

    // Memory usage monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as PerformanceWithMemory).memory;
      if (memory) {
        this.recordMetric({
          name: 'memory-usage',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          category: 'memory',
          tags: {
            total: memory.totalJSHeapSize.toString(),
            limit: memory.jsHeapSizeLimit.toString(),
          },
        });
      }
    };

    // Check memory every 30 seconds
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    // Apply sampling in production
    if (process.env.NODE_ENV === 'production' && PERFORMANCE_CONFIG.sampling.enabled) {
      if (Math.random() > PERFORMANCE_CONFIG.sampling.rate) return;
    }

    this.metrics.push(metric);

    // Limit metrics array size
    if (this.metrics.length > PERFORMANCE_CONFIG.sampling.maxMetrics) {
      this.metrics = this.metrics.slice(-PERFORMANCE_CONFIG.sampling.maxMetrics / 2);
    }

    // Check thresholds and trigger optimizations
    this.checkThresholds(metric);
  }

  /**
   * Check performance thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.getThresholdForMetric(metric.name);
    if (!threshold) return;

    if (metric.value > threshold.critical) {
      this.triggerOptimization(metric, 'critical');
    } else if (metric.value > threshold.warning) {
      this.triggerOptimization(metric, 'warning');
    }
  }

  /**
   * Get threshold for a specific metric
   */
  private getThresholdForMetric(metricName: string): PerformanceThresholds | null {
    // Map metric names to threshold categories
    const thresholdMap: Record<string, keyof typeof PERFORMANCE_CONFIG.thresholds> = {
      'api-request': 'apiRequest',
      'database-query': 'databaseQuery',
      'component-render': 'componentRender',
      'bundle-size': 'bundleSize',
      'memory-usage': 'memoryUsage',
    };

    const category = thresholdMap[metricName];
    return category ? PERFORMANCE_CONFIG.thresholds[category] : null;
  }

  /**
   * Trigger performance optimization
   */
  private triggerOptimization(metric: PerformanceMetric, level: 'warning' | 'critical'): void {
    if (!PERFORMANCE_CONFIG.autoOptimization.enabled) return;

    console.warn(`Performance ${level}: ${metric.name} took ${metric.value}${metric.unit}`);

    // Trigger specific optimizations based on metric type
    switch (metric.category) {
      case 'network':
        this.optimizeNetworkRequests();
        break;
      case 'render':
        this.optimizeRendering();
        break;
      case 'memory':
        this.optimizeMemoryUsage();
        break;
      case 'computation':
        this.optimizeComputation();
        break;
    }
  }

  /**
   * Optimize network requests
   */
  private optimizeNetworkRequests(): void {
    // Enable request caching
    if ('caches' in window) {
      // Implementation would go here
      console.log('Enabling aggressive caching for slow requests');
    }
  }

  /**
   * Optimize rendering performance
   */
  private optimizeRendering(): void {
    // Suggest component optimizations
    console.log('Consider using React.memo() or useMemo() for expensive components');
  }

  /**
   * Optimize memory usage
   */
  private optimizeMemoryUsage(): void {
    // Trigger garbage collection if available
    const windowWithGC = window as WindowWithGC;
    if ('gc' in window && typeof windowWithGC.gc === 'function') {
      windowWithGC.gc();
    }
    
    // Clear old metrics
    this.metrics = this.metrics.slice(-100);
  }

  /**
   * Optimize computation performance
   */
  private optimizeComputation(): void {
    console.log('Long task detected - consider using Web Workers for heavy computation');
  }

  /**
   * Measure function execution time
   */
  measureFunction<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'computation'
  ): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    this.recordMetric({
      name,
      value: endTime - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category,
    });

    return result;
  }

  /**
   * Measure async function execution time
   */
  async measureAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'computation'
  ): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    this.recordMetric({
      name,
      value: endTime - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category,
    });

    return result;
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp < 300000); // Last 5 minutes

    const totalTime = recentMetrics.reduce((sum, m) => sum + m.value, 0);
    const slowestOperation = recentMetrics.reduce((slowest, current) => 
      current.value > slowest.value ? current : slowest, 
      recentMetrics[0] || { name: 'none', value: 0 }
    );

    const memoryMetrics = recentMetrics.filter(m => m.category === 'memory');
    const avgMemoryUsage = memoryMetrics.length > 0 
      ? memoryMetrics.reduce((sum, m) => sum + m.value, 0) / memoryMetrics.length 
      : 0;

    const recommendations = this.generateRecommendations(recentMetrics);

    return {
      metrics: recentMetrics,
      summary: {
        totalTime,
        slowestOperation: slowestOperation.name,
        memoryUsage: avgMemoryUsage,
        recommendations,
      },
      timestamp: now,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];

    // Check for slow API requests
    const slowApiRequests = metrics.filter(m => 
      m.category === 'network' && m.value > PERFORMANCE_CONFIG.thresholds.apiRequest.warning
    );
    if (slowApiRequests.length > 0) {
      recommendations.push('Consider implementing request caching or optimizing API endpoints');
    }

    // Check for memory issues
    const highMemoryUsage = metrics.filter(m => 
      m.category === 'memory' && m.value > PERFORMANCE_CONFIG.thresholds.memoryUsage.warning
    );
    if (highMemoryUsage.length > 0) {
      recommendations.push('High memory usage detected - consider implementing lazy loading');
    }

    // Check for long tasks
    const longTasks = metrics.filter(m => 
      m.name === 'long-task' && m.value > 50
    );
    if (longTasks.length > 0) {
      recommendations.push('Long tasks detected - consider using Web Workers for heavy computation');
    }

    // Check for slow renders
    const slowRenders = metrics.filter(m => 
      m.category === 'render' && m.value > PERFORMANCE_CONFIG.thresholds.componentRender.warning
    );
    if (slowRenders.length > 0) {
      recommendations.push('Slow component renders detected - consider using React.memo() or optimization');
    }

    return recommendations;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance measurement decorators and utilities
export function measurePerformance(
  name: string,
  category: PerformanceMetric['category'] = 'computation'
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      return performanceMonitor.measureFunction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${(target as any)?.constructor?.name || 'unknown'}.${propertyKey}`,
        () => originalMethod.apply(this, args),
        category
      );
    };

    return descriptor;
  };
}

export function measureAsyncPerformance(
  name: string,
  category: PerformanceMetric['category'] = 'computation'
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      return performanceMonitor.measureAsyncFunction(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${(target as any)?.constructor?.name || 'unknown'}.${propertyKey}`,
        () => originalMethod.apply(this, args),
        category
      );
    };

    return descriptor;
  };
}

// Export types and utilities
export { PERFORMANCE_CONFIG };
export type { PerformanceMetric, PerformanceThresholds, PerformanceReport };
