package handlers

import (
	"net/http"
	"strconv"

	"server/internal/middleware"
	"server/internal/models"
	"server/internal/repository"

	"github.com/gin-gonic/gin"
)

// IssuesHandler handles issues-related endpoints
type IssuesHandler struct {
	issuesRepo *repository.IssuesRepository
	eventsRepo *repository.EventsRepository
}

// NewIssuesHandler creates a new issues handler
func NewIssuesHandler(issuesRepo *repository.IssuesRepository, eventsRepo *repository.EventsRepository) *IssuesHandler {
	return &IssuesHandler{
		issuesRepo: issuesRepo,
		eventsRepo: eventsRepo,
	}
}

// GetIssues handles GET /api/v1/issues
func (h *IssuesHandler) GetIssues(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
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

	// Set project ID from auth context if not provided
	if query.ProjectID == nil {
		query.ProjectID = &authCtx.Project.ID
	} else {
		// Verify user has access to the requested project
		if *query.ProjectID != authCtx.Project.ID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Access denied to project",
				"code":  "PROJECT_ACCESS_DENIED",
			})
			return
		}
	}

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
			"error": "Failed to get issues",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetIssue handles GET /api/v1/issues/:id
func (h *IssuesHandler) GetIssue(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	issueID := c.Param("id")
	if issueID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Issue ID is required",
			"code":  "MISSING_ISSUE_ID",
		})
		return
	}

	// Get issue
	ctx := c.Request.Context()
	issue, err := h.issuesRepo.GetIssueByID(ctx, issueID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get issue",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if issue == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Issue not found",
			"code":  "ISSUE_NOT_FOUND",
		})
		return
	}

	// Verify user has access to the issue's project
	if issue.ProjectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to issue",
			"code":  "ISSUE_ACCESS_DENIED",
		})
		return
	}

	c.JSON(http.StatusOK, issue)
}

// UpdateIssueStatus handles PATCH /api/v1/issues/:id/status
func (h *IssuesHandler) UpdateIssueStatus(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	issueID := c.Param("id")
	if issueID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Issue ID is required",
			"code":  "MISSING_ISSUE_ID",
		})
		return
	}

	// Parse request body
	var request struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	// Validate status
	var status models.IssueStatus
	switch request.Status {
	case "unresolved":
		status = models.StatusUnresolved
	case "resolved":
		status = models.StatusResolved
	case "ignored":
		status = models.StatusIgnored
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error":          "Invalid status",
			"code":           "INVALID_STATUS",
			"valid_statuses": []string{"unresolved", "resolved", "ignored"},
		})
		return
	}

	// Get issue to verify access
	ctx := c.Request.Context()
	issue, err := h.issuesRepo.GetIssueByID(ctx, issueID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get issue",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if issue == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Issue not found",
			"code":  "ISSUE_NOT_FOUND",
		})
		return
	}

	// Verify user has access to the issue's project
	if issue.ProjectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to issue",
			"code":  "ISSUE_ACCESS_DENIED",
		})
		return
	}

	// Update status
	if err := h.issuesRepo.UpdateIssueStatus(ctx, issueID, status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update issue status",
			"code":  "UPDATE_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Issue status updated successfully",
		"issue_id":   issueID,
		"new_status": string(status),
	})
}

// GetIssueTimeSeries handles GET /api/v1/issues/:id/timeseries
func (h *IssuesHandler) GetIssueTimeSeries(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	issueID := c.Param("id")
	if issueID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Issue ID is required",
			"code":  "MISSING_ISSUE_ID",
		})
		return
	}

	timeRange := c.DefaultQuery("time_range", "24h")

	// Get issue to verify access
	ctx := c.Request.Context()
	issue, err := h.issuesRepo.GetIssueByID(ctx, issueID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get issue",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if issue == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Issue not found",
			"code":  "ISSUE_NOT_FOUND",
		})
		return
	}

	// Verify user has access to the issue's project
	if issue.ProjectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to issue",
			"code":  "ISSUE_ACCESS_DENIED",
		})
		return
	}

	// Get time series data
	timeSeries, err := h.issuesRepo.GetIssueTimeSeries(ctx, issueID, timeRange)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get time series",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"issue_id":   issueID,
		"time_range": timeRange,
		"data":       timeSeries,
	})
}

// GetIssueEvents handles GET /api/v1/issues/:id/events
func (h *IssuesHandler) GetIssueEvents(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	issueID := c.Param("id")
	if issueID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Issue ID is required",
			"code":  "MISSING_ISSUE_ID",
		})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Get issue to verify access
	ctx := c.Request.Context()
	issue, err := h.issuesRepo.GetIssueByID(ctx, issueID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get issue",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	if issue == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Issue not found",
			"code":  "ISSUE_NOT_FOUND",
		})
		return
	}

	// Verify user has access to the issue's project
	if issue.ProjectID != authCtx.Project.ID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Access denied to issue",
			"code":  "ISSUE_ACCESS_DENIED",
		})
		return
	}

	// Build events query
	eventsQuery := &models.EventsQuery{
		IssueID: &issueID,
		Page:    page,
		Limit:   limit,
	}

	// Get events
	response, err := h.eventsRepo.GetEvents(ctx, eventsQuery)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get events",
			"code":  "INTERNAL_ERROR",
		})
		return
	}

	// Add issue information to response
	response.Issue = issue

	c.JSON(http.StatusOK, response)
}
