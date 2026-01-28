# CityCare - Starting with Scaling
# PowerShell script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CityCare - Starting with Scaling" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Pulling latest images..." -ForegroundColor Blue
docker-compose pull

Write-Host ""
Write-Host "🏗️  Building services..." -ForegroundColor Blue
docker-compose build

Write-Host ""
Write-Host "🚀 Starting services with scaling..." -ForegroundColor Blue
docker-compose up -d `
  --scale hospital-service=3 `
  --scale ambulance-service=3 `
  --scale emergency-request-service=3 `
  --scale validation-service=2 `
  --scale orchestrator-service=2

Write-Host ""
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "✅ Checking service health..." -ForegroundColor Green
Write-Host ""

# Function to check service
function Test-Service {
    param($Url, $Name)
    try {
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "✓" -ForegroundColor Green -NoNewline
        Write-Host " $Name`: $Url"
        return $true
    } catch {
        Write-Host "⚠" -ForegroundColor Yellow -NoNewline
        Write-Host " $Name`: Not responding"
        return $false
    }
}

# Check services
Test-Service "http://localhost:8080" "Nginx Load Balancer"
Test-Service "http://localhost:3001/health" "Hospital Service"
Test-Service "http://localhost:3002/health" "Ambulance Service"
Test-Service "http://localhost:3003/health" "Validation Service"
Test-Service "http://localhost:3004/health" "Emergency Request Service"
Test-Service "http://localhost:15672" "RabbitMQ Management (citycare/citycare123)"
Test-Service "http://localhost:3000" "Admin Frontend"

Write-Host ""
Write-Host "📊 Monitoring:" -ForegroundColor Green
Write-Host "  • Grafana: http://localhost:3006 (admin/admin)"
Write-Host "  • Prometheus: http://localhost:9090"
Write-Host "  • Nginx Status: http://localhost:8080/nginx_status"
Write-Host ""

Write-Host "📈 Service Scaling:" -ForegroundColor Blue
$services = docker-compose ps --format json | ConvertFrom-Json
$scaledServices = $services | Where-Object { $_.Service -match "(hospital-service|ambulance-service|emergency-request-service|validation-service|orchestrator-service)" }
Write-Host "  Running $($scaledServices.Count) service instances"

Write-Host ""
Write-Host "✨ CityCare is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "View logs: docker-compose logs -f"
Write-Host "Stop all: docker-compose down"
Write-Host ""
