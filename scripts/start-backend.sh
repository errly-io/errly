#!/bin/bash

# Errly Backend Startup Script
# This script starts databases and Go API server

set -e

echo "🚀 Starting Errly Backend (Databases + Go API)..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Starting databases..."

# Start databases
docker-compose up -d postgres clickhouse redis

print_status "Waiting for databases to be ready..."

# Wait for PostgreSQL
print_status "Waiting for PostgreSQL..."
until docker-compose exec postgres pg_isready -U errly -d errly > /dev/null 2>&1; do
    sleep 2
done
print_success "PostgreSQL is ready"

# Wait for Redis
print_status "Waiting for Redis..."
until docker-compose exec redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done
print_success "Redis is ready"

# Wait for ClickHouse (just check if port is open)
print_status "Waiting for ClickHouse..."
until curl -s http://localhost:8123/ping > /dev/null 2>&1; do
    sleep 2
done
print_success "ClickHouse is ready"

print_status "Running database migrations..."

# Run PostgreSQL migrations
if ./scripts/db-migrate.sh up; then
    print_success "Database migrations completed"
else
    print_error "Database migrations failed"
    exit 1
fi

print_status "Starting Go API server..."

# Start API server
docker-compose up -d api-server --no-deps

print_status "Waiting for API server to be ready..."

# Wait for API server
until curl -s http://localhost:8080/health > /dev/null 2>&1; do
    sleep 2
done
print_success "Go API server is ready"

echo ""
print_success "Errly Backend is now running!"
echo ""
echo "📊 Services:"
echo "  • PostgreSQL:    localhost:5432"
echo "  • ClickHouse:    localhost:8123 (HTTP), localhost:9000 (Native)"
echo "  • Redis:         localhost:6379"
echo "  • Go API Server: http://localhost:8080"
echo ""
echo "🔗 Quick Tests:"
echo "  • API Health:    curl http://localhost:8080/health"
echo "  • ClickHouse:    curl http://localhost:8123/ping"
echo "  • PostgreSQL:    docker-compose exec postgres pg_isready -U errly"
echo "  • Redis:         docker-compose exec redis redis-cli ping"
echo ""
echo "📝 Logs:"
echo "  • API logs:      docker-compose logs -f api-server"
echo "  • All logs:      docker-compose logs -f postgres clickhouse redis api-server"
echo ""
echo "🛑 To stop:"
echo "  • docker-compose down"
echo ""

print_success "Backend startup complete! 🚀"
print_status "You can now start the Next.js web UI separately with: cd web && npm run dev"
