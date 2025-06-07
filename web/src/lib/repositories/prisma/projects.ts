import { prisma, type Project, type CreateProject } from '@/lib/db/prisma';

export class PrismaProjectsRepository {

  async getById(id: string): Promise<Project | null> {
    return prisma.projects.findUnique({
      where: { id },
      include: {
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        api_keys: {
          select: {
            id: true,
            name: true,
            key_prefix: true,
            scopes: true,
            last_used_at: true,
            created_at: true,
            expires_at: true,
          },
        },
      },
    });
  }

  async getBySlug(spaceId: string, slug: string): Promise<Project | null> {
    return prisma.projects.findFirst({
      where: {
        space_id: spaceId,
        slug,
      },
      include: {
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async getBySpace(spaceId: string): Promise<Project[]> {
    return prisma.projects.findMany({
      where: { space_id: spaceId },
      orderBy: { created_at: 'desc' },
      include: {
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            api_keys: true,
          },
        },
      },
    });
  }

  // Legacy alias for backward compatibility
  async getByOrganization(organizationId: string): Promise<Project[]> {
    return this.getBySpace(organizationId);
  }

  async create(data: CreateProject): Promise<Project> {
    return prisma.projects.create({
      data: {
        name: data.name,
        slug: data.slug,
        space_id: data.space_id,
        platform: data.platform,
        framework: data.framework || null,
        description: data.description || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: data.settings as any || {},
      },
      include: {
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<CreateProject>
  ): Promise<Project> {
    return prisma.projects.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: data.settings as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      include: {
        spaces: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.projects.delete({
      where: { id },
    });
  }

  async exists(spaceId: string, slug: string): Promise<boolean> {
    const count = await prisma.projects.count({
      where: {
        space_id: spaceId,
        slug,
      },
    });
    return count > 0;
  }

  // Get projects with API key count
  async getWithApiKeyCount(spaceId: string) {
    return prisma.projects.findMany({
      where: { space_id: spaceId },
      include: {
        _count: {
          select: {
            api_keys: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

// Singleton instance
export const prismaProjectsRepository = new PrismaProjectsRepository();
