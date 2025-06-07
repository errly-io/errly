import { prismaUsersRepository, prismaSpacesRepository } from '../repositories/prisma';
import { hashPassword } from './password';

/**
 * Create a test user with password for development/testing
 */
export async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await prismaUsersRepository.getByEmail('test@example.com');
    if (existingUser) {
      console.log('Test user already exists');
      return existingUser;
    }

    // Create test space
    let testSpace;
    try {
      testSpace = await prismaSpacesRepository.getBySlug('test-space');
    } catch {
      testSpace = await prismaSpacesRepository.create({
        name: 'Test Space',
        slug: 'test-space',
        description: 'Test space for development',
      });
    }

    // Hash the test password
    const passwordHash = await hashPassword('password');

    // Create test user
    if (!testSpace?.id) {
      throw new Error('Failed to create test space');
    }

    const testUser = await prismaUsersRepository.create({
      email: 'test@example.com',
      name: 'Test User',
      password_hash: passwordHash,
      space_id: testSpace.id,
      role: 'admin',
    });

    console.log('Test user created successfully:', {
      email: testUser.email,
      name: testUser.name,
      space: testSpace?.name || 'No space',
    });

    return testUser;
  } catch (error) {
    console.error('Failed to create test user:', error);
    throw error;
  }
}

/**
 * Create multiple test users for development
 */
export async function createTestUsers() {
  const users = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: 'admin123',
      role: 'admin' as const,
    },
    {
      email: 'user@example.com',
      name: 'Regular User',
      password: 'user123',
      role: 'member' as const,
    },
    {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password',
      role: 'admin' as const,
    },
  ];

  const createdUsers = [];

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await prismaUsersRepository.getByEmail(userData.email);
      if (existingUser) {
        console.log(`User ${userData.email} already exists`);
        createdUsers.push(existingUser);
        continue;
      }

      // Create space for user
      const spaceName = `${userData.name}'s Space`;
      const spaceSlug = spaceName.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      let space;
      try {
        space = await prismaSpacesRepository.getBySlug(spaceSlug);
      } catch {
        space = await prismaSpacesRepository.create({
          name: spaceName,
          slug: spaceSlug,
          description: `Space for ${userData.name}`,
        });
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      if (!space?.id) {
        throw new Error(`Failed to create space for user ${userData.email}`);
      }

      const user = await prismaUsersRepository.create({
        email: userData.email,
        name: userData.name,
        password_hash: passwordHash,
        space_id: space.id,
        role: userData.role,
      });

      console.log(`Created user: ${user.email}`);
      createdUsers.push(user);
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error);
    }
  }

  return createdUsers;
}
