import { prisma, type Space, type CreateSpace } from '@/lib/db/prisma';

export class PrismaSpacesRepository {

  async getById(id: string): Promise<Space | null> {
    return prisma.spaces.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            created_at: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            platform: true,
            framework: true,
            created_at: true,
          },
        },
      },
    });
  }

  async getBySlug(slug: string): Promise<Space | null> {
    return prisma.spaces.findUnique({
      where: { slug },
    });
  }

  async getAll(): Promise<Space[]> {
    return prisma.spaces.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
    });
  }

  async create(data: CreateSpace): Promise<Space> {
    return prisma.spaces.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: data.settings as any ?? {},
      },
    });
  }

  async update(
    id: string,
    data: Partial<CreateSpace>
  ): Promise<Space> {
    return prisma.spaces.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: data.settings as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.spaces.delete({
      where: { id },
    });
  }

  async exists(slug: string): Promise<boolean> {
    const count = await prisma.spaces.count({
      where: { slug },
    });
    return count > 0;
  }

  // Space statistics
  async getStats(id: string) {
    const [space, userCount, projectCount] = await Promise.all([
      prisma.spaces.findUnique({
        where: { id },
      }),
      prisma.users.count({
        where: { space_id: id },
      }),
      prisma.projects.count({
        where: { space_id: id },
      }),
    ]);

    return {
      space,
      stats: {
        users: userCount,
        projects: projectCount,
      },
    };
  }
}

// Singleton instance
export const prismaSpacesRepository = new PrismaSpacesRepository();
