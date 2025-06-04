package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"server/internal/database"
	"server/internal/models"
)

// APIKeysRepository handles API key operations
type APIKeysRepository struct {
	db *database.PostgresDB
}

// NewAPIKeysRepository creates a new API keys repository
func NewAPIKeysRepository(db *database.PostgresDB) *APIKeysRepository {
	return &APIKeysRepository{db: db}
}

// GetByHash retrieves an API key by its hash
func (r *APIKeysRepository) GetByHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	query := `
		SELECT id, name, key_hash, key_prefix, project_id, scopes, 
		       last_used_at, created_at, expires_at
		FROM api_keys 
		WHERE key_hash = $1
	`

	var apiKey models.APIKey
	var scopes pq.StringArray

	err := r.db.QueryRowContext(ctx, query, keyHash).Scan(
		&apiKey.ID,
		&apiKey.Name,
		&apiKey.KeyHash,
		&apiKey.KeyPrefix,
		&apiKey.ProjectID,
		&scopes,
		&apiKey.LastUsedAt,
		&apiKey.CreatedAt,
		&apiKey.ExpiresAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get API key by hash: %w", err)
	}

	apiKey.Scopes = []string(scopes)
	return &apiKey, nil
}

// GetByProject retrieves all API keys for a project
func (r *APIKeysRepository) GetByProject(ctx context.Context, projectID uuid.UUID) ([]*models.APIKey, error) {
	query := `
		SELECT id, name, key_hash, key_prefix, project_id, scopes, 
		       last_used_at, created_at, expires_at
		FROM api_keys 
		WHERE project_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, projectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get API keys by project: %w", err)
	}
	defer rows.Close()

	var apiKeys []*models.APIKey
	for rows.Next() {
		var apiKey models.APIKey
		var scopes pq.StringArray

		err := rows.Scan(
			&apiKey.ID,
			&apiKey.Name,
			&apiKey.KeyHash,
			&apiKey.KeyPrefix,
			&apiKey.ProjectID,
			&scopes,
			&apiKey.LastUsedAt,
			&apiKey.CreatedAt,
			&apiKey.ExpiresAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API key: %w", err)
		}

		apiKey.Scopes = []string(scopes)
		apiKeys = append(apiKeys, &apiKey)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating API keys: %w", err)
	}

	return apiKeys, nil
}

// Create creates a new API key
func (r *APIKeysRepository) Create(ctx context.Context, apiKey *models.APIKey) error {
	query := `
		INSERT INTO api_keys (id, name, key_hash, key_prefix, project_id, scopes, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	apiKey.ID = uuid.New()
	apiKey.CreatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query,
		apiKey.ID,
		apiKey.Name,
		apiKey.KeyHash,
		apiKey.KeyPrefix,
		apiKey.ProjectID,
		pq.Array(apiKey.Scopes),
		apiKey.ExpiresAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create API key: %w", err)
	}

	return nil
}

// UpdateLastUsed updates the last used timestamp for an API key
func (r *APIKeysRepository) UpdateLastUsed(ctx context.Context, keyID uuid.UUID) error {
	query := `UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, keyID)
	if err != nil {
		return fmt.Errorf("failed to update last used timestamp: %w", err)
	}

	return nil
}

// UpdateName updates the name of an API key
func (r *APIKeysRepository) UpdateName(ctx context.Context, keyID uuid.UUID, name string) error {
	query := `UPDATE api_keys SET name = $2 WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, keyID, name)
	if err != nil {
		return fmt.Errorf("failed to update API key name: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found")
	}

	return nil
}

// Delete deletes an API key
func (r *APIKeysRepository) Delete(ctx context.Context, keyID uuid.UUID) error {
	query := `DELETE FROM api_keys WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, keyID)
	if err != nil {
		return fmt.Errorf("failed to delete API key: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API key not found")
	}

	return nil
}

// GetActiveKeysCount returns the count of active (non-expired) API keys for a project
func (r *APIKeysRepository) GetActiveKeysCount(ctx context.Context, projectID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM api_keys 
		WHERE project_id = $1 
		  AND (expires_at IS NULL OR expires_at > NOW())
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, projectID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get active keys count: %w", err)
	}

	return count, nil
}

// CleanupExpired deletes API keys that have been expired for more than 30 days
func (r *APIKeysRepository) CleanupExpired(ctx context.Context, projectID uuid.UUID) (int, error) {
	query := `
		DELETE FROM api_keys 
		WHERE project_id = $1 
		  AND expires_at IS NOT NULL 
		  AND expires_at <= NOW() - INTERVAL '30 days'
	`

	result, err := r.db.ExecContext(ctx, query, projectID)
	if err != nil {
		return 0, fmt.Errorf("failed to cleanup expired API keys: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return int(rowsAffected), nil
}
