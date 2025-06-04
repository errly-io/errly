import { postgres, queryOne, queryMany } from '@/lib/db/postgres';
import { ApiKey, CreateApiKeyRequest } from '@/lib/types/database';

export class ApiKeysRepository {

  async getByProject(projectId: string): Promise<ApiKey[]> {
    const query = `
      SELECT
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
      FROM api_keys
      WHERE project_id = $1
      ORDER BY created_at DESC
    `;

    return queryMany<ApiKey>(query, [projectId]);
  }

  async getById(id: string): Promise<ApiKey | null> {
    const query = `
      SELECT
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
      FROM api_keys
      WHERE id = $1
    `;

    return queryOne<ApiKey>(query, [id]);
  }

  async getByHash(keyHash: string): Promise<ApiKey | null> {
    const query = `
      SELECT
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
      FROM api_keys
      WHERE key_hash = $1
    `;

    return queryOne<ApiKey>(query, [keyHash]);
  }

  async create(
    projectId: string,
    keyData: CreateApiKeyRequest,
    keyHash: string,
    keyPrefix: string
  ): Promise<ApiKey> {
    const query = `
      INSERT INTO api_keys (
        name, key_hash, key_prefix, project_id, scopes, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
    `;

    const result = await queryOne<ApiKey>(query, [
      keyData.name,
      keyHash,
      keyPrefix,
      projectId,
      keyData.scopes,
      keyData.expires_at || null
    ]);

    if (!result) {
      throw new Error('Failed to create API key');
    }

    return result;
  }

  async updateLastUsed(id: string): Promise<void> {
    const query = `
      UPDATE api_keys
      SET last_used_at = NOW()
      WHERE id = $1
    `;

    await postgres.query(query, [id]);
  }

  async updateName(id: string, name: string): Promise<ApiKey> {
    const query = `
      UPDATE api_keys
      SET name = $2
      WHERE id = $1
      RETURNING
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
    `;

    const result = await queryOne<ApiKey>(query, [id, name]);

    if (!result) {
      throw new Error('API key not found or update failed');
    }

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM api_keys WHERE id = $1`;
    const result = await postgres.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByProject(projectId: string): Promise<number> {
    const query = `DELETE FROM api_keys WHERE project_id = $1`;
    const result = await postgres.query(query, [projectId]);
    return result.rowCount ?? 0;
  }

  async getActiveKeysCount(projectId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM api_keys
      WHERE project_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
    `;

    const result = await queryOne<{ count: number }>(query, [projectId]);
    return result?.count || 0;
  }

  async getExpiredKeys(projectId: string): Promise<ApiKey[]> {
    const query = `
      SELECT
        id,
        name,
        key_hash,
        key_prefix,
        project_id,
        scopes,
        last_used_at,
        created_at,
        expires_at
      FROM api_keys
      WHERE project_id = $1
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
      ORDER BY expires_at DESC
    `;

    return queryMany<ApiKey>(query, [projectId]);
  }

  async cleanupExpiredKeys(projectId: string): Promise<number> {
    const query = `
      DELETE FROM api_keys
      WHERE project_id = $1
        AND expires_at IS NOT NULL
        AND expires_at <= NOW() - INTERVAL '30 days'
    `;

    const result = await postgres.query(query, [projectId]);
    return result.rowCount ?? 0;
  }
}

export const apiKeysRepository = new ApiKeysRepository();
