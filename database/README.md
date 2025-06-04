# Database Management

This directory contains all database-related files for the Errly project.

## 🚀 Quick Start

```bash
# 1. Run migrations (schema changes)
npm run db:migrate

# 2. Seed development data
npm run db:seed:dev

# 3. Generate types
npm run types:generate
```

## 📁 Directory Structure

```
database/
├── README.md                      # This file
├── MIGRATIONS.md                  # Migration system documentation
├── SEEDING.md                     # Seeding system documentation
├── seeds/                         # Data seeding files
│   ├── development.sql           # Development sample data
│   ├── test.sql                  # Test data
│   ├── production.sql            # Production data
│   └── clickhouse/               # ClickHouse-specific seeds
├── cmd/seed/                     # Go seeding utility
│   ├── main.go
│   └── go.mod
└── migrations/                   # Schema migrations (in project root)
```

## 🔧 Key Concepts

### Migrations vs Seeding

**Migrations** (`migrations/` directory):
- Schema changes only (CREATE TABLE, ALTER TABLE, etc.)
- Version controlled and sequential
- Applied automatically in CI/CD
- Managed by Goose

**Seeding** (`database/seeds/` directory):
- Sample and test data only
- Environment-specific (dev/test/prod)
- Applied manually or in development setup
- Managed by custom Go utility

### Environment Separation

- **Development**: Rich sample data for UI development
- **Test**: Minimal, predictable data for automated testing  
- **Production**: Essential system data only

## 📋 Common Commands

### Schema Management
```bash
npm run db:migrate              # Apply pending migrations
npm run db:status               # Check migration status
npm run db:create:postgres      # Create new PostgreSQL migration
```

### Data Management
```bash
npm run db:seed:dev            # Seed development data
npm run db:clean:dev           # Clean development data
npm run db:reset:dev           # Reset (clean + seed) development data
npm run db:seed:test           # Seed test data
```

### Type Generation
```bash
npm run types:generate         # Generate all types
npm run types:prisma           # Generate Prisma types only
npm run types:sqlc             # Generate sqlc types only
```

## 🛡️ Safety Features

- **Production Protection**: Requires explicit `--force` flag
- **Idempotent Operations**: Safe to run multiple times
- **Environment Isolation**: Separate data for each environment
- **Transaction Safety**: Atomic operations where possible

## 📚 Documentation

- **[MIGRATIONS.md](./MIGRATIONS.md)** - Complete migration system guide
- **[SEEDING.md](./SEEDING.md)** - Complete seeding system guide
- **[../docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md)** - Full development setup

## 🔗 Related Scripts

- **[../scripts/goose-migrate.sh](../scripts/goose-migrate.sh)** - Migration management
- **[../scripts/seed.sh](../scripts/seed.sh)** - Data seeding
- **[../scripts/dev-setup.sh](../scripts/dev-setup.sh)** - Development setup

## ⚡ Development Workflow

1. **Initial Setup**:
   ```bash
   npm run dev:setup              # Full setup (migrations + types)
   npm run db:seed:dev            # Add sample data
   ```

2. **Schema Changes**:
   ```bash
   npm run db:create:postgres add_feature
   # Edit the generated migration file
   npm run db:migrate
   npm run types:generate
   ```

3. **Data Changes**:
   ```bash
   # Edit database/seeds/development.sql
   npm run db:reset:dev           # Apply changes
   ```

4. **Testing**:
   ```bash
   npm run db:seed:test           # Prepare test data
   npm test                       # Run tests
   ```

## 🚨 Important Notes

- **Always run migrations before seeding**
- **Never put seed data in migration files**
- **Use environment-specific seed files**
- **Production seeding requires `--force` flag**
- **Clean test data between test runs**
