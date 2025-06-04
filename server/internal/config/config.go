package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the application
type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	ClickHouse ClickHouseConfig
	Redis      RedisConfig
	Auth       AuthConfig
	RateLimit  RateLimitConfig
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Port         string
	Host         string
	Environment  string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
}

// DatabaseConfig holds PostgreSQL configuration
type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	MaxConns int
	MinConns int
}

// ClickHouseConfig holds ClickHouse configuration
type ClickHouseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

// RedisConfig holds Redis configuration
type RedisConfig struct {
	URL      string
	Password string
	DB       int
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	JWTSecret          string
	TokenExpiry        time.Duration
	RefreshTokenExpiry time.Duration
	APIKeyHashRounds   int
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	IngestRPM    int // Requests per minute for ingestion
	APIRPMPerKey int // API requests per minute per key
	BurstSize    int // Burst size for rate limiter
}

// Load loads configuration from environment variables
func Load() (*Config, error) {
	cfg := &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "8080"),
			Host:         getEnv("HOST", "0.0.0.0"),
			Environment:  getEnv("ENVIRONMENT", "development"),
			ReadTimeout:  getDurationEnv("READ_TIMEOUT", 30*time.Second),
			WriteTimeout: getDurationEnv("WRITE_TIMEOUT", 30*time.Second),
			IdleTimeout:  getDurationEnv("IDLE_TIMEOUT", 120*time.Second),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "errly"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "errly"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
			MaxConns: getIntEnv("DB_MAX_CONNS", 25),
			MinConns: getIntEnv("DB_MIN_CONNS", 5),
		},
		ClickHouse: ClickHouseConfig{
			Host:     getEnv("CLICKHOUSE_HOST", "localhost"),
			Port:     getEnv("CLICKHOUSE_PORT", "9000"),
			User:     getEnv("CLICKHOUSE_USER", "errly"),
			Password: getEnv("CLICKHOUSE_PASSWORD", ""),
			Database: getEnv("CLICKHOUSE_DATABASE", "errly_events"),
		},
		Redis: RedisConfig{
			URL:      getEnv("REDIS_URL", "redis://localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       getIntEnv("REDIS_DB", 0),
		},
		Auth: AuthConfig{
			JWTSecret:          getEnv("JWT_SECRET", ""),
			TokenExpiry:        getDurationEnv("TOKEN_EXPIRY", 24*time.Hour),
			RefreshTokenExpiry: getDurationEnv("REFRESH_TOKEN_EXPIRY", 7*24*time.Hour),
			APIKeyHashRounds:   getIntEnv("API_KEY_HASH_ROUNDS", 12),
		},
		RateLimit: RateLimitConfig{
			IngestRPM:    getIntEnv("INGEST_RPM", 1000),
			APIRPMPerKey: getIntEnv("API_RPM_PER_KEY", 100),
			BurstSize:    getIntEnv("BURST_SIZE", 50),
		},
	}

	// Validate required configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

// Validate validates the configuration
func (c *Config) Validate() error {
	if c.Database.Host == "" {
		return fmt.Errorf("database host is required")
	}
	if c.Database.User == "" {
		return fmt.Errorf("database user is required")
	}
	if c.Database.Password == "" {
		return fmt.Errorf("database password is required")
	}
	if c.ClickHouse.Host == "" {
		return fmt.Errorf("clickhouse host is required")
	}
	if c.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT secret is required")
	}
	return nil
}

// DatabaseDSN returns the PostgreSQL connection string
func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.DBName,
		c.Database.SSLMode,
	)
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return c.Server.Environment == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return c.Server.Environment == "production"
}

// Helper functions for environment variables
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnv(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
