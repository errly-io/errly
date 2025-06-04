# Code Quality System

Comprehensive code quality and security system for Errly.

## 🚀 Quick Start

```bash
# Setup all tools
npm run quality:setup

# Daily workflow
npm run quality:check
npm run quality:fix
npm run test:watch
```

## 🛠️ Tools

### Frontend
- **ESLint**: Security, quality, modern JS rules
- **Prettier**: Code formatting
- **Vitest**: Fast testing with coverage
- **TypeScript**: Strict type checking

### Backend
- **golangci-lint**: 30+ Go linters
- **gosec**: Go security analysis
- **go test**: Unit testing with race detection

### Security
- **Dependency scanning**: Automated vulnerability detection
- **Secrets detection**: Credential scanning
- **SAST**: Static security analysis
- **Audit script**: Comprehensive security reports

## 📋 Commands

```bash
# Quality checks
npm run quality:check
npm run lint
npm run format
npm run type-check

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Security
npm run security:audit
npm run security:deps

# Go
npm run go:lint
npm run go:test
```

## 📊 Standards

### Coverage
- Global: 70%
- Security modules: 90%
- Auth modules: 85%
- Database modules: 80%

### Code Quality
- Max complexity: 15
- Max line length: 120 chars
- Security issues: Zero tolerance

## 🔄 Automation

- **Pre-commit hooks**: Automatic quality checks
- **CI/CD pipeline**: Quality gates in GitHub Actions
- **Watch mode**: Real-time feedback during development
- **Conventional commits**: Standardized commit messages

## 🔧 Configuration

- **ESLint**: `tools/quality/eslint-security.config.mjs`
- **Go Linting**: `tools/quality/golangci.yml`
- **Vitest**: `tools/quality/vitest.config.ts`
- **Pre-commit**: `.husky/`

## 🚨 Troubleshooting

```bash
# Hooks not running
npx husky install

# ESLint errors
npm run lint:security

# Go linting
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Coverage issues
npm run test:coverage
```

## 📚 Documentation

- **[Code Quality Guide](docs/CODE_QUALITY.md)** - Detailed documentation
- **[Tools README](tools/quality/README.md)** - Configuration details

The system ensures high code quality and security standards while maintaining fast development workflow.
