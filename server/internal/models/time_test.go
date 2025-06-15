package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestFlexibleTime_UnmarshalJSON(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected time.Time
		wantErr  bool
	}{
		{
			name:     "RFC3339 format",
			input:    `"2023-12-01T15:04:05Z"`,
			expected: time.Date(2023, 12, 1, 15, 4, 5, 0, time.UTC),
			wantErr:  false,
		},
		{
			name:     "RFC3339 with timezone",
			input:    `"2023-12-01T15:04:05+03:00"`,
			expected: time.Date(2023, 12, 1, 12, 4, 5, 0, time.UTC),
			wantErr:  false,
		},
		{
			name:     "Python ISO with microseconds",
			input:    `"2023-12-01T15:04:05.123456"`,
			expected: time.Date(2023, 12, 1, 15, 4, 5, 123456000, time.UTC),
			wantErr:  false,
		},
		{
			name:     "Python ISO with microseconds and Z",
			input:    `"2023-12-01T15:04:05.123456Z"`,
			expected: time.Date(2023, 12, 1, 15, 4, 5, 123456000, time.UTC),
			wantErr:  false,
		},
		{
			name:     "Simple ISO without timezone",
			input:    `"2023-12-01T15:04:05"`,
			expected: time.Date(2023, 12, 1, 15, 4, 5, 0, time.UTC),
			wantErr:  false,
		},
		{
			name:    "Invalid format",
			input:   `"invalid-time"`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var ft FlexibleTime
			err := json.Unmarshal([]byte(tt.input), &ft)

			if tt.wantErr {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				return
			}

			if err != nil {
				t.Errorf("Unexpected error: %v", err)
				return
			}

			if !ft.Time.Equal(tt.expected) {
				t.Errorf("Expected %v, got %v", tt.expected, ft.Time)
			}
		})
	}
}

func TestFlexibleTime_MarshalJSON(t *testing.T) {
	ft := FlexibleTime{Time: time.Date(2023, 12, 1, 15, 4, 5, 0, time.UTC)}
	
	data, err := json.Marshal(ft)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
		return
	}

	expected := `"2023-12-01T15:04:05Z"`
	if string(data) != expected {
		t.Errorf("Expected %s, got %s", expected, string(data))
	}
}

func TestIngestEvent_WithFlexibleTime(t *testing.T) {
	jsonData := `{
		"message": "Test error",
		"environment": "test",
		"level": "error",
		"timestamp": "2023-12-01T15:04:05.123456Z"
	}`

	var event IngestEvent
	err := json.Unmarshal([]byte(jsonData), &event)
	if err != nil {
		t.Errorf("Unexpected error: %v", err)
		return
	}

	if event.Timestamp == nil {
		t.Error("Timestamp should not be nil")
		return
	}

	expected := time.Date(2023, 12, 1, 15, 4, 5, 123456000, time.UTC)
	if !event.Timestamp.Time.Equal(expected) {
		t.Errorf("Expected %v, got %v", expected, event.Timestamp.Time)
	}
}
