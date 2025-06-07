'use server';

import { revalidatePath } from 'next/cache';
import { apiKeysRepository } from '@/lib/repositories/postgres/apiKeys';
import { projectsRepository } from '@/lib/repositories/postgres/projects';
import { generateApiKey } from '@/lib/utils/apiKeys';
import { ApiKeyWithToken, CreateApiKeyRequest, ApiKeyScope } from '@/lib/types/database';

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createApiKey(
  projectId: string,
  formData: FormData
): Promise<ActionResult<ApiKeyWithToken>> {
  try {
    const name = formData.get('name') as string;
    const scopesString = formData.get('scopes') as string;
    const expiresAtString = formData.get('expires_at') as string;

    // Validation
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        fieldErrors: { name: 'API key name is required' }
      };
    }

    if (name.length > 100) {
      return {
        success: false,
        fieldErrors: { name: 'API key name must be less than 100 characters' }
      };
    }

    let scopes: ApiKeyScope[] = [];
    try {
      scopes = JSON.parse(scopesString || '[]');
    } catch {
      return {
        success: false,
        fieldErrors: { scopes: 'Invalid scopes format' }
      };
    }

    if (scopes.length === 0) {
      return {
        success: false,
        fieldErrors: { scopes: 'At least one scope is required' }
      };
    }

    // Check validity of scopes
    const validScopes: ApiKeyScope[] = ['ingest', 'read', 'admin'];
    const invalidScopes = scopes.filter(scope => !validScopes.includes(scope));
    if (invalidScopes.length > 0) {
      return {
        success: false,
        fieldErrors: { scopes: `Invalid scopes: ${invalidScopes.join(', ')}` }
      };
    }

    // Check project existence
    const project = await projectsRepository.getById(projectId);
    if (!project) {
      return {
        success: false,
        error: 'Project not found'
      };
    }

    // Check key limit (maximum 10 active keys per project)
    const activeKeysCount = await apiKeysRepository.getActiveKeysCount(projectId);
    if (activeKeysCount >= 10) {
      return {
        success: false,
        error: 'Maximum number of API keys reached (10 per project)'
      };
    }

    // Parse expiration date
    let expiresAt: Date | undefined;
    if (expiresAtString) {
      expiresAt = new Date(expiresAtString);
      if (isNaN(expiresAt.getTime())) {
        return {
          success: false,
          fieldErrors: { expires_at: 'Invalid expiration date' }
        };
      }
      if (expiresAt <= new Date()) {
        return {
          success: false,
          fieldErrors: { expires_at: 'Expiration date must be in the future' }
        };
      }
    }

    const { token, hash, prefix } = generateApiKey(project.slug);

    // Create request
    const keyRequest: CreateApiKeyRequest = {
      name: name.trim(),
      scopes,
      ...(expiresAt && { expires_at: expiresAt })
    };

    // Save to database
    const apiKey = await apiKeysRepository.create(projectId, keyRequest, hash, prefix);

    // Update pages
    revalidatePath('/[space]/projects/[id]', 'page');

    // Return key with token (only once!)
    const apiKeyWithToken: ApiKeyWithToken = {
      ...apiKey,
      token
    };

    return {
      success: true,
      data: apiKeyWithToken
    };
  } catch (error) {
    console.error('Error creating API key:', error);
    return {
      success: false,
      error: 'Failed to create API key. Please try again.'
    };
  }
}

export async function updateApiKeyName(
  keyId: string,
  name: string
): Promise<ActionResult<ApiKeyWithToken>> {
  try {
    // Validation
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        fieldErrors: { name: 'API key name is required' }
      };
    }

    if (name.length > 100) {
      return {
        success: false,
        fieldErrors: { name: 'API key name must be less than 100 characters' }
      };
    }

    const apiKey = await apiKeysRepository.updateName(keyId, name.trim());

    // Update pages
    revalidatePath('/[space]/projects/[id]', 'page');

    return {
      success: true,
      data: apiKey
    };
  } catch (error) {
    console.error('Error updating API key name:', error);
    return {
      success: false,
      error: 'Failed to update API key name. Please try again.'
    };
  }
}

export async function deleteApiKey(keyId: string): Promise<ActionResult> {
  try {
    const success = await apiKeysRepository.delete(keyId);
    
    if (!success) {
      return {
        success: false,
        error: 'API key not found'
      };
    }

    // Update pages
    revalidatePath('/[space]/projects/[id]', 'page');

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting API key:', error);
    return {
      success: false,
      error: 'Failed to delete API key. Please try again.'
    };
  }
}

export async function getProjectApiKeys(projectId: string) {
  try {
    return await apiKeysRepository.getByProject(projectId);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }
}

export async function cleanupExpiredApiKeys(projectId: string): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const deletedCount = await apiKeysRepository.cleanupExpiredKeys(projectId);

    // Update pages
    revalidatePath('/[space]/projects/[id]', 'page');

    return {
      success: true,
      data: { deletedCount }
    };
  } catch (error) {
    console.error('Error cleaning up expired API keys:', error);
    return {
      success: false,
      error: 'Failed to cleanup expired API keys. Please try again.'
    };
  }
}
