package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"errly/tools/test-runner/internal/chaos"
	"errly/tools/test-runner/internal/config"
)

// NewChaosCmd creates the chaos engineering command
func NewChaosCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "chaos",
		Short: "Run chaos engineering tests",
		Long: `Run chaos engineering tests to verify system resilience.

Chaos engineering tests simulate various failure scenarios to ensure
the migration system can recover gracefully from unexpected situations.`,
		RunE: runChaosCmd,
	}

	// Chaos-specific flags
	cmd.Flags().String("type", "all", "Chaos test type: interruption, connection, disk, concurrent, or all")
	cmd.Flags().Duration("interruption-delay", 0, "Delay before interrupting migration (0 = use config default)")
	cmd.Flags().Int("retry-attempts", 0, "Number of retry attempts (0 = use config default)")
	cmd.Flags().Bool("skip-cleanup", false, "Skip cleanup after test (for debugging)")

	return cmd
}

func runChaosCmd(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Parse flags
	testType, _ := cmd.Flags().GetString("type")
	interruptionDelay, _ := cmd.Flags().GetDuration("interruption-delay")
	retryAttempts, _ := cmd.Flags().GetInt("retry-attempts")
	skipCleanup, _ := cmd.Flags().GetBool("skip-cleanup")

	// Use config defaults if not specified
	if interruptionDelay == 0 {
		interruptionDelay = cfg.Testing.Chaos.InterruptionDelay
	}
	if retryAttempts == 0 {
		retryAttempts = cfg.Testing.Chaos.RetryAttempts
	}

	// Create chaos tester
	tester, err := chaos.NewTester(&chaos.Config{
		PostgresURL:       config.GetPostgresURL(),
		ClickHouseURL:     config.GetClickHouseURL(),
		InterruptionDelay: interruptionDelay,
		MaxRecoveryTime:   cfg.Testing.Chaos.MaxRecoveryTime,
		RetryAttempts:     retryAttempts,
		SkipCleanup:       skipCleanup,
		Verbose:           viper.GetBool("verbose"),
		DryRun:            viper.GetBool("dry_run"),
	})
	if err != nil {
		return fmt.Errorf("failed to create chaos tester: %w", err)
	}

	// Run the appropriate test(s)
	var results []*chaos.Result

	switch testType {
	case "interruption":
		result, err := tester.RunInterruption(cmd.Context())
		if err != nil {
			return fmt.Errorf("interruption test failed: %w", err)
		}
		results = append(results, result)

	case "connection":
		result, err := tester.RunConnectionLoss(cmd.Context())
		if err != nil {
			return fmt.Errorf("connection test failed: %w", err)
		}
		results = append(results, result)

	case "disk":
		result, err := tester.RunDiskSpace(cmd.Context())
		if err != nil {
			return fmt.Errorf("disk space test failed: %w", err)
		}
		results = append(results, result)

	case "concurrent":
		result, err := tester.RunConcurrentAccess(cmd.Context())
		if err != nil {
			return fmt.Errorf("concurrent access test failed: %w", err)
		}
		results = append(results, result)

	case "all":
		allResults, err := tester.RunAll(cmd.Context())
		if err != nil {
			return fmt.Errorf("chaos tests failed: %w", err)
		}
		results = allResults

	default:
		return fmt.Errorf("invalid chaos test type: %s (use: interruption, connection, disk, concurrent, all)", testType)
	}

	// Print results
	printChaosResults(results)

	return nil
}

func printChaosResults(results []*chaos.Result) {
	fmt.Printf("\n🔥 Chaos Engineering Results\n")
	fmt.Printf("============================\n\n")

	successCount := 0
	totalTests := len(results)

	for _, result := range results {
		status := "✅ PASSED"
		if !result.Success {
			status = "❌ FAILED"
		} else {
			successCount++
		}

		fmt.Printf("%s %s\n", status, result.TestType)
		fmt.Printf("  Description: %s\n", result.Description)
		fmt.Printf("  Duration: %v\n", result.Duration)

		if result.RecoveryTime > 0 {
			fmt.Printf("  Recovery Time: %v\n", result.RecoveryTime)
		}

		if result.Error != nil {
			fmt.Printf("  Error: %v\n", result.Error)
		}

		if len(result.Details) > 0 {
			fmt.Printf("  Details:\n")
			for key, value := range result.Details {
				fmt.Printf("    %s: %v\n", key, value)
			}
		}
		fmt.Printf("\n")
	}

	// Summary
	fmt.Printf("📊 Summary:\n")
	fmt.Printf("  Total Tests: %d\n", totalTests)
	fmt.Printf("  Passed: %d\n", successCount)
	fmt.Printf("  Failed: %d\n", totalTests-successCount)
	fmt.Printf("  Success Rate: %.1f%%\n", float64(successCount)/float64(totalTests)*100)
	fmt.Printf("\n")

	if successCount == totalTests {
		fmt.Printf("🛡️ System demonstrates excellent resilience to chaos scenarios!\n")
	} else {
		fmt.Printf("⚠️ Some chaos tests failed. Review the results and improve system resilience.\n")
	}
}
