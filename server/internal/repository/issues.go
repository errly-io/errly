package repository

import (
	"context"
	"fmt"
	"strings"

	"server/internal/database"
	"server/internal/models"

	"github.com/google/uuid"
)

// IssuesRepository handles issue operations in ClickHouse
type IssuesRepository struct {
	db *database.ClickHouseDB
}

// NewIssuesRepository creates a new issues repository
func NewIssuesRepository(db *database.ClickHouseDB) *IssuesRepository {
	return &IssuesRepository{db: db}
}

// GetIssues retrieves issues with pagination and filtering
func (r *IssuesRepository) GetIssues(ctx context.Context, query *models.IssuesQuery) (*models.IssuesResponse, error) {
	// Build WHERE conditions
	var conditions []string
	var args []interface{}
	argIndex := 1

	if query.ProjectID != nil {
		conditions = append(conditions, fmt.Sprintf("project_id = $%d", argIndex))
		args = append(args, *query.ProjectID)
		argIndex++
	}

	if query.Status != nil && *query.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, string(*query.Status))
		argIndex++
	}

	if query.Level != nil && *query.Level != "" {
		conditions = append(conditions, fmt.Sprintf("level = $%d", argIndex))
		args = append(args, string(*query.Level))
		argIndex++
	}

	if query.Environment != nil && *query.Environment != "" {
		conditions = append(conditions, fmt.Sprintf("has(environments, $%d)", argIndex))
		args = append(args, *query.Environment)
		argIndex++
	}

	if query.Search != nil && *query.Search != "" {
		conditions = append(conditions, fmt.Sprintf("positionCaseInsensitive(message, $%d) > 0", argIndex))
		args = append(args, *query.Search)
		argIndex++
	}

	// Add time range condition
	if query.TimeRange != nil {
		timeCondition := getTimeRangeCondition(*query.TimeRange)
		if timeCondition != "" {
			// For issues, we filter by last_seen
			timeCondition = strings.Replace(timeCondition, "timestamp", "last_seen", 1)
			conditions = append(conditions, timeCondition)
		}
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total issues
	countQuery := fmt.Sprintf("SELECT count() FROM issues %s", whereClause)
	row := r.db.QueryRow(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count issues: %w", err)
	}

	// Get statistics for different statuses
	stats, err := r.getIssuesStats(ctx, query.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues stats: %w", err)
	}

	// Calculate pagination
	offset := (query.Page - 1) * query.Limit

	// Build ORDER BY clause
	orderBy := "last_seen DESC" // default
	if query.SortBy != "" {
		direction := "DESC"
		if query.SortOrder == "asc" {
			direction = "ASC"
		}
		orderBy = fmt.Sprintf("%s %s", query.SortBy, direction)
	}

	// Get issues
	dataQuery := fmt.Sprintf(`
		SELECT
			id, project_id, fingerprint, message, level, status,
			first_seen, last_seen, event_count, user_count, environments, tags
		FROM issues
		%s
		ORDER BY %s
		LIMIT %d OFFSET %d
	`, whereClause, orderBy, query.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query issues: %w", err)
	}
	defer rows.Close()

	var issues []models.Issue
	for rows.Next() {
		var issue models.Issue
		var level, status string

		err := rows.Scan(
			&issue.ID,
			&issue.ProjectID,
			&issue.Fingerprint,
			&issue.Message,
			&level,
			&status,
			&issue.FirstSeen,
			&issue.LastSeen,
			&issue.EventCount,
			&issue.UserCount,
			&issue.Environments,
			&issue.Tags,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan issue: %w", err)
		}

		issue.Level = models.ErrorLevel(level)
		issue.Status = models.IssueStatus(status)
		issues = append(issues, issue)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating issues: %w", err)
	}

	response := &models.IssuesResponse{
		Data:    issues,
		Total:   total,
		Page:    query.Page,
		Limit:   query.Limit,
		Stats:   *stats,
		HasNext: offset+query.Limit < total,
		HasPrev: query.Page > 1,
	}

	return response, nil
}

// GetIssueByID retrieves a single issue by ID
func (r *IssuesRepository) GetIssueByID(ctx context.Context, issueID string) (*models.Issue, error) {
	query := `
		SELECT
			id, project_id, fingerprint, message, level, status,
			first_seen, last_seen, event_count, user_count, environments, tags
		FROM issues
		WHERE id = $1
		LIMIT 1
	`

	row := r.db.QueryRow(ctx, query, issueID)

	var issue models.Issue
	var level, status string

	err := row.Scan(
		&issue.ID,
		&issue.ProjectID,
		&issue.Fingerprint,
		&issue.Message,
		&level,
		&status,
		&issue.FirstSeen,
		&issue.LastSeen,
		&issue.EventCount,
		&issue.UserCount,
		&issue.Environments,
		&issue.Tags,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue by ID: %w", err)
	}

	issue.Level = models.ErrorLevel(level)
	issue.Status = models.IssueStatus(status)

	return &issue, nil
}

