package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"server/internal/database"
	"server/internal/models"

	"github.com/google/uuid"
)

// ProjectsRepository handles project operations
type ProjectsRepository struct {
	db *database.PostgresDB
}

// NewProjectsRepository creates a new projects repository
func NewProjectsRepository(db *database.PostgresDB) *ProjectsRepository {
	return &ProjectsRepository{db: db}
}

// GetByID retrieves a project by its ID
func (r *ProjectsRepository) GetByID(ctx context.Context, projectID uuid.UUID) (*models.Project, error) {
	query := `
		SELECT id, name, slug, space_id, platform, framework,
		       description, settings, created_at, updated_at
		FROM projects
		WHERE id = $1
	`

	var project models.Project
	var settingsJSON []byte

	err := r.db.QueryRowContext(ctx, query, projectID).Scan(
		&project.ID,
		&project.Name,
		&project.Slug,
		&project.SpaceID,
		&project.Platform,
		&project.Framework,
		&project.Description,
		&settingsJSON,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get project by ID: %w", err)
	}

	// Parse settings JSON
	if len(settingsJSON) > 0 {
		if err := json.Unmarshal(settingsJSON, &project.Settings); err != nil {
			return nil, fmt.Errorf("failed to parse project settings: %w", err)
		}
	}

	return &project, nil
}

// GetBySlug retrieves a project by space ID and slug
func (r *ProjectsRepository) GetBySlug(ctx context.Context, spaceID uuid.UUID, slug string) (*models.Project, error) {
	query := `
		SELECT id, name, slug, space_id, platform, framework,
		       description, settings, created_at, updated_at
		FROM projects
		WHERE space_id = $1 AND slug = $2
	`

	var project models.Project
	var settingsJSON []byte

	err := r.db.QueryRowContext(ctx, query, spaceID, slug).Scan(
		&project.ID,
		&project.Name,
		&project.Slug,
		&project.SpaceID,
		&project.Platform,
		&project.Framework,
		&project.Description,
		&settingsJSON,
		&project.CreatedAt,
		&project.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get project by slug: %w", err)
	}

	// Parse settings JSON
	if len(settingsJSON) > 0 {
		if err := json.Unmarshal(settingsJSON, &project.Settings); err != nil {
			return nil, fmt.Errorf("failed to parse project settings: %w", err)
		}
	}

	return &project, nil
}

// GetBySpace retrieves all projects for a space
func (r *ProjectsRepository) GetBySpace(ctx context.Context, spaceID uuid.UUID) ([]*models.Project, error) {
	query := `
		SELECT id, name, slug, space_id, platform, framework,
		       description, settings, created_at, updated_at
		FROM projects
		WHERE space_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, spaceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get projects by space: %w", err)
	}
	defer rows.Close()

	var projects []*models.Project
	for rows.Next() {
		var project models.Project
		var settingsJSON []byte

		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.Slug,
			&project.SpaceID,
			&project.Platform,
			&project.Framework,
			&project.Description,
			&settingsJSON,
			&project.CreatedAt,
			&project.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan project: %w", err)
		}

		// Parse settings JSON
		if len(settingsJSON) > 0 {
			if err := json.Unmarshal(settingsJSON, &project.Settings); err != nil {
				return nil, fmt.Errorf("failed to parse project settings: %w", err)
			}
		}

		projects = append(projects, &project)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating projects: %w", err)
	}

	return projects, nil
}

// Legacy alias for backward compatibility
func (r *ProjectsRepository) GetByOrganization(ctx context.Context, organizationID uuid.UUID) ([]*models.Project, error) {
	return r.GetBySpace(ctx, organizationID)
}

// Create creates a new project
func (r *ProjectsRepository) Create(ctx context.Context, project *models.Project) error {
	query := `
		INSERT INTO projects (id, name, slug, space_id, platform, framework, description, settings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	project.ID = uuid.New()

	// Marshal settings to JSON
	settingsJSON, err := json.Marshal(project.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal project settings: %w", err)
	}

	err = r.db.QueryRowContext(ctx, query,
		project.ID,
		project.Name,
		project.Slug,
		project.SpaceID,
		project.Platform,
		project.Framework,
		project.Description,
		settingsJSON,
	).Scan(&project.CreatedAt, &project.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create project: %w", err)
	}

	return nil
}

// Update updates a project
func (r *ProjectsRepository) Update(ctx context.Context, project *models.Project) error {
	query := `
		UPDATE projects
		SET name = $2, description = $3, settings = $4, updated_at = NOW()
		WHERE id = $1
		RETURNING updated_at
	`

	// Marshal settings to JSON
	settingsJSON, err := json.Marshal(project.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal project settings: %w", err)
	}

	err = r.db.QueryRowContext(ctx, query,
		project.ID,
		project.Name,
		project.Description,
		settingsJSON,
	).Scan(&project.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("project not found")
		}
		return fmt.Errorf("failed to update project: %w", err)
	}

	return nil
}

// Delete deletes a project
func (r *ProjectsRepository) Delete(ctx context.Context, projectID uuid.UUID) error {
	query := `DELETE FROM projects WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, projectID)
	if err != nil {
		return fmt.Errorf("failed to delete project: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("project not found")
	}

	return nil
}
