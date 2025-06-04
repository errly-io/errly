#!/bin/bash

# Script for starting databases in development mode

echo "🚀 Starting development databases..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.dev.yml down

# Start databases
echo "🔄 Starting databases..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
echo "⏳ Waiting for databases to be ready..."

# Check PostgreSQL
echo "🐘 Checking PostgreSQL..."
until docker exec errly-postgres pg_isready -U errly -d errly > /dev/null 2>&1; do
    echo "   PostgreSQL is not ready yet..."
    sleep 2
done
echo "✅ PostgreSQL is ready!"

# Check ClickHouse
echo "🏠 Checking ClickHouse..."
until docker exec errly-clickhouse wget --no-verbose --tries=1 --spider http://localhost:8123/ping > /dev/null 2>&1; do
    echo "   ClickHouse is not ready yet..."
    sleep 2
done
echo "✅ ClickHouse is ready!"

# Check Redis
echo "🔴 Checking Redis..."
until docker exec errly-redis redis-cli ping > /dev/null 2>&1; do
    echo "   Redis is not ready yet..."
    sleep 2
done
echo "✅ Redis is ready!"

echo ""
echo "🎉 All databases are ready!"
echo ""
echo "📊 Database URLs:"
echo "   PostgreSQL: postgresql://errly:errly_dev_password@localhost:5432/errly"
echo "   ClickHouse: http://localhost:8123 (user: errly, password: errly_dev_password)"
echo "   Redis:      redis://localhost:6379"
echo ""
echo "🔧 Management URLs:"
echo "   ClickHouse UI: http://localhost:8123/play"
echo ""
echo "📝 To stop databases: docker-compose -f docker-compose.dev.yml down"
echo "📝 To view logs: docker-compose -f docker-compose.dev.yml logs -f"
