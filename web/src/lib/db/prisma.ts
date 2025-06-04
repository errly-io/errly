import { PrismaClient } from '../../../generated/prisma';

// Singleton pattern for Prisma Client
class PrismaConnection {
  private static instance: PrismaConnection;
  private client: PrismaClient;

  private constructor() {
    this.client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await this.client.$disconnect();
    });
  }

  public static getInstance(): PrismaConnection {
    if (!PrismaConnection.instance) {
      PrismaConnection.instance = new PrismaConnection();
    }
    return PrismaConnection.instance;
  }

  public getClient(): PrismaClient {
    return this.client;
  }

  public async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  public async connect(): Promise<void> {
    await this.client.$connect();
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Prisma health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const prismaConnection = PrismaConnection.getInstance();
export const prisma = prismaConnection.getClient();

// Utility functions for working with transactions
export async function withTransaction<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(callback);
}

// Types from Prisma for export
export type {
  spaces as Space,
  users as User,
  projects as Project,
  api_keys as ApiKey,
  user_sessions as UserSession,
} from '../../../generated/prisma';

// Utility types for creating records
export type CreateSpace = {
  name: string;
  slug: string;
  description?: string;
  settings?: any;
};

export type CreateUser = {
  email: string;
  name: string;
  avatar_url?: string;
  password_hash?: string;
  space_id: string;
  role?: string;
  settings?: any;
};

export type CreateProject = {
  name: string;
  slug: string;
  space_id: string;
  platform: string;
  framework?: string;
  description?: string;
  settings?: any;
};

export type CreateApiKey = {
  name: string;
  key_hash: string;
  key_prefix: string;
  project_id: string;
  scopes: string[];
  expires_at?: Date;
};
