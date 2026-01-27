# CityCare - Azure Deployment Guide

> **⚠️ NOTICE:** This guide is for **Azure Container Apps** deployment. For the recommended **CI/CD deployment with Azure VM**, see [CI-CD.md](.github/CI-CD.md)

## Deployment Options

1. **[CI/CD with Azure VM](.github/CI-CD.md)** ⭐ **RECOMMENDED**
   - Automated deployment with GitHub Actions
   - Self-hosted runner on Azure VM
   - Continuous Integration and Continuous Deployment
   - Cost-effective for development/demo
   
2. **Azure Container Apps** (This Guide)
   - Fully managed container platform
   - Better for production workloads
   - Higher cost but more scalable

---

## Azure Container Apps Deployment

### Prerequisites

1. **Azure CLI** - Install from: https://aka.ms/installazurecliwindows
2. **Docker Desktop** - Running and logged in
3. **Azure Subscription** - Active with sufficient credits
4. **Node.js & npm** - For Prisma migrations

### Quick Deploy (30-45 minutes)

> **Note:** These PowerShell scripts are now deprecated in favor of the CI/CD approach. They are kept for reference only.

#### Step 1: Deploy Infrastructure & Services (DEPRECATED)

```powershell
cd citycare
.\azure-deploy.ps1
```

This script will:
- ✅ Create Azure Resource Group
- ✅ Create Azure Container Registry (ACR)
- ✅ Create Azure PostgreSQL Flexible Server (3 databases)
- ✅ Create Container Apps Environment
- ✅ Build & push all Docker images to ACR
- ✅ Deploy all 5 microservices
- ✅ Configure networking & environment variables

**Expected time: 30-40 minutes**

### Step 2: Run Database Migrations

```powershell
.\azure-migrate.ps1
```

This will run Prisma `db push` on all 3 cloud databases.

**Expected time: 2-3 minutes**

### Step 3: Configure Auto-Scaling

```powershell
.\azure-scaling.ps1
```

Sets up HTTP-based auto-scaling rules for all services.

**Expected time: 2 minutes**

### Step 4: Test Deployment

```powershell
# Replace with your orchestrator URL from deployment-info.txt
.\azure-test.ps1 -BaseUrl "https://orchestrator-service.YOUR_HASH.eastus.azurecontainerapps.io"
```

## Manual Deployment (Alternative)

If you prefer step-by-step control:

### 1. Login to Azure

```powershell
az login
```

### 2. Create Resource Group

```powershell
az group create --name citycare-rg --location eastus
```

### 3. Create Container Registry

```powershell
az acr create --resource-group citycare-rg --name citycareregistry --sku Basic --admin-enabled true
az acr login --name citycareregistry
```

### 4. Create PostgreSQL Server

```powershell
az postgres flexible-server create \
    --resource-group citycare-rg \
    --name citycare-db-server \
    --location eastus \
    --admin-user citycareadmin \
    --admin-password "CityCare2026!Secure" \
    --sku-name Standard_B1ms \
    --version 16 \
    --public-access 0.0.0.0
```

### 5. Create Databases

```powershell
az postgres flexible-server db create --resource-group citycare-rg --server-name citycare-db-server --database-name hospital_db
az postgres flexible-server db create --resource-group citycare-rg --server-name citycare-db-server --database-name ambulance_db
az postgres flexible-server db create --resource-group citycare-rg --server-name citycare-db-server --database-name emergency_request_db
```

### 6. Build & Push Images

```powershell
$ACR = "citycareregistry.azurecr.io"

docker build -t $ACR/hospital-service:latest ./hospital-service
docker push $ACR/hospital-service:latest

docker build -t $ACR/ambulance-service:latest ./ambulance-service
docker push $ACR/ambulance-service:latest

docker build -t $ACR/validation-service:latest ./validation-service
docker push $ACR/validation-service:latest

docker build -t $ACR/emergency-request-service:latest ./emergency-request-service
docker push $ACR/emergency-request-service:latest

docker build -t $ACR/orchestrator-service:latest ./orchestrator-service
docker push $ACR/orchestrator-service:latest
```

### 7. Create Container Apps Environment

```powershell
az containerapp env create \
    --name citycare-env \
    --resource-group citycare-rg \
    --location eastus
```

### 8. Deploy Services

See `azure-deploy.ps1` for full deployment commands.

## Cost Estimate

**Development/Demo Configuration:**
- Container Apps (5 services): ~$15-30/day
- PostgreSQL Flexible Server (Burstable): ~$10/day
- Container Registry (Basic): ~$0.20/day
- Log Analytics: ~$2/day

**Total: ~$30-45/day** (for active development)

**Cost Saving Tips:**
- Delete resources when not in use: `az group delete --name citycare-rg`
- Scale down to min replicas (1) for each service
- Use Azure for Students ($100 free credit)

## Monitoring

View logs and metrics in Azure Portal:
1. Navigate to Resource Group: `citycare-rg`
2. Click on any Container App
3. Go to "Log stream" or "Metrics"

## Troubleshooting

### Service Not Starting
```powershell
az containerapp logs show --name hospital-service --resource-group citycare-rg --tail 50
```

### Database Connection Issues
- Check firewall rules allow Azure services
- Verify connection strings in Container App environment variables
- Test connection: `psql -h citycare-db-server.postgres.database.azure.com -U citycareadmin -d hospital_db`

### Image Pull Errors
```powershell
# Re-login to ACR
az acr login --name citycareregistry

# Verify image exists
az acr repository list --name citycareregistry
```

## Cleanup

To delete all Azure resources:

```powershell
az group delete --name citycare-rg --yes --no-wait
```

This removes:
- All Container Apps
- PostgreSQL Server & Databases
- Container Registry
- Log Analytics Workspace
- Everything in the resource group

## Next Steps After Deployment

1. ✅ Verify all services are healthy
2. ✅ Test orchestration endpoint
3. ✅ Add sample data (hospitals, ambulances)
4. ✅ Deploy admin frontend to Azure Static Web Apps
5. ✅ Set up custom domain (optional)
6. ✅ Configure monitoring alerts
7. ✅ Run load tests to show scaling

## Support

- Azure Container Apps Docs: https://learn.microsoft.com/en-us/azure/container-apps/
- Azure PostgreSQL Docs: https://learn.microsoft.com/en-us/azure/postgresql/
- Azure CLI Reference: https://learn.microsoft.com/en-us/cli/azure/

## Demo Day Checklist

- [ ] All services deployed and healthy
- [ ] Database has sample data
- [ ] Auto-scaling configured
- [ ] Monitoring dashboard ready
- [ ] Load test results documented
- [ ] Architecture diagram updated with Azure services
- [ ] Service URLs documented
- [ ] Backup plan if Azure has issues (local Docker Compose)
