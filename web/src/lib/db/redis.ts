import { createClient, RedisClientType } from 'redis';

// Singleton pattern for Redis connection
class RedisConnection {
  private static instance: RedisConnection;
  private readonly client: RedisClientType;
  private isConnected = false;

  private constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    // Handle events
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      console.log('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }
}

// Export singleton instance
export const redis = RedisConnection.getInstance();

// Cache utilities
export class Cache {
  private static readonly TTL = {
    SHORT: 60 * 5,      // 5 minutes
    MEDIUM: 60 * 30,    // 30 minutes
    LONG: 60 * 60 * 2,  // 2 hours
  };

  static async get<T>(key: string): Promise<T | null> {
    try {
      await redis.connect();
      const value = await redis.getClient().get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', { key, error });
      return null;
    }
  }

  static async set<T>(
    key: string,
    value: T,
    ttl: number = Cache.TTL.MEDIUM
  ): Promise<void> {
    try {
      await redis.connect();
      await redis.getClient().setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', { key, error });
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redis.connect();
      await redis.getClient().del(key);
    } catch (error) {
      console.error('Cache delete error:', { key, error });
    }
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      await redis.connect();
      const keys = await redis.getClient().keys(pattern);
      if (keys.length > 0) {
        await redis.getClient().del(keys);
      }
    } catch (error) {
      console.error('Cache invalidate pattern error:', { pattern, error });
    }
  }

  // Specific methods for caching
  static async getProjectStats(projectId: string): Promise<unknown> {
    return this.get(`project:stats:${projectId}`);
  }

  static async setProjectStats(projectId: string, stats: unknown): Promise<void> {
    return this.set(`project:stats:${projectId}`, stats, Cache.TTL.SHORT);
  }

  static async getIssues(cacheKey: string): Promise<unknown> {
    return this.get(`issues:${cacheKey}`);
  }

  static async setIssues(cacheKey: string, issues: unknown): Promise<void> {
    return this.set(`issues:${cacheKey}`, issues, Cache.TTL.SHORT);
  }

  static async invalidateProject(projectId: string): Promise<void> {
    await this.invalidatePattern(`project:*:${projectId}`);
    await this.invalidatePattern(`issues:*:${projectId}*`);
  }
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.connect();
    await redis.getClient().ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Utility functions
export function generateCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort((a, b) => a.localeCompare(b))
    .map(key => `${key}:${params[key]}`)
    .join('|');

  return `${prefix}:${sortedParams}`;
}
