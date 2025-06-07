import { prisma, type User, type CreateUser } from '@/lib/db/prisma';

export class PrismaUsersRepository {

  async getById(id: string): Promise<User | null> {
    return prisma.users.findUnique({
      where: { id },
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

  async getByEmail(email: string): Promise<User | null> {
    return prisma.users.findUnique({
      where: { email },
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

  async getBySpace(spaceId: string): Promise<User[]> {
    return prisma.users.findMany({
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
      },
    });
  }

  async create(data: CreateUser): Promise<User> {
    return prisma.users.create({
      data: {
        email: data.email,
        name: data.name,
        avatar_url: data.avatar_url ?? null,
        password_hash: data.password_hash ?? null,
        space_id: data.space_id,
        role: data.role ?? 'member',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: data.settings as any ?? {},
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
    data: Partial<CreateUser>
  ): Promise<User> {
    return prisma.users.update({
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
    await prisma.users.delete({
      where: { id },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.users.update({
      where: { id },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
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

  async exists(email: string): Promise<boolean> {
    const count = await prisma.users.count({
      where: { email },
    });
    return count > 0;
  }

  // Update user role
  async updateRole(id: string, role: string): Promise<User> {
    return prisma.users.update({
      where: { id },
      data: {
        role,
        updated_at: new Date(),
      },
    });
  }

  // Get users by role
  async getByRole(spaceId: string, role: string): Promise<User[]> {
    return prisma.users.findMany({
      where: {
        space_id: spaceId,
        role,
      },
      orderBy: { created_at: 'desc' },
    });
  }
}

// Singleton instance
export const prismaUsersRepository = new PrismaUsersRepository();
