#!/bin/bash

# Husky and lint-staged setup for pre-commit hooks
# This script sets up automated code quality checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

print_status "Setting up code quality tools..."

# Install husky and lint-staged
print_status "Installing husky and lint-staged..."
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional

# Install additional ESLint plugins for security
print_status "Installing security-focused ESLint plugins..."
pnpm add -D eslint-plugin-security eslint-plugin-sonarjs eslint-plugin-unicorn eslint-plugin-promise

# Install testing tools
print_status "Installing testing tools..."
pnpm add -D vitest @vitest/ui @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Install bundle analyzer and performance tools
print_status "Installing performance analysis tools..."
pnpm add -D @next/bundle-analyzer webpack-bundle-analyzer

# Install documentation tools
print_status "Installing documentation tools..."
pnpm add -D typedoc @storybook/cli

# Initialize husky
print_status "Initializing husky..."
npx husky init

# Create pre-commit hook
print_status "Creating pre-commit hook..."
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run lint-staged for staged files
npx lint-staged

# Run type checking
echo "🔍 Running TypeScript type checking..."
pnpm run type-check

# Run Go linting if Go files changed
if git diff --cached --name-only | grep -q '\.go$'; then
    echo "🔍 Running Go linting..."
    make lint
fi
EOF

# Create commit-msg hook for conventional commits
print_status "Creating commit-msg hook..."
cat > .husky/commit-msg << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit $1
EOF

# Create pre-push hook
print_status "Creating pre-push hook..."
cat > .husky/pre-push << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests before push
echo "🧪 Running tests before push..."
pnpm run test

# Run build to ensure everything compiles
echo "🏗️  Running build check..."
pnpm run build

# Run security audit
echo "🔒 Running security audit..."
pnpm audit --audit-level moderate
EOF

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
chmod +x .husky/pre-push

print_success "Husky hooks created successfully!"

# Create lint-staged configuration
print_status "Creating lint-staged configuration..."
cat > .lintstagedrc.json << 'EOF'
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "git add"
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --write",
    "git add"
  ],
  "*.go": [
    "gofmt -w",
    "goimports -w",
    "git add"
  ],
  "*.sql": [
    "prettier --write --parser sql",
    "git add"
  ]
}
EOF

# Create commitlint configuration
print_status "Creating commitlint configuration..."
cat > .commitlintrc.json << 'EOF'
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "chore",
        "ci",
        "build",
        "revert",
        "security"
      ]
    ],
    "subject-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100]
  }
}
EOF

print_success "Code quality tools setup completed!"
print_info "Next steps:"
echo "  1. Run: npm run quality:check to test the setup"
echo "  2. Configure your IDE with the new ESLint rules"
echo "  3. Try the new Vitest testing: npm run test:watch"
echo ""
print_warning "Note: The pre-commit hooks will now run automatically on every commit"
print_info "To skip hooks temporarily, use: git commit --no-verify"
