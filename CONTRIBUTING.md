# Contributing to Errly

Thank you for your interest in contributing to Errly! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Go 1.21+
- Docker and Docker Compose
- Git

### Development Setup

1. Fork and clone the repository:
```bash
git clone https://github.com/your-username/errly.git
cd errly
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development environment:
```bash
npm run dev:setup
```

## 🏗️ Project Structure

- `web/` - Next.js frontend application
- `server/` - Go API server
- `migrations/` - Database migrations
- `internal/testing/` - Go CLI testing system
- `docs/` - Documentation

## 🔧 Development Workflow

### Frontend Development

```bash
# Start Next.js development server
cd web
pnpm dev
```

### Backend Development

```bash
# Start Go API server
cd server
go run main.go
```

### Database Migrations

```bash
# Create new migration
npm run db:create:postgres migration_name

# Apply migrations
npm run dev:migrate

# Check migration status
npm run dev:status
```

## 🧪 Testing

### Running Tests

```bash
# Build test runner
make build

# Run basic verification
npm run test:verify

# Run volume tests
npm run test:volume:small

# Run chaos tests
npm run test:chaos:all
```

### Writing Tests

- Add unit tests for new features
- Include integration tests for API endpoints
- Test database migrations thoroughly
- Add chaos engineering tests for critical paths

## 📝 Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Prefer functional programming patterns with Effect-TS

### Go

- Follow Go conventions and `gofmt`
- Use meaningful variable names
- Add comments for exported functions
- Handle errors explicitly

### Database

- Use descriptive migration names
- Include both up and down migrations
- Test migrations on sample data
- Document schema changes

## 🔍 Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Add or update tests as needed
4. Update documentation if required
5. Ensure all tests pass
6. Submit a pull request with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes

### PR Requirements

- [ ] Tests pass
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes (or clearly documented)
- [ ] Migrations tested

## 🐛 Bug Reports

When reporting bugs, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, versions)
- Error messages or logs
- Screenshots if applicable

## 💡 Feature Requests

For new features:

- Check existing issues first
- Describe the use case
- Explain the expected behavior
- Consider implementation complexity
- Discuss with maintainers before large changes

## 📚 Documentation

- Update README.md for user-facing changes
- Add inline code comments
- Update API documentation
- Include examples for new features

## 🤝 Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Provide constructive feedback
- Follow the code of conduct

## 📞 Getting Help

- Check existing documentation
- Search through issues
- Ask questions in discussions
- Contact maintainers for complex issues

Thank you for contributing to Errly! 🎉
