#!/bin/bash

# Development Setup Script for Errly
# This script sets up the development environment with migrations and type generation

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

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Check if required tools are installed
check_dependencies() {
    print_header "Checking Dependencies"
    
    local missing_deps=()
    
    # Check for goose
    if ! command -v goose &> /dev/null && [ ! -f "$HOME/go/bin/goose" ]; then
        missing_deps+=("goose")
    fi
    
    # Check for sqlc
    if ! command -v sqlc &> /dev/null && [ ! -f "$HOME/go/bin/sqlc" ]; then
        missing_deps+=("sqlc")
    fi
    
    # Check for prisma
    if ! command -v prisma &> /dev/null; then
        missing_deps+=("prisma")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "To install missing dependencies:"
        for dep in "${missing_deps[@]}"; do
            case $dep in
                goose)
                    echo "  go install github.com/pressly/goose/v3/cmd/goose@latest"
                    ;;
                sqlc)
                    echo "  go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest"
                    ;;
                prisma)
                    echo "  pnpm add prisma @prisma/client"
                    ;;
            esac
        done
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Check if databases are running
check_databases() {
    print_header "Checking Database Connections"
    
    # Check PostgreSQL
    if ! pg_isready -h localhost -p 5432 -U errly > /dev/null 2>&1; then
        print_error "PostgreSQL is not available"
        echo "Start it with: docker-compose up -d postgres"
        exit 1
    fi
    print_success "PostgreSQL is running"
    
    # Check ClickHouse
    if ! curl -s http://localhost:8123/ping > /dev/null 2>&1; then
        print_error "ClickHouse is not available"
        echo "Start it with: docker-compose up -d clickhouse"
        exit 1
    fi
    print_success "ClickHouse is running"
}

# Run migrations
run_migrations() {
    print_header "Running Database Migrations"
    
    print_status "Running PostgreSQL migrations..."
    ./scripts/goose-migrate.sh postgres up
    
    print_status "Running ClickHouse migrations..."
    ./scripts/goose-migrate.sh clickhouse up
    
    print_success "All migrations completed"
}

# Generate types
generate_types() {
    print_header "Generating Types"
    
    print_status "Generating Prisma types..."
    npm run types:prisma
    
    print_status "Generating sqlc types..."
    npm run types:sqlc
    
    print_success "Type generation completed"
}

# Show migration status
show_status() {
    print_header "Migration Status"
    
    print_status "PostgreSQL migration status:"
    ./scripts/goose-migrate.sh postgres status
    
    echo ""
    print_status "ClickHouse migration status:"
    ./scripts/goose-migrate.sh clickhouse status
}

# Main function
main() {
    local action=${1:-setup}
    
    case $action in
        setup)
            print_header "Errly Development Setup"
            check_dependencies
            check_databases
            run_migrations
            generate_types
            show_status
            print_success "Development environment is ready!"
            ;;
        migrate)
            check_databases
            run_migrations
            ;;
        types)
            generate_types
            ;;
        status)
            show_status
            ;;
        check)
            check_dependencies
            check_databases
            ;;
        *)
            echo "Usage: $0 [setup|migrate|types|status|check]"
            echo ""
            echo "Commands:"
            echo "  setup   - Full setup (default): check deps, run migrations, generate types"
            echo "  migrate - Run database migrations only"
            echo "  types   - Generate types only"
            echo "  status  - Show migration status"
            echo "  check   - Check dependencies and database connections"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
