# Code Quality & Security

Comprehensive code quality and security system for Errly.

## 🛠️ Tools

### Frontend
- **ESLint**: Security, sonarjs, unicorn, promise plugins
- **Prettier**: Code formatting
- **Vitest**: Unit testing with coverage
- **TypeScript**: Strict type checking

### Backend
- **golangci-lint**: 30+ linters including security
- **gosec**: Go security analysis
- **go test**: Unit testing with race detection

### Security
- **Dependency scanning**: Automated vulnerability detection
- **Secrets detection**: Credential scanning
- **SAST**: Static security analysis

## 🚀 Quick Start

```bash
# Setup
npm run quality:setup

# Daily use
npm run quality:check
npm run quality:fix
npm run security:audit
```

## 📋 Commands

```bash
# Quality
npm run quality:check
npm run quality:fix
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
npm run go:fmt

# Analysis
npm run bundle:analyze
npm run docs:generate
```

## 🔧 Configuration

- **ESLint**: `tools/quality/eslint-security.config.mjs`
- **Go Linting**: `tools/quality/golangci.yml`
- **Vitest**: `tools/quality/vitest.config.ts`
- **Pre-commit**: `.husky/`

## 🛡️ Security

- **Static analysis**: ESLint security plugin, gosec
- **Dependency scanning**: Automated vulnerability detection
- **Secrets detection**: API keys, tokens, credentials
- **File security**: Permissions, environment validation
- **Audit script**: `tools/quality/security-audit.sh`

## 📊 Standards

### Coverage
- **Global**: 70%
- **Security**: 90%
- **Auth**: 85%
- **Database**: 80%

### Code Quality
- **Complexity**: Max 15
- **Line length**: Max 120 chars
- **Security issues**: Zero tolerance

## 🔄 CI/CD

- **Workflow**: `.github/workflows/code-quality.yml`
- **Triggers**: Push, PR, weekly security audits
- **Quality gates**: Frontend, backend, security, bundle analysis
- **Reports**: Coverage (Codecov), security (SARIF), bundle analysis

## 🎯 Workflow

```bash
# Development
npm run test:watch
npm run lint:fix

# Before commit
npm run quality:check
git commit -m "feat: add feature"  # Conventional commits
```

## 📝 Guidelines

- Write tests for new features
- Never commit secrets
- Use TypeScript strict mode
- Keep functions small and focused
- Monitor bundle size

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

## 📚 Resources

- [ESLint Security](https://github.com/eslint-community/eslint-plugin-security)
- [golangci-lint](https://golangci-lint.run/)
- [Vitest](https://vitest.dev/)
- [Husky](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
