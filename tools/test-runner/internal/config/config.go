package config

import (
	"time"

	"github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
	Postgres   PostgresConfig   `mapstructure:"postgres"`
	ClickHouse ClickHouseConfig `mapstructure:"clickhouse"`
	Testing    TestingConfig    `mapstructure:"testing"`
	Verbose    bool             `mapstructure:"verbose"`
	DryRun     bool             `mapstructure:"dry_run"`
}

// PostgresConfig holds PostgreSQL configuration
type PostgresConfig struct {
	URL             string        `mapstructure:"url"`
	MaxConnections  int           `mapstructure:"max_connections"`
	ConnectTimeout  time.Duration `mapstructure:"connect_timeout"`
	MigrationsPath  string        `mapstructure:"migrations_path"`
}

// ClickHouseConfig holds ClickHouse configuration
type ClickHouseConfig struct {
	URL             string        `mapstructure:"url"`
	MaxConnections  int           `mapstructure:"max_connections"`
	ConnectTimeout  time.Duration `mapstructure:"connect_timeout"`
	MigrationsPath  string        `mapstructure:"migrations_path"`
}

// TestingConfig holds testing-specific configuration
type TestingConfig struct {
	Volume VolumeConfig `mapstructure:"volume"`
	Chaos  ChaosConfig  `mapstructure:"chaos"`
}

// VolumeConfig holds volume testing configuration
type VolumeConfig struct {
	SmallSize   int `mapstructure:"small_size"`
	MediumSize  int `mapstructure:"medium_size"`
	LargeSize   int `mapstructure:"large_size"`
	XLargeSize  int `mapstructure:"xlarge_size"`
	BatchSize   int `mapstructure:"batch_size"`
	MaxDuration time.Duration `mapstructure:"max_duration"`
}

// ChaosConfig holds chaos testing configuration
type ChaosConfig struct {
	InterruptionDelay time.Duration `mapstructure:"interruption_delay"`
	MaxRecoveryTime   time.Duration `mapstructure:"max_recovery_time"`
	RetryAttempts     int           `mapstructure:"retry_attempts"`
}

// SetDefaults sets default configuration values
func SetDefaults() {
	// PostgreSQL defaults
	viper.SetDefault("postgres.max_connections", 10)
	viper.SetDefault("postgres.connect_timeout", "30s")
	viper.SetDefault("postgres.migrations_path", "migrations/postgres")

	// ClickHouse defaults
	viper.SetDefault("clickhouse.max_connections", 5)
	viper.SetDefault("clickhouse.connect_timeout", "30s")
	viper.SetDefault("clickhouse.migrations_path", "migrations/clickhouse")

	// Volume testing defaults
	viper.SetDefault("testing.volume.small_size", 100000)
	viper.SetDefault("testing.volume.medium_size", 1000000)
	viper.SetDefault("testing.volume.large_size", 10000000)
	viper.SetDefault("testing.volume.xlarge_size", 50000000)
	viper.SetDefault("testing.volume.batch_size", 100000)
	viper.SetDefault("testing.volume.max_duration", "30m")

	// Chaos testing defaults
	viper.SetDefault("testing.chaos.interruption_delay", "5s")
	viper.SetDefault("testing.chaos.max_recovery_time", "2m")
	viper.SetDefault("testing.chaos.retry_attempts", 3)

	// Global defaults
	viper.SetDefault("verbose", false)
	viper.SetDefault("dry_run", false)
}

// Load loads configuration from viper
func Load() (*Config, error) {
	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

// GetPostgresURL returns the PostgreSQL URL with fallback to environment
func GetPostgresURL() string {
	if url := viper.GetString("postgres.url"); url != "" {
		return url
	}
	// Fallback to common environment variables
	if url := viper.GetString("DATABASE_URL"); url != "" {
		return url
	}
	return "postgres://errly:errly_dev_password@localhost:5432/errly?sslmode=disable"
}

// GetClickHouseURL returns the ClickHouse URL with fallback to environment
func GetClickHouseURL() string {
	if url := viper.GetString("clickhouse.url"); url != "" {
		return url
	}
	// Fallback to common environment variables
	if url := viper.GetString("CLICKHOUSE_URL"); url != "" {
		return url
	}
	return "tcp://errly:errly_dev_password@localhost:9000/errly_events"
}
