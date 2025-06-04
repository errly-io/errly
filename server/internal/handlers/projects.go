package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"server/internal/middleware"
	"server/internal/models"
	"server/internal/repository"
)

// ProjectsHandler handles project-related endpoints
type ProjectsHandler struct {
	projectsRepo *repository.ProjectsRepository
	eventsRepo   *repository.EventsRepository
	issuesRepo   *repository.IssuesRepository
}

// NewProjectsHandler creates a new projects handler
func NewProjectsHandler(
	projectsRepo *repository.ProjectsRepository,
	eventsRepo *repository.EventsRepository,
	issuesRepo *repository.IssuesRepository,
) *ProjectsHandler {
	return &ProjectsHandler{
		projectsRepo: projectsRepo,
		eventsRepo:   eventsRepo,
		issuesRepo:   issuesRepo,
	}
}

// GetProject handles GET /api/v1/projects/:id
func (h *ProjectsHandler) GetProject(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	projectIDStr := c.Param("id")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
			"code":  "MISSING_PROJECT_ID",
		})
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID format",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	// Verify user has access to the project
	if projectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to project",
			"code":  "PROJECT_ACCESS_DENIED",
		})
		return
	}

	c.JSON(http.StatusOK, authCtx.Project)
}

// GetProjectStats handles GET /api/v1/projects/:id/stats
func (h *ProjectsHandler) GetProjectStats(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	projectIDStr := c.Param("id")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
			"code":  "MISSING_PROJECT_ID",
		})
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID format",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	// Verify user has access to the project
	if projectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to project",
			"code":  "PROJECT_ACCESS_DENIED",
		})
		return
	}

	timeRange := c.DefaultQuery("time_range", "24h")

	// Get project statistics
	ctx := c.Request.Context()
	stats, err := h.eventsRepo.GetProjectStats(ctx, projectID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get project statistics",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetProjectIssues handles GET /api/v1/projects/:id/issues
func (h *ProjectsHandler) GetProjectIssues(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	projectIDStr := c.Param("id")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
			"code":  "MISSING_PROJECT_ID",
		})
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID format",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	// Verify user has access to the project
	if projectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to project",
			"code":  "PROJECT_ACCESS_DENIED",
		})
		return
	}

	// Parse query parameters
	var query models.IssuesQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid query parameters",
			"code":    "INVALID_QUERY_PARAMS",
			"details": err.Error(),
		})
		return
	}

	// Set project ID
	query.ProjectID = &projectID

	// Validate pagination
	if query.Page < 1 {
		query.Page = 1
	}
	if query.Limit < 1 || query.Limit > 100 {
		query.Limit = 50
	}

	// Get issues
	ctx := c.Request.Context()
	response, err := h.issuesRepo.GetIssues(ctx, &query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get project issues",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetProjectEvents handles GET /api/v1/projects/:id/events
func (h *ProjectsHandler) GetProjectEvents(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	projectIDStr := c.Param("id")
	if projectIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Project ID is required",
			"code":  "MISSING_PROJECT_ID",
		})
		return
	}

	projectID, err := uuid.Parse(projectIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid project ID format",
			"code":  "INVALID_PROJECT_ID",
		})
		return
	}

	// Verify user has access to the project
	if projectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to project",
			"code":  "PROJECT_ACCESS_DENIED",
		})
		return
	}

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	environment := c.Query("environment")
	userID := c.Query("user_id")
	timeRange := c.Query("time_range")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 100
	}

	// Build events query
	eventsQuery := &models.EventsQuery{
		ProjectID: &projectID,
		Page:      page,
		Limit:     limit,
	}

	if environment != "" {
		eventsQuery.Environment = &environment
	}
	if userID != "" {
		eventsQuery.UserID = &userID
	}
	if timeRange != "" {
		eventsQuery.TimeRange = &timeRange
	}

	// Get events
	ctx := c.Request.Context()
	response, err := h.eventsRepo.GetEvents(ctx, eventsQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get project events",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// ValidateAPIKey handles POST /api/v1/auth/validate
func (h *ProjectsHandler) ValidateAPIKey(c *gin.Context) {
	// Get auth context (this endpoint is called after auth middleware)
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"api_key": gin.H{
			"id":           authCtx.APIKey.ID,
			"name":         authCtx.APIKey.Name,
			"scopes":       authCtx.APIKey.Scopes,
			"expires_at":   authCtx.APIKey.ExpiresAt,
			"last_used_at": authCtx.APIKey.LastUsedAt,
		},
		"project": gin.H{
			"id":       authCtx.Project.ID,
			"name":     authCtx.Project.Name,
			"slug":     authCtx.Project.Slug,
			"platform": authCtx.Project.Platform,
		},
	})
}
