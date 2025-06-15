package models

import (
	"fmt"
	"strings"
	"time"
)

// FlexibleTime handles multiple time formats from Python
type FlexibleTime struct {
	time.Time
}

// UnmarshalJSON implements json.Unmarshaler
func (ft *FlexibleTime) UnmarshalJSON(data []byte) error {
	// Remove quotes
	timeStr := strings.Trim(string(data), `"`)
	
	// Try different formats
	formats := []string{
		time.RFC3339,                    // Go default: 2006-01-02T15:04:05Z07:00
		time.RFC3339Nano,                // With nanoseconds
		"2006-01-02T15:04:05.999999",    // Python ISO with microseconds
		"2006-01-02T15:04:05.999999Z",   // Python ISO with microseconds and Z
		"2006-01-02T15:04:05",           // Simple ISO without timezone
	}
	
	var err error
	for _, format := range formats {
		ft.Time, err = time.Parse(format, timeStr)
		if err == nil {
			return nil
		}
	}
	
	return fmt.Errorf("unable to parse time %s", timeStr)
}

// MarshalJSON implements json.Marshaler
func (ft FlexibleTime) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, ft.Format(time.RFC3339))), nil
}
