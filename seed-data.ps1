# CityCare Platform - Test Data Seed Script (PowerShell)
# This script populates the system with sample data for testing

$BASE_URL = "http://localhost"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CityCare Platform - Seeding Test Data" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🏥 Creating hospitals..." -ForegroundColor Yellow

# Dhaka Hospitals
Invoke-RestMethod -Method Post -Uri "$BASE_URL:3001/hospitals" -ContentType "application/json" -Body '{"name":"Dhaka Medical College Hospital","city":"dhaka","icuBeds":80,"ventilators":40}' | Out-Null
Write-Host "  ✅ Created: Dhaka Medical College Hospital" -ForegroundColor Green

Invoke-RestMethod -Method Post -Uri "$BASE_URL:3001/hospitals" -ContentType "application/json" -Body '{"name":"Square Hospital","city":"dhaka","icuBeds":50,"ventilators":30}' | Out-Null
Write-Host "  ✅ Created: Square Hospital" -ForegroundColor Green

Invoke-RestMethod -Method Post -Uri "$BASE_URL:3001/hospitals" -ContentType "application/json" -Body '{"name":"United Hospital","city":"dhaka","icuBeds":60,"ventilators":35}' | Out-Null
Write-Host "  ✅ Created: United Hospital" -ForegroundColor Green

# Chittagong Hospitals
Invoke-RestMethod -Method Post -Uri "$BASE_URL:3001/hospitals" -ContentType "application/json" -Body '{"name":"Chittagong Medical College","city":"chittagong","icuBeds":70,"ventilators":30}' | Out-Null
Write-Host "  ✅ Created: Chittagong Medical College" -ForegroundColor Green

Invoke-RestMethod -Method Post -Uri "$BASE_URL:3001/hospitals" -ContentType "application/json" -Body '{"name":"Chevron Clinical Laboratory","city":"chittagong","icuBeds":40,"ventilators":20}' | Out-Null
Write-Host "  ✅ Created: Chevron Clinical Laboratory" -ForegroundColor Green

Write-Host ""
Write-Host "🚑 Creating ambulances..." -ForegroundColor Yellow

# Dhaka Ambulances
1..5 | ForEach-Object {
    $capacity = Get-Random -Minimum 4 -Maximum 8
    $body = @{
        vehicleId = "AMB-DH-00$_"
        city = "dhaka"
        capacity = $capacity
        status = "AVAILABLE"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Method Post -Uri "$BASE_URL:3002/ambulances" -ContentType "application/json" -Body $body | Out-Null
    Write-Host "  ✅ Created: AMB-DH-00$_ (Dhaka)" -ForegroundColor Green
}

# Add some busy ambulances
6..7 | ForEach-Object {
    $body = @{
        vehicleId = "AMB-DH-00$_"
        city = "dhaka"
        capacity = 4
        status = "BUSY"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Method Post -Uri "$BASE_URL:3002/ambulances" -ContentType "application/json" -Body $body | Out-Null
    Write-Host "  ✅ Created: AMB-DH-00$_ (Dhaka - BUSY)" -ForegroundColor Green
}

# Chittagong Ambulances
1..3 | ForEach-Object {
    $capacity = Get-Random -Minimum 4 -Maximum 8
    $body = @{
        vehicleId = "AMB-CTG-00$_"
        city = "chittagong"
        capacity = $capacity
        status = "AVAILABLE"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Method Post -Uri "$BASE_URL:3002/ambulances" -ContentType "application/json" -Body $body | Out-Null
    Write-Host "  ✅ Created: AMB-CTG-00$_ (Chittagong)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚨 Creating sample emergency requests..." -ForegroundColor Yellow

# Approved request
Invoke-RestMethod -Method Post -Uri "$BASE_URL:3004/requests" -ContentType "application/json" -Body '{"city":"dhaka","requiredIcuBeds":50,"requiredAmbulanceCapacity":15}' | Out-Null
Write-Host "  ✅ Created: Emergency request (should be APPROVED)" -ForegroundColor Green

# Rejected request (too many ICU beds)
Invoke-RestMethod -Method Post -Uri "$BASE_URL:3004/requests" -ContentType "application/json" -Body '{"city":"dhaka","requiredIcuBeds":500,"requiredAmbulanceCapacity":10}' | Out-Null
Write-Host "  ✅ Created: Emergency request (should be REJECTED - insufficient ICU)" -ForegroundColor Green

# Another approved request
Invoke-RestMethod -Method Post -Uri "$BASE_URL:3004/requests" -ContentType "application/json" -Body '{"city":"chittagong","requiredIcuBeds":60,"requiredAmbulanceCapacity":8}' | Out-Null
Write-Host "  ✅ Created: Emergency request (should be APPROVED)" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Test data seeded successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor White
Write-Host "  🏥 Hospitals: 5 (3 in Dhaka, 2 in Chittagong)" -ForegroundColor White
Write-Host "  🚑 Ambulances: 10 (7 in Dhaka, 3 in Chittagong)" -ForegroundColor White
Write-Host "  🚨 Emergency Requests: 3 (2 APPROVED, 1 REJECTED)" -ForegroundColor White
Write-Host ""
Write-Host "View data:" -ForegroundColor White
Write-Host "  Invoke-RestMethod -Uri $BASE_URL:3001/hospitals" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod -Uri $BASE_URL:3002/ambulances" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod -Uri $BASE_URL:3004/requests" -ForegroundColor Gray
Write-Host ""
