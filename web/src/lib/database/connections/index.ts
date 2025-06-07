/**
 * Database Connection Management
 * 
 * Centralized database connection management for all database types
 */

import { prisma } from '../../db/prisma';
import { clickhouse } from '../../db/clickhouse';
import { redis } from '../../db/redis';

export { prisma, prismaConnection, withTransaction } from '../../db/prisma';
export { ClickHouseConnection, clickhouse } from '../../db/clickhouse';
export { redis, Cache } from '../../db/redis';
export { PostgresConnection, postgres } from '../../db/postgres';

// Connection health checks
export async function checkDatabaseHealth() {
  const results = {
    postgres: false,
    clickhouse: false,
    redis: false,
  };

  try {
    // Check PostgreSQL via Prisma
    await prisma.$queryRaw`SELECT 1`;
    results.postgres = true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
  }

  try {
    // Check ClickHouse
    await clickhouse.query({ query: 'SELECT 1' });
    results.clickhouse = true;
  } catch (error) {
    console.error('ClickHouse health check failed:', error);
  }

  try {
    // Check Redis
    await redis.connect();
    await redis.getClient().ping();
    results.redis = true;
  } catch (error) {
    console.error('Redis health check failed:', error);
  }

  return results;
}

// Connection pool monitoring
export function getConnectionStats() {
  return {
    postgres: {
      // Prisma doesn't expose pool stats directly
      status: 'connected',
    },
    clickhouse: {
      status: 'connected',
    },
    redis: {
      status: 'connected',
    },
  };
}
