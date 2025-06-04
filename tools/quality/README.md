# Code Quality Tools

Configuration for code quality and security tools.

## 📁 Files

- `eslint-security.config.mjs` - ESLint with security rules
- `golangci.yml` - Go linting configuration
- `vitest.config.ts` - Vitest testing configuration
- `husky-setup.sh` - Pre-commit hooks setup
- `security-audit.sh` - Security audit script

## 🚀 Usage

```bash
# Setup
npm run quality:setup

# Daily use
npm run quality:check
npm run quality:fix
npm run security:audit
```

## 🛠️ Configuration

### ESLint Security
- Security vulnerabilities detection
- Code quality rules (SonarJS)
- Modern JS practices (Unicorn)
- Promise best practices

### Go Linting
- 30+ linters including gosec
- Security, quality, performance checks
- Style consistency enforcement

### Vitest Testing
- Fast execution with V8 coverage
- Jest-compatible API
- Custom matchers for domain testing

### Coverage Thresholds
- Global: 70%
- Security: 90%
- Auth: 85%
- Database: 80%

### Pre-commit Hooks
- Staged files processing
- TypeScript validation
- Go linting (if changed)
- Conventional commits

### Security Audit
- Dependency scanning
- Static analysis
- Secrets detection
- File permissions check
