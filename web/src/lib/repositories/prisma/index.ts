// Prisma repositories - Type-safe database access with Prisma Client
export { PrismaSpacesRepository, prismaSpacesRepository } from './spaces';
export { PrismaProjectsRepository, prismaProjectsRepository } from './projects';
export { PrismaUsersRepository, prismaUsersRepository } from './users';
export { PrismaApiKeysRepository, prismaApiKeysRepository } from './apiKeys';

// Re-export Prisma client and types
export { prisma, prismaConnection, withTransaction } from '../../db/prisma';
export type {
  Space,
  User,
  Project,
  ApiKey,
  UserSession,
  CreateSpace,
  CreateUser,
  CreateProject,
  CreateApiKey,
} from '../../db/prisma';
