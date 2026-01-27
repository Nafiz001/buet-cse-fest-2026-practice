# Run Prisma migrations on Azure PostgreSQL
# Run this AFTER azure-deploy.ps1 completes

$DB_SERVER = "citycare-db-server"
$DB_ADMIN_USER = "citycareadmin"
$DB_ADMIN_PASSWORD = "CityCare2026!Secure"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Prisma Migrations on Azure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Hospital Service Migration
Write-Host "`nRunning Hospital Service migration..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/hospital_db?sslmode=require"
Set-Location hospital-service
npx prisma db push
Set-Location ..

# Ambulance Service Migration
Write-Host "`nRunning Ambulance Service migration..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/ambulance_db?sslmode=require"
Set-Location ambulance-service
npx prisma db push
Set-Location ..

# Emergency Request Service Migration
Write-Host "`nRunning Emergency Request Service migration..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/emergency_request_db?sslmode=require"
Set-Location emergency-request-service
npx prisma db push
Set-Location ..

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "All migrations completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
