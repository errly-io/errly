/**
 * Performance Monitoring
 * 
 * Core Web Vitals tracking and performance monitoring utilities
 */

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

export interface PerformanceBudget {
  firstContentfulPaint: number; // ms
  largestContentfulPaint: number; // ms
  interactionToNextPaint: number; // ms (replaces FID)
  cumulativeLayoutShift: number; // score
  timeToFirstByte: number; // ms
  bundleSize: number; // bytes
}

// Default performance budgets
export const PERFORMANCE_BUDGETS: PerformanceBudget = {
  firstContentfulPaint: 1800,
  largestContentfulPaint: 2500,
  interactionToNextPaint: 200, // INP budget
  cumulativeLayoutShift: 0.1,
  timeToFirstByte: 600,
  bundleSize: 100 * 1024, // 100KB
};

// Performance metrics collection
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  const sendMetric = (metric: PerformanceMetric) => {
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      console.log('Performance metric:', metric);
    }
  };

  // Core Web Vitals
  onCLS((metric: Metric) => {
    sendMetric({
      name: 'CLS',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });

  onINP((metric: Metric) => {
    sendMetric({
      name: 'INP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });

  onFCP((metric: Metric) => {
    sendMetric({
      name: 'FCP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });

  onLCP((metric: Metric) => {
    sendMetric({
      name: 'LCP',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });

  onTTFB((metric: Metric) => {
    sendMetric({
      name: 'TTFB',
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
    });
  });
}

// Performance budget validation
export function validatePerformanceBudget(metrics: Record<string, number | undefined>): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (metrics.fcp !== undefined && metrics.fcp > PERFORMANCE_BUDGETS.firstContentfulPaint) {
    violations.push(`FCP exceeded budget: ${metrics.fcp}ms > ${PERFORMANCE_BUDGETS.firstContentfulPaint}ms`);
  }

  if (metrics.lcp !== undefined && metrics.lcp > PERFORMANCE_BUDGETS.largestContentfulPaint) {
    violations.push(`LCP exceeded budget: ${metrics.lcp}ms > ${PERFORMANCE_BUDGETS.largestContentfulPaint}ms`);
  }

  if (metrics.inp !== undefined && metrics.inp > PERFORMANCE_BUDGETS.interactionToNextPaint) {
    violations.push(`INP exceeded budget: ${metrics.inp}ms > ${PERFORMANCE_BUDGETS.interactionToNextPaint}ms`);
  }

  if (metrics.cls !== undefined && metrics.cls > PERFORMANCE_BUDGETS.cumulativeLayoutShift) {
    violations.push(`CLS exceeded budget: ${metrics.cls} > ${PERFORMANCE_BUDGETS.cumulativeLayoutShift}`);
  }

  if (metrics.ttfb !== undefined && metrics.ttfb > PERFORMANCE_BUDGETS.timeToFirstByte) {
    violations.push(`TTFB exceeded budget: ${metrics.ttfb}ms > ${PERFORMANCE_BUDGETS.timeToFirstByte}ms`);
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// Resource timing analysis
export function analyzeResourceTiming() {
  if (typeof window === 'undefined') return null;

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  const analysis = {
    totalResources: entries.length,
    totalSize: 0,
    slowestResources: [] as Array<{ name: string; duration: number; size: number }>,
    resourceTypes: {} as Record<string, number>,
  };

  entries.forEach((entry) => {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;
    
    analysis.totalSize += size;
    
    // Track resource types
    const type = getResourceType(entry.name);
    analysis.resourceTypes[type] = (analysis.resourceTypes[type] || 0) + 1;
    
    // Track slowest resources
    if (duration > 100) { // Resources taking more than 100ms
      analysis.slowestResources.push({
        name: entry.name,
        duration,
        size,
      });
    }
  });

  // Sort slowest resources by duration
  analysis.slowestResources.sort((a, b) => b.duration - a.duration);
  analysis.slowestResources = analysis.slowestResources.slice(0, 10); // Top 10

  return analysis;
}

function getResourceType(url: string): string {
  if (url.includes('.js')) return 'javascript';
  if (url.includes('.css')) return 'stylesheet';
  if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'image';
  if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
  return 'other';
}

// Memory usage monitoring
export function getMemoryUsage() {
  if (typeof window === 'undefined' || !('memory' in performance)) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
  };
}
