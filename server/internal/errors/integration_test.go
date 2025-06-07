package errors

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"testing"
)

func TestSecureErrorIntegration(t *testing.T) {
	t.Run("should handle API errors securely", func(t *testing.T) {
		originalErr := errors.New("Database connection failed: password=secret123")
		apiErr := NewDatabaseError("user_lookup", originalErr)

		// Should sanitize sensitive information
		if strings.Contains(apiErr.Message, "secret123") {
			t.Error("API error should not contain sensitive information")
		}

		if !strings.Contains(apiErr.Message, "[REDACTED]") {
			t.Error("API error should redact sensitive information")
		}
	})

	t.Run("should serialize errors safely for API responses", func(t *testing.T) {
		err := NewAuthenticationError("login", "Invalid credentials: token=abc123")
		
		jsonData, marshalErr := json.Marshal(err.ToJSON())
		if marshalErr != nil {
			t.Fatalf("Failed to marshal error: %v", marshalErr)
		}

		jsonStr := string(jsonData)
		
		// Should not contain sensitive information in JSON
		if strings.Contains(jsonStr, "abc123") {
			t.Error("JSON should not contain sensitive token")
		}

		// Should contain expected fields
		if !strings.Contains(jsonStr, "message") {
			t.Error("JSON should contain message field")
		}
		
		if !strings.Contains(jsonStr, "code") {
			t.Error("JSON should contain code field")
		}
	})

	t.Run("should handle nested error contexts securely", func(t *testing.T) {
		context := map[string]interface{}{
			"user": map[string]interface{}{
				"id":       123,
				"password": "secret123",
				"apiKey":   "key_abc123",
			},
			"request": map[string]interface{}{
				"headers": map[string]interface{}{
					"authorization": "Bearer token123",
				},
			},
		}

		err := NewSecureError("Operation failed", "OPERATION_ERROR", nil, context)

		// Should sanitize nested sensitive data
		if err.Context == nil {
			t.Error("Context should not be nil")
		}

		// Check that sensitive fields are redacted
		userContext, ok := err.Context["user"].(map[string]interface{})
		if !ok {
			t.Error("User context should be preserved as map")
		}

		if userContext["password"] != "[REDACTED]" {
			t.Error("Password should be redacted in nested context")
		}

		if userContext["apiKey"] != "[REDACTED]" {
			t.Error("API key should be redacted in nested context")
		}

		// Non-sensitive data should be preserved
		if userContext["id"] != 123 {
			t.Error("Non-sensitive data should be preserved")
		}
	})

	t.Run("should prevent prototype pollution in context", func(t *testing.T) {
		maliciousContext := map[string]interface{}{
			"__proto__":     map[string]interface{}{"polluted": true},
			"constructor":   "malicious",
			"prototype":     "dangerous",
			"normalField":   "safe",
		}

		err := NewSecureError("Test error", "TEST_ERROR", nil, maliciousContext)

		// Dangerous properties should be excluded
		if _, exists := err.Context["__proto__"]; exists {
			t.Error("__proto__ should be excluded from context")
		}

		if _, exists := err.Context["constructor"]; exists {
			t.Error("constructor should be excluded from context")
		}

		if _, exists := err.Context["prototype"]; exists {
			t.Error("prototype should be excluded from context")
		}

		// Normal fields should be preserved
		if err.Context["normalField"] != "safe" {
			t.Error("Normal fields should be preserved")
		}
	})

	t.Run("should handle large error messages efficiently", func(t *testing.T) {
		// Create a large error message
		largeMessage := strings.Repeat("Error: ", 1000) + "password=secret123"
		
		err := NewSecureError(largeMessage, "LARGE_ERROR", nil, nil)

		// Should truncate to maximum length
		if len(err.Message) > MaxErrorMessageLength {
			t.Errorf("Error message should be truncated to %d characters, got %d", 
				MaxErrorMessageLength, len(err.Message))
		}

		// Should still sanitize sensitive information
		if strings.Contains(err.Message, "secret123") {
			t.Error("Large error message should still be sanitized")
		}
	})

	t.Run("should handle concurrent error creation safely", func(t *testing.T) {
		const numGoroutines = 100
		errors := make(chan *SecureError, numGoroutines)

		// Create errors concurrently
		for i := 0; i < numGoroutines; i++ {
			go func(index int) {
				err := NewSecureError(
					fmt.Sprintf("Concurrent error %d: password=secret%d", index, index),
					"CONCURRENT_ERROR",
					nil,
					map[string]interface{}{
						"index": index,
						"secret": fmt.Sprintf("secret%d", index),
					},
				)
				errors <- err
			}(i)
		}

		// Collect all errors
		var collectedErrors []*SecureError
		for i := 0; i < numGoroutines; i++ {
			err := <-errors
			collectedErrors = append(collectedErrors, err)
		}

		// Verify all errors were created and sanitized correctly
		if len(collectedErrors) != numGoroutines {
			t.Errorf("Expected %d errors, got %d", numGoroutines, len(collectedErrors))
		}

		for _, err := range collectedErrors {
			if strings.Contains(err.Message, "secret") && !strings.Contains(err.Message, "[REDACTED]") {
				t.Error("Concurrent error should be sanitized")
			}

			if err.Context["secret"] != "[REDACTED]" {
				t.Error("Concurrent error context should be sanitized")
			}
		}
	})
}

