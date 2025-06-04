package commands

import (
	"fmt"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	"errly/tools/test-runner/internal/config"
	"errly/tools/test-runner/internal/verify"
)

// NewVerifyCmd creates the verification command
func NewVerifyCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "verify",
		Short: "Verify schema synchronization and system health",
		Long: `Verify that all database schemas are synchronized and the system is healthy.

This command checks:
- Database connectivity
- Migration status
- Schema synchronization between tools (Goose, Prisma, sqlc)
- Data integrity
- Index performance`,
		RunE: runVerifyCmd,
	}

	// Verify-specific flags
	cmd.Flags().Bool("check-connectivity", true, "Check database connectivity")
	cmd.Flags().Bool("check-migrations", true, "Check migration status")
	cmd.Flags().Bool("check-schema-sync", true, "Check schema synchronization")
	cmd.Flags().Bool("check-data-integrity", true, "Check data integrity")
	cmd.Flags().Bool("check-performance", true, "Check query performance")
	cmd.Flags().Bool("generate-types", false, "Regenerate types after verification")

	return cmd
}

func runVerifyCmd(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Parse flags
	checkConnectivity, _ := cmd.Flags().GetBool("check-connectivity")
	checkMigrations, _ := cmd.Flags().GetBool("check-migrations")
	checkSchemaSync, _ := cmd.Flags().GetBool("check-schema-sync")
	checkDataIntegrity, _ := cmd.Flags().GetBool("check-data-integrity")
	checkPerformance, _ := cmd.Flags().GetBool("check-performance")
	generateTypes, _ := cmd.Flags().GetBool("generate-types")

	// Create verifier
	verifier, err := verify.NewVerifier(&verify.Config{
		PostgresURL:   config.GetPostgresURL(),
		ClickHouseURL: config.GetClickHouseURL(),
		PostgresMigrationsPath: cfg.Postgres.MigrationsPath,
		ClickHouseMigrationsPath: cfg.ClickHouse.MigrationsPath,
		Verbose:       viper.GetBool("verbose"),
		DryRun:        viper.GetBool("dry_run"),
	})
	if err != nil {
		return fmt.Errorf("failed to create verifier: %w", err)
	}

	// Run verification checks
	result := &verify.Result{
		Checks: make(map[string]*verify.CheckResult),
	}

	if checkConnectivity {
		fmt.Printf("🔌 Checking database connectivity...\n")
		checkResult, err := verifier.CheckConnectivity(cmd.Context())
		if err != nil {
			return fmt.Errorf("connectivity check failed: %w", err)
		}
		result.Checks["connectivity"] = checkResult
	}

	if checkMigrations {
		fmt.Printf("📋 Checking migration status...\n")
		checkResult, err := verifier.CheckMigrations(cmd.Context())
		if err != nil {
			return fmt.Errorf("migration check failed: %w", err)
		}
		result.Checks["migrations"] = checkResult
	}

	if checkSchemaSync {
		fmt.Printf("🔄 Checking schema synchronization...\n")
		checkResult, err := verifier.CheckSchemaSync(cmd.Context())
		if err != nil {
			return fmt.Errorf("schema sync check failed: %w", err)
		}
		result.Checks["schema_sync"] = checkResult
	}

	if checkDataIntegrity {
		fmt.Printf("🛡️ Checking data integrity...\n")
		checkResult, err := verifier.CheckDataIntegrity(cmd.Context())
		if err != nil {
			return fmt.Errorf("data integrity check failed: %w", err)
		}
		result.Checks["data_integrity"] = checkResult
	}

	if checkPerformance {
		fmt.Printf("⚡ Checking query performance...\n")
		checkResult, err := verifier.CheckPerformance(cmd.Context())
		if err != nil {
			return fmt.Errorf("performance check failed: %w", err)
		}
		result.Checks["performance"] = checkResult
	}

	if generateTypes {
		fmt.Printf("🔧 Regenerating types...\n")
		checkResult, err := verifier.RegenerateTypes(cmd.Context())
		if err != nil {
			return fmt.Errorf("type generation failed: %w", err)
		}
		result.Checks["type_generation"] = checkResult
	}

	// Print results
	printVerifyResults(result)

	return nil
}

func printVerifyResults(result *verify.Result) {
	fmt.Printf("\n🔍 Verification Results\n")
	fmt.Printf("======================\n\n")

	passedChecks := 0
	totalChecks := len(result.Checks)

	for checkName, checkResult := range result.Checks {
		status := "✅ PASSED"
		if !checkResult.Success {
			status = "❌ FAILED"
		} else {
			passedChecks++
		}

		fmt.Printf("%s %s\n", status, formatCheckName(checkName))

		if checkResult.Message != "" {
			fmt.Printf("  %s\n", checkResult.Message)
		}

		if checkResult.Error != nil {
			fmt.Printf("  Error: %v\n", checkResult.Error)
		}

		if len(checkResult.Details) > 0 {
			for key, value := range checkResult.Details {
				fmt.Printf("  %s: %v\n", key, value)
			}
		}

		if checkResult.Duration > 0 {
			fmt.Printf("  Duration: %v\n", checkResult.Duration)
		}

		fmt.Printf("\n")
	}

	// Summary
	fmt.Printf("📊 Summary:\n")
	fmt.Printf("  Total Checks: %d\n", totalChecks)
	fmt.Printf("  Passed: %d\n", passedChecks)
	fmt.Printf("  Failed: %d\n", totalChecks-passedChecks)
	fmt.Printf("  Success Rate: %.1f%%\n", float64(passedChecks)/float64(totalChecks)*100)
	fmt.Printf("\n")

	if passedChecks == totalChecks {
		fmt.Printf("🎉 All verification checks passed! System is healthy.\n")
	} else {
		fmt.Printf("⚠️ Some verification checks failed. Please review and fix the issues.\n")
	}
}

func formatCheckName(name string) string {
	switch name {
	case "connectivity":
		return "Database Connectivity"
	case "migrations":
		return "Migration Status"
	case "schema_sync":
		return "Schema Synchronization"
	case "data_integrity":
		return "Data Integrity"
	case "performance":
		return "Query Performance"
	case "type_generation":
		return "Type Generation"
	default:
		return name
	}
}
