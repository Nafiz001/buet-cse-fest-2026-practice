# Azure Deployment Script for CityCare Microservices
# This script deploys all services to Azure Container Apps

# Configuration
$RESOURCE_GROUP = "citycare-rg"
$LOCATION = "eastus"
$ENVIRONMENT = "citycare-env"
$REGISTRY_NAME = "citycareregistry"
$LOG_ANALYTICS_WORKSPACE = "citycare-logs"

# Database Configuration
$DB_SERVER = "citycare-db-server"
$DB_ADMIN_USER = "citycareadmin"
$DB_ADMIN_PASSWORD = "CityCare2026!Secure"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CityCare Azure Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Azure CLI is installed
Write-Host "`nChecking Azure CLI..." -ForegroundColor Yellow
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "Azure CLI not found. Please install it from: https://aka.ms/installazurecliwindows" -ForegroundColor Red
    exit 1
}

Write-Host "Azure CLI found!" -ForegroundColor Green

# Login to Azure
Write-Host "`nLogging in to Azure..." -ForegroundColor Yellow
az login

# Create Resource Group
Write-Host "`nCreating Resource Group: $RESOURCE_GROUP..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
Write-Host "`nCreating Azure Container Registry: $REGISTRY_NAME..." -ForegroundColor Yellow
az acr create --resource-group $RESOURCE_GROUP --name $REGISTRY_NAME --sku Basic --admin-enabled true

# Get ACR credentials
Write-Host "`nGetting ACR credentials..." -ForegroundColor Yellow
$ACR_USERNAME = az acr credential show --name $REGISTRY_NAME --query "username" -o tsv
$ACR_PASSWORD = az acr credential show --name $REGISTRY_NAME --query "passwords[0].value" -o tsv
$ACR_LOGIN_SERVER = az acr show --name $REGISTRY_NAME --query "loginServer" -o tsv

Write-Host "ACR Login Server: $ACR_LOGIN_SERVER" -ForegroundColor Green

# Login to ACR
Write-Host "`nLogging in to Azure Container Registry..." -ForegroundColor Yellow
az acr login --name $REGISTRY_NAME

# Create PostgreSQL Flexible Server
Write-Host "`nCreating Azure PostgreSQL Flexible Server..." -ForegroundColor Yellow
az postgres flexible-server create `
    --resource-group $RESOURCE_GROUP `
    --name $DB_SERVER `
    --location $LOCATION `
    --admin-user $DB_ADMIN_USER `
    --admin-password $DB_ADMIN_PASSWORD `
    --sku-name Standard_B1ms `
    --tier Burstable `
    --version 16 `
    --public-access 0.0.0.0 `
    --storage-size 32

# Create databases
Write-Host "`nCreating databases..." -ForegroundColor Yellow
az postgres flexible-server db create --resource-group $RESOURCE_GROUP --server-name $DB_SERVER --database-name hospital_db
az postgres flexible-server db create --resource-group $RESOURCE_GROUP --server-name $DB_SERVER --database-name ambulance_db
az postgres flexible-server db create --resource-group $RESOURCE_GROUP --server-name $DB_SERVER --database-name emergency_request_db

# Configure firewall rules
Write-Host "`nConfiguring database firewall rules..." -ForegroundColor Yellow
az postgres flexible-server firewall-rule create `
    --resource-group $RESOURCE_GROUP `
    --name $DB_SERVER `
    --rule-name AllowAzureServices `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Create Log Analytics Workspace
Write-Host "`nCreating Log Analytics Workspace..." -ForegroundColor Yellow
az monitor log-analytics workspace create `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS_WORKSPACE `
    --location $LOCATION

$LOG_ANALYTICS_ID = az monitor log-analytics workspace show `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS_WORKSPACE `
    --query "customerId" -o tsv

$LOG_ANALYTICS_KEY = az monitor log-analytics workspace get-shared-keys `
    --resource-group $RESOURCE_GROUP `
    --workspace-name $LOG_ANALYTICS_WORKSPACE `
    --query "primarySharedKey" -o tsv

# Create Container Apps Environment
Write-Host "`nCreating Container Apps Environment..." -ForegroundColor Yellow
az containerapp env create `
    --name $ENVIRONMENT `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --logs-workspace-id $LOG_ANALYTICS_ID `
    --logs-workspace-key $LOG_ANALYTICS_KEY

# Build and push Docker images
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Building and pushing Docker images..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$services = @("hospital-service", "ambulance-service", "validation-service", "emergency-request-service", "orchestrator-service")

foreach ($service in $services) {
    Write-Host "`nBuilding $service..." -ForegroundColor Yellow
    Set-Location $service
    docker build -t "${ACR_LOGIN_SERVER}/${service}:latest" .
    
    Write-Host "Pushing $service to ACR..." -ForegroundColor Yellow
    docker push "${ACR_LOGIN_SERVER}/${service}:latest"
    
    Set-Location ..
}

