import { postgres, queryOne, queryMany } from '@/lib/db/postgres';
import { Project } from '@/lib/types/database';

interface ProjectStats {
  total_events: number;
  total_issues: number;
  unresolved_issues: number;
  affected_users: number;
}

export class ProjectsRepository {

  async getBySpace(spaceId: string): Promise<Project[]> {
    const query = `
      SELECT
        p.*,
        s.name as space_name,
        s.slug as space_slug
      FROM projects p
      JOIN spaces s ON p.space_id = s.id
      WHERE p.space_id = $1
      ORDER BY p.created_at DESC
    `;

    return queryMany<Project>(query, [spaceId]);
  }

  async getById(id: string): Promise<Project | null> {
    const query = `
      SELECT
        p.*,
        s.name as space_name,
        s.slug as space_slug
      FROM projects p
      JOIN spaces s ON p.space_id = s.id
      WHERE p.id = $1
    `;

    return queryOne<Project>(query, [id]);
  }

  async getBySlug(spaceId: string, slug: string): Promise<Project | null> {
    const query = `
      SELECT
        p.*,
        s.name as space_name,
        s.slug as space_slug
      FROM projects p
      JOIN spaces s ON p.space_id = s.id
      WHERE p.space_id = $1 AND p.slug = $2
    `;

    return queryOne<Project>(query, [spaceId, slug]);
  }

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const query = `
      INSERT INTO projects (
        name, slug, space_id, platform, framework, description, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await queryOne<Project>(query, [
      project.name,
      project.slug,
      project.space_id,
      project.platform,
      project.framework,
      project.description,
      JSON.stringify(project.settings)
    ]);

    if (!result) {
      throw new Error('Failed to create project');
    }

    return result;
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClause.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClause.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.settings !== undefined) {
      setClause.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(updates.settings));
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
      UPDATE projects
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await queryOne<Project>(query, values);

    if (!result) {
      throw new Error('Project not found or update failed');
    }

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM projects WHERE id = $1`;
    const result = await postgres.query(query, [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async getProjectsWithStats(spaceId: string): Promise<(Project & { stats?: ProjectStats })[]> {
    // Get projects from PostgreSQL
    const projects = await this.getBySpace(spaceId);

    // Here you can add statistics from ClickHouse
    // For now, return projects without statistics
    return projects.map(project => ({
      ...project,
      stats: {
        total_events: 0,
        total_issues: 0,
        unresolved_issues: 0,
        affected_users: 0
      }
    }));
  }
}

export const projectsRepository = new ProjectsRepository();
