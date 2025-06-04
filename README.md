# Errly - Error Tracking Platform

A modern error tracking and monitoring platform built with Next.js and Go.

## 🏗️ Architecture

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│    Next.js Web UI   │    Go API Server    │     Databases       │
│                     │                     │                     │
│ • Server Components │ • SDK Endpoints     │ • PostgreSQL        │
│ • Direct DB Access  │ • Event Ingestion   │ • ClickHouse        │
│ • Admin Interface   │ • Authentication    │ • Redis             │
│ • Dashboard         │ • Rate Limiting     │                     │
│ • User Management   │ • Public API        │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for development)
- Go 1.21+ (for development)

### 1. Start Full Stack

```bash
# Start all services with Docker Compose
./scripts/start-full-stack.sh
```

This will start:
- **PostgreSQL** (port 5432) - Users, projects, API keys
- **ClickHouse** (port 8123) - Events, issues, analytics
- **Redis** (port 6379) - Rate limiting, caching
- **Go API Server** (port 8080) - SDK endpoints
- **Next.js Web UI** (port 3000) - Admin interface

### 2. Development Setup

```bash
# Setup development environment (migrations + types)
npm run dev:setup

# Or step by step:
npm run dev:check          # Check dependencies and connections
npm run dev:migrate        # Run database migrations
npm run dev:types          # Generate TypeScript and Go types
```

### 3. Access the Platform

- **Web Interface**: http://localhost:3000
- **API Server**: http://localhost:8080
- **API Health**: http://localhost:8080/health

## 🗄️ Database Management

This project uses **Goose** for database migrations with automatic type generation:

### Quick Commands
```bash
# Full development setup
npm run dev:setup

# Migration management
npm run dev:migrate         # Apply all pending migrations
npm run dev:status          # Show migration status
npm run dev:types           # Generate types for TypeScript and Go

# Create new migrations
npm run db:create:postgres add_feature
npm run db:create:clickhouse add_analytics
```

### Type Generation
- **TypeScript**: Prisma generates type-safe client for Next.js
- **Go**: sqlc generates type-safe queries for Go API

📚 **[Full Migration Documentation](docs/MIGRATIONS.md)**

## 🧪 Testing & Quality Assurance

This project includes a comprehensive **Go CLI testing system** for migration safety and system reliability:

### Quick Testing Commands
```bash
# Build the test runner
make build

# Basic system verification
npm run test:verify

# Volume testing (performance with large datasets)
npm run test:volume:small      # 100K records
npm run test:volume:medium     # 1M records
npm run test:volume:large      # 10M records

# Chaos engineering (failure resilience)
npm run test:chaos:all         # All chaos tests
npm run test:chaos:interruption # Migration interruption recovery

# Complete test suites
npm run test:suite:basic       # Basic safety tests
npm run test:suite:production-ready # Full production-ready suite
```

### Advanced Testing
```bash
# Direct CLI usage with custom options
./build/test-runner volume --size small --verbose
./build/test-runner chaos --type interruption --verbose
./build/test-runner verify --generate-types

# Cross-platform builds
make build-all                 # Build for all platforms
```

### Testing Features
- **Volume Testing**: Performance testing with realistic datasets
- **Chaos Engineering**: Failure simulation and recovery testing
- **Schema Verification**: Database synchronization checks
- **Type Generation**: Automated TypeScript/Go type updates
- **CI/CD Integration**: GitHub Actions automation

🔧 **[Go CLI Testing Documentation](docs/GO_CLI_TESTING.md)**

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 19** - UI library with server components
- **Mantine UI** - Component library
- **Effect-TS** - Functional programming and error handling
- **TypeScript** - Type safety

### Backend
- **Go 1.21+** - API server and SDK
- **PostgreSQL** - Primary database for users, projects, API keys
- **ClickHouse** - Analytics database for events and issues
- **Redis** - Caching and rate limiting

### DevOps & Tools
- **Docker & Docker Compose** - Containerization
- **Goose** - Database migrations
- **Prisma** - TypeScript ORM
- **sqlc** - Go type-safe SQL
- **pnpm** - Package manager
- **Nx** - Monorepo tooling

## 📁 Project Structure

```
errly/
├── web/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App Router pages and API routes
│   │   ├── components/    # Shared React components
│   │   ├── lib/           # Utilities and configurations
│   │   └── modules/       # Feature modules (profile, etc.)
│   └── Dockerfile
├── server/                 # Go API server
│   ├── cmd/               # Application entrypoints
│   ├── internal/          # Private application code
│   │   ├── handlers/      # HTTP handlers
│   │   ├── services/      # Business logic
│   │   └── models/        # Data models
│   └── Dockerfile
├── migrations/             # Database migrations
│   ├── postgres/          # PostgreSQL migrations
│   └── clickhouse/        # ClickHouse migrations
├── internal/testing/       # Go CLI testing system
├── scripts/               # Development scripts
└── docs/                  # Documentation
```

## 🔧 Environment Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```bash
# Database passwords (required)
DB_PASSWORD=your_secure_password
CLICKHOUSE_PASSWORD=your_secure_password

# Authentication secrets (required)
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret

# Optional: OAuth providers
AUTH_GOOGLE_ID=your_google_client_id
AUTH_GOOGLE_SECRET=your_google_client_secret
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](docs/)
- 🐛 [Issue Tracker](https://github.com/your-username/errly/issues)
- 💬 [Discussions](https://github.com/your-username/errly/discussions)
