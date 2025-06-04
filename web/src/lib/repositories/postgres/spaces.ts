import { queryOne, queryMany } from '@/lib/db/postgres';
import { Space } from '@/lib/types/database';

export class SpacesRepository {

  async getById(id: string): Promise<Space | null> {
    const query = `
      SELECT * FROM spaces
      WHERE id = $1
    `;
    return queryOne<Space>(query, [id]);
  }

  async getBySlug(slug: string): Promise<Space | null> {
    const query = `
      SELECT * FROM spaces
      WHERE slug = $1
    `;
    return queryOne<Space>(query, [slug]);
  }

  async getAll(): Promise<Space[]> {
    const query = `
      SELECT * FROM spaces
      ORDER BY created_at DESC
    `;
    return queryMany<Space>(query);
  }

  async create(space: Omit<Space, 'id' | 'created_at' | 'updated_at'>): Promise<Space> {
    const query = `
      INSERT INTO spaces (name, slug, description, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await queryOne<Space>(query, [
      space.name,
      space.slug,
      space.description,
      JSON.stringify(space.settings || {})
    ]);

    if (!result) {
      throw new Error('Failed to create space');
    }

    return result;
  }

  async update(id: string, updates: Partial<Space>): Promise<Space> {
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
      UPDATE spaces
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await queryOne<Space>(query, values);

    if (!result) {
      throw new Error('Space not found or update failed');
    }

    return result;
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM spaces WHERE id = $1`;
    const result = await queryOne(query, [id]);
    return !!result;
  }
}

export const spacesRepository = new SpacesRepository();
