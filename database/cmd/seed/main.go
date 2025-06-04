package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/ClickHouse/clickhouse-go/v2"
	_ "github.com/lib/pq"
)

type Config struct {
	PostgresURL   string
	ClickHouseURL string
	Environment   string
	Database      string
	Action        string
	Force         bool
}

func main() {
	config := parseFlags()

	if err := validateConfig(config); err != nil {
		log.Fatalf("Configuration error: %v", err)
	}

	seeder := NewSeeder(config)

	switch config.Action {
	case "seed":
		if err := seeder.Seed(); err != nil {
			log.Fatalf("Seeding failed: %v", err)
		}
		fmt.Printf("✅ Successfully seeded %s database for %s environment\n", config.Database, config.Environment)
	case "clean":
		if err := seeder.Clean(); err != nil {
			log.Fatalf("Cleaning failed: %v", err)
		}
		fmt.Printf("✅ Successfully cleaned %s database for %s environment\n", config.Database, config.Environment)
	case "reset":
		if err := seeder.Reset(); err != nil {
			log.Fatalf("Reset failed: %v", err)
		}
		fmt.Printf("✅ Successfully reset %s database for %s environment\n", config.Database, config.Environment)
	default:
		log.Fatalf("Unknown action: %s", config.Action)
	}
}

func parseFlags() Config {
	var config Config

	flag.StringVar(&config.PostgresURL, "postgres-url", os.Getenv("POSTGRES_URL"), "PostgreSQL connection URL")
	flag.StringVar(&config.ClickHouseURL, "clickhouse-url", os.Getenv("CLICKHOUSE_URL"), "ClickHouse connection URL")
	flag.StringVar(&config.Environment, "env", "development", "Environment (development, test, production)")
	flag.StringVar(&config.Database, "db", "all", "Database to seed (postgres, clickhouse, all)")
	flag.StringVar(&config.Action, "action", "seed", "Action to perform (seed, clean, reset)")
	flag.BoolVar(&config.Force, "force", false, "Force action without confirmation")

	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, "Usage: %s [options]\n\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "Database seeding utility for Errly\n\n")
		fmt.Fprintf(os.Stderr, "Options:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExamples:\n")
		fmt.Fprintf(os.Stderr, "  %s -env=development -db=all -action=seed\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -env=test -db=postgres -action=clean\n", os.Args[0])
		fmt.Fprintf(os.Stderr, "  %s -env=development -db=clickhouse -action=reset -force\n", os.Args[0])
	}

	flag.Parse()
	return config
}

func validateConfig(config Config) error {
	if config.Environment != "development" && config.Environment != "test" && config.Environment != "production" {
		return fmt.Errorf("invalid environment: %s (must be development, test, or production)", config.Environment)
	}

	if config.Database != "postgres" && config.Database != "clickhouse" && config.Database != "all" {
		return fmt.Errorf("invalid database: %s (must be postgres, clickhouse, or all)", config.Database)
	}

	if config.Action != "seed" && config.Action != "clean" && config.Action != "reset" {
		return fmt.Errorf("invalid action: %s (must be seed, clean, or reset)", config.Action)
	}

	if config.Environment == "production" && !config.Force {
		return fmt.Errorf("production environment requires --force flag for safety")
	}

	return nil
}

type Seeder struct {
	config Config
}

func NewSeeder(config Config) *Seeder {
	return &Seeder{config: config}
}

func (s *Seeder) Seed() error {
	if s.config.Database == "all" || s.config.Database == "postgres" {
		if err := s.seedPostgres(); err != nil {
			return fmt.Errorf("postgres seeding failed: %w", err)
		}
	}

	if s.config.Database == "all" || s.config.Database == "clickhouse" {
		if err := s.seedClickHouse(); err != nil {
			return fmt.Errorf("clickhouse seeding failed: %w", err)
		}
	}

	return nil
}

func (s *Seeder) Clean() error {
	if s.config.Environment == "production" {
		return fmt.Errorf("cleaning production data is not allowed")
	}

	if s.config.Database == "all" || s.config.Database == "postgres" {
		if err := s.cleanPostgres(); err != nil {
			return fmt.Errorf("postgres cleaning failed: %w", err)
		}
	}

	if s.config.Database == "all" || s.config.Database == "clickhouse" {
		if err := s.cleanClickHouse(); err != nil {
			return fmt.Errorf("clickhouse cleaning failed: %w", err)
		}
	}

	return nil
}

