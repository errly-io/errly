'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { projectsRepository } from '@/lib/repositories/postgres/projects';
import { invalidateProjectCache } from '@/lib/data/projects';
import { Project } from '@/lib/db/prisma';
import { ProjectSettings } from '@/lib/types/database';
import { log } from '@/lib/logging/logger';

export type ActionResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createProject(
  spaceId: string,
  formData: FormData
): Promise<ActionResult<Project>> {
  try {
    const name = formData.get('name') as string;
    const platform = formData.get('platform') as string;
    const framework = formData.get('framework') as string;
    const description = formData.get('description') as string;

    // Validation
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        fieldErrors: { name: 'Project name is required' }
      };
    }

    if (!platform || platform.trim().length === 0) {
      return {
        success: false,
        fieldErrors: { platform: 'Platform is required' }
      };
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check slug uniqueness
    const existingProject = await projectsRepository.getBySlug(spaceId, slug);
    if (existingProject) {
      return {
        success: false,
        fieldErrors: { name: 'Project with this name already exists' }
      };
    }

    // Create project
    const projectData = {
      name: name.trim(),
      slug,
      space_id: spaceId,
      platform: platform.trim(),
      framework: framework?.trim() || null,
      description: description?.trim() || null,
      settings: {
        environments: ['development', 'staging', 'production'],
        alert_rules: [],
        retention_days: 30,
        sample_rate: 1.0
      } satisfies ProjectSettings
    };

    const project = await projectsRepository.create(projectData);

    // Invalidate cache
    await invalidateProjectCache(project.id, spaceId);

    // Update pages
    revalidatePath('/[space]/projects', 'page');
    revalidatePath('/[space]', 'page');

    log.info('Project created successfully', { projectId: project.id, spaceId });
    return {
      success: true,
      data: project
    };
  } catch (error) {
    log.error('Error creating project', { spaceId }, error as Error);
    return {
      success: false,
      error: 'Failed to create project. Please try again.'
    };
  }
}

export async function updateProject(
  projectId: string,
  formData: FormData
): Promise<ActionResult<Project>> {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const settingsJson = formData.get('settings') as string;

    // Validation
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        fieldErrors: { name: 'Project name is required' }
      };
    }

    const updates: Partial<Project> = {
      name: name.trim(),
      description: description?.trim() || null,
    };

    // Parse settings if provided
    if (settingsJson) {
      try {
        updates.settings = JSON.parse(settingsJson);
      } catch (error) {
        return {
          success: false,
          fieldErrors: { settings: 'Invalid settings format' }
        };
      }
    }

    const project = await projectsRepository.update(projectId, updates);

    // Invalidate cache
    await invalidateProjectCache(projectId, project.space_id || '');

    // Update pages
    revalidatePath('/[space]/projects', 'page');
    revalidatePath('/[space]/projects/[id]', 'page');

    log.info('Project updated successfully', { projectId });
    return {
      success: true,
      data: project
    };
  } catch (error) {
    log.error('Error updating project', { projectId }, error as Error);
    return {
      success: false,
      error: 'Failed to update project. Please try again.'
    };
  }
}

export async function deleteProject(
  projectId: string,
  spaceSlug: string
): Promise<ActionResult> {
  try {
    // Get project to obtain space_id
    const project = await projectsRepository.getById(projectId);
    if (!project) {
      return {
        success: false,
        error: 'Project not found'
      };
    }

    const success = await projectsRepository.delete(projectId);

    if (!success) {
      return {
        success: false,
        error: 'Failed to delete project'
      };
    }

    // Invalidate cache
    await invalidateProjectCache(projectId, project.space_id || '');

    // Update pages
    revalidatePath('/[space]/projects', 'page');
    revalidatePath('/[space]', 'page');

    log.info('Project deleted successfully', { projectId });
    return {
      success: true
    };
  } catch (error) {
    log.error('Error deleting project', { projectId }, error as Error);
    return {
      success: false,
      error: 'Failed to delete project. Please try again.'
    };
  }
}

export async function createProjectAndRedirect(
  spaceSlug: string,
  formData: FormData
) {
  // Get space_id by slug (simplified - use slug as id)
  const spaceId = spaceSlug === 'default'
    ? '00000000-0000-0000-0000-000000000001'
    : spaceSlug;

  const result = await createProject(spaceId, formData);

  if (result.success && result.data) {
    redirect(`/${spaceSlug}/projects/${result.data.id}`);
  }

  return result;
}
