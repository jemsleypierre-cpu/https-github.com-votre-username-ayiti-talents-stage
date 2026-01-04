#!/bin/bash

# Start development environment script
# Usage: ./scripts/start-dev.sh

echo "🚀 Starting Ayiti Talents Order Tracking Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start Docker containers
echo "📦 Starting Docker containers..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
done
echo "✅ PostgreSQL is ready!"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 1
done
echo "✅ Redis is ready!"

# Install backend dependencies if needed
if [ ! -d "backend/node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
cd backend && npx prisma generate && cd ..

# Run database migrations
echo "🗃️ Running database migrations..."
cd backend && npx prisma db push && cd ..

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "To start the servers, run in separate terminals:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: npm run dev"
echo ""
echo "Or use Docker for everything:"
echo "  docker-compose up"
echo ""
echo "📖 Demo credentials:"
echo "  Admin:  admin@ayiti.com / password123"
echo "  Driver: driver@ayiti.com / password123"
echo "  User:   user@ayiti.com / password123"

