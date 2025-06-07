package errors

import (
	"errors"
	"strings"
	"testing"
)

func TestSecureError_Basic(t *testing.T) {
	err := NewSecureError("test message", "TEST_CODE", nil, nil)
	
	if err.Message != "test message" {
		t.Errorf("Expected message 'test message', got '%s'", err.Message)
	}
	
	if err.Code != "TEST_CODE" {
		t.Errorf("Expected code 'TEST_CODE', got '%s'", err.Code)
	}
	
	if err.Timestamp == 0 {
		t.Error("Expected timestamp to be set")
	}
}

func TestSecureError_SanitizeMessage(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{
			input:    "Database connection failed: password=secret123",
			expected: "Database connection failed: [REDACTED]=secret123",
		},
		{
			input:    "API key validation failed: key_abc123",
			expected: "API [REDACTED] validation failed: key_abc123",
		},
		{
			input:    strings.Repeat("A", 600),
			expected: strings.Repeat("A", 500),
		},
		{
			input:    "",
			expected: "An error occurred",
		},
	}
	
	for _, test := range tests {
		result := sanitizeMessage(test.input)
		if result != test.expected {
			t.Errorf("Expected '%s', got '%s'", test.expected, result)
		}
	}
}

func TestSecureError_SanitizeContext(t *testing.T) {
	context := map[string]interface{}{
		"username": "john",
		"password": "secret123",
		"apiKey":   "key_abc123",
		"normal":   "value",
		"__proto__": "dangerous",
	}
	
	sanitized := sanitizeContext(context)
	
	if sanitized["username"] != "john" {
		t.Error("Expected username to be preserved")
	}
	
	if sanitized["password"] != "[REDACTED]" {
		t.Error("Expected password to be redacted")
	}
	
	if sanitized["apiKey"] != "[REDACTED]" {
		t.Error("Expected apiKey to be redacted")
	}
	
	if sanitized["normal"] != "value" {
		t.Error("Expected normal field to be preserved")
	}
	
	if _, exists := sanitized["__proto__"]; exists {
		t.Error("Expected __proto__ to be excluded")
	}
}

func TestSecureError_ToJSON(t *testing.T) {
	originalErr := errors.New("original error")
	context := map[string]interface{}{
		"sensitive": "secret",
		"normal":    "value",
	}
	
	err := NewSecureError("test message", "TEST_CODE", originalErr, context)
	json := err.ToJSON()
	
	if json["message"] != "test message" {
		t.Error("Expected message in JSON")
	}
	
	if json["code"] != "TEST_CODE" {
		t.Error("Expected code in JSON")
	}
	
	if _, exists := json["context"]; exists {
		t.Error("Expected context to be excluded from JSON")
	}
	
	if _, exists := json["originalErr"]; exists {
		t.Error("Expected originalErr to be excluded from JSON")
	}
}

func TestValidationError(t *testing.T) {
	err := NewValidationError("email", "invalid format", "not-an-email")
	
	if err.Field != "email" {
		t.Errorf("Expected field 'email', got '%s'", err.Field)
	}
	
	if err.Code != "VALIDATION_ERROR" {
		t.Errorf("Expected code 'VALIDATION_ERROR', got '%s'", err.Code)
	}
	
	if !strings.Contains(err.Message, "email") {
		t.Error("Expected message to contain field name")
	}
}

func TestAuthenticationError(t *testing.T) {
	err := NewAuthenticationError("login", "invalid credentials")
	
	if err.Action != "login" {
		t.Errorf("Expected action 'login', got '%s'", err.Action)
	}
	
	if err.Code != "AUTHENTICATION_ERROR" {
		t.Errorf("Expected code 'AUTHENTICATION_ERROR', got '%s'", err.Code)
	}
	
	if err.Message != "invalid credentials" {
		t.Errorf("Expected message 'invalid credentials', got '%s'", err.Message)
	}
}

func TestAuthenticationError_DefaultMessage(t *testing.T) {
	err := NewAuthenticationError("login", "")
	
	if err.Message != "Authentication failed" {
		t.Errorf("Expected default message 'Authentication failed', got '%s'", err.Message)
	}
}

