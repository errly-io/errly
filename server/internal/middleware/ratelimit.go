package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"server/internal/config"
	"server/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitMiddleware handles rate limiting using Redis
type RateLimitMiddleware struct {
	redis  *database.RedisDB
	config *config.RateLimitConfig
}

// NewRateLimitMiddleware creates a new rate limit middleware
func NewRateLimitMiddleware(redis *database.RedisDB, cfg *config.RateLimitConfig) *RateLimitMiddleware {
	return &RateLimitMiddleware{
		redis:  redis,
		config: cfg,
	}
}

// RateLimit applies rate limiting based on API key
func (m *RateLimitMiddleware) RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get API key from context (set by auth middleware)
		apiKey := GetAPIKey(c)
		if apiKey == nil {
			// If no API key, apply global rate limiting by IP
			if !m.checkIPRateLimit(c) {
				return
			}
		} else {
			// Apply API key specific rate limiting
			if !m.checkAPIKeyRateLimit(c, apiKey.ID.String()) {
				return
			}
		}

		c.Next()
	}
}

// IngestRateLimit applies specific rate limiting for ingestion endpoints
func (m *RateLimitMiddleware) IngestRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := GetAPIKey(c)
		if apiKey == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "API key required for ingestion",
				"code":  "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		// Check ingestion specific rate limit
		if !m.checkIngestRateLimit(c, apiKey.ID.String()) {
			return
		}

		c.Next()
	}
}

// checkAPIKeyRateLimit checks rate limit for a specific API key
func (m *RateLimitMiddleware) checkAPIKeyRateLimit(c *gin.Context, keyID string) bool {
	return m.checkRateLimit(c, fmt.Sprintf("api_key:%s", keyID), m.config.APIRPMPerKey, time.Minute)
}

// checkIngestRateLimit checks rate limit for ingestion endpoints
func (m *RateLimitMiddleware) checkIngestRateLimit(c *gin.Context, keyID string) bool {
	return m.checkRateLimit(c, fmt.Sprintf("ingest:%s", keyID), m.config.IngestRPM, time.Minute)
}

// checkIPRateLimit checks rate limit by IP address
func (m *RateLimitMiddleware) checkIPRateLimit(c *gin.Context) bool {
	clientIP := c.ClientIP()
	return m.checkRateLimit(c, fmt.Sprintf("ip:%s", clientIP), 60, time.Minute) // 60 requests per minute for IP
}

// checkRateLimit implements sliding window rate limiting using Redis
func (m *RateLimitMiddleware) checkRateLimit(c *gin.Context, key string, limit int, window time.Duration) bool {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	now := time.Now()
	windowStart := now.Add(-window)

	// Redis key for this rate limit window
	redisKey := fmt.Sprintf("rate_limit:%s", key)

	// Use Redis pipeline for atomic operations
	pipe := m.redis.Client().Pipeline()

	// Remove expired entries
	pipe.ZRemRangeByScore(ctx, redisKey, "0", fmt.Sprintf("%d", windowStart.UnixNano()))

	// Count current requests in window
	countCmd := pipe.ZCard(ctx, redisKey)

	// Add current request
	pipe.ZAdd(ctx, redisKey, redis.Z{
		Score:  float64(now.UnixNano()),
		Member: fmt.Sprintf("%d", now.UnixNano()),
	})

	// Set expiration
	pipe.Expire(ctx, redisKey, window+time.Minute)

	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil {
		// If Redis fails, allow the request (fail open)
		fmt.Printf("Rate limit Redis error: %v\n", err)
		return true
	}

	// Get the count before adding current request
	currentCount := countCmd.Val()

	// Check if limit exceeded
	if currentCount >= int64(limit) {
		// Calculate reset time
		resetTime := now.Add(window)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
		c.Header("X-RateLimit-Remaining", "0")
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))
		c.Header("Retry-After", strconv.Itoa(int(window.Seconds())))

		c.JSON(http.StatusTooManyRequests, gin.H{
			"error":      "Rate limit exceeded",
			"code":       "RATE_LIMIT_EXCEEDED",
			"limit":      limit,
			"window":     window.String(),
			"reset_time": resetTime.Unix(),
		})
		c.Abort()
		return false
	}

	// Set rate limit headers for successful requests
	remaining := limit - int(currentCount) - 1
	if remaining < 0 {
		remaining = 0
	}

	c.Header("X-RateLimit-Limit", strconv.Itoa(limit))
	c.Header("X-RateLimit-Remaining", strconv.Itoa(remaining))
	c.Header("X-RateLimit-Reset", strconv.FormatInt(now.Add(window).Unix(), 10))

	return true
}

// BurstRateLimit applies burst rate limiting for high-frequency endpoints
func (m *RateLimitMiddleware) BurstRateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := GetAPIKey(c)
		if apiKey == nil {
			c.Next()
			return
		}

		// Check burst limit (shorter window, smaller limit)
		key := fmt.Sprintf("burst:%s", apiKey.ID.String())
		if !m.checkRateLimit(c, key, m.config.BurstSize, 10*time.Second) {
			return
		}

		c.Next()
	}
}

// GetRateLimitInfo returns current rate limit status for debugging
func (m *RateLimitMiddleware) GetRateLimitInfo(c *gin.Context) {
	apiKey := GetAPIKey(c)
	if apiKey == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "API key required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	keyID := apiKey.ID.String()
	now := time.Now()
	window := time.Minute

	// Check different rate limit buckets
	buckets := map[string]string{
		"api_requests": fmt.Sprintf("rate_limit:api_key:%s", keyID),
		"ingestion":    fmt.Sprintf("rate_limit:ingest:%s", keyID),
		"burst":        fmt.Sprintf("rate_limit:burst:%s", keyID),
	}

	info := make(map[string]interface{})

	for bucketName, redisKey := range buckets {
		windowStart := now.Add(-window)

		// Count requests in current window
		count, err := m.redis.Client().ZCount(ctx, redisKey,
			fmt.Sprintf("%d", windowStart.UnixNano()),
			fmt.Sprintf("%d", now.UnixNano())).Result()

		if err != nil {
			count = 0
		}

		var limit int
		switch bucketName {
		case "api_requests":
			limit = m.config.APIRPMPerKey
		case "ingestion":
			limit = m.config.IngestRPM
		case "burst":
			limit = m.config.BurstSize
		}

		info[bucketName] = map[string]interface{}{
			"current":   count,
			"limit":     limit,
			"remaining": limit - int(count),
			"window":    window.String(),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"rate_limits": info,
		"timestamp":   now.Unix(),
	})
}
