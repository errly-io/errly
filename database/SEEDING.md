# Database Seeding System

This document describes the database seeding system for Errly, which provides a clean separation between schema migrations and data seeding.

## 🎯 Overview

The seeding system is designed with the following principles:
- **Separation of Concerns**: Schema changes (migrations) are separate from data seeding
- **Environment-Specific**: Different seed data for development, test, and production
- **Idempotent**: Safe to run multiple times without side effects
- **Type-Safe**: Written in Go for better error handling and type safety
- **Secure**: Production requires explicit confirmation

## 📁 Structure

```
database/
├── seeds/                          # PostgreSQL seed files
│   ├── development.sql            # Development sample data
│   ├── test.sql                   # Test data for automated testing
│   ├── production.sql             # Minimal production data
│   └── clickhouse/                # ClickHouse seed files
│       ├── development.sql
│       ├── test.sql
│       └── production.sql
├── cmd/seed/                      # Go seeding utility
│   ├── main.go                    # Main seeding logic
│   └── go.mod                     # Go dependencies
└── SEEDING.md                     # This documentation
```

## 🚀 Quick Start

### Using npm scripts (recommended)
```bash
# Seed development data
npm run db:seed:dev

# Seed test data
npm run db:seed:test

# Clean development data
npm run db:clean:dev

# Reset (clean + seed) development data
npm run db:reset:dev
```

### Using the script directly
```bash
# Seed all databases for development
./scripts/seed.sh development all seed

# Seed only PostgreSQL for testing
./scripts/seed.sh test postgres seed

# Clean all test data
./scripts/seed.sh test all clean

# Reset development ClickHouse data
./scripts/seed.sh development clickhouse reset
```

## 📋 Available Commands

### npm Scripts
- `npm run db:seed:dev` - Seed development data (all databases)
- `npm run db:seed:test` - Seed test data (all databases)
- `npm run db:seed:postgres` - Seed PostgreSQL only (development)
- `npm run db:seed:clickhouse` - Seed ClickHouse only (development)
- `npm run db:clean:dev` - Clean development seed data
- `npm run db:clean:test` - Clean test seed data
- `npm run db:reset:dev` - Reset development data (clean + seed)
- `npm run db:reset:test` - Reset test data (clean + seed)

### Direct Script Usage
```bash
./scripts/seed.sh <environment> <database> <action> [--force]
```

**Arguments:**
- `environment`: `development`, `test`, `production`
- `database`: `postgres`, `clickhouse`, `all`
- `action`: `seed`, `clean`, `reset`
- `--force`: Required for production operations

## 🔧 Configuration

The seeding system uses the same environment variables as the migration system:

```bash
# PostgreSQL connection
POSTGRES_URL=postgresql://user:password@localhost:5432/errly

# ClickHouse connection
CLICKHOUSE_URL=localhost:9000
```

## 📝 Seed Data Files

### PostgreSQL Seeds (`database/seeds/`)

**development.sql**: Sample data for local development
- Demo space with sample projects
- Test users and API keys
- Realistic data for UI development

**test.sql**: Minimal data for automated testing
- Predictable IDs for test assertions
- Minimal dataset for fast test execution
- Clean, isolated test data

**production.sql**: Essential production data
- Intentionally minimal
- Only critical system configuration
- No sample/test data

### ClickHouse Seeds (`database/seeds/clickhouse/`)

Similar structure but for ClickHouse-specific data:
- Error events and issues for development
- Test events for automated testing
- Empty for production (data created by application)

## 🛡️ Safety Features

### Production Protection
- Requires `--force` flag for all production operations
- Interactive confirmation for destructive actions
- Cleaning production data is explicitly forbidden

### Idempotency
- Uses `ON CONFLICT DO NOTHING` for safe re-runs
- Cleaning operations use specific patterns to avoid data loss
- Reset operations are atomic (clean then seed)

### Error Handling
- Comprehensive error messages
- Transaction-safe operations
- Graceful handling of missing files

## 🔄 Development Workflow

### 1. Initial Setup
```bash
# Run migrations first
npm run db:migrate

# Then seed development data
npm run db:seed:dev
```

### 2. Adding New Seed Data
1. Edit the appropriate `.sql` file in `database/seeds/`
2. Run the seeding command to test
3. Commit the changes

### 3. Testing
```bash
# Clean test environment
npm run db:clean:test

# Seed fresh test data
npm run db:seed:test

# Run your tests
npm test
```

### 4. Resetting Development Data
```bash
# Reset all development data
npm run db:reset:dev

# Or reset specific database
./scripts/seed.sh development postgres reset
```

## 🚨 Migration from Old System

The old migration-based seeding has been removed:
- `migrations/postgres/00004_seed_data.sql` - Cleaned up
- `migrations/clickhouse/20240601000002_seed_data.sql` - Cleaned up

All seed data has been moved to the new system with proper environment separation.

## 🔍 Troubleshooting

### Common Issues

**"Go is not installed"**
- Install Go 1.21+ from https://golang.org/

**"POSTGRES_URL not set"**
- Set the environment variable or add to `.env.local`

**"Seed file not found"**
- Check that the file exists in the correct directory
- Verify the environment name is correct

**"Permission denied"**
- Make sure the script is executable: `chmod +x scripts/seed.sh`

### Debug Mode
```bash
# Run with verbose output
./scripts/seed.sh development all seed --force
```

## 📚 Best Practices

1. **Keep production seeds minimal** - Only essential system data
2. **Use realistic development data** - Helps catch UI/UX issues
3. **Keep test data predictable** - Use fixed IDs for assertions
4. **Run seeds after migrations** - Always migrate schema first
5. **Clean before important tests** - Ensure clean state
6. **Version control seed files** - Track changes to seed data

## 🔗 Related Documentation

- [Database Migrations](./MIGRATIONS.md) - Schema migration system
- [Development Setup](../docs/DEVELOPMENT.md) - Full development setup
- [Testing Guide](../docs/TESTING.md) - Testing best practices
