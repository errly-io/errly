package database

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"server/internal/config"
)

// RedisDB wraps the Redis client
type RedisDB struct {
	client *redis.Client
}

// NewRedisDB creates a new Redis connection
func NewRedisDB(cfg *config.Config) (*RedisDB, error) {
	opt, err := redis.ParseURL(cfg.Redis.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	// Override with config values if provided
	if cfg.Redis.Password != "" {
		opt.Password = cfg.Redis.Password
	}
	opt.DB = cfg.Redis.DB

	client := redis.NewClient(opt)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	return &RedisDB{client: client}, nil
}

// Close closes the Redis connection
func (db *RedisDB) Close() error {
	return db.client.Close()
}

// Client returns the underlying Redis client
func (db *RedisDB) Client() *redis.Client {
	return db.client
}

// Health checks the Redis health
func (db *RedisDB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("Redis health check failed: %w", err)
	}

	return nil
}

// Set sets a key-value pair with expiration
func (db *RedisDB) Set(ctx context.Context, key string, value interface{}, expiration time.Duration) error {
	return db.client.Set(ctx, key, value, expiration).Err()
}

// Get gets a value by key
func (db *RedisDB) Get(ctx context.Context, key string) (string, error) {
	return db.client.Get(ctx, key).Result()
}

// Del deletes keys
func (db *RedisDB) Del(ctx context.Context, keys ...string) error {
	return db.client.Del(ctx, keys...).Err()
}

// Exists checks if keys exist
func (db *RedisDB) Exists(ctx context.Context, keys ...string) (int64, error) {
	return db.client.Exists(ctx, keys...).Result()
}

// Incr increments a key
func (db *RedisDB) Incr(ctx context.Context, key string) (int64, error) {
	return db.client.Incr(ctx, key).Result()
}

// Expire sets expiration for a key
func (db *RedisDB) Expire(ctx context.Context, key string, expiration time.Duration) error {
	return db.client.Expire(ctx, key, expiration).Err()
}
