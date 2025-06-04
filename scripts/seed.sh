#!/bin/bash

# Database seeding script for Errly
# This script provides a convenient interface to the Go seeding utility

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_status() {
    echo -e "${BLUE}🔄 $1${NC}"
}

# Check if Go is installed
check_go() {
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed. Please install Go to use the seeding utility."
        exit 1
    fi
}

# Build the seeding utility
build_seeder() {
    print_status "Building seeding utility..."
    cd database/cmd/seed
    go mod tidy
    go build -o ../../../bin/seed .
    cd - > /dev/null
    print_success "Seeding utility built successfully"
}

# Check if seeder binary exists, build if not
ensure_seeder() {
    if [ ! -f "bin/seed" ]; then
        build_seeder
    fi
}

# Load environment variables
load_env() {
    if [ -f ".env.local" ]; then
        export $(grep -v '^#' .env.local | xargs)
    fi
    
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 <environment> <database> <action> [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Environment to seed (development, test, production)"
    echo "  database       Database to seed (postgres, clickhouse, all)"
    echo "  action         Action to perform (seed, clean, reset)"
    echo ""
    echo "Options:"
    echo "  --force        Force action without confirmation (required for production)"
    echo ""
    echo "Examples:"
    echo "  $0 development all seed           # Seed all databases for development"
    echo "  $0 test postgres clean           # Clean PostgreSQL test data"
    echo "  $0 development clickhouse reset  # Reset ClickHouse development data"
    echo "  $0 production all seed --force   # Seed production (requires --force)"
    echo ""
    echo "Environment Variables:"
    echo "  POSTGRES_URL      PostgreSQL connection URL"
    echo "  CLICKHOUSE_URL    ClickHouse connection URL"
}

# Validate arguments
validate_args() {
    if [ $# -lt 3 ]; then
        print_error "Insufficient arguments"
        show_usage
        exit 1
    fi
    
    local env=$1
    local db=$2
    local action=$3
    
    if [[ ! "$env" =~ ^(development|test|production)$ ]]; then
        print_error "Invalid environment: $env"
        show_usage
        exit 1
    fi
    
    if [[ ! "$db" =~ ^(postgres|clickhouse|all)$ ]]; then
        print_error "Invalid database: $db"
        show_usage
        exit 1
    fi
    
    if [[ ! "$action" =~ ^(seed|clean|reset)$ ]]; then
        print_error "Invalid action: $action"
        show_usage
        exit 1
    fi
}

# Confirm production actions
confirm_production() {
    local env=$1
    local action=$2
    local force=$3
    
    if [ "$env" = "production" ] && [ "$force" != "--force" ]; then
        print_error "Production environment requires --force flag for safety"
        exit 1
    fi
    
    if [ "$env" = "production" ]; then
        print_warning "You are about to $action production data!"
        read -p "Are you absolutely sure? Type 'yes' to continue: " confirm
        if [ "$confirm" != "yes" ]; then
            print_info "Operation cancelled"
            exit 0
        fi
    fi
}

# Main function
main() {
    if [ $# -eq 0 ]; then
        show_usage
        exit 1
    fi
    
    # Handle help
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    validate_args "$@"
    
    local env=$1
    local db=$2
    local action=$3
    local force=${4:-""}
    
    confirm_production "$env" "$action" "$force"
    
    check_go
    load_env
    ensure_seeder
    
    print_status "Running seeding utility..."
    
    # Build command arguments
    local args="-env=$env -db=$db -action=$action"
    if [ "$force" = "--force" ]; then
        args="$args -force"
    fi
    
    # Run the seeder
    if ./bin/seed $args; then
        print_success "Seeding operation completed successfully"
    else
        print_error "Seeding operation failed"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"
