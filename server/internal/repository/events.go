package repository

import (
	"context"
	"crypto/md5"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"server/internal/database"
	"server/internal/models"
)

// EventsRepository handles event operations in ClickHouse
type EventsRepository struct {
	db *database.ClickHouseDB
}

// NewEventsRepository creates a new events repository
func NewEventsRepository(db *database.ClickHouseDB) *EventsRepository {
	return &EventsRepository{db: db}
}

// InsertEvents inserts multiple events into ClickHouse
func (r *EventsRepository) InsertEvents(ctx context.Context, events []*models.ErrorEvent) error {
	if len(events) == 0 {
		return nil
	}

	// Prepare batch insert
	batch, err := r.db.PrepareBatch(ctx, `
		INSERT INTO error_events (
			id, project_id, timestamp, message, stack_trace, environment,
			release_version, user_id, user_email, user_ip, browser, os, url,
			tags, extra, fingerprint, level, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare batch: %w", err)
	}

	// Add events to batch
	for _, event := range events {
		err := batch.Append(
			event.ID,
			event.ProjectID,
			event.Timestamp,
			event.Message,
			event.StackTrace,
			event.Environment,
			event.ReleaseVersion,
			event.UserID,
			event.UserEmail,
			event.UserIP,
			event.Browser,
			event.OS,
			event.URL,
			event.Tags,
			event.Extra,
			event.Fingerprint,
			string(event.Level),
			event.CreatedAt,
		)
		if err != nil {
			return fmt.Errorf("failed to append event to batch: %w", err)
		}
	}

	// Execute batch
	if err := batch.Send(); err != nil {
		return fmt.Errorf("failed to send batch: %w", err)
	}

	return nil
}

// GetEvents retrieves events with pagination and filtering
func (r *EventsRepository) GetEvents(ctx context.Context, query *models.EventsQuery) (*models.EventsResponse, error) {
	// Build WHERE conditions
	var conditions []string
	var args []interface{}
	argIndex := 1

	if query.ProjectID != nil {
		conditions = append(conditions, fmt.Sprintf("project_id = $%d", argIndex))
		args = append(args, *query.ProjectID)
		argIndex++
	}

	if query.Environment != nil && *query.Environment != "" {
		conditions = append(conditions, fmt.Sprintf("environment = $%d", argIndex))
		args = append(args, *query.Environment)
		argIndex++
	}

	if query.UserID != nil && *query.UserID != "" {
		conditions = append(conditions, fmt.Sprintf("user_id = $%d", argIndex))
		args = append(args, *query.UserID)
		argIndex++
	}

	// Add time range condition
	if query.TimeRange != nil {
		timeCondition := getTimeRangeCondition(*query.TimeRange)
		if timeCondition != "" {
			conditions = append(conditions, timeCondition)
		}
	}

	// If issue_id is provided, get fingerprint and filter by it
	if query.IssueID != nil && *query.IssueID != "" {
		// Get issue fingerprint
		fingerprintQuery := `SELECT fingerprint FROM issues WHERE id = $1 LIMIT 1`
		row := r.db.QueryRow(ctx, fingerprintQuery, *query.IssueID)

		var fingerprint string
		if err := row.Scan(&fingerprint); err != nil {
			return nil, fmt.Errorf("failed to get issue fingerprint: %w", err)
		}

		conditions = append(conditions, fmt.Sprintf("fingerprint = $%d", argIndex))
		args = append(args, fingerprint)
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total events
	countQuery := fmt.Sprintf("SELECT count() FROM error_events %s", whereClause)
	row := r.db.QueryRow(ctx, countQuery, args...)

	var total int
	if err := row.Scan(&total); err != nil {
		return nil, fmt.Errorf("failed to count events: %w", err)
	}

	// Calculate pagination
	offset := (query.Page - 1) * query.Limit

	// Get events
	dataQuery := fmt.Sprintf(`
		SELECT 
			id, project_id, timestamp, message, stack_trace, environment,
			release_version, user_id, user_email, user_ip, browser, os, url,
			tags, extra, fingerprint, level
		FROM error_events
		%s
		ORDER BY timestamp DESC
		LIMIT %d OFFSET %d
	`, whereClause, query.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	var events []models.ErrorEvent
	for rows.Next() {
		var event models.ErrorEvent
		var level string

		err := rows.Scan(
			&event.ID,
			&event.ProjectID,
			&event.Timestamp,
			&event.Message,
			&event.StackTrace,
			&event.Environment,
			&event.ReleaseVersion,
			&event.UserID,
			&event.UserEmail,
			&event.UserIP,
			&event.Browser,
			&event.OS,
			&event.URL,
			&event.Tags,
			&event.Extra,
			&event.Fingerprint,
			&level,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %w", err)
		}

		event.Level = models.ErrorLevel(level)
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating events: %w", err)
	}

	return &models.EventsResponse{
		Data:    events,
		Total:   total,
		Page:    query.Page,
		Limit:   query.Limit,
		HasNext: offset+query.Limit < total,
		HasPrev: query.Page > 1,
	}, nil
}

// GetProjectStats retrieves aggregated statistics for a project
func (r *EventsRepository) GetProjectStats(ctx context.Context, projectID uuid.UUID, timeRange string) (*models.ProjectStats, error) {
	timeCondition := getTimeRangeCondition(timeRange)

	query := fmt.Sprintf(`
		SELECT 
			'%s' as project_id,
			count() as total_events,
			uniq(fingerprint) as total_issues,
			countIf(level = 'error') as error_events,
			uniq(user_id) as affected_users,
			max(timestamp) as last_event
		FROM error_events
		WHERE project_id = $1 AND %s
	`, projectID.String(), timeCondition)

	row := r.db.QueryRow(ctx, query, projectID)

	var stats models.ProjectStats
	var lastEvent *time.Time

	err := row.Scan(
		&stats.ProjectID,
		&stats.TotalEvents,
		&stats.TotalIssues,
		&stats.UnresolvedIssues, // Using error_events as proxy for unresolved
		&stats.AffectedUsers,
		&lastEvent,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get project stats: %w", err)
	}

	stats.LastEvent = lastEvent

	// Calculate error rate
	if stats.TotalEvents > 0 {
		stats.ErrorRate = (float64(stats.UnresolvedIssues) / float64(stats.TotalEvents)) * 100
	}

	return &stats, nil
}

// GenerateFingerprint generates a fingerprint for an event
func (r *EventsRepository) GenerateFingerprint(event *models.IngestEvent) string {
	// Create fingerprint based on message and stack trace
	fingerprintData := event.Message
	if event.StackTrace != nil {
		// Use first few lines of stack trace for fingerprint
		lines := strings.Split(*event.StackTrace, "\n")
		if len(lines) > 3 {
			lines = lines[:3]
		}
		fingerprintData += strings.Join(lines, "\n")
	}

	// Add environment to make fingerprints environment-specific
	fingerprintData += event.Environment

	// Generate MD5 hash
	hash := md5.Sum([]byte(fingerprintData))
	return fmt.Sprintf("%x", hash)
}

// getTimeRangeCondition returns a ClickHouse condition for time range filtering
func getTimeRangeCondition(timeRange string) string {
	switch timeRange {
	case "1h":
		return "timestamp >= now() - INTERVAL 1 HOUR"
	case "24h":
		return "timestamp >= now() - INTERVAL 24 HOUR"
	case "7d":
		return "timestamp >= now() - INTERVAL 7 DAY"
	case "30d":
		return "timestamp >= now() - INTERVAL 30 DAY"
	default:
		return "timestamp >= now() - INTERVAL 24 HOUR"
	}
}
