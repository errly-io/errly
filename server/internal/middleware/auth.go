package middleware

import (
	"context"
	"crypto/sha256"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"server/internal/errors"
	"server/internal/models"
	"server/internal/repository"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware handles API key authentication
type AuthMiddleware struct {
	apiKeysRepo  *repository.APIKeysRepository
	projectsRepo *repository.ProjectsRepository
}

// NewAuthMiddleware creates a new auth middleware
func NewAuthMiddleware(apiKeysRepo *repository.APIKeysRepository, projectsRepo *repository.ProjectsRepository) *AuthMiddleware {
	return &AuthMiddleware{
		apiKeysRepo:  apiKeysRepo,
		projectsRepo: projectsRepo,
	}
}

// RequireAPIKey middleware that validates API key and sets auth context
func (m *AuthMiddleware) RequireAPIKey(requiredScopes ...models.APIKeyScope) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract API key from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			authErr := errors.NewAuthenticationError("api_key_validation", "Missing Authorization header")
			c.JSON(http.StatusUnauthorized, authErr.ToJSON())
			c.Abort()
			return
		}

		// Parse Bearer token
		apiKey := strings.TrimPrefix(authHeader, "Bearer ")
		if apiKey == authHeader {
			authErr := errors.NewAuthenticationError("api_key_validation", "Invalid Authorization header format")
			c.JSON(http.StatusUnauthorized, authErr.ToJSON())
			c.Abort()
			return
		}

		// Validate API key format
		if !isValidAPIKeyFormat(apiKey) {
			authErr := errors.NewAuthenticationError("api_key_validation", "Invalid API key format")
			c.JSON(http.StatusUnauthorized, authErr.ToJSON())
			c.Abort()
			return
		}

		// Hash the API key for database lookup
		keyHash := hashAPIKey(apiKey)

		// Get API key from database
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		dbAPIKey, err := m.apiKeysRepo.GetByHash(ctx, keyHash)
		if err != nil {
			dbErr := errors.NewDatabaseError("GetByHash", err)
			c.JSON(http.StatusInternalServerError, dbErr.ToJSON())
			c.Abort()
			return
		}

		if dbAPIKey == nil {
			authErr := errors.NewAuthenticationError("api_key_validation", "Invalid API key")
			c.JSON(http.StatusUnauthorized, authErr.ToJSON())
			c.Abort()
			return
		}

		// Check if API key is expired
		if dbAPIKey.IsExpired() {
			authErr := errors.NewAuthenticationError("api_key_validation", "API key has expired")
			c.JSON(http.StatusUnauthorized, authErr.ToJSON())
			c.Abort()
			return
		}

		// Check required scopes
		for _, requiredScope := range requiredScopes {
			if !dbAPIKey.HasScope(requiredScope) {
				authzErr := errors.NewAuthorizationError(string(requiredScope), "api_access")
				c.JSON(http.StatusForbidden, authzErr.ToJSON())
				c.Abort()
				return
			}
		}

		// Get project information
		project, err := m.projectsRepo.GetByID(ctx, dbAPIKey.ProjectID)
		if err != nil {
			dbErr := errors.NewDatabaseError("GetByID", err)
			c.JSON(http.StatusInternalServerError, dbErr.ToJSON())
			c.Abort()
			return
		}

		if project == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Project not found",
				"code":  "PROJECT_NOT_FOUND",
			})
			c.Abort()
			return
		}

		// Update last used timestamp (async)
		go func() {
			updateCtx, updateCancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer updateCancel()

			if err := m.apiKeysRepo.UpdateLastUsed(updateCtx, dbAPIKey.ID); err != nil {
				// Log error but don't fail the request
				fmt.Printf("Failed to update API key last used timestamp: %v\n", err)
			}
		}()

		// Set auth context
		authCtx := &models.AuthContext{
			APIKey:  dbAPIKey,
			Project: project,
		}

		c.Set("auth", authCtx)
		c.Set("api_key", dbAPIKey)
		c.Set("project", project)

		c.Next()
	}
}

// RequireScope middleware that checks for specific scopes (use after RequireAPIKey)
func (m *AuthMiddleware) RequireScope(requiredScopes ...models.APIKeyScope) gin.HandlerFunc {
	return func(c *gin.Context) {
		authCtx, exists := c.Get("auth")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		auth := authCtx.(*models.AuthContext)

		for _, requiredScope := range requiredScopes {
			if !auth.APIKey.HasScope(requiredScope) {
				c.JSON(http.StatusForbidden, gin.H{
					"error": fmt.Sprintf("Missing required scope: %s", requiredScope),
					"code":  "INSUFFICIENT_SCOPE",
				})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

// GetAuthContext helper to get auth context from gin.Context
func GetAuthContext(c *gin.Context) *models.AuthContext {
	if authCtx, exists := c.Get("auth"); exists {
		return authCtx.(*models.AuthContext)
	}
	return nil
}

// GetProject helper to get project from gin.Context
func GetProject(c *gin.Context) *models.Project {
	if project, exists := c.Get("project"); exists {
		return project.(*models.Project)
	}
	return nil
}

// GetAPIKey helper to get API key from gin.Context
func GetAPIKey(c *gin.Context) *models.APIKey {
	if apiKey, exists := c.Get("api_key"); exists {
		return apiKey.(*models.APIKey)
	}
	return nil
}

// isValidAPIKeyFormat validates the API key format
func isValidAPIKeyFormat(apiKey string) bool {
	// Expected format: errly_<4_chars>_<64_hex_chars>
	pattern := `^errly_[a-z0-9]{4}_[a-f0-9]{64}$`
	matched, _ := regexp.MatchString(pattern, apiKey)
	return matched
}

// hashAPIKey creates a SHA-256 hash of the API key
func hashAPIKey(apiKey string) string {
	hash := sha256.Sum256([]byte(apiKey))
	return fmt.Sprintf("%x", hash)
}
