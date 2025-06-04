# Database Migrations with Goose

This project uses [Goose](https://github.com/pressly/goose) for database schema management with automatic type generation.

## 🚀 Quick Start

```bash
npm run dev:setup
```

This command will:
- Check all dependencies (goose, sqlc, prisma)
- Verify database connections (PostgreSQL + ClickHouse)
- Run all pending migrations
- Generate types for TypeScript and Go

**Note**: This does NOT include seeding data. For data seeding, see [Database Seeding](./SEEDING.md).

## 📋 Available Commands

```bash
# Development workflow
npm run dev:setup          # Full setup (migrations + types)
npm run dev:migrate         # Apply all pending migrations
npm run dev:types           # Generate all types
npm run dev:status          # Show migration status

# Create new migrations
npm run db:create:postgres add_feature      # Create PostgreSQL migration
npm run db:create:clickhouse add_analytics  # Create ClickHouse migration

# Data seeding (separate from migrations)
npm run db:seed:dev                         # Seed development data
npm run db:clean:dev                        # Clean development data
npm run db:reset:dev                        # Reset development data
```

## 🗂️ Project Structure

```
migrations/
├── postgres/               # PostgreSQL migrations (Goose format)
└── clickhouse/             # ClickHouse migrations (Goose format)

generated/
└── prisma/                 # Generated TypeScript types

server/internal/database/
├── queries/                # SQL queries for sqlc
└── generated/              # Generated Go types
```

## 📚 Resources

- **[Full Migration Documentation](../docs/MIGRATIONS.md)**
- [Goose Documentation](https://pressly.github.io/goose/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [sqlc Documentation](https://docs.sqlc.dev/)
