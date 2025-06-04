package services

import (
	"context"
	"fmt"
	"time"

	"server/internal/models"
	"server/internal/repository"

	"github.com/google/uuid"
)

// IngestService handles event ingestion logic
type IngestService struct {
	eventsRepo *repository.EventsRepository
	issuesRepo *repository.IssuesRepository
}

// NewIngestService creates a new ingest service
func NewIngestService(eventsRepo *repository.EventsRepository, issuesRepo *repository.IssuesRepository) *IngestService {
	return &IngestService{
		eventsRepo: eventsRepo,
		issuesRepo: issuesRepo,
	}
}

// ProcessEvents processes incoming events and creates/updates issues
func (s *IngestService) ProcessEvents(ctx context.Context, projectID uuid.UUID, ingestEvents []models.IngestEvent) error {
	if len(ingestEvents) == 0 {
		return nil
	}

	// Convert ingest events to error events
	var errorEvents []*models.ErrorEvent
	fingerprintMap := make(map[string][]*models.ErrorEvent)

	for _, ingestEvent := range ingestEvents {
		// Generate fingerprint for grouping
		fingerprint := s.eventsRepo.GenerateFingerprint(&ingestEvent)

		// Create error event
		errorEvent := &models.ErrorEvent{
			ID:             uuid.New().String(),
			ProjectID:      projectID,
			Timestamp:      time.Now(),
			Message:        ingestEvent.Message,
			StackTrace:     ingestEvent.StackTrace,
			Environment:    ingestEvent.Environment,
			ReleaseVersion: ingestEvent.ReleaseVersion,
			UserID:         ingestEvent.UserID,
			UserEmail:      ingestEvent.UserEmail,
			UserIP:         ingestEvent.UserIP,
			Browser:        ingestEvent.Browser,
			OS:             ingestEvent.OS,
			URL:            ingestEvent.URL,
			Tags:           ingestEvent.Tags,
			Extra:          ingestEvent.Extra,
			Fingerprint:    fingerprint,
			Level:          ingestEvent.Level,
			CreatedAt:      time.Now(),
		}

		// Use provided timestamp if available
		if ingestEvent.Timestamp != nil {
			errorEvent.Timestamp = *ingestEvent.Timestamp
		}

		// Initialize maps if nil
		if errorEvent.Tags == nil {
			errorEvent.Tags = make(map[string]string)
		}
		if errorEvent.Extra == nil {
			errorEvent.Extra = make(map[string]interface{})
		}

		errorEvents = append(errorEvents, errorEvent)
		fingerprintMap[fingerprint] = append(fingerprintMap[fingerprint], errorEvent)
	}

	// Insert events into ClickHouse
	if err := s.eventsRepo.InsertEvents(ctx, errorEvents); err != nil {
		return fmt.Errorf("failed to insert events: %w", err)
	}

	// Process issues (create or update)
	if err := s.processIssues(ctx, projectID, fingerprintMap); err != nil {
		return fmt.Errorf("failed to process issues: %w", err)
	}

	return nil
}

// processIssues creates or updates issues based on fingerprints
func (s *IngestService) processIssues(ctx context.Context, projectID uuid.UUID, fingerprintMap map[string][]*models.ErrorEvent) error {
	for fingerprint, events := range fingerprintMap {
		if len(events) == 0 {
			continue
		}

		// Check if issue already exists
		existingIssue, err := s.getIssueByFingerprint(ctx, projectID, fingerprint)
		if err != nil {
			return fmt.Errorf("failed to check existing issue: %w", err)
		}

		if existingIssue != nil {
			// Update existing issue
			if err := s.updateExistingIssue(ctx, existingIssue, events); err != nil {
				return fmt.Errorf("failed to update existing issue: %w", err)
			}
		} else {
			// Create new issue
			if err := s.createNewIssue(ctx, projectID, fingerprint, events); err != nil {
				return fmt.Errorf("failed to create new issue: %w", err)
			}
		}
	}

	return nil
}

