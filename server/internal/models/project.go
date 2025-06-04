package models

import (
	"time"

	"github.com/google/uuid"
)

// Project represents a project in the system
type Project struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	Name        string                 `json:"name" db:"name"`
	Slug        string                 `json:"slug" db:"slug"`
	SpaceID     uuid.UUID              `json:"space_id" db:"space_id"`
	Platform    string                 `json:"platform" db:"platform"`
	Framework   *string                `json:"framework" db:"framework"`
	Description *string                `json:"description" db:"description"`
	Settings    map[string]interface{} `json:"settings" db:"settings"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at" db:"updated_at"`
}

// APIKey represents an API key for project authentication
type APIKey struct {
	ID         uuid.UUID  `json:"id" db:"id"`
	Name       string     `json:"name" db:"name"`
	KeyHash    string     `json:"-" db:"key_hash"` // Never expose hash in JSON
	KeyPrefix  string     `json:"key_prefix" db:"key_prefix"`
	ProjectID  uuid.UUID  `json:"project_id" db:"project_id"`
	Scopes     []string   `json:"scopes" db:"scopes"`
	LastUsedAt *time.Time `json:"last_used_at" db:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at" db:"expires_at"`
}

// APIKeyScope represents the available scopes for API keys
type APIKeyScope string

const (
	ScopeIngest APIKeyScope = "ingest"
	ScopeRead   APIKeyScope = "read"
	ScopeAdmin  APIKeyScope = "admin"
)

// HasScope checks if the API key has a specific scope
func (k *APIKey) HasScope(scope APIKeyScope) bool {
	for _, s := range k.Scopes {
		if s == string(scope) {
			return true
		}
	}
	return false
}

// IsExpired checks if the API key is expired
func (k *APIKey) IsExpired() bool {
	if k.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*k.ExpiresAt)
}

// AuthContext represents the authenticated context
type AuthContext struct {
	APIKey  *APIKey  `json:"api_key"`
	Project *Project `json:"project"`
}

// Space represents a space
type Space struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Slug      string    `json:"slug" db:"slug"`
	Plan      string    `json:"plan" db:"plan"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Organization is an alias for backward compatibility
type Organization = Space

// User represents a user in the system
type User struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Name      *string   `json:"name" db:"name"`
	Image     *string   `json:"image" db:"image"`
	SpaceID   uuid.UUID `json:"space_id" db:"space_id"`
	Role      string    `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}
