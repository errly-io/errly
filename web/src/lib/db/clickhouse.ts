import { createClient, ClickHouseClient } from '@clickhouse/client';

// Singleton pattern for ClickHouse connection
class ClickHouseConnection {
  private static instance: ClickHouseConnection;
  private readonly client: ClickHouseClient;

  private constructor() {
    this.client = createClient({
      url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
      username: process.env.CLICKHOUSE_USER ?? 'errly',
      password: process.env.CLICKHOUSE_PASSWORD ?? 'errly_dev_password',
      database: process.env.CLICKHOUSE_DATABASE ?? 'errly_events',
      clickhouse_settings: {
        // Optimizations for analytical queries
        max_execution_time: 60,
        max_memory_usage: '4000000000', // 4GB
        use_uncompressed_cache: 1,
        compress: 1,
      },
      compression: {
        response: true,
        request: false,
      },
    });
  }

  public static getInstance(): ClickHouseConnection {
    if (!ClickHouseConnection.instance) {
      ClickHouseConnection.instance = new ClickHouseConnection();
    }
    return ClickHouseConnection.instance;
  }

  public getClient(): ClickHouseClient {
    return this.client;
  }

  public async query<T = unknown>(params: {
    query: string;
    query_params?: Record<string, unknown>;
    format?: 'JSON' | 'JSONEachRow' | 'CSV';
  }): Promise<T[]> {
    try {
      const { query, format = 'JSON' } = params;

      // Use direct HTTP requests instead of official client
      const url = process.env.CLICKHOUSE_URL ?? 'http://localhost:8123';
      const username = process.env.CLICKHOUSE_USER ?? 'errly';
      const password = process.env.CLICKHOUSE_PASSWORD ?? 'errly_dev_password';
      const database = process.env.CLICKHOUSE_DATABASE ?? 'errly_events';

      // Add FORMAT JSON if not present in query, but NOT for ALTER TABLE queries
      const trimmedQuery = query.trim();
      const isAlterQuery = trimmedQuery.toUpperCase().startsWith('ALTER');
      const finalQuery = (trimmedQuery.toUpperCase().includes('FORMAT') || isAlterQuery)
        ? query
        : `${trimmedQuery} FORMAT ${format}`;

      // Replace database name if not specified
      let queryWithDb = finalQuery;
      if (finalQuery.includes('FROM issues')) {
        queryWithDb = finalQuery.replace('FROM issues', `FROM ${database}.issues`);
      } else if (finalQuery.includes('FROM error_events')) {
        queryWithDb = finalQuery.replace('FROM error_events', `FROM ${database}.error_events`);
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Basic ${Buffer.from(username + ':' + password).toString('base64')}`,
        },
        body: queryWithDb,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ClickHouse HTTP error details:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          query: queryWithDb
        });
        throw new Error(`ClickHouse HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const text = await response.text();

      // For ALTER TABLE queries ClickHouse returns empty response
      if (query.trim().toUpperCase().startsWith('ALTER')) {
        return [];
      }

      // For SELECT queries parse JSON
      const data = JSON.parse(text);

      // ClickHouse returns data in format { data: [...] }
      return data.data ?? [];
    } catch (error) {
      console.error('ClickHouse query failed');
      throw error;
    }
  }

  public async insert<T>(params: {
    table: string;
    values: T[];
    format?: 'JSONEachRow' | 'CSV';
  }): Promise<void> {
    try {
      const { table, values, format = 'JSONEachRow' } = params;

      await this.client.insert({
        table: table,
        values: values,
        format: format,
      });
    } catch (error) {
      console.error('ClickHouse insert failed');
      throw error;
    }
  }

  public async close(): Promise<void> {
    await this.client.close();
  }
}

// Export class and singleton instance
export { ClickHouseConnection };
export const clickhouse = ClickHouseConnection.getInstance();

// Utility functions
export async function queryOne<T>(
  query: string,
  params?: Record<string, unknown>
): Promise<T | null> {
  const result = await clickhouse.query<T>({
    query,
    ...(params && { query_params: params })
  });
  return result[0] ?? null;
}

export async function queryMany<T>(
  query: string,
  params?: Record<string, unknown>
): Promise<T[]> {
  return clickhouse.query<T>({
    query,
    ...(params && { query_params: params })
  });
}

export async function queryCount(
  query: string,
  params?: Record<string, unknown>
): Promise<number> {
  const result = await clickhouse.query<{ count: number }>({
    query,
    ...(params && { query_params: params })
  });
  return result[0]?.count ?? 0;
}

// Batch insert helper
export async function batchInsert<T>(
  table: string,
  values: T[],
  batchSize = 1000
): Promise<void> {
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    await clickhouse.insert({ table, values: batch });
  }
}

// Health check
export async function checkClickHouseHealth(): Promise<boolean> {
  try {
    await clickhouse.query({ query: 'SELECT 1' });
    return true;
  } catch (error) {
    console.error('ClickHouse health check failed:', error);
    return false;
  }
}

// Time range helpers
export function getTimeRangeCondition(timeRange: string, table: 'error_events' | 'issues' = 'error_events'): string {
  const timeField = table === 'issues' ? 'last_seen' : 'timestamp';

  switch (timeRange) {
    case '1h':
      return `${timeField} >= now() - INTERVAL 1 HOUR`;
    case '24h':
      return `${timeField} >= now() - INTERVAL 24 HOUR`;
    case '7d':
      return `${timeField} >= now() - INTERVAL 7 DAY`;
    case '30d':
      return `${timeField} >= now() - INTERVAL 30 DAY`;
    default:
      return `${timeField} >= now() - INTERVAL 24 HOUR`;
  }
}

export function formatClickHouseDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}