// getIssueByFingerprint retrieves an issue by fingerprint
func (s *IngestService) getIssueByFingerprint(ctx context.Context, projectID uuid.UUID, fingerprint string) (*models.Issue, error) {
	query := &models.IssuesQuery{
		ProjectID: &projectID,
		Page:      1,
		Limit:     1,
	}

	// This is a simplified approach - in a real implementation, you'd want a direct fingerprint lookup
	response, err := s.issuesRepo.GetIssues(ctx, query)
	if err != nil {
		return nil, err
	}

	// Find issue with matching fingerprint
	for _, issue := range response.Data {
		if issue.Fingerprint == fingerprint {
			return &issue, nil
		}
	}

	return nil, nil
}

// createNewIssue creates a new issue
func (s *IngestService) createNewIssue(ctx context.Context, projectID uuid.UUID, fingerprint string, events []*models.ErrorEvent) error {
	firstEvent := events[0]

	// Collect unique environments
	envMap := make(map[string]bool)
	userMap := make(map[string]bool)

	for _, event := range events {
		envMap[event.Environment] = true
		if event.UserID != nil {
			userMap[*event.UserID] = true
		}
	}

	environments := make([]string, 0, len(envMap))
	for env := range envMap {
		environments = append(environments, env)
	}

	// Create issue
	issue := &models.Issue{
		ID:           uuid.New().String(),
		ProjectID:    projectID,
		Fingerprint:  fingerprint,
		Message:      firstEvent.Message,
		Level:        firstEvent.Level,
		Status:       models.StatusUnresolved,
		FirstSeen:    firstEvent.Timestamp,
		LastSeen:     firstEvent.Timestamp,
		EventCount:   uint64(len(events)),
		UserCount:    uint64(len(userMap)),
		Environments: environments,
		Tags:         firstEvent.Tags,
		UpdatedAt:    time.Now(),
	}

	// Find latest timestamp
	for _, event := range events {
		if event.Timestamp.After(issue.LastSeen) {
			issue.LastSeen = event.Timestamp
		}
		if event.Timestamp.Before(issue.FirstSeen) {
			issue.FirstSeen = event.Timestamp
		}
	}

	// Insert issue into ClickHouse
	return s.insertIssue(ctx, issue)
}

// updateExistingIssue updates an existing issue with new events
func (s *IngestService) updateExistingIssue(ctx context.Context, issue *models.Issue, events []*models.ErrorEvent) error {
	// Update counters and timestamps
	userMap := make(map[string]bool)
	envMap := make(map[string]bool)

	// Add existing environments
	for _, env := range issue.Environments {
		envMap[env] = true
	}

	latestTimestamp := issue.LastSeen

	for _, event := range events {
		if event.UserID != nil {
			userMap[*event.UserID] = true
		}
		envMap[event.Environment] = true

		if event.Timestamp.After(latestTimestamp) {
			latestTimestamp = event.Timestamp
		}
	}

	// Update environments
	environments := make([]string, 0, len(envMap))
	for env := range envMap {
		environments = append(environments, env)
	}

	// Update issue
	updatedIssue := &models.Issue{
		ID:           issue.ID,
		ProjectID:    issue.ProjectID,
		Fingerprint:  issue.Fingerprint,
		Message:      issue.Message,
		Level:        issue.Level,
		Status:       issue.Status,
		FirstSeen:    issue.FirstSeen,
		LastSeen:     latestTimestamp,
		EventCount:   issue.EventCount + uint64(len(events)),
		UserCount:    issue.UserCount + uint64(len(userMap)),
		Environments: environments,
		Tags:         issue.Tags,
		UpdatedAt:    time.Now(),
	}

	return s.updateIssue(ctx, updatedIssue)
}

// insertIssue inserts a new issue into ClickHouse
func (s *IngestService) insertIssue(ctx context.Context, issue *models.Issue) error {
	return s.issuesRepo.InsertIssue(ctx, issue)
}

// updateIssue updates an existing issue in ClickHouse
func (s *IngestService) updateIssue(ctx context.Context, issue *models.Issue) error {
	return s.issuesRepo.UpdateIssue(ctx, issue)
}
