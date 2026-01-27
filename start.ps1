# CityCare Platform - Quick Start Script (PowerShell)
# This script sets up and starts the entire platform

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CityCare Emergency Platform - Quick Start" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if docker-compose is available
try {
    docker-compose version | Out-Null
    Write-Host "✅ docker-compose is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: docker-compose is not installed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
docker-compose build

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "🏥 Checking service health..." -ForegroundColor Yellow

$services = @(
    @{Name="hospital-service"; Port=3001},
    @{Name="ambulance-service"; Port=3002},
    @{Name="validation-service"; Port=3003},
    @{Name="emergency-request-service"; Port=3004}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($service.Port)/health" -TimeoutSec 2 -UseBasicParsing
        Write-Host "  ✅ $($service.Name) is healthy" -ForegroundColor Green
    } catch {
        Write-Host "  ⚠️  $($service.Name) is not responding yet (may need more time)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ CityCare Platform is running!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor White
Write-Host "  🏥 Hospital Service:     http://localhost:3001" -ForegroundColor White
Write-Host "  🚑 Ambulance Service:    http://localhost:3002" -ForegroundColor White
Write-Host "  ✅ Validation Service:   http://localhost:3003" -ForegroundColor White
Write-Host "  🚨 Emergency Service:    http://localhost:3004" -ForegroundColor White
Write-Host ""
Write-Host "Monitoring:" -ForegroundColor White
Write-Host "  📊 Prometheus:           http://localhost:9090" -ForegroundColor White
Write-Host "  📈 Grafana:              http://localhost:3000 (admin/admin)" -ForegroundColor White
Write-Host ""
Write-Host "View logs:" -ForegroundColor White
Write-Host "  docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "Stop services:" -ForegroundColor White
Write-Host "  docker-compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy hacking! 🚀" -ForegroundColor Cyan
