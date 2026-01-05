# Start development environment script for Windows
# Usage: .\scripts\start-dev.ps1

Write-Host "🚀 Starting Ayiti Talents Order Tracking Development Environment..." -ForegroundColor Cyan

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker first." -ForegroundColor Red
    exit 1
}

# Start Docker containers
Write-Host "📦 Starting Docker containers..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 1
    $result = docker-compose exec -T postgres pg_isready -U postgres 2>$null
} while (-not $result)
Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green

# Wait for Redis to be ready
Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
do {
    Start-Sleep -Seconds 1
    $result = docker-compose exec -T redis redis-cli ping 2>$null
} while ($result -ne "PONG")
Write-Host "✅ Redis is ready!" -ForegroundColor Green

# Install backend dependencies if needed
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

# Install frontend dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
Push-Location backend
npx prisma generate
Pop-Location

# Run database migrations
Write-Host "🗃️ Running database migrations..." -ForegroundColor Yellow
Push-Location backend
npx prisma db push
Pop-Location

Write-Host ""
Write-Host "✅ Development environment is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the servers, run in separate terminals:" -ForegroundColor Cyan
Write-Host "  Backend:  cd backend; npm run dev" -ForegroundColor White
Write-Host "  Frontend: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use Docker for everything:" -ForegroundColor Cyan
Write-Host "  docker-compose up" -ForegroundColor White
Write-Host ""
Write-Host "📖 Demo credentials:" -ForegroundColor Cyan
Write-Host "  Admin:  admin@ayiti.com / password123" -ForegroundColor White
Write-Host "  Driver: driver@ayiti.com / password123" -ForegroundColor White
Write-Host "  User:   user@ayiti.com / password123" -ForegroundColor White



