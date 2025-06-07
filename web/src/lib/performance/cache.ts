/**
 * Advanced Caching System
 * 
 * Multi-layer caching with automatic invalidation and performance optimization
 */

import { JsonValue } from '@/lib/types/api';
import { performanceMonitor } from './monitor';

// Cache configuration types
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'lfu' | 'fifo'; // Eviction strategy
  persistent: boolean; // Whether to persist to localStorage
  compress: boolean; // Whether to compress large values
}

interface CacheEntry<T = JsonValue> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Approximate size in bytes
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

// Default cache configurations
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  api: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    strategy: 'lru',
    persistent: false,
    compress: true,
  },
  user: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 50,
    strategy: 'lru',
    persistent: true,
    compress: false,
  },
  static: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 200,
    strategy: 'lfu',
    persistent: true,
    compress: true,
  },
  session: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxSize: 20,
    strategy: 'lru',
    persistent: false,
    compress: false,
  },
};

// Advanced cache implementation
class AdvancedCache<T = JsonValue> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
  };
  private config: CacheConfig;
  private name: string;

  constructor(name: string, config?: Partial<CacheConfig>) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIGS.api, ...config };
    
    // Load from persistent storage if enabled
    if (this.config.persistent) {
      this.loadFromStorage();
    }

    // Setup cleanup interval
    this.setupCleanup();
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const startTime = performance.now();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateStats();
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    this.updateHitRate();

    // Record performance metric
    performanceMonitor.recordMetric({
      name: 'cache-get',
      value: performance.now() - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'memory',
      tags: { cache: this.name, result: 'hit' },
    });

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, customTtl?: number): void {
    const startTime = performance.now();
    
    const ttl = customTtl || this.config.ttl;
    const size = this.estimateSize(value);
    
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evictEntries();
    }

    // Compress large values if enabled
    if (this.config.compress && size > 1024) {
      entry.value = this.compressValue(value);
    }

    this.cache.set(key, entry);
    this.updateStats();

    // Persist to storage if enabled
    if (this.config.persistent) {
      this.saveToStorage();
    }

    // Record performance metric
    performanceMonitor.recordMetric({
      name: 'cache-set',
      value: performance.now() - startTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'memory',
      tags: { cache: this.name, size: size.toString() },
    });
  }

  /**
   * Check if cache has key
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateStats();
      if (this.config.persistent) {
        this.saveToStorage();
      }
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
    };
    
    if (this.config.persistent) {
      this.clearStorage();
    }
  }

  /**
   * Get or set value with factory function
   */
  async getOrSet<R extends T>(
    key: string,
    factory: () => Promise<R> | R,
    customTtl?: number
  ): Promise<R> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached as R;
    }

    const value = await factory();
    this.set(key, value, customTtl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache size information
   */
  getSizeInfo(): { entries: number; estimatedBytes: number; maxEntries: number } {
    return {
      entries: this.cache.size,
      estimatedBytes: this.stats.totalSize,
      maxEntries: this.config.maxSize,
    };
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    if (invalidated > 0) {
      this.updateStats();
      if (this.config.persistent) {
        this.saveToStorage();
      }
    }
    
    return invalidated;
  }

  /**
   * Warm up cache with data
   */
  warmUp(data: Record<string, T>): void {
    for (const [key, value] of Object.entries(data)) {
      this.set(key, value);
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict entries based on strategy
   */
  private evictEntries(): void {
    const entriesToEvict = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // Evict 10%
    
    switch (this.config.strategy) {
      case 'lru':
        this.evictLRU(entriesToEvict);
        break;
      case 'lfu':
        this.evictLFU(entriesToEvict);
        break;
      case 'fifo':
        this.evictFIFO(entriesToEvict);
        break;
    }
    
    this.stats.evictions += entriesToEvict;
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict least frequently used entries
   */
  private evictLFU(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Evict first in, first out entries
   */
  private evictFIFO(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count);
    
    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: T): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return JSON.stringify(value).length * 2; // Rough estimate
    }
  }

  /**
   * Compress value (simple implementation)
   */
  private compressValue(value: T): T {
    // In a real implementation, you might use a compression library
    // For now, we'll just return the value as-is
    return value;
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.evictions += cleaned;
      this.updateStats();
      
      if (this.config.persistent) {
        this.saveToStorage();
      }
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(`cache_${this.name}`);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [key, entry] of Object.entries(data)) {
          if (!this.isExpired(entry as CacheEntry<T>)) {
            this.cache.set(key, entry as CacheEntry<T>);
          }
        }
        this.updateStats();
      }
    } catch (error) {
      console.warn(`Failed to load cache ${this.name} from storage:`, error);
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Object.fromEntries(this.cache.entries());
      localStorage.setItem(`cache_${this.name}`, JSON.stringify(data));
    } catch (error) {
      console.warn(`Failed to save cache ${this.name} to storage:`, error);
    }
  }

  /**
   * Clear cache from localStorage
   */
  private clearStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(`cache_${this.name}`);
    } catch (error) {
      console.warn(`Failed to clear cache ${this.name} from storage:`, error);
    }
  }
}

// Cache manager for multiple cache instances
class CacheManager {
  private caches = new Map<string, AdvancedCache>();

  /**
   * Get or create cache instance
   */
  getCache<T extends JsonValue = JsonValue>(name: string, config?: Partial<CacheConfig>): AdvancedCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new AdvancedCache<T>(name, config) as AdvancedCache<JsonValue>);
    }
    return this.caches.get(name) as AdvancedCache<T>;
  }

  /**
   * Get all cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get total memory usage across all caches
   */
  getTotalMemoryUsage(): number {
    let total = 0;
    for (const cache of this.caches.values()) {
      total += cache.getSizeInfo().estimatedBytes;
    }
    return total;
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Convenience functions for common cache operations
export const apiCache = cacheManager.getCache('api', DEFAULT_CONFIGS.api);
export const userCache = cacheManager.getCache('user', DEFAULT_CONFIGS.user);
export const staticCache = cacheManager.getCache('static', DEFAULT_CONFIGS.static);
export const sessionCache = cacheManager.getCache('session', DEFAULT_CONFIGS.session);

// Cache decorator for methods
export function cached(
  cacheName: string,
  keyGenerator?: (...args: unknown[]) => string,
  ttl?: number
) {
  return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = cacheManager.getCache(cacheName);

    descriptor.value = async function (...args: unknown[]) {
      const key = keyGenerator
        ? keyGenerator(...args)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : `${(target as any)?.constructor?.name || 'unknown'}.${propertyKey}.${JSON.stringify(args)}`;

      return cache.getOrSet(key, () => originalMethod.apply(this, args), ttl);
    };

    return descriptor;
  };
}

export { AdvancedCache, CacheManager };
export type { CacheConfig, CacheEntry, CacheStats };
