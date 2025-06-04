declare namespace NodeJS {
  interface ProcessEnv {
    AUTH_GOOGLE_ID?: string;
    AUTH_GOOGLE_SECRET?: string;
    AUTH_SECRET?: string;
    NEXTAUTH_URL?: string;
    NEXTAUTH_SECRET?: string;
    DATABASE_URL?: string;
    CLICKHOUSE_URL?: string;
    CLICKHOUSE_USERNAME?: string;
    CLICKHOUSE_PASSWORD?: string;
    REDIS_URL?: string;
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
