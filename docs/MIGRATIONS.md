# Database Migrations with Goose

This project uses [Goose](https://github.com/pressly/goose) for database schema management with automatic type generation for both TypeScript (Prisma) and Go (sqlc).

## 🚀 Quick Start

### Setup Development Environment
```bash
npm run dev:setup
```
This command will:
- Check all dependencies
- Verify database connections
- Run all pending migrations
- Generate types for TypeScript and Go

## 📋 Available Commands

### NPM Scripts
```bash
# Development workflow
npm run dev:setup          # Full setup (migrations + types)
npm run dev:migrate         # Run migrations only
npm run dev:types           # Generate types only
npm run dev:status          # Show migration status
npm run dev:check           # Check dependencies and connections
npm run dev:verify          # Verify schema synchronization across all tools

# Database operations
npm run db:migrate          # Run all migrations
npm run db:rollback         # Rollback migrations
npm run db:status           # Show migration status
npm run db:create:postgres  # Create new PostgreSQL migration
npm run db:create:clickhouse # Create new ClickHouse migration

# Type generation
npm run types:generate      # Generate all types
npm run types:prisma        # Generate Prisma types
npm run types:sqlc          # Generate sqlc types
```

### Direct Scripts
```bash
# Goose migrations
./scripts/goose-migrate.sh all status
./scripts/goose-migrate.sh postgres up
./scripts/goose-migrate.sh clickhouse up

# Development setup
./scripts/dev-setup.sh setup
./scripts/dev-setup.sh migrate
./scripts/dev-setup.sh types
```

## 🗂️ Project Structure

```
migrations/
├── postgres/               # PostgreSQL migrations (Goose format)
│   ├── 20240601000001_initial_schema.sql
│   ├── 20240601000002_add_indexes.sql
│   └── ...
└── clickhouse/             # ClickHouse migrations (Goose format)
    ├── 20240601000001_initial_schema.sql
    └── ...

generated/
└── prisma/                 # Generated TypeScript types

server/internal/database/
├── queries/                # SQL queries for sqlc
│   ├── spaces.sql
│   ├── users.sql
│   └── ...
└── generated/              # Generated Go types
    ├── models.go
    ├── querier.go
    └── ...
```

## 📝 Creating New Migrations

### PostgreSQL Migration
```bash
npm run db:create:postgres add_new_feature
# or
./scripts/goose-migrate.sh postgres create add_new_feature
```

### ClickHouse Migration
```bash
npm run db:create:clickhouse add_analytics_table
# or
./scripts/goose-migrate.sh clickhouse create add_analytics_table
```

### Migration File Format
Goose migrations use a single file with `-- +goose Up` and `-- +goose Down` annotations:

```sql
-- +goose Up
-- Create new table
CREATE TABLE new_feature (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- +goose Down
-- Rollback changes
DROP TABLE IF EXISTS new_feature;
```

## 🔧 Type Generation

### TypeScript (Prisma)
- **Location**: `generated/prisma/`
- **Usage**: Import from `@/lib/db/prisma`
- **Features**: Type-safe database access, relations, transactions

```typescript
import { prisma, type Space } from '@/lib/db/prisma';

const space = await prisma.spaces.findUnique({
  where: { id: spaceId },
  include: { projects: true }
});
```

### Go (sqlc)
- **Location**: `server/internal/database/generated/`
- **Usage**: Import generated package
- **Features**: Type-safe queries, prepared statements

```go
import "server/internal/database/generated"

queries := generated.New(db)
space, err := queries.GetSpace(ctx, spaceID)
```

## 🔄 Development Workflow

### 1. Start Development
```bash
# Start databases
docker-compose up -d postgres clickhouse

# Setup environment
npm run dev:setup
```

### 2. Create New Migration
```bash
# Create migration
npm run db:create:postgres add_user_preferences

# Edit the generated file
# migrations/postgres/20240601000005_add_user_preferences.sql
```

### 3. Apply Migration and Generate Types
```bash
# Apply migration
npm run dev:migrate

# Generate types
npm run dev:types
```

### 4. Use Generated Types
```typescript
// In TypeScript
import { prismaUsersRepository } from '@/lib/repositories/prisma';
const user = await prismaUsersRepository.getById(userId);
```

```go
// In Go
queries := generated.New(db)
user, err := queries.GetUser(ctx, userID)
```

## 🚨 Best Practices

### ✅ DO:
- Always create both Up and Down migrations
- Test rollbacks in development
- Use descriptive migration names
- Keep migrations small and focused
- Generate types after schema changes
- Use transactions for complex migrations

### ❌ DON'T:
- Edit existing migration files after they're applied
- Delete migration files
- Skip version numbers
- Make breaking changes without proper rollback strategy
- Commit without generating types

## 🔍 Troubleshooting

### Migration Fails
```bash
# Check migration status
npm run dev:status

# Force migration to specific version (dangerous!)
./scripts/goose-migrate.sh postgres force <version>
```

### Type Generation Fails
```bash
# Check database connection
npm run dev:check

# Regenerate types
npm run dev:types
```

### Database Connection Issues
```bash
# Check if databases are running
docker-compose ps

# Restart databases
docker-compose restart postgres clickhouse
```

## 📚 References

- [Goose Documentation](https://pressly.github.io/goose/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [sqlc Documentation](https://docs.sqlc.dev/)
