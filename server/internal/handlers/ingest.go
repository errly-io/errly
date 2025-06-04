package handlers

import (
	"fmt"
	"net/http"
	"time"

	"server/internal/middleware"
	"server/internal/models"
	"server/internal/services"

	"github.com/gin-gonic/gin"
)

// IngestHandler handles event ingestion endpoints
type IngestHandler struct {
	ingestService *services.IngestService
}

// NewIngestHandler creates a new ingest handler
func NewIngestHandler(ingestService *services.IngestService) *IngestHandler {
	return &IngestHandler{
		ingestService: ingestService,
	}
}

// IngestEvents handles POST /api/v1/ingest
func (h *IngestHandler) IngestEvents(c *gin.Context) {
	// Get auth context
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	// Parse request body
	var request models.IngestRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"code":    "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	// Validate events
	if len(request.Events) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one event is required",
			"code":  "NO_EVENTS",
		})
		return
	}

	if len(request.Events) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Maximum 100 events per request",
			"code":  "TOO_MANY_EVENTS",
		})
		return
	}

	// Validate each event
	for i, event := range request.Events {
		if err := h.validateEvent(&event); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":       "Invalid event",
				"code":        "INVALID_EVENT",
				"event_index": i,
				"details":     err.Error(),
			})
			return
		}
	}

	// Process events
	ctx := c.Request.Context()
	if err := h.ingestService.ProcessEvents(ctx, authCtx.Project.ID, request.Events); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process events",
			"code":  "PROCESSING_ERROR",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "Events processed successfully",
		"processed_count": len(request.Events),
		"project_id":      authCtx.Project.ID,
		"timestamp":       time.Now().Unix(),
	})
}

// validateEvent validates a single ingest event
func (h *IngestHandler) validateEvent(event *models.IngestEvent) error {
	if event.Message == "" {
		return fmt.Errorf("message is required")
	}

	if len(event.Message) > 1000 {
		return fmt.Errorf("message too long (max 1000 characters)")
	}

	if event.Environment == "" {
		return fmt.Errorf("environment is required")
	}

	// Validate level
	validLevels := map[models.ErrorLevel]bool{
		models.LevelError:   true,
		models.LevelWarning: true,
		models.LevelInfo:    true,
		models.LevelDebug:   true,
	}

	if !validLevels[event.Level] {
		return fmt.Errorf("invalid level: %s", event.Level)
	}

	// Validate timestamp if provided
	if event.Timestamp != nil {
		now := time.Now()
		// Don't allow events from more than 7 days in the past
		if event.Timestamp.Before(now.Add(-7 * 24 * time.Hour)) {
			return fmt.Errorf("timestamp too old (max 7 days)")
		}
		// Don't allow events from the future
		if event.Timestamp.After(now.Add(1 * time.Hour)) {
			return fmt.Errorf("timestamp in the future")
		}
	}

	// Validate stack trace length
	if event.StackTrace != nil && len(*event.StackTrace) > 10000 {
		return fmt.Errorf("stack trace too long (max 10000 characters)")
	}

	// Validate tags
	if event.Tags != nil {
		if len(event.Tags) > 20 {
			return fmt.Errorf("too many tags (max 20)")
		}
		for key, value := range event.Tags {
			if len(key) > 100 {
				return fmt.Errorf("tag key too long (max 100 characters)")
			}
			if len(value) > 200 {
				return fmt.Errorf("tag value too long (max 200 characters)")
			}
		}
	}

	return nil
}

// GetIngestInfo returns information about ingestion capabilities
func (h *IngestHandler) GetIngestInfo(c *gin.Context) {
	authCtx := middleware.GetAuthContext(c)
	if authCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
			"code":  "AUTH_REQUIRED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"project_id":     authCtx.Project.ID,
		"project_name":   authCtx.Project.Name,
		"api_key_scopes": authCtx.APIKey.Scopes,
		"limits": gin.H{
			"max_events_per_request": 100,
			"max_message_length":     1000,
			"max_stack_trace_length": 10000,
			"max_tags":               20,
			"max_tag_key_length":     100,
			"max_tag_value_length":   200,
			"max_event_age_days":     7,
		},
		"supported_levels": []string{
			string(models.LevelError),
			string(models.LevelWarning),
			string(models.LevelInfo),
			string(models.LevelDebug),
		},
		"timestamp": time.Now().Unix(),
	})
}

// HealthCheck returns the health status of the ingestion service
func (h *IngestHandler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "ingest",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
	})
}