// UpdateIssueStatus updates the status of an issue
func (r *IssuesRepository) UpdateIssueStatus(ctx context.Context, issueID string, status models.IssueStatus) error {
	query := `
		ALTER TABLE issues
		UPDATE status = $2, updated_at = now64()
		WHERE id = $1
	`

	err := r.db.Exec(ctx, query, issueID, string(status))
	if err != nil {
		return fmt.Errorf("failed to update issue status: %w", err)
	}

	return nil
}

// GetIssueTimeSeries retrieves time series data for an issue
func (r *IssuesRepository) GetIssueTimeSeries(ctx context.Context, issueID string, timeRange string) ([]map[string]interface{}, error) {
	// First get the issue to get its fingerprint
	issue, err := r.GetIssueByID(ctx, issueID)
	if err != nil {
		return nil, fmt.Errorf("failed to get issue: %w", err)
	}

	timeCondition := getTimeRangeCondition(timeRange)

	query := fmt.Sprintf(`
		SELECT
			toStartOfHour(timestamp) as timestamp,
			count() as count
		FROM error_events
		WHERE fingerprint = $1 AND %s
		GROUP BY timestamp
		ORDER BY timestamp
	`, timeCondition)

	rows, err := r.db.Query(ctx, query, issue.Fingerprint)
	if err != nil {
		return nil, fmt.Errorf("failed to query time series: %w", err)
	}
	defer rows.Close()

	var timeSeries []map[string]interface{}
	for rows.Next() {
		var timestamp string
		var count uint64

		err := rows.Scan(&timestamp, &count)
		if err != nil {
			return nil, fmt.Errorf("failed to scan time series: %w", err)
		}

		timeSeries = append(timeSeries, map[string]interface{}{
			"timestamp": timestamp,
			"count":     count,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating time series: %w", err)
	}

	return timeSeries, nil
}

// getIssuesStats retrieves statistics for issues by status
func (r *IssuesRepository) getIssuesStats(ctx context.Context, projectID *uuid.UUID) (*struct {
	TotalIssues      int `json:"total_issues"`
	UnresolvedIssues int `json:"unresolved_issues"`
	ResolvedIssues   int `json:"resolved_issues"`
	IgnoredIssues    int `json:"ignored_issues"`
}, error) {
	var query string
	var args []interface{}

	if projectID != nil {
		query = `
			SELECT
				count() as total_issues,
				countIf(status = 'unresolved') as unresolved_issues,
				countIf(status = 'resolved') as resolved_issues,
				countIf(status = 'ignored') as ignored_issues
			FROM issues
			WHERE project_id = $1
		`
		args = append(args, *projectID)
	} else {
		query = `
			SELECT
				count() as total_issues,
				countIf(status = 'unresolved') as unresolved_issues,
				countIf(status = 'resolved') as resolved_issues,
				countIf(status = 'ignored') as ignored_issues
			FROM issues
		`
	}

	row := r.db.QueryRow(ctx, query, args...)

	stats := &struct {
		TotalIssues      int `json:"total_issues"`
		UnresolvedIssues int `json:"unresolved_issues"`
		ResolvedIssues   int `json:"resolved_issues"`
		IgnoredIssues    int `json:"ignored_issues"`
	}{}

	err := row.Scan(
		&stats.TotalIssues,
		&stats.UnresolvedIssues,
		&stats.ResolvedIssues,
		&stats.IgnoredIssues,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get issues stats: %w", err)
	}

	return stats, nil
}

// InsertIssue inserts a new issue into ClickHouse
func (r *IssuesRepository) InsertIssue(ctx context.Context, issue *models.Issue) error {
	query := `
		INSERT INTO issues (
			id, project_id, fingerprint, message, level, status,
			first_seen, last_seen, event_count, user_count, environments, tags, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	return r.db.Exec(ctx, query,
		issue.ID,
		issue.ProjectID,
		issue.Fingerprint,
		issue.Message,
		string(issue.Level),
		string(issue.Status),
		issue.FirstSeen,
		issue.LastSeen,
		issue.EventCount,
		issue.UserCount,
		issue.Environments,
		issue.Tags,
		issue.UpdatedAt,
	)
}

// UpdateIssue updates an existing issue in ClickHouse
func (r *IssuesRepository) UpdateIssue(ctx context.Context, issue *models.Issue) error {
	query := `
		ALTER TABLE issues
		UPDATE
			last_seen = $2,
			event_count = $3,
			user_count = $4,
			environments = $5,
			updated_at = $6
		WHERE id = $1
	`

	return r.db.Exec(ctx, query,
		issue.ID,
		issue.LastSeen,
		issue.EventCount,
		issue.UserCount,
		issue.Environments,
		issue.UpdatedAt,
	)
}
