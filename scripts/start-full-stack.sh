#!/bin/bash

# Errly Full Stack Startup Script
# This script starts the complete Errly infrastructure

set -e

echo "🚀 Starting Errly Full Stack..."

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

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    print_error "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

print_status "Checking for existing containers..."

# Stop existing containers if running
if docker-compose ps | grep -q "Up"; then
    print_warning "Found running containers. Stopping them..."
    docker-compose down
fi

print_status "Building and starting services..."

# Build and start all services
docker-compose up --build -d

print_status "Waiting for services to be healthy..."

# Function to wait for service health
wait_for_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy"; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        print_status "Waiting for $service_name to be healthy (attempt $attempt/$max_attempts)..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to become healthy"
    return 1
}

# Wait for all services to be healthy
services=("postgres" "clickhouse" "redis" "api-server" "web-ui")

for service in "${services[@]}"; do
    wait_for_service $service
done

print_success "All services are healthy!"

echo ""
echo "🎉 Errly Full Stack is now running!"
echo ""
echo "📊 Services:"
echo "  • PostgreSQL:    http://localhost:5432"
echo "  • ClickHouse:    http://localhost:8123"
echo "  • Redis:         http://localhost:6379"
echo "  • Go API Server: http://localhost:8080"
echo "  • Next.js Web:   http://localhost:3000"
echo ""
echo "🔗 Quick Links:"
echo "  • Web Interface: http://localhost:3000"
echo "  • API Health:    http://localhost:8080/health"
echo "  • Web Health:    http://localhost:3000/health"
echo ""
echo "📝 Logs:"
echo "  • View all logs:     docker-compose logs -f"
echo "  • View API logs:     docker-compose logs -f api-server"
echo "  • View Web logs:     docker-compose logs -f web-ui"
echo ""
echo "🛑 To stop all services:"
echo "  • docker-compose down"
echo ""

# Optional: Open browser
if command -v open > /dev/null 2>&1; then
    read -p "Open web interface in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open http://localhost:3000
    fi
elif command -v xdg-open > /dev/null 2>&1; then
    read -p "Open web interface in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open http://localhost:3000
    fi
fi

print_success "Startup complete! 🚀"