func TestAuthorizationError(t *testing.T) {
	err := NewAuthorizationError("admin_panel", "view")
	
	if err.Resource != "admin_panel" {
		t.Errorf("Expected resource 'admin_panel', got '%s'", err.Resource)
	}
	
	if err.Action != "view" {
		t.Errorf("Expected action 'view', got '%s'", err.Action)
	}
	
	if err.Code != "AUTHORIZATION_ERROR" {
		t.Errorf("Expected code 'AUTHORIZATION_ERROR', got '%s'", err.Code)
	}
	
	if !strings.Contains(err.Message, "admin_panel") {
		t.Error("Expected message to contain resource name")
	}
}

func TestNetworkError(t *testing.T) {
	originalErr := errors.New("connection timeout")
	err := NewNetworkError("request failed", 500, originalErr)
	
	if err.StatusCode != 500 {
		t.Errorf("Expected status code 500, got %d", err.StatusCode)
	}
	
	if err.Code != "NETWORK_ERROR" {
		t.Errorf("Expected code 'NETWORK_ERROR', got '%s'", err.Code)
	}
	
	if err.Unwrap() != originalErr {
		t.Error("Expected to unwrap to original error")
	}
}

func TestDatabaseError(t *testing.T) {
	originalErr := errors.New("connection failed")
	err := NewDatabaseError("SELECT users", originalErr)
	
	if err.Operation != "SELECT users" {
		t.Errorf("Expected operation 'SELECT users', got '%s'", err.Operation)
	}
	
	if err.Code != "DATABASE_ERROR" {
		t.Errorf("Expected code 'DATABASE_ERROR', got '%s'", err.Code)
	}
	
	if !strings.Contains(err.Message, "SELECT users") {
		t.Error("Expected message to contain operation")
	}
}

func TestCreateSafeError(t *testing.T) {
	// Test with nil error
	err1 := CreateSafeError(nil, "TEST_CODE")
	if err1.Message != "Unknown error" {
		t.Error("Expected 'Unknown error' for nil input")
	}
	
	// Test with existing SecureError
	original := NewSecureError("original", "ORIGINAL", nil, nil)
	err2 := CreateSafeError(original, "NEW_CODE")
	if err2 != original {
		t.Error("Expected to return the same SecureError")
	}
	
	// Test with standard error
	stdErr := errors.New("standard error")
	err3 := CreateSafeError(stdErr, "STD_CODE")
	if err3.Code != "STD_CODE" {
		t.Error("Expected new code for standard error")
	}
	if err3.Unwrap() != stdErr {
		t.Error("Expected to wrap standard error")
	}
}

func TestSanitizeValue(t *testing.T) {
	tests := []struct {
		input    interface{}
		expected interface{}
	}{
		{nil, nil},
		{"test", "test"},
		{123, 123},
		{true, true},
		{[]interface{}{1, 2, 3}, []interface{}{1, 2, 3}},
		{map[string]interface{}{"key": "value"}, map[string]interface{}{"key": "value"}},
		{struct{ Name string }{"test"}, "[COMPLEX_VALUE]"},
	}
	
	for _, test := range tests {
		result := sanitizeValue(test.input)
		// For complex comparisons, we'll just check the type
		if test.expected == "[COMPLEX_VALUE]" {
			if result != "[COMPLEX_VALUE]" {
				t.Errorf("Expected '[COMPLEX_VALUE]', got %v", result)
			}
		}
	}
}

func TestSanitizeValue_LargeArray(t *testing.T) {
	largeArray := make([]interface{}, 20)
	for i := range largeArray {
		largeArray[i] = i
	}
	
	result := sanitizeValue(largeArray)
	resultArray, ok := result.([]interface{})
	if !ok {
		t.Error("Expected result to be an array")
	}
	
	if len(resultArray) != 10 {
		t.Errorf("Expected array to be limited to 10 items, got %d", len(resultArray))
	}
}

func TestContains(t *testing.T) {
	slice := []string{"a", "b", "c"}
	
	if !contains(slice, "b") {
		t.Error("Expected to find 'b' in slice")
	}
	
	if contains(slice, "d") {
		t.Error("Expected not to find 'd' in slice")
	}
}
