/**
 * Advanced Lazy Loading System
 * 
 * Intelligent component and resource lazy loading with performance optimization
 */

import React, { 
  Suspense, 
  lazy, 
  ComponentType, 
  ReactNode, 
  useEffect, 
  useState, 
  useRef,
  useMemo,
} from 'react';
import { performanceMonitor } from './monitor';

// Lazy loading configuration
export interface LazyLoadConfig {
  threshold: number; // Intersection threshold (0-1)
  rootMargin: string; // Root margin for intersection observer
  preload: boolean; // Whether to preload on hover/focus
  retryAttempts: number; // Number of retry attempts on failure
  retryDelay: number; // Delay between retry attempts (ms)
  timeout: number; // Timeout for loading (ms)
  fallback?: ReactNode; // Custom fallback component
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>; // Custom error boundary
}

const DEFAULT_CONFIG: LazyLoadConfig = {
  threshold: 0.1,
  rootMargin: '50px',
  preload: true,
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 10000,
};

// Loading states
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// Lazy component wrapper with advanced features
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  config: Partial<LazyLoadConfig> = {}
): ComponentType<React.ComponentProps<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create lazy component with retry logic
  const LazyComponent = lazy(() => {
    return retryImport(importFn, finalConfig.retryAttempts, finalConfig.retryDelay);
  });

  // Wrapper component with error boundary and performance tracking
  return function LazyWrapper(props: React.ComponentProps<T>) {
    const [error, setError] = useState<Error | null>(null);

    const retry = () => {
      setError(null);
      // Note: setLoadingState is not available in this simplified wrapper
    };

    // Custom error boundary
    if (error && finalConfig.errorBoundary) {
      const ErrorBoundary = finalConfig.errorBoundary;
      return <ErrorBoundary error={error} retry={retry} />;
    }

    // Default error display
    if (error) {
      return (
        <div className="lazy-load-error">
          <p>Failed to load component: {error.message}</p>
          <button onClick={retry}>Retry</button>
        </div>
      );
    }

    return (
      <Suspense 
        fallback={
          finalConfig.fallback || (
            <div className="lazy-load-spinner">
              <div className="spinner" />
              <span>Loading...</span>
            </div>
          )
        }
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

// Retry import with exponential backoff
async function retryImport<T>(
  importFn: () => Promise<T>,
  attempts: number,
  delay: number
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryImport(importFn, attempts - 1, delay * 2); // Exponential backoff
  }
}

// Intersection Observer based lazy loading hook
export function useIntersectionObserver(
  config: Partial<LazyLoadConfig> = {}
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect(); // Stop observing once intersected
        }
      },
      {
        threshold: finalConfig.threshold,
        rootMargin: finalConfig.rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [finalConfig.threshold, finalConfig.rootMargin]);

  return [ref, isIntersecting];
}

// Lazy image component with progressive loading
export interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  config?: Partial<LazyLoadConfig>;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function LazyImage({ 
  src, 
  alt, 
  placeholder, 
  className, 
  config = {},
  onLoad,
  onError,
}: LazyImageProps) {
  const [ref, isIntersecting] = useIntersectionObserver(config);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [imageSrc, setImageSrc] = useState<string>(placeholder || '');

  useEffect(() => {
    if (!isIntersecting) return;

    setLoadingState('loading');
    const img = new Image();
    
    const startTime = performance.now();
    
    img.onload = () => {
      const loadTime = performance.now() - startTime;
      setImageSrc(src);
      setLoadingState('loaded');
      onLoad?.();
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'lazy-image-load',
        value: loadTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'network',
        tags: { 
          src: src.substring(0, 50), // Truncate URL for privacy
          success: 'true',
        },
      });
    };
    
    img.onerror = () => {
      const loadTime = performance.now() - startTime;
      setLoadingState('error');
      const error = new Error(`Failed to load image: ${src}`);
      onError?.(error);
      
      // Record performance metric
      performanceMonitor.recordMetric({
        name: 'lazy-image-load',
        value: loadTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'network',
        tags: { 
          src: src.substring(0, 50),
          success: 'false',
        },
      });
    };
    
    img.src = src;
  }, [isIntersecting, src, onLoad, onError]);

  return (
    <div 
      ref={ref} 
      className={`lazy-image ${className || ''} ${loadingState}`}
    >
      {imageSrc && (
        <img 
          src={imageSrc} 
          alt={alt}
          className={loadingState === 'loaded' ? 'loaded' : 'loading'}
        />
      )}
      {loadingState === 'loading' && (
        <div className="lazy-image-spinner">
          <div className="spinner" />
        </div>
      )}
      {loadingState === 'error' && (
        <div className="lazy-image-error">
          <span>Failed to load image</span>
        </div>
      )}
    </div>
  );
}

// Lazy content component for any content
export interface LazyContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  config?: Partial<LazyLoadConfig>;
  className?: string;
}

export function LazyContent({ 
  children, 
  fallback, 
  config = {},
  className,
}: LazyContentProps) {
  const [ref, isIntersecting] = useIntersectionObserver(config);

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : (fallback || <div className="lazy-content-placeholder" />)}
    </div>
  );
}

// Preloader for critical resources
export class ResourcePreloader {
  private static preloadedResources = new Set<string>();
  
  static preloadComponent(importFn: () => Promise<unknown>): void {
    const key = importFn.toString();
    if (this.preloadedResources.has(key)) return;
    
    this.preloadedResources.add(key);
    
    // Preload with low priority
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  }
  
  static preloadImage(src: string): void {
    if (this.preloadedResources.has(src)) return;
    
    this.preloadedResources.add(src);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  }
  
  static preloadScript(src: string): void {
    if (this.preloadedResources.has(src)) return;
    
    this.preloadedResources.add(src);
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = src;
    document.head.appendChild(link);
  }
}

// Hook for preloading on hover/focus
export function usePreloadOnHover<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const preload = useMemo(() => {
    let preloaded = false;
    return () => {
      if (!preloaded) {
        preloaded = true;
        ResourcePreloader.preloadComponent(importFn);
      }
    };
  }, [importFn]);

  return {
    onMouseEnter: preload,
    onFocus: preload,
  };
}

// Bundle splitting utilities - commented out until components exist
// export const LazyComponents = {
//   // Common lazy-loaded components
//   Dashboard: createLazyComponent(() => import('@/components/Dashboard')),
//   Settings: createLazyComponent(() => import('@/components/Settings')),
//   Profile: createLazyComponent(() => import('@/components/Profile')),
//   Analytics: createLazyComponent(() => import('@/components/Analytics')),
//
//   // Heavy components with custom config
//   DataTable: createLazyComponent(
//     () => import('@/components/DataTable'),
//     {
//       preload: true,
//       retryAttempts: 5,
//       fallback: <div>Loading data table...</div>,
//     }
//   ),
//
//   Chart: createLazyComponent(
//     () => import('@/components/Chart'),
//     {
//       preload: false,
//       timeout: 15000, // Charts might take longer to load
//     }
//   ),
// };

export { DEFAULT_CONFIG as LAZY_LOAD_DEFAULT_CONFIG };
