package models

import (
	"time"

	"github.com/google/uuid"
)

// ErrorLevel represents the severity level of an error
type ErrorLevel string

const (
	LevelError   ErrorLevel = "error"
	LevelWarning ErrorLevel = "warning"
	LevelInfo    ErrorLevel = "info"
	LevelDebug   ErrorLevel = "debug"
)

// IssueStatus represents the status of an issue
type IssueStatus string

const (
	StatusUnresolved IssueStatus = "unresolved"
	StatusResolved   IssueStatus = "resolved"
	StatusIgnored    IssueStatus = "ignored"
)

// ErrorEvent represents a single error event from the client
type ErrorEvent struct {
	ID             string                 `json:"id"`
	ProjectID      uuid.UUID              `json:"project_id"`
	Timestamp      time.Time              `json:"timestamp"`
	Message        string                 `json:"message"`
	StackTrace     *string                `json:"stack_trace,omitempty"`
	Environment    string                 `json:"environment"`
	ReleaseVersion *string                `json:"release_version,omitempty"`
	UserID         *string                `json:"user_id,omitempty"`
	UserEmail      *string                `json:"user_email,omitempty"`
	UserIP         *string                `json:"user_ip,omitempty"`
	Browser        *string                `json:"browser,omitempty"`
	OS             *string                `json:"os,omitempty"`
	URL            *string                `json:"url,omitempty"`
	Tags           map[string]string      `json:"tags"`
	Extra          map[string]interface{} `json:"extra"`
	Fingerprint    string                 `json:"fingerprint"`
	Level          ErrorLevel             `json:"level"`
	CreatedAt      time.Time              `json:"created_at"`
}

// Issue represents an aggregated issue
type Issue struct {
	ID           string            `json:"id"`
	ProjectID    uuid.UUID         `json:"project_id"`
	Fingerprint  string            `json:"fingerprint"`
	Message      string            `json:"message"`
	Level        ErrorLevel        `json:"level"`
	Status       IssueStatus       `json:"status"`
	FirstSeen    time.Time         `json:"first_seen"`
	LastSeen     time.Time         `json:"last_seen"`
	EventCount   uint64            `json:"event_count"`
	UserCount    uint64            `json:"user_count"`
	Environments []string          `json:"environments"`
	Tags         map[string]string `json:"tags"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

// IngestRequest represents the request payload for event ingestion
type IngestRequest struct {
	Events []IngestEvent `json:"events" binding:"required,min=1,max=100"`
}

// IngestEvent represents a single event in the ingestion request
type IngestEvent struct {
	Message        string                 `json:"message" binding:"required"`
	StackTrace     *string                `json:"stack_trace,omitempty"`
	Environment    string                 `json:"environment" binding:"required"`
	ReleaseVersion *string                `json:"release_version,omitempty"`
	UserID         *string                `json:"user_id,omitempty"`
	UserEmail      *string                `json:"user_email,omitempty"`
	UserIP         *string                `json:"user_ip,omitempty"`
	Browser        *string                `json:"browser,omitempty"`
	OS             *string                `json:"os,omitempty"`
	URL            *string                `json:"url,omitempty"`
	Tags           map[string]string      `json:"tags"`
	Extra          map[string]interface{} `json:"extra"`
	Level          ErrorLevel             `json:"level"`
	Timestamp      *time.Time             `json:"timestamp,omitempty"`
}

// ProjectStats represents aggregated statistics for a project
type ProjectStats struct {
	ProjectID        uuid.UUID  `json:"project_id"`
	TotalEvents      uint64     `json:"total_events"`
	TotalIssues      uint64     `json:"total_issues"`
	UnresolvedIssues uint64     `json:"unresolved_issues"`
	AffectedUsers    uint64     `json:"affected_users"`
	ErrorRate        float64    `json:"error_rate"`
	LastEvent        *time.Time `json:"last_event"`
}

// IssuesQuery represents query parameters for fetching issues
type IssuesQuery struct {
	ProjectID   *uuid.UUID   `form:"project_id"`
	Status      *IssueStatus `form:"status"`
	Environment *string      `form:"environment"`
	Level       *ErrorLevel  `form:"level"`
	Search      *string      `form:"search"`
	TimeRange   *string      `form:"time_range"`
	Page        int          `form:"page,default=1"`
	Limit       int          `form:"limit,default=50"`
	SortBy      string       `form:"sort_by,default=last_seen"`
	SortOrder   string       `form:"sort_order,default=desc"`
}

// EventsQuery represents query parameters for fetching events
type EventsQuery struct {
	IssueID     *string    `form:"issue_id"`
	ProjectID   *uuid.UUID `form:"project_id"`
	Environment *string    `form:"environment"`
	UserID      *string    `form:"user_id"`
	TimeRange   *string    `form:"time_range"`
	Page        int        `form:"page,default=1"`
	Limit       int        `form:"limit,default=100"`
}

// PaginatedResponse represents a paginated response
type PaginatedResponse[T any] struct {
	Data    []T  `json:"data"`
	Total   int  `json:"total"`
	Page    int  `json:"page"`
	Limit   int  `json:"limit"`
	HasNext bool `json:"has_next"`
	HasPrev bool `json:"has_prev"`
}

// IssuesResponse represents the response for issues endpoint
type IssuesResponse struct {
	Data  []Issue `json:"data"`
	Total int     `json:"total"`
	Page  int     `json:"page"`
	Limit int     `json:"limit"`
	Stats struct {
		TotalIssues      int `json:"total_issues"`
		UnresolvedIssues int `json:"unresolved_issues"`
		ResolvedIssues   int `json:"resolved_issues"`
		IgnoredIssues    int `json:"ignored_issues"`
	} `json:"stats"`
	HasNext bool `json:"has_next"`
	HasPrev bool `json:"has_prev"`
}

// EventsResponse represents the response for events endpoint
type EventsResponse struct {
	Data    []ErrorEvent `json:"data"`
	Total   int          `json:"total"`
	Page    int          `json:"page"`
	Limit   int          `json:"limit"`
	Issue   *Issue       `json:"issue,omitempty"`
	HasNext bool         `json:"has_next"`
	HasPrev bool         `json:"has_prev"`
}
