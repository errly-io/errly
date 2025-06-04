import { projectsRepository } from '@/lib/repositories/postgres/projects';
import { issuesRepository } from '@/lib/repositories/clickhouse/issues';
import { Cache } from '@/lib/db/redis';
import { Project } from '@/lib/db/prisma';
import { ProjectStats } from '@/lib/types/database';

/**
 * Server-side data functions for Projects
 * These functions run on the server and can directly access databases
 */

export async function getProjects(spaceId: string): Promise<Project[]> {
  try {
    // Check cache
    const cacheKey = `projects:space:${spaceId}`;
    const cached = await Cache.get<Project[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from database
    const projects = await projectsRepository.getBySpace(spaceId);

    // Cache for 5 minutes
    await Cache.set(cacheKey, projects, 5 * 60);

    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    // Check cache
    const cacheKey = `project:${projectId}`;
    const cached = await Cache.get<Project>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from database
    const project = await projectsRepository.getById(projectId);

    if (project) {
      // Cache for 10 minutes
      await Cache.set(cacheKey, project, 10 * 60);
    }

    return project;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export async function getProjectBySlug(spaceId: string, slug: string): Promise<Project | null> {
  try {
    return await projectsRepository.getBySlug(spaceId, slug);
  } catch (error) {
    console.error('Error fetching project by slug:', error);
    return null;
  }
}

export async function getProjectsWithStats(spaceId: string): Promise<Array<Project & { stats: ProjectStats }>> {
  try {
    // Check cache
    const cacheKey = `projects:stats:space:${spaceId}`;
    const cached = await Cache.get<Array<Project & { stats: ProjectStats }>>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get projects
    const projects = await getProjects(spaceId);

    // Get statistics for each project in parallel
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        try {
          const stats = await issuesRepository.getProjectStats(project.id, '24h');
          return { ...project, stats };
        } catch (error) {
          console.error(`Error fetching stats for project ${project.id}:`, error);
          return {
            ...project,
            stats: {
              project_id: project.id,
              total_events: 0,
              total_issues: 0,
              unresolved_issues: 0,
              affected_users: 0,
              error_rate: 0,
              last_event: null
            }
          };
        }
      })
    );

    // Cache for 2 minutes (statistics change frequently)
    await Cache.set(cacheKey, projectsWithStats, 2 * 60);

    return projectsWithStats;
  } catch (error) {
    console.error('Error fetching projects with stats:', error);
    return [];
  }
}

export async function getProjectStats(projectId: string, timeRange = '24h'): Promise<ProjectStats> {
  try {
    // Check cache
    const cacheKey = `project:stats:${projectId}:${timeRange}`;
    const cached = await Cache.get<ProjectStats>(cacheKey);

    if (cached) {
      return cached;
    }

    // Get from ClickHouse
    const stats = await issuesRepository.getProjectStats(projectId, timeRange);

    // Cache for 2 minutes
    await Cache.set(cacheKey, stats, 2 * 60);

    return stats;
  } catch (error) {
    console.error('Error fetching project stats:', error);
    return {
      project_id: projectId,
      total_events: 0,
      total_issues: 0,
      unresolved_issues: 0,
      affected_users: 0,
      error_rate: 0,
      last_event: null
    };
  }
}

// Function for project cache invalidation
export async function invalidateProjectCache(projectId: string, spaceId?: string): Promise<void> {
  try {
    await Cache.del(`project:${projectId}`);
    await Cache.invalidatePattern(`project:stats:${projectId}:*`);

    if (spaceId) {
      await Cache.del(`projects:space:${spaceId}`);
      await Cache.del(`projects:stats:space:${spaceId}`);
    }
  } catch (error) {
    console.error('Error invalidating project cache:', error);
  }
}