func TestErrorTypeIntegration(t *testing.T) {
	t.Run("should create appropriate error types for different scenarios", func(t *testing.T) {
		// Validation error
		validationErr := NewValidationError("email", "invalid format", "not-an-email")
		if validationErr.Code != "VALIDATION_ERROR" {
			t.Error("Validation error should have correct code")
		}

		// Authentication error
		authErr := NewAuthenticationError("login", "")
		if authErr.Message != "Authentication failed" {
			t.Error("Authentication error should have default message")
		}

		// Authorization error
		authzErr := NewAuthorizationError("admin_panel", "view")
		if !strings.Contains(authzErr.Message, "admin_panel") {
			t.Error("Authorization error should mention resource")
		}

		// Network error
		netErr := NewNetworkError("Request failed", 500, errors.New("connection timeout"))
		if netErr.StatusCode != 500 {
			t.Error("Network error should preserve status code")
		}

		// Database error
		dbErr := NewDatabaseError("SELECT users", errors.New("connection failed"))
		if !strings.Contains(dbErr.Message, "SELECT users") {
			t.Error("Database error should mention operation")
		}
	})

	t.Run("should unwrap errors correctly", func(t *testing.T) {
		originalErr := errors.New("original error")
		wrappedErr := NewNetworkError("Network failed", 500, originalErr)

		unwrapped := wrappedErr.Unwrap()
		if unwrapped != originalErr {
			t.Error("Should unwrap to original error")
		}
	})

	t.Run("should handle error chaining", func(t *testing.T) {
		rootErr := errors.New("root cause")
		dbErr := NewDatabaseError("query", rootErr)
		apiErr := CreateSafeError(dbErr, "API_ERROR")

		// Should preserve error chain
		if apiErr.Unwrap() != dbErr {
			t.Error("Should preserve error chain")
		}

		if dbErr.Unwrap() != rootErr {
			t.Error("Should preserve original error in chain")
		}
	})
}

func TestSecurityScenarios(t *testing.T) {
	t.Run("should handle SQL injection attempts in error messages", func(t *testing.T) {
		sqlInjection := "'; DROP TABLE users; --"
		err := NewDatabaseError("user_lookup", errors.New(sqlInjection))

		// Should sanitize SQL injection attempts
		if strings.Contains(err.Message, "DROP TABLE") {
			t.Error("Should sanitize SQL injection attempts")
		}

		if strings.Contains(err.Message, "--") {
			t.Error("Should sanitize SQL comment markers")
		}
	})

	t.Run("should handle XSS attempts in error context", func(t *testing.T) {
		xssPayload := "<script>alert('xss')</script>"
		context := map[string]interface{}{
			"userInput": xssPayload,
		}

		err := NewValidationError("input", "invalid", context)

		// Should sanitize XSS attempts
		contextStr := fmt.Sprintf("%v", err.Context)
		if strings.Contains(contextStr, "<script>") {
			t.Error("Should sanitize XSS attempts in context")
		}
	})

	t.Run("should handle path traversal attempts", func(t *testing.T) {
		pathTraversal := "../../../etc/passwd"
		err := NewValidationError("filename", "invalid path", pathTraversal)

		// Should sanitize path traversal attempts
		if strings.Contains(err.Message, "../") {
			t.Error("Should sanitize path traversal attempts")
		}
	})

	t.Run("should handle environment variable exposure", func(t *testing.T) {
		envError := "Database connection failed: DATABASE_URL=postgres://user:pass@host/db"
		err := NewDatabaseError("connection", errors.New(envError))

		// Should sanitize environment variables
		if strings.Contains(err.Message, "postgres://") {
			t.Error("Should sanitize database URLs")
		}

		if strings.Contains(err.Message, "user:pass") {
			t.Error("Should sanitize credentials in URLs")
		}
	})
}

func BenchmarkSecureErrorCreation(b *testing.B) {
	b.Run("simple error creation", func(b *testing.B) {
		for i := 0; i < b.N; i++ {
			_ = NewSecureError("Test error", "TEST_ERROR", nil, nil)
		}
	})

	b.Run("error with context", func(b *testing.B) {
		context := map[string]interface{}{
			"user_id": 123,
			"action":  "login",
			"ip":      "192.168.1.1",
		}

		for i := 0; i < b.N; i++ {
			_ = NewSecureError("Test error", "TEST_ERROR", nil, context)
		}
	})

	b.Run("error with sensitive context", func(b *testing.B) {
		context := map[string]interface{}{
			"user_id":  123,
			"password": "secret123",
			"api_key":  "key_abc123",
			"token":    "token_xyz789",
		}

		for i := 0; i < b.N; i++ {
			_ = NewSecureError("Test error", "TEST_ERROR", nil, context)
		}
	})

	b.Run("large error message", func(b *testing.B) {
		largeMessage := strings.Repeat("Error: ", 100) + "password=secret123"

		for i := 0; i < b.N; i++ {
			_ = NewSecureError(largeMessage, "LARGE_ERROR", nil, nil)
		}
	})
}
