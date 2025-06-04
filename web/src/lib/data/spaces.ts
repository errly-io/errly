import { prismaSpacesRepository, type Space } from '@/lib/repositories/prisma';

/**
 * Get space by ID
 */
export async function getSpace(id: string): Promise<Space | null> {
  return prismaSpacesRepository.getById(id);
}

/**
 * Get space by slug
 */
export async function getSpaceBySlug(slug: string): Promise<Space | null> {
  return prismaSpacesRepository.getBySlug(slug);
}

/**
 * Get all spaces
 */
export async function getSpaces(): Promise<Space[]> {
  return prismaSpacesRepository.getAll();
}

/**
 * Create a new space
 */
export async function createSpace(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<Space> {
  return prismaSpacesRepository.create(data);
}

/**
 * Update space
 */
export async function updateSpace(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string;
  }>
): Promise<Space> {
  return prismaSpacesRepository.update(id, data);
}

/**
 * Delete space
 */
export async function deleteSpace(id: string): Promise<void> {
  return prismaSpacesRepository.delete(id);
}

/**
 * Check if space exists by slug
 */
export async function spaceExists(slug: string): Promise<boolean> {
  return prismaSpacesRepository.exists(slug);
}

/**
 * Get space statistics
 */
export async function getSpaceStats(id: string) {
  return prismaSpacesRepository.getStats(id);
}
