# Test the deployed services on Azure

param(
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Azure Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Test Health Endpoints
Write-Host "`nTesting Health Endpoints..." -ForegroundColor Yellow

$services = @{
    "Hospital" = "${BaseUrl}/hospitals"
    "Ambulance" = "${BaseUrl}/ambulances"
    "Validation" = "${BaseUrl}/validate"
    "Orchestrator" = "${BaseUrl}/orchestrate"
}

foreach ($service in $services.Keys) {
    $url = $services[$service]
    try {
        Write-Host "Testing $service Service: $url/health" -ForegroundColor White
        $response = Invoke-RestMethod -Uri "$url/health" -Method Get -TimeoutSec 10
        Write-Host "  ✓ $service Service is healthy" -ForegroundColor Green
    }
    catch {
        Write-Host "  ✗ $service Service failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test Orchestrator
Write-Host "`nTesting Orchestration Endpoint..." -ForegroundColor Yellow

$body = @{
    city = "Dhaka"
    requiredIcuBeds = 10
    requiredAmbulanceCapacity = 5
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "${BaseUrl}/orchestrate/emergency" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  ✓ Orchestration successful!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json -Depth 5)" -ForegroundColor White
}
catch {
    Write-Host "  ✗ Orchestration failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Testing Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