# Database connection strings
$HOSPITAL_DB_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/hospital_db?sslmode=require"
$AMBULANCE_DB_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/ambulance_db?sslmode=require"
$EMERGENCY_DB_URL = "postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER}.postgres.database.azure.com:5432/emergency_request_db?sslmode=require"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Deploying Container Apps..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Deploy Hospital Service
Write-Host "`nDeploying Hospital Service..." -ForegroundColor Yellow
az containerapp create `
    --name hospital-service `
    --resource-group $RESOURCE_GROUP `
    --environment $ENVIRONMENT `
    --image "${ACR_LOGIN_SERVER}/hospital-service:latest" `
    --target-port 3001 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 5 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --env-vars "NODE_ENV=production" "PORT=3001" "DATABASE_URL=$HOSPITAL_DB_URL"

# Deploy Ambulance Service
Write-Host "`nDeploying Ambulance Service..." -ForegroundColor Yellow
az containerapp create `
    --name ambulance-service `
    --resource-group $RESOURCE_GROUP `
    --environment $ENVIRONMENT `
    --image "${ACR_LOGIN_SERVER}/ambulance-service:latest" `
    --target-port 3002 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 5 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --env-vars "NODE_ENV=production" "PORT=3002" "DATABASE_URL=$AMBULANCE_DB_URL"

# Get service URLs for validation service
$HOSPITAL_URL = az containerapp show --name hospital-service --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
$AMBULANCE_URL = az containerapp show --name ambulance-service --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv

# Deploy Validation Service
Write-Host "`nDeploying Validation Service..." -ForegroundColor Yellow
az containerapp create `
    --name validation-service `
    --resource-group $RESOURCE_GROUP `
    --environment $ENVIRONMENT `
    --image "${ACR_LOGIN_SERVER}/validation-service:latest" `
    --target-port 3003 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 5 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --env-vars "NODE_ENV=production" "PORT=3003" "HOSPITAL_SERVICE_URL=https://$HOSPITAL_URL" "AMBULANCE_SERVICE_URL=https://$AMBULANCE_URL"

# Deploy Emergency Request Service
$VALIDATION_URL = az containerapp show --name validation-service --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`nDeploying Emergency Request Service..." -ForegroundColor Yellow
az containerapp create `
    --name emergency-request-service `
    --resource-group $RESOURCE_GROUP `
    --environment $ENVIRONMENT `
    --image "${ACR_LOGIN_SERVER}/emergency-request-service:latest" `
    --target-port 3004 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 5 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --env-vars "NODE_ENV=production" "PORT=3004" "DATABASE_URL=$EMERGENCY_DB_URL" "VALIDATION_SERVICE_URL=https://$VALIDATION_URL" "HOSPITAL_SERVICE_URL=https://$HOSPITAL_URL" "AMBULANCE_SERVICE_URL=https://$AMBULANCE_URL"

# Deploy Orchestrator Service
Write-Host "`nDeploying Orchestrator Service..." -ForegroundColor Yellow
az containerapp create `
    --name orchestrator-service `
    --resource-group $RESOURCE_GROUP `
    --environment $ENVIRONMENT `
    --image "${ACR_LOGIN_SERVER}/orchestrator-service:latest" `
    --target-port 3005 `
    --ingress external `
    --min-replicas 1 `
    --max-replicas 10 `
    --cpu 0.5 `
    --memory 1.0Gi `
    --registry-server $ACR_LOGIN_SERVER `
    --registry-username $ACR_USERNAME `
    --registry-password $ACR_PASSWORD `
    --env-vars "NODE_ENV=production" "PORT=3005" "VALIDATION_SERVICE_URL=https://$VALIDATION_URL" "HOSPITAL_SERVICE_URL=https://$HOSPITAL_URL" "AMBULANCE_SERVICE_URL=https://$AMBULANCE_URL"

# Get orchestrator URL
$ORCHESTRATOR_URL = az containerapp show --name orchestrator-service --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
$REQUEST_URL = az containerapp show --name emergency-request-service --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "`nService URLs:" -ForegroundColor Cyan
Write-Host "Hospital Service: https://$HOSPITAL_URL" -ForegroundColor White
Write-Host "Ambulance Service: https://$AMBULANCE_URL" -ForegroundColor White
Write-Host "Validation Service: https://$VALIDATION_URL" -ForegroundColor White
Write-Host "Emergency Request Service: https://$REQUEST_URL" -ForegroundColor White
Write-Host "Orchestrator Service: https://$ORCHESTRATOR_URL" -ForegroundColor White

Write-Host "`nDatabase Server:" -ForegroundColor Cyan
Write-Host "${DB_SERVER}.postgres.database.azure.com" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Run Prisma migrations on cloud databases" -ForegroundColor White
Write-Host "2. Deploy admin frontend to Azure Static Web Apps" -ForegroundColor White
Write-Host "3. Configure auto-scaling rules" -ForegroundColor White
Write-Host "4. Set up monitoring alerts" -ForegroundColor White

Write-Host "`nSaving deployment info to deployment-info.txt..." -ForegroundColor Yellow
@"
CityCare Azure Deployment Information
Generated: $(Get-Date)

Resource Group: $RESOURCE_GROUP
Location: $LOCATION
Container Registry: $ACR_LOGIN_SERVER

Service URLs:
- Hospital Service: https://$HOSPITAL_URL
- Ambulance Service: https://$AMBULANCE_URL
- Validation Service: https://$VALIDATION_URL
- Emergency Request Service: https://$REQUEST_URL
- Orchestrator Service: https://$ORCHESTRATOR_URL

Database Server: ${DB_SERVER}.postgres.database.azure.com
Admin User: $DB_ADMIN_USER

Databases:
- hospital_db
- ambulance_db
- emergency_request_db
"@ | Out-File -FilePath "deployment-info.txt"

Write-Host "`nDeployment info saved to deployment-info.txt" -ForegroundColor Green
