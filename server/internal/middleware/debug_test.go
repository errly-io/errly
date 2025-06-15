package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestDebugMiddleware(t *testing.T) {
	// Set gin to test mode to enable debug middleware
	gin.SetMode(gin.TestMode)

	// Create a test router with debug middleware
	router := gin.New()
	router.Use(DebugMiddleware())
	
	// Add a simple test route
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test response"})
	})

	// Create a test request
	body := `{"test": "data"}`
	req, _ := http.NewRequest("POST", "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	router.ServeHTTP(w, req)

	// Check that the response is correct
	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	// Check that the response body is correct
	expectedBody := `{"message":"test response"}`
	if w.Body.String() != expectedBody {
		t.Errorf("Expected body %s, got %s", expectedBody, w.Body.String())
	}
}

func TestDebugMiddleware_ProductionMode(t *testing.T) {
	// Set gin to release mode to disable debug middleware
	gin.SetMode(gin.ReleaseMode)
	defer gin.SetMode(gin.TestMode) // Reset after test

	// Create a test router with debug middleware
	router := gin.New()
	router.Use(DebugMiddleware())
	
	// Add a simple test route
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "production response"})
	})

	// Create a test request
	req, _ := http.NewRequest("GET", "/test", nil)

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	router.ServeHTTP(w, req)

	// Check that the response is correct (middleware should not interfere)
	if w.Code != http.StatusOK {
		t.Errorf("Expected status code %d, got %d", http.StatusOK, w.Code)
	}

	expectedBody := `{"message":"production response"}`
	if w.Body.String() != expectedBody {
		t.Errorf("Expected body %s, got %s", expectedBody, w.Body.String())
	}
}
