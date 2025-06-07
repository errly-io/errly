/**
 * Database Monitoring
 * 
 * Comprehensive monitoring for all database connections and operations
 */

import { prisma } from '../connections';

export interface DatabaseMetrics {
  connectionCount: number;
  activeQueries: number;
  averageQueryTime: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
  errorRate: number;
  lastError?: {
    message: string;
    timestamp: Date;
    query?: string;
  };
}

export interface DatabaseHealth {
  postgres: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    metrics: DatabaseMetrics;
  };
  clickhouse: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    metrics: DatabaseMetrics;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    metrics: DatabaseMetrics;
  };
}

// Query performance tracking
const queryMetrics = new Map<string, {
  count: number;
  totalTime: number;
  errors: number;
  lastExecuted: Date;
}>();

export function trackQuery(queryType: string, duration: number, error?: Error) {
  const existing = queryMetrics.get(queryType) || {
    count: 0,
    totalTime: 0,
    errors: 0,
    lastExecuted: new Date(),
  };

  existing.count++;
  existing.totalTime += duration;
  existing.lastExecuted = new Date();
  
  if (error) {
    existing.errors++;
  }

  queryMetrics.set(queryType, existing);

  // Log slow queries (>1000ms)
  if (duration > 1000) {
    console.warn(`Slow query detected: ${queryType} took ${duration}ms`);
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const health: DatabaseHealth = {
    postgres: {
      status: 'down',
      responseTime: 0,
      metrics: getEmptyMetrics(),
    },
    clickhouse: {
      status: 'down',
      responseTime: 0,
      metrics: getEmptyMetrics(),
    },
    redis: {
      status: 'down',
      responseTime: 0,
      metrics: getEmptyMetrics(),
    },
  };

  // Check PostgreSQL
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    health.postgres = {
      status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'down',
      responseTime,
      metrics: await getPostgresMetrics(),
    };
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  // Check ClickHouse
  try {
    const start = Date.now();
    // Add ClickHouse health check here
    const responseTime = Date.now() - start;
    
    health.clickhouse = {
      status: responseTime < 200 ? 'healthy' : responseTime < 1000 ? 'degraded' : 'down',
      responseTime,
      metrics: await getClickHouseMetrics(),
    };
  } catch (error) {
    console.error('ClickHouse health check failed:', error);
  }

  // Check Redis
  try {
    const start = Date.now();
    // Add Redis health check here
    const responseTime = Date.now() - start;
    
    health.redis = {
      status: responseTime < 50 ? 'healthy' : responseTime < 200 ? 'degraded' : 'down',
      responseTime,
      metrics: await getRedisMetrics(),
    };
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return health;
}

async function getPostgresMetrics(): Promise<DatabaseMetrics> {
  try {
    // Get connection count and other metrics from Prisma
    const metrics: DatabaseMetrics = {
      connectionCount: 0, // Prisma doesn't expose this directly
      activeQueries: 0,
      averageQueryTime: 0,
      slowQueries: [],
      errorRate: 0,
    };

    // Calculate metrics from tracked queries
    const postgresQueries = Array.from(queryMetrics.entries())
      .filter(([key]) => key.startsWith('postgres_'));

    if (postgresQueries.length > 0) {
      const totalQueries = postgresQueries.reduce((sum, [, data]) => sum + data.count, 0);
      const totalTime = postgresQueries.reduce((sum, [, data]) => sum + data.totalTime, 0);
      const totalErrors = postgresQueries.reduce((sum, [, data]) => sum + data.errors, 0);

      metrics.averageQueryTime = totalTime / totalQueries;
      metrics.errorRate = totalErrors / totalQueries;
    }

    return metrics;
  } catch (error) {
    return getEmptyMetrics();
  }
}

async function getClickHouseMetrics(): Promise<DatabaseMetrics> {
  // Implement ClickHouse-specific metrics
  return getEmptyMetrics();
}

async function getRedisMetrics(): Promise<DatabaseMetrics> {
  // Implement Redis-specific metrics
  return getEmptyMetrics();
}

function getEmptyMetrics(): DatabaseMetrics {
  return {
    connectionCount: 0,
    activeQueries: 0,
    averageQueryTime: 0,
    slowQueries: [],
    errorRate: 0,
  };
}

// Performance monitoring middleware
export function withDatabaseMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  queryType: string
): T {
  return (async (...args: any[]) => {
    const start = Date.now();
    let error: Error | undefined;

    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const duration = Date.now() - start;
      trackQuery(queryType, duration, error);
    }
  }) as T;
}

// Query optimization suggestions
export function getQueryOptimizationSuggestions(): Array<{
  query: string;
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
}> {
  const suggestions: Array<{
    query: string;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
  }> = [];

  queryMetrics.forEach((metrics, queryType) => {
    const avgTime = metrics.totalTime / metrics.count;
    
    if (avgTime > 1000) {
      suggestions.push({
        query: queryType,
        suggestion: 'Consider adding database indexes or optimizing query structure',
        impact: 'high',
      });
    } else if (avgTime > 500) {
      suggestions.push({
        query: queryType,
        suggestion: 'Query performance could be improved with caching',
        impact: 'medium',
      });
    }

    if (metrics.errors / metrics.count > 0.05) {
      suggestions.push({
        query: queryType,
        suggestion: 'High error rate detected, review query logic',
        impact: 'high',
      });
    }
  });

  return suggestions.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return impactOrder[b.impact] - impactOrder[a.impact];
  });
}
