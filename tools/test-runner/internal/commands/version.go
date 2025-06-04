package commands

import (
	"fmt"
	"runtime"

	"github.com/spf13/cobra"
)

// NewVersionCmd creates the version command
func NewVersionCmd(version, commit, date string) *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Show version information",
		Long:  "Show detailed version information including build details.",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("Errly Migration Test Runner\n")
			fmt.Printf("===========================\n\n")
			fmt.Printf("Version:    %s\n", version)
			fmt.Printf("Commit:     %s\n", commit)
			fmt.Printf("Built:      %s\n", date)
			fmt.Printf("Go Version: %s\n", runtime.Version())
			fmt.Printf("OS/Arch:    %s/%s\n", runtime.GOOS, runtime.GOARCH)
		},
	}
}
