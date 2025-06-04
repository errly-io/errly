import { prisma, type ApiKey, type CreateApiKey } from '@/lib/db/prisma';

export class PrismaApiKeysRepository {

  async getById(id: string): Promise<ApiKey | null> {
    return prisma.api_keys.findUnique({
      where: { id },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            space_id: true,
          },
        },
      },
    });
  }

  async getByHash(keyHash: string): Promise<ApiKey | null> {
    return prisma.api_keys.findUnique({
      where: { key_hash: keyHash },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            space_id: true,
          },
        },
      },
    });
  }

  async getByPrefix(keyPrefix: string): Promise<ApiKey | null> {
    return prisma.api_keys.findFirst({
      where: { key_prefix: keyPrefix },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            space_id: true,
          },
        },
      },
    });
  }

  async getByProject(projectId: string): Promise<ApiKey[]> {
    return prisma.api_keys.findMany({
      where: { project_id: projectId },
      orderBy: { created_at: 'desc' },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            space_id: true,
          },
        },
      },
    });
  }

  async create(data: CreateApiKey): Promise<ApiKey> {
    return prisma.api_keys.create({
      data: {
        name: data.name,
        key_hash: data.key_hash,
        key_prefix: data.key_prefix,
        project_id: data.project_id,
        scopes: data.scopes,
        expires_at: data.expires_at || null,
      },
      include: {
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            space_id: true,
          },
        },
      },
    });
  }

  async updateLastUsed(id: string): Promise<void> {
    await prisma.api_keys.update({
      where: { id },
      data: {
        last_used_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.api_keys.delete({
      where: { id },
    });
  }

  async exists(keyHash: string): Promise<boolean> {
    const count = await prisma.api_keys.count({
      where: { key_hash: keyHash },
    });
    return count > 0;
  }

  // Get active keys (not expired)
  async getActiveByProject(projectId: string): Promise<ApiKey[]> {
    return prisma.api_keys.findMany({
      where: {
        project_id: projectId,
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Get expired keys
  async getExpiredByProject(projectId: string): Promise<ApiKey[]> {
    return prisma.api_keys.findMany({
      where: {
        project_id: projectId,
        expires_at: { lt: new Date() },
      },
      orderBy: { expires_at: 'desc' },
    });
  }

  // Check key access rights
  async hasScope(keyHash: string, scope: string): Promise<boolean> {
    const apiKey = await prisma.api_keys.findUnique({
      where: { key_hash: keyHash },
      select: { scopes: true },
    });

    return apiKey?.scopes.includes(scope) || false;
  }
}

// Singleton instance
export const prismaApiKeysRepository = new PrismaApiKeysRepository();
