package middleware

import (
	"bytes"
	"fmt"
	"io"
	"time"

	"github.com/gin-gonic/gin"
)

// DebugMiddleware logs request and response for debugging
func DebugMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip in production
		if gin.Mode() == gin.ReleaseMode {
			c.Next()
			return
		}

		// Read and restore request body
		var bodyBytes []byte
		if c.Request.Body != nil {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		// Log request
		fmt.Printf("\n=== REQUEST ===\n")
		fmt.Printf("Time: %s\n", time.Now().Format(time.RFC3339))
		fmt.Printf("Method: %s\n", c.Request.Method)
		fmt.Printf("Path: %s\n", c.Request.URL.Path)
		fmt.Printf("Headers:\n")
		for k, v := range c.Request.Header {
			fmt.Printf("  %s: %s\n", k, v)
		}
		if len(bodyBytes) > 0 {
			fmt.Printf("Body: %s\n", string(bodyBytes))
		}

		// Create response writer to capture response
		blw := &bodyLogWriter{body: bytes.NewBufferString(""), ResponseWriter: c.Writer}
		c.Writer = blw

		// Process request
		c.Next()

		// Log response
		fmt.Printf("\n=== RESPONSE ===\n")
		fmt.Printf("Status: %d\n", c.Writer.Status())
		fmt.Printf("Body: %s\n", blw.body.String())
		fmt.Printf("================\n\n")
	}
}

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}
