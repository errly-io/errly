package database

import (
	"context"
	"fmt"

	"server/internal/config"
	generated "server/internal/database/generated"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SQLCDatabase wraps the sqlc generated queries with pgx connection
type SQLCDatabase struct {
	pool    *pgxpool.Pool
	queries *generated.Queries
}

// NewSQLCDatabase creates a new database connection using sqlc with pgx driver
func NewSQLCDatabase(cfg *config.Config) (*SQLCDatabase, error) {
	// Create pgxpool config
	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %w", err)
	}

	// Configure connection pool
	poolConfig.MaxConns = int32(cfg.Database.MaxConns)
	poolConfig.MinConns = int32(cfg.Database.MinConns)

	// Create connection pool
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test the connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Create sqlc queries
	queries := generated.New(pool)

	return &SQLCDatabase{
		pool:    pool,
		queries: queries,
	}, nil
}

// GetQueries returns the sqlc generated queries
func (s *SQLCDatabase) GetQueries() *generated.Queries {
	return s.queries
}

// GetPool returns the underlying pgxpool.Pool connection
func (s *SQLCDatabase) GetPool() *pgxpool.Pool {
	return s.pool
}

// WithTx executes a function within a database transaction
func (s *SQLCDatabase) WithTx(ctx context.Context, fn func(*generated.Queries) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	qtx := s.queries.WithTx(tx)
	if err := fn(qtx); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// Close closes the database connection
func (s *SQLCDatabase) Close() {
	s.pool.Close()
}

// Health checks the database connection
func (s *SQLCDatabase) Health(ctx context.Context) error {
	return s.pool.Ping(ctx)
}

// Repository interfaces using sqlc generated types
type SpacesRepository struct {
	queries *generated.Queries
}

func NewSpacesRepository(db *SQLCDatabase) *SpacesRepository {
	return &SpacesRepository{
		queries: db.GetQueries(),
	}
}

func (r *SpacesRepository) GetByID(ctx context.Context, id string) (*generated.Spaces, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return nil, err
	}

	space, err := r.queries.GetSpace(ctx, uuid)
	if err != nil {
		return nil, err
	}
	return &space, nil
}

func (r *SpacesRepository) GetBySlug(ctx context.Context, slug string) (*generated.Spaces, error) {
	space, err := r.queries.GetSpaceBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	return &space, nil
}

func (r *SpacesRepository) Create(ctx context.Context, params generated.CreateSpaceParams) (*generated.Spaces, error) {
	space, err := r.queries.CreateSpace(ctx, params)
	if err != nil {
		return nil, err
	}
	return &space, nil
}

// Legacy aliases for backward compatibility
type OrganizationsRepository = SpacesRepository

func NewOrganizationsRepository(db *SQLCDatabase) *OrganizationsRepository {
	return NewSpacesRepository(db)
}

type ProjectsRepository struct {
	queries *generated.Queries
}

func NewProjectsRepository(db *SQLCDatabase) *ProjectsRepository {
	return &ProjectsRepository{
		queries: db.GetQueries(),
	}
}

func (r *ProjectsRepository) GetByID(ctx context.Context, id string) (*generated.Projects, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return nil, err
	}

	project, err := r.queries.GetProject(ctx, uuid)
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *ProjectsRepository) GetBySpace(ctx context.Context, spaceID string) ([]generated.Projects, error) {
	uuid, err := parseUUID(spaceID)
	if err != nil {
		return nil, err
	}

	return r.queries.ListProjectsBySpace(ctx, uuid)
}

// Legacy alias for backward compatibility
func (r *ProjectsRepository) GetByOrganization(ctx context.Context, orgID string) ([]generated.Projects, error) {
	return r.GetBySpace(ctx, orgID)
}

type UsersRepository struct {
	queries *generated.Queries
}

func NewUsersRepository(db *SQLCDatabase) *UsersRepository {
	return &UsersRepository{
		queries: db.GetQueries(),
	}
}

func (r *UsersRepository) GetByID(ctx context.Context, id string) (*generated.Users, error) {
	uuid, err := parseUUID(id)
	if err != nil {
		return nil, err
	}

	user, err := r.queries.GetUser(ctx, uuid)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UsersRepository) GetByEmail(ctx context.Context, email string) (*generated.Users, error) {
	user, err := r.queries.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

type APIKeysRepository struct {
	queries *generated.Queries
}

func NewAPIKeysRepository(db *SQLCDatabase) *APIKeysRepository {
	return &APIKeysRepository{
		queries: db.GetQueries(),
	}
}

func (r *APIKeysRepository) GetByHash(ctx context.Context, hash string) (*generated.ApiKeys, error) {
	key, err := r.queries.GetAPIKeyByHash(ctx, hash)
	if err != nil {
		return nil, err
	}
	return &key, nil
}

func (r *APIKeysRepository) UpdateLastUsed(ctx context.Context, id string) error {
	uuid, err := parseUUID(id)
	if err != nil {
		return err
	}

	return r.queries.UpdateAPIKeyLastUsed(ctx, uuid)
}

// Helper function to parse UUID strings
func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}
