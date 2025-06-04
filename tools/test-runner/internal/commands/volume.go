package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"errly/tools/test-runner/internal/config"
	"errly/tools/test-runner/internal/volume"
)

// NewVolumeCmd creates the volume testing command
func NewVolumeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "volume",
		Short: "Run volume testing",
		Long: `Run volume testing to verify migration performance with large datasets.

Volume testing generates realistic data and measures migration performance,
memory usage, and query performance impact.`,
		RunE: runVolumeCmd,
	}

	// Volume-specific flags
	cmd.Flags().String("size", "small", "Volume size: small, medium, large, xlarge, or custom number")
	cmd.Flags().Int("custom-size", 0, "Custom volume size (overrides --size)")
	cmd.Flags().String("description", "", "Custom description for the test")
	cmd.Flags().Bool("skip-cleanup", false, "Skip cleanup after test (for debugging)")
	cmd.Flags().Bool("generate-only", false, "Only generate data, don't run migrations")
	cmd.Flags().Bool("benchmark-only", false, "Only run benchmark, assume data exists")

	return cmd
}

func runVolumeCmd(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Parse flags
	sizeFlag, _ := cmd.Flags().GetString("size")
	customSize, _ := cmd.Flags().GetInt("custom-size")
	description, _ := cmd.Flags().GetString("description")
	skipCleanup, _ := cmd.Flags().GetBool("skip-cleanup")
	generateOnly, _ := cmd.Flags().GetBool("generate-only")
	benchmarkOnly, _ := cmd.Flags().GetBool("benchmark-only")

	// Determine volume size
	var volumeSize int
	if customSize > 0 {
		volumeSize = customSize
		if description == "" {
			description = fmt.Sprintf("Custom Volume (%d records)", customSize)
		}
	} else {
		switch sizeFlag {
		case "small":
			volumeSize = cfg.Testing.Volume.SmallSize
			if description == "" {
				description = fmt.Sprintf("Small Volume (%d records)", volumeSize)
			}
		case "medium":
			volumeSize = cfg.Testing.Volume.MediumSize
			if description == "" {
				description = fmt.Sprintf("Medium Volume (%d records)", volumeSize)
			}
		case "large":
			volumeSize = cfg.Testing.Volume.LargeSize
			if description == "" {
				description = fmt.Sprintf("Large Volume (%d records)", volumeSize)
			}
		case "xlarge":
			volumeSize = cfg.Testing.Volume.XLargeSize
			if description == "" {
				description = fmt.Sprintf("XLarge Volume (%d records)", volumeSize)
			}
		default:
			return fmt.Errorf("invalid size: %s (use: small, medium, large, xlarge)", sizeFlag)
		}
	}

	// Create volume tester
	tester, err := volume.NewTester(&volume.Config{
		PostgresURL:    config.GetPostgresURL(),
		ClickHouseURL:  config.GetClickHouseURL(),
		VolumeSize:     volumeSize,
		Description:    description,
		BatchSize:      cfg.Testing.Volume.BatchSize,
		MaxDuration:    cfg.Testing.Volume.MaxDuration,
		SkipCleanup:    skipCleanup,
		GenerateOnly:   generateOnly,
		BenchmarkOnly:  benchmarkOnly,
		Verbose:        viper.GetBool("verbose"),
		DryRun:         viper.GetBool("dry_run"),
	})
	if err != nil {
		return fmt.Errorf("failed to create volume tester: %w", err)
	}

	// Run the test
	result, err := tester.Run(cmd.Context())
	if err != nil {
		return fmt.Errorf("volume test failed: %w", err)
	}

	// Print results
	printVolumeResults(result)

	return nil
}

func printVolumeResults(result *volume.Result) {
	fmt.Printf("\n🎯 Volume Test Results\n")
	fmt.Printf("=====================\n\n")

	fmt.Printf("📊 Test Configuration:\n")
	fmt.Printf("  Description: %s\n", result.Description)
	fmt.Printf("  Volume Size: %d records\n", result.VolumeSize)
	fmt.Printf("  Batch Size: %d\n", result.BatchSize)
	fmt.Printf("\n")

	fmt.Printf("📈 Data Generation:\n")
	fmt.Printf("  Spaces: %d\n", result.DataGeneration.Spaces)
	fmt.Printf("  Projects: %d\n", result.DataGeneration.Projects)
	fmt.Printf("  Users: %d\n", result.DataGeneration.Users)
	fmt.Printf("  API Keys: %d\n", result.DataGeneration.APIKeys)
	fmt.Printf("  Error Events: %d\n", result.DataGeneration.ErrorEvents)
	fmt.Printf("  Generation Time: %v\n", result.DataGeneration.Duration)
	fmt.Printf("\n")

	if result.Migration != nil {
		fmt.Printf("⚡ Migration Performance:\n")
		fmt.Printf("  Migration Time: %v\n", result.Migration.Duration)
		fmt.Printf("  Rollback Time: %v\n", result.Migration.RollbackDuration)
		fmt.Printf("  Memory Impact: %.2f MB\n", result.Migration.MemoryImpactMB)

		if result.Migration.Duration.Seconds() > 0 {
			recordsPerSecond := float64(result.VolumeSize) / result.Migration.Duration.Seconds()
			fmt.Printf("  Records/Second: %.0f\n", recordsPerSecond)
		} else {
			fmt.Printf("  Records/Second: Very fast (< 1 second)\n")
		}
		fmt.Printf("\n")
	}

	if len(result.QueryPerformance) > 0 {
		fmt.Printf("🔍 Query Performance:\n")
		for _, qp := range result.QueryPerformance {
			fmt.Printf("  %s: %v\n", qp.Description, qp.Duration)
		}
		fmt.Printf("\n")
	}

	// Performance warnings
	if result.Migration != nil {
		if result.Migration.Duration.Minutes() > 5 {
			fmt.Printf("⚠️  Warning: Migration took longer than 5 minutes\n")
		}
		if result.Migration.MemoryImpactMB > 2048 {
			fmt.Printf("⚠️  Warning: Memory usage increased by more than 2GB\n")
		}
	}

	// Success indicators
	fmt.Printf("✅ Volume test completed successfully!\n")
}
