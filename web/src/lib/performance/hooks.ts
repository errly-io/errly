/**
 * Performance-Optimized React Hooks
 * 
 * Collection of hooks designed for optimal performance and memory usage
 */

import { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  DependencyList,
  EffectCallback,
} from 'react';
import { performanceMonitor } from './monitor';
import { apiCache } from './cache';
import { JsonValue } from '@/lib/types/api';

// Performance memory interface
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Extended performance interface
interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

// Extended window interface
interface ExtendedWindow extends Window {
  gc?: () => void;
}

// Debounced value hook with performance tracking
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'debounce-update',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'computation',
        tags: { delay: delay.toString() },
      });
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttled callback hook
export function useThrottle<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun.current >= delay) {
      lastRun.current = now;
      return callback(...args);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        callback(...args);
      }, delay - (now - lastRun.current));
    }
  }, [callback, delay]) as T;
}

// Memoized async operation hook with caching
export function useAsyncMemo<T>(
  asyncFn: () => Promise<T>,
  deps: DependencyList,
  cacheKey?: string
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const depsKey = JSON.stringify(deps);

  const fetchData = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const startTime = performance.now();

    try {
      // Check cache first if cache key is provided
      if (cacheKey) {
        const cached = apiCache.get(cacheKey);
        if (cached) {
          setData(cached as T);
          setLoading(false);
          return;
        }
      }

      const result = await asyncFn();

      if (!abortControllerRef.current.signal.aborted) {
        setData(result);

        // Cache result if cache key is provided
        if (cacheKey) {
          apiCache.set(cacheKey, result as JsonValue);
        }

        // Record performance metric
        performanceMonitor.recordMetric({
          name: 'async-memo',
          value: performance.now() - startTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'computation',
          tags: {
            cached: cacheKey ? 'false' : 'n/a',
            success: 'true',
          },
        });
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // Record performance metric
        performanceMonitor.recordMetric({
          name: 'async-memo',
          value: performance.now() - startTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'computation',
          tags: {
            cached: 'false',
            success: 'false',
            error: error.message,
          },
        });
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [asyncFn, cacheKey]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, depsKey]);

  const refetch = useCallback(() => {
    if (cacheKey) {
      apiCache.delete(cacheKey);
    }
    fetchData();
  }, [fetchData, cacheKey]);

  return { data, loading, error, refetch };
}

// Optimized effect hook that only runs when dependencies actually change
export function useDeepEffect(effect: EffectCallback, deps: DependencyList): void {
  const prevDepsRef = useRef<DependencyList | undefined>(undefined);
  const depsString = JSON.stringify(deps);

  useEffect(() => {
    const prevDepsString = JSON.stringify(prevDepsRef.current);

    if (prevDepsString !== depsString) {
      prevDepsRef.current = deps;
      return effect();
    }
  }, [effect, depsString, deps]);
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, 16); // ~60fps

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange,
  };
}

// Intersection observer hook for performance monitoring
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      
      // Record visibility metric
      performanceMonitor.recordMetric({
        name: 'element-visibility',
        value: entry.intersectionRatio,
        unit: 'percentage',
        timestamp: Date.now(),
        category: 'render',
        tags: { 
          visible: entry.isIntersecting.toString(),
          ratio: entry.intersectionRatio.toString(),
        },
      });
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

// Performance-aware state hook
export function usePerformantState<T>(
  initialValue: T,
  name?: string
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const updateCountRef = useRef(0);

  const setPerformantState = useCallback((value: T | ((prev: T) => T)) => {
    const startTime = performance.now();
    
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      updateCountRef.current++;
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'state-update',
        value: performance.now() - startTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'render',
        tags: { 
          stateName: name || 'unknown',
          updateCount: updateCountRef.current.toString(),
        },
      });
      
      return newValue;
    });
  }, [name]);

  return [state, setPerformantState];
}

// Optimized event handler hook
export function useOptimizedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef<DependencyList>(deps);

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
    depsRef.current = deps;
  });

  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}

// Memory usage monitoring hook
export function useMemoryMonitor(): {
  memoryUsage: number;
  isHighUsage: boolean;
  cleanup: () => void;
} {
  const [memoryUsage, setMemoryUsage] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as ExtendedPerformance).memory;
        if (memory) {
          const usage = memory.usedJSHeapSize;
          setMemoryUsage(usage);

          // Record memory metric
          performanceMonitor.recordMetric({
            name: 'memory-usage',
            value: usage,
            unit: 'bytes',
            timestamp: Date.now(),
            category: 'memory',
          });
        }
      }
    };

    checkMemory();
    intervalRef.current = setInterval(checkMemory, 5000); // Check every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const isHighUsage = memoryUsage > 50 * 1024 * 1024; // 50MB threshold

  const cleanup = useCallback(() => {
    // Force garbage collection if available
    const extendedWindow = window as ExtendedWindow;
    if ('gc' in extendedWindow && typeof extendedWindow.gc === 'function') {
      extendedWindow.gc();
    }
    
    // Clear caches
    apiCache.clear();
  }, []);

  return { memoryUsage, isHighUsage, cleanup };
}

// Batch state updates hook
export function useBatchedState<T extends Record<string, unknown>>(
  initialState: T
): [T, (updates: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdatesRef = useRef<Partial<T>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setState(prevState => ({ ...prevState, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
    }, 0); // Batch in next tick
  }, []);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (Object.keys(pendingUpdatesRef.current).length > 0) {
      setState(prevState => ({ ...prevState, ...pendingUpdatesRef.current }));
      pendingUpdatesRef.current = {};
    }
  }, []);

  return [state, batchUpdate, flushUpdates];
}

// All hooks are already exported above
