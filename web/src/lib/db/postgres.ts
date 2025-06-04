import { Pool, PoolClient } from 'pg';

// Singleton pattern for PostgreSQL connection
class PostgresConnection {
  private static instance: PostgresConnection;
  private readonly pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): PostgresConnection {
    if (!PostgresConnection.instance) {
      PostgresConnection.instance = new PostgresConnection();
    }
    return PostgresConnection.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async query(text: string, params?: any[]) {
    try {
      const res = await this.pool.query(text, params);
      return res;
    } catch (error) {
      // Log error for debugging but without sensitive query details
      console.error('Database query failed');
      throw error;
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const postgres = PostgresConnection.getInstance();

// Utility functions
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return postgres.transaction(callback);
}

// Typed query helpers
export async function queryOne<T>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await postgres.query(text, params);
  return result.rows[0] ?? null;
}

export async function queryMany<T>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await postgres.query(text, params);
  return result.rows;
}

export async function queryExists(
  text: string,
  params?: any[]
): Promise<boolean> {
  const result = await postgres.query(text, params);
  return (result.rowCount ?? 0) > 0;
}

// Health check
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    await postgres.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('PostgreSQL health check failed:', error);
    return false;
  }
}
