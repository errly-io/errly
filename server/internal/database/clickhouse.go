package database

import (
	"context"
	"fmt"
	"time"

	"server/internal/config"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ClickHouse/clickhouse-go/v2/lib/driver"
)

// ClickHouseDB wraps the ClickHouse connection
type ClickHouseDB struct {
	conn driver.Conn
}

// NewClickHouseDB creates a new ClickHouse connection
func NewClickHouseDB(cfg *config.Config) (*ClickHouseDB, error) {
	addr := fmt.Sprintf("%s:%s", cfg.ClickHouse.Host, cfg.ClickHouse.Port)
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{addr},
		Auth: clickhouse.Auth{
			Database: cfg.ClickHouse.Database,
			Username: cfg.ClickHouse.User,
			Password: cfg.ClickHouse.Password,
		},
		Settings: clickhouse.Settings{
			"max_execution_time": 60,
			"max_memory_usage":   "4000000000", // 4GB
		},
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
		DialTimeout:      time.Second * 30,
		MaxOpenConns:     10,
		MaxIdleConns:     5,
		ConnMaxLifetime:  time.Hour,
		ConnOpenStrategy: clickhouse.ConnOpenInOrder,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to ClickHouse: %w", err)
	}

	// Test the connection
	if err := conn.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to ping ClickHouse: %w", err)
	}

	return &ClickHouseDB{conn: conn}, nil
}

// Close closes the ClickHouse connection
func (db *ClickHouseDB) Close() error {
	return db.conn.Close()
}

// Conn returns the underlying ClickHouse connection
func (db *ClickHouseDB) Conn() driver.Conn {
	return db.conn
}

// Health checks the ClickHouse health
func (db *ClickHouseDB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.conn.Ping(ctx); err != nil {
		return fmt.Errorf("ClickHouse health check failed: %w", err)
	}

	return nil
}

// Query executes a query and returns rows
func (db *ClickHouseDB) Query(ctx context.Context, query string, args ...interface{}) (driver.Rows, error) {
	return db.conn.Query(ctx, query, args...)
}

// QueryRow executes a query and returns a single row
func (db *ClickHouseDB) QueryRow(ctx context.Context, query string, args ...interface{}) driver.Row {
	return db.conn.QueryRow(ctx, query, args...)
}

// Exec executes a query without returning rows
func (db *ClickHouseDB) Exec(ctx context.Context, query string, args ...interface{}) error {
	return db.conn.Exec(ctx, query, args...)
}

// PrepareBatch prepares a batch for bulk inserts
func (db *ClickHouseDB) PrepareBatch(ctx context.Context, query string) (driver.Batch, error) {
	return db.conn.PrepareBatch(ctx, query)
}
