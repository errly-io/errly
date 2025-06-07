'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance/monitoring';

/**
 * Performance Monitor Component
 * 
 * Initializes Core Web Vitals tracking and performance monitoring
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring only in production
    if (process.env.NODE_ENV === 'production') {
      initPerformanceMonitoring();
    }
  }, []);

  // This component doesn't render anything
  return null;
}
