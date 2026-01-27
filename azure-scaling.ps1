# Configure auto-scaling rules for Azure Container Apps

$RESOURCE_GROUP = "citycare-rg"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuring Auto-Scaling Rules" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Orchestrator Service - Scale based on HTTP traffic
Write-Host "`nConfiguring Orchestrator Service scaling..." -ForegroundColor Yellow
az containerapp update `
    --name orchestrator-service `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --max-replicas 10 `
    --scale-rule-name http-requests `
    --scale-rule-type http `
    --scale-rule-http-concurrency 50

# Hospital Service
Write-Host "`nConfiguring Hospital Service scaling..." -ForegroundColor Yellow
az containerapp update `
    --name hospital-service `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --max-replicas 5 `
    --scale-rule-name http-requests `
    --scale-rule-type http `
    --scale-rule-http-concurrency 100

# Ambulance Service
Write-Host "`nConfiguring Ambulance Service scaling..." -ForegroundColor Yellow
az containerapp update `
    --name ambulance-service `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 1 `
    --max-replicas 5 `
    --scale-rule-name http-requests `
    --scale-rule-type http `
    --scale-rule-http-concurrency 100

# Validation Service - Critical, needs more scaling
Write-Host "`nConfiguring Validation Service scaling..." -ForegroundColor Yellow
az containerapp update `
    --name validation-service `
    --resource-group $RESOURCE_GROUP `
    --min-replicas 2 `
    --max-replicas 8 `
    --scale-rule-name http-requests `
    --scale-rule-type http `
    --scale-rule-http-concurrency 75

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Auto-scaling configured!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nScaling Configuration:" -ForegroundColor Cyan
Write-Host "- Orchestrator: 1-10 replicas (50 concurrent requests per replica)" -ForegroundColor White
Write-Host "- Validation: 2-8 replicas (75 concurrent requests per replica)" -ForegroundColor White
Write-Host "- Hospital: 1-5 replicas (100 concurrent requests per replica)" -ForegroundColor White
Write-Host "- Ambulance: 1-5 replicas (100 concurrent requests per replica)" -ForegroundColor White