func (s *Seeder) Reset() error {
	if err := s.Clean(); err != nil {
		return err
	}
	return s.Seed()
}

func (s *Seeder) seedPostgres() error {
	if s.config.PostgresURL == "" {
		return fmt.Errorf("POSTGRES_URL not set")
	}

	db, err := sql.Open("postgres", s.config.PostgresURL)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres: %w", err)
	}
	defer db.Close()

	seedFile := filepath.Join("database", "seeds", s.config.Environment+".sql")
	return s.executeSQLFile(db, seedFile)
}

func (s *Seeder) seedClickHouse() error {
	if s.config.ClickHouseURL == "" {
		return fmt.Errorf("CLICKHOUSE_URL not set")
	}

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{s.config.ClickHouseURL},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to clickhouse: %w", err)
	}
	defer conn.Close()

	seedFile := filepath.Join("database", "seeds", "clickhouse", s.config.Environment+".sql")
	return s.executeClickHouseFile(conn, seedFile)
}

func (s *Seeder) executeSQLFile(db *sql.DB, filename string) error {
	content, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("⚠️  Seed file %s not found, skipping\n", filename)
			return nil
		}
		return fmt.Errorf("failed to read seed file %s: %w", filename, err)
	}

	// Split by semicolon and execute each statement
	statements := strings.Split(string(content), ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}

		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute statement: %w", err)
		}
	}

	fmt.Printf("📄 Executed seed file: %s\n", filename)
	return nil
}

func (s *Seeder) executeClickHouseFile(conn clickhouse.Conn, filename string) error {
	content, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			fmt.Printf("⚠️  Seed file %s not found, skipping\n", filename)
			return nil
		}
		return fmt.Errorf("failed to read seed file %s: %w", filename, err)
	}

	// Split by semicolon and execute each statement
	statements := strings.Split(string(content), ";")
	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}

		if err := conn.Exec(context.Background(), stmt); err != nil {
			return fmt.Errorf("failed to execute statement: %w", err)
		}
	}

	fmt.Printf("📄 Executed seed file: %s\n", filename)
	return nil
}

func (s *Seeder) cleanPostgres() error {
	if s.config.PostgresURL == "" {
		return fmt.Errorf("POSTGRES_URL not set")
	}

	db, err := sql.Open("postgres", s.config.PostgresURL)
	if err != nil {
		return fmt.Errorf("failed to connect to postgres: %w", err)
	}
	defer db.Close()

	// Clean seed data in reverse order to respect foreign key constraints
	cleanStatements := []string{
		"DELETE FROM api_keys WHERE key_prefix LIKE '%demo%' OR key_prefix LIKE '%test%'",
		"DELETE FROM projects WHERE slug LIKE '%demo%' OR slug LIKE '%test%'",
		"DELETE FROM users WHERE email LIKE '%demo%' OR email LIKE '%test%' OR email LIKE '%example%'",
		"DELETE FROM spaces WHERE slug LIKE '%demo%' OR slug LIKE '%test%'",
	}

	for _, stmt := range cleanStatements {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("failed to execute clean statement: %w", err)
		}
	}

	fmt.Printf("🧹 Cleaned PostgreSQL seed data\n")
	return nil
}

func (s *Seeder) cleanClickHouse() error {
	if s.config.ClickHouseURL == "" {
		return fmt.Errorf("CLICKHOUSE_URL not set")
	}

	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{s.config.ClickHouseURL},
	})
	if err != nil {
		return fmt.Errorf("failed to connect to clickhouse: %w", err)
	}
	defer conn.Close()

	// Clean seed data
	cleanStatements := []string{
		"DELETE FROM errly_events.issues WHERE id LIKE '%sample%' OR id LIKE '%test%'",
		"DELETE FROM errly_events.error_events WHERE id LIKE '%sample%' OR id LIKE '%test%'",
	}

	for _, stmt := range cleanStatements {
		if err := conn.Exec(context.Background(), stmt); err != nil {
			return fmt.Errorf("failed to execute clean statement: %w", err)
		}
	}

	fmt.Printf("🧹 Cleaned ClickHouse seed data\n")
	return nil
}