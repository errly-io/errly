package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"errly/tools/test-runner/internal/commands"
	"errly/tools/test-runner/internal/config"
)

var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	if err := newRootCmd().Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func newRootCmd() *cobra.Command {
	var cfgFile string

	rootCmd := &cobra.Command{
		Use:   "test-runner",
		Short: "Errly Migration Testing Suite",
		Long: `A comprehensive testing suite for Errly database migrations.

This tool provides volume testing, chaos engineering, and verification
capabilities to ensure migration safety and system reliability.`,
		Version: fmt.Sprintf("%s (commit: %s, built: %s)", version, commit, date),
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return initConfig(cfgFile)
		},
	}

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is .test-runner.yaml)")
	rootCmd.PersistentFlags().String("postgres-url", "", "PostgreSQL connection URL")
	rootCmd.PersistentFlags().String("clickhouse-url", "", "ClickHouse connection URL")
	rootCmd.PersistentFlags().Bool("verbose", false, "verbose output")
	rootCmd.PersistentFlags().Bool("dry-run", false, "dry run mode (don't execute destructive operations)")

	// Bind flags to viper
	viper.BindPFlag("postgres.url", rootCmd.PersistentFlags().Lookup("postgres-url"))
	viper.BindPFlag("clickhouse.url", rootCmd.PersistentFlags().Lookup("clickhouse-url"))
	viper.BindPFlag("verbose", rootCmd.PersistentFlags().Lookup("verbose"))
	viper.BindPFlag("dry_run", rootCmd.PersistentFlags().Lookup("dry-run"))

	// Add subcommands
	rootCmd.AddCommand(
		commands.NewVolumeCmd(),
		commands.NewChaosCmd(),
		commands.NewVerifyCmd(),
		commands.NewSuiteCmd(),
		commands.NewVersionCmd(version, commit, date),
	)

	return rootCmd
}

func initConfig(cfgFile string) error {
	if cfgFile != "" {
		viper.SetConfigFile(cfgFile)
	} else {
		viper.SetConfigName(".test-runner")
		viper.SetConfigType("yaml")
		viper.AddConfigPath(".")
		viper.AddConfigPath("$HOME")
	}

	// Environment variables
	viper.SetEnvPrefix("ERRLY_TEST")
	viper.AutomaticEnv()

	// Set defaults
	config.SetDefaults()

	// Read config file
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return fmt.Errorf("failed to read config file: %w", err)
		}
	}

	return nil
}
