package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"server/internal/config"

	_ "github.com/lib/pq"
)

// PostgresDB wraps the sql.DB connection
type PostgresDB struct {
	*sql.DB
}

// NewPostgresDB creates a new PostgreSQL connection
func NewPostgresDB(cfg *config.Config) (*PostgresDB, error) {
	db, err := sql.Open("postgres", cfg.DatabaseDSN())
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(cfg.Database.MaxConns)
	db.SetMaxIdleConns(cfg.Database.MinConns)
	db.SetConnMaxLifetime(time.Hour)

	// Test the connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &PostgresDB{DB: db}, nil
}

// Close closes the database connection
func (db *PostgresDB) Close() error {
	return db.DB.Close()
}

// Health checks the database health
func (db *PostgresDB) Health() error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("database health check failed: %w", err)
	}

	return nil
}
