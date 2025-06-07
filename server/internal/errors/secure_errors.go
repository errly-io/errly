// Package errors provides secure error handling utilities for the Go API server
package errors

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// Security configuration
const (
	MaxErrorMessageLength = 500
	MaxStackTraceLength   = 2000
)

// Sensitive patterns that should be redacted from error messages
var sensitivePatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)password`),
	regexp.MustCompile(`(?i)secret`),
	regexp.MustCompile(`(?i)token`),
	regexp.MustCompile(`(?i)key`),
	regexp.MustCompile(`(?i)auth`),
	regexp.MustCompile(`(?i)credential`),
	regexp.MustCompile(`(?i)session`),
	regexp.MustCompile(`(?i)cookie`),
	regexp.MustCompile(`(?i)bearer`),
	regexp.MustCompile(`(?i)api[_-]?key`),
	regexp.MustCompile(`(?i)database`),
	regexp.MustCompile(`(?i)connection`),
	regexp.MustCompile(`(?i)env`),
	regexp.MustCompile(`(?i)config`),
}

// Dangerous properties that should be excluded from context
var dangerousProperties = []string{"__proto__", "constructor", "prototype"}

// SecureError represents a secure error with sanitized information
type SecureError struct {
	Message     string                 `json:"message"`
	Code        string                 `json:"code"`
	Timestamp   int64                  `json:"timestamp"`
	Context     map[string]interface{} `json:"context,omitempty"`
	originalErr error                  `json:"-"` // Never serialized
}

// Error implements the error interface
func (e *SecureError) Error() string {
	return e.Message
}

// Unwrap returns the original error for error unwrapping
func (e *SecureError) Unwrap() error {
	return e.originalErr
}

// ToJSON returns a safe JSON representation
func (e *SecureError) ToJSON() map[string]interface{} {
	return map[string]interface{}{
		"message":   e.Message,
		"code":      e.Code,
		"timestamp": e.Timestamp,
		// context and originalErr intentionally excluded for security
	}
}

// ToDetailedJSON returns detailed JSON for development environments
func (e *SecureError) ToDetailedJSON() map[string]interface{} {
	result := e.ToJSON()
	
	// Only include details in development
	if isDevelopment() {
		if e.Context != nil {
			result["context"] = e.Context
		}
		if e.originalErr != nil {
			stack := fmt.Sprintf("%+v", e.originalErr)
			if len(stack) > MaxStackTraceLength {
				stack = stack[:MaxStackTraceLength]
			}
			result["stack"] = stack
		}
	}
	
	return result
}

// NewSecureError creates a new secure error
func NewSecureError(message, code string, originalErr error, context map[string]interface{}) *SecureError {
	return &SecureError{
		Message:     sanitizeMessage(message),
		Code:        code,
		Timestamp:   time.Now().Unix(),
		Context:     sanitizeContext(context),
		originalErr: originalErr,
	}
}

// Specific error types

// ValidationError represents a validation error
type ValidationError struct {
	*SecureError
	Field string `json:"field"`
}

// NewValidationError creates a new validation error
func NewValidationError(field, message string, value interface{}) *ValidationError {
	context := map[string]interface{}{
		"field":           field,
		"sanitized_value": sanitizeValue(value),
	}
	
	return &ValidationError{
		SecureError: NewSecureError(
			fmt.Sprintf("Validation failed for field '%s': %s", field, message),
			"VALIDATION_ERROR",
			nil,
			context,
		),
		Field: field,
	}
}

// AuthenticationError represents an authentication error
type AuthenticationError struct {
	*SecureError
	Action string `json:"action"`
}

// NewAuthenticationError creates a new authentication error
func NewAuthenticationError(action, message string) *AuthenticationError {
	if message == "" {
		message = "Authentication failed"
	}
	
	context := map[string]interface{}{
		"action": action,
	}
	
	return &AuthenticationError{
		SecureError: NewSecureError(message, "AUTHENTICATION_ERROR", nil, context),
		Action:      action,
	}
}

// AuthorizationError represents an authorization error
type AuthorizationError struct {
	*SecureError
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// NewAuthorizationError creates a new authorization error
func NewAuthorizationError(resource, action string) *AuthorizationError {
	message := fmt.Sprintf("Access denied to %s", resource)
	context := map[string]interface{}{
		"resource": resource,
		"action":   action,
	}
	
	return &AuthorizationError{
		SecureError: NewSecureError(message, "AUTHORIZATION_ERROR", nil, context),
		Resource:    resource,
		Action:      action,
	}
}

// NetworkError represents a network-related error
type NetworkError struct {
	*SecureError
	StatusCode int `json:"status_code,omitempty"`
}

// NewNetworkError creates a new network error
func NewNetworkError(message string, statusCode int, originalErr error) *NetworkError {
	context := map[string]interface{}{}
	if statusCode > 0 {
		context["status_code"] = statusCode
	}
	
	return &NetworkError{
		SecureError: NewSecureError(message, "NETWORK_ERROR", originalErr, context),
		StatusCode:  statusCode,
	}
}

// DatabaseError represents a database-related error
type DatabaseError struct {
	*SecureError
	Operation string `json:"operation"`
}

// NewDatabaseError creates a new database error
func NewDatabaseError(operation string, originalErr error) *DatabaseError {
	message := fmt.Sprintf("Database operation failed: %s", operation)
	context := map[string]interface{}{
		"operation": operation,
	}
	
	return &DatabaseError{
		SecureError: NewSecureError(message, "DATABASE_ERROR", originalErr, context),
		Operation:   operation,
	}
}

// Utility functions

// sanitizeMessage sanitizes error messages to prevent information disclosure
func sanitizeMessage(message string) string {
	if message == "" {
		return "An error occurred"
	}
	
	// Limit message length
	if len(message) > MaxErrorMessageLength {
		message = message[:MaxErrorMessageLength]
	}
	
	// Remove sensitive information
	for _, pattern := range sensitivePatterns {
		message = pattern.ReplaceAllString(message, "[REDACTED]")
	}
	
	return strings.TrimSpace(message)
}

// sanitizeContext sanitizes context objects to prevent data leakage
func sanitizeContext(context map[string]interface{}) map[string]interface{} {
	if context == nil {
		return nil
	}
	
	sanitized := make(map[string]interface{})
	
	for key, value := range context {
		// Skip dangerous properties
		if contains(dangerousProperties, key) {
			continue
		}
		
		// Check for sensitive keys
		isSensitive := false
		for _, pattern := range sensitivePatterns {
			if pattern.MatchString(key) {
				isSensitive = true
				break
			}
		}
		
		if isSensitive {
			sanitized[key] = "[REDACTED]"
		} else {
			sanitized[key] = sanitizeValue(value)
		}
	}
	
	return sanitized
}

// sanitizeValue sanitizes individual values
func sanitizeValue(value interface{}) interface{} {
	if value == nil {
		return nil
	}
	
	switch v := value.(type) {
	case string:
		return sanitizeMessage(v)
	case map[string]interface{}:
		return sanitizeContext(v)
	case []interface{}:
		// Limit array size
		if len(v) > 10 {
			v = v[:10]
		}
		sanitized := make([]interface{}, len(v))
		for i, item := range v {
			sanitized[i] = sanitizeValue(item)
		}
		return sanitized
	case int, int32, int64, float32, float64, bool:
		return v
	default:
		return "[COMPLEX_VALUE]"
	}
}

// CreateSafeError creates a safe error from any error
func CreateSafeError(err error, code string) *SecureError {
	if err == nil {
		return NewSecureError("Unknown error", code, nil, nil)
	}
	
	if secureErr, ok := err.(*SecureError); ok {
		return secureErr
	}
	
	return NewSecureError(err.Error(), code, err, nil)
}

// Helper functions

// contains checks if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// isDevelopment checks if we're in development mode
func isDevelopment() bool {
	// This should be configured based on your environment setup
	// For now, we'll use a simple check
	return false // Set to true for development
}
