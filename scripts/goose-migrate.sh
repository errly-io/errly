#!/bin/bash

# Goose Migration Script for Errly
# Usage: ./scripts/goose-migrate.sh [postgres|clickhouse|all] [up|down|status|create] [args...]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
POSTGRES_URL="postgres://errly:errly_dev_password@localhost:5432/errly?sslmode=disable"
CLICKHOUSE_URL="tcp://errly:errly_dev_password@localhost:9000/errly_events"
POSTGRES_MIGRATIONS_DIR="migrations/postgres"
CLICKHOUSE_MIGRATIONS_DIR="migrations/clickhouse"

# Check if goose is installed
GOOSE_CMD="goose"
if ! command -v goose &> /dev/null; then
    # Try to use goose from GOPATH
    if [ -f "$HOME/go/bin/goose" ]; then
        GOOSE_CMD="$HOME/go/bin/goose"
    else
        print_error "goose CLI not found. Please install it first:"
        echo "  go install github.com/pressly/goose/v3/cmd/goose@latest"
        exit 1
    fi
fi

DATABASE=${1:-all}
ACTION=${2:-status}
ARGS=${@:3}

run_postgres_migration() {
    local action=$1
    local args=$2

    print_status "Running PostgreSQL migration: $action"
    case $action in
        up)
            $GOOSE_CMD postgres "$POSTGRES_URL" up -dir "$POSTGRES_MIGRATIONS_DIR" $args
            ;;
        down)
            $GOOSE_CMD postgres "$POSTGRES_URL" down -dir "$POSTGRES_MIGRATIONS_DIR" $args
            ;;
        status)
            $GOOSE_CMD postgres "$POSTGRES_URL" status -dir "$POSTGRES_MIGRATIONS_DIR"
            ;;
        create)
            if [ -z "$args" ]; then
                print_error "Please specify migration name for create"
                echo "Usage: $0 postgres create <migration_name>"
                exit 1
            fi
            $GOOSE_CMD postgres "$POSTGRES_URL" create $args sql -dir "$POSTGRES_MIGRATIONS_DIR"
            ;;
        *)
            print_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

run_clickhouse_migration() {
    local action=$1
    local args=$2

    print_status "Running ClickHouse migration: $action"
    case $action in
        up)
            $GOOSE_CMD clickhouse "$CLICKHOUSE_URL" up -dir "$CLICKHOUSE_MIGRATIONS_DIR" $args
            ;;
        down)
            $GOOSE_CMD clickhouse "$CLICKHOUSE_URL" down -dir "$CLICKHOUSE_MIGRATIONS_DIR" $args
            ;;
        status)
            $GOOSE_CMD clickhouse "$CLICKHOUSE_URL" status -dir "$CLICKHOUSE_MIGRATIONS_DIR"
            ;;
        create)
            if [ -z "$args" ]; then
                print_error "Please specify migration name for create"
                echo "Usage: $0 clickhouse create <migration_name>"
                exit 1
            fi
            $GOOSE_CMD clickhouse "$CLICKHOUSE_URL" create $args sql -dir "$CLICKHOUSE_MIGRATIONS_DIR"
            ;;
        *)
            print_error "Unknown action: $action"
            exit 1
            ;;
    esac
}

case $DATABASE in
    postgres)
        run_postgres_migration "$ACTION" "$ARGS"
        ;;
    clickhouse)
        run_clickhouse_migration "$ACTION" "$ARGS"
        ;;
    all)
        if [ "$ACTION" = "create" ]; then
            print_error "Cannot create migrations for 'all'. Please specify 'postgres' or 'clickhouse'"
            exit 1
        fi
        print_status "Running migrations for all databases"
        run_postgres_migration "$ACTION" "$ARGS"
        echo ""
        run_clickhouse_migration "$ACTION" "$ARGS"
        ;;
    *)
        print_error "Unknown database: $DATABASE"
        echo ""
        echo "Usage: $0 [postgres|clickhouse|all] [up|down|status|create] [args...]"
        echo ""
        echo "Examples:"
        echo "  $0 all status                    # Show status for all databases"
        echo "  $0 all up                       # Apply all pending migrations"
        echo "  $0 postgres up                  # Apply PostgreSQL migrations"
        echo "  $0 clickhouse up                # Apply ClickHouse migrations"
        echo "  $0 postgres create add_users    # Create new PostgreSQL migration"
        echo "  $0 clickhouse create add_events # Create new ClickHouse migration"
        exit 1
        ;;
esac

print_success "Migration completed successfully"
