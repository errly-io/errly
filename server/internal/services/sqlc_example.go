package services

import (
	"context"
	"fmt"

	"server/internal/database"
	generated "server/internal/database/generated"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// SQLCExampleService demonstrates sqlc usage in services
type SQLCExampleService struct {
	db *database.SQLCDatabase
}

// NewSQLCExampleService creates a new service with sqlc
func NewSQLCExampleService(db *database.SQLCDatabase) *SQLCExampleService {
	return &SQLCExampleService{
		db: db,
	}
}

// CreateOrganizationWithProject creates organization and project in transaction
func (s *SQLCExampleService) CreateOrganizationWithProject(
	ctx context.Context,
	orgName, orgSlug, projectName, projectSlug, platform string,
) (*generated.Spaces, *generated.Projects, error) {
	var space generated.Spaces
	var project generated.Projects

	err := s.db.WithTx(ctx, func(qtx *generated.Queries) error {
		// Create space
		createdSpace, err := qtx.CreateSpace(ctx, generated.CreateSpaceParams{
			Name:        orgName,
			Slug:        orgSlug,
			Description: pgtype.Text{},
			Settings:    []byte("{}"),
		})
		if err != nil {
			return fmt.Errorf("failed to create space: %w", err)
		}
		space = createdSpace

		// Create project
		createdProject, err := qtx.CreateProject(ctx, generated.CreateProjectParams{
			Name:        projectName,
			Slug:        projectSlug,
			SpaceID:     space.ID,
			Platform:    platform,
			Framework:   pgtype.Text{},
			Description: pgtype.Text{},
			Settings:    []byte("{}"),
		})
		if err != nil {
			return fmt.Errorf("failed to create project: %w", err)
		}
		project = createdProject

		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	return &space, &project, nil
}

// GetSpaceWithProjects gets space with all projects
func (s *SQLCExampleService) GetSpaceWithProjects(
	ctx context.Context,
	spaceID string,
) (*generated.Spaces, []generated.Projects, error) {
	queries := s.db.GetQueries()

	// Parse UUID
	spaceUUID, err := uuid.Parse(spaceID)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid space ID: %w", err)
	}

	// Get space
	space, err := queries.GetSpace(ctx, spaceUUID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get space: %w", err)
	}

	// Get space projects
	projects, err := queries.ListProjectsBySpace(ctx, spaceUUID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get projects: %w", err)
	}

	return &space, projects, nil
}

// GetOrganizationWithProjects is an alias for backward compatibility
func (s *SQLCExampleService) GetOrganizationWithProjects(
	ctx context.Context,
	orgID string,
) (*generated.Spaces, []generated.Projects, error) {
	return s.GetSpaceWithProjects(ctx, orgID)
}

// CreateAPIKeyForProject creates API key for project
func (s *SQLCExampleService) CreateAPIKeyForProject(
	ctx context.Context,
	projectID, keyName, keyHash, keyPrefix string,
	scopes []string,
) (*generated.ApiKeys, error) {
	queries := s.db.GetQueries()

	// Parse UUID
	projectUUID, err := uuid.Parse(projectID)
	if err != nil {
		return nil, fmt.Errorf("invalid project ID: %w", err)
	}

	// Create API key
	apiKey, err := queries.CreateAPIKey(ctx, generated.CreateAPIKeyParams{
		Name:      keyName,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
		ProjectID: projectUUID,
		Scopes:    scopes,
		ExpiresAt: pgtype.Timestamptz{}, // No expiration
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create API key: %w", err)
	}

	return &apiKey, nil
}

// AuthenticateAPIKey validates API key and updates last used time
func (s *SQLCExampleService) AuthenticateAPIKey(
	ctx context.Context,
	keyHash string,
) (*generated.ApiKeys, error) {
	queries := s.db.GetQueries()

	// Get API key by hash
	apiKey, err := queries.GetAPIKeyByHash(ctx, keyHash)
	if err != nil {
		return nil, fmt.Errorf("API key not found: %w", err)
	}

	// Update last used time
	err = queries.UpdateAPIKeyLastUsed(ctx, apiKey.ID)
	if err != nil {
		// Log error but don't interrupt authentication
		fmt.Printf("Failed to update API key last used time: %v\n", err)
	}

	return &apiKey, nil
}

// GetUsersBySpace gets all users of space
func (s *SQLCExampleService) GetUsersBySpace(
	ctx context.Context,
	spaceID string,
) ([]generated.Users, error) {
	queries := s.db.GetQueries()

	// Parse UUID
	spaceUUID, err := uuid.Parse(spaceID)
	if err != nil {
		return nil, fmt.Errorf("invalid space ID: %w", err)
	}

	// Get users
	users, err := queries.ListUsersBySpace(ctx, spaceUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}

	return users, nil
}

// Legacy alias for backward compatibility
func (s *SQLCExampleService) GetUsersByOrganization(
	ctx context.Context,
	orgID string,
) ([]generated.Users, error) {
	return s.GetUsersBySpace(ctx, orgID)
}
