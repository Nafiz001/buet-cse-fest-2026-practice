# Quick Start Guide for Azure Deployment

## What I Need From You:

### **Azure Account Information:**

1. **Azure Subscription** 
   - Do you have an active Azure subscription?
   - If you're a student, sign up for Azure for Students: https://azure.microsoft.com/free/students/
   - You get $100 free credit

2. **Azure CLI Installed**
   - Download: https://aka.ms/installazurecliwindows
   - After installing, open PowerShell and run: `az --version`

3. **Docker Desktop Running**
   - Make sure Docker Desktop is running
   - You should see the Docker icon in system tray

---

## Quick Deploy Steps:

### Step 1: Open PowerShell as Administrator

```powershell
cd G:\KUET\BCF_test\citycare
```

### Step 2: Run the Deployment Script

```powershell
.\azure-deploy-simple.ps1
```

This will:
- ✅ Prompt you to login to Azure (browser will open)
- ✅ Create all Azure resources
- ✅ Build and upload Docker images
- ✅ Deploy 4 microservices
- ✅ Set up PostgreSQL databases
- ✅ Configure networking

**Time: 30-40 minutes**

### Step 3: Run Database Migrations

```powershell
.\azure-migrate.ps1
```

### Step 4: Configure Auto-Scaling

```powershell
.\azure-scaling.ps1
```

---

## What Will Be Created:

| Resource | Purpose | Cost/Day |
|----------|---------|----------|
| Container Apps (4 services) | Run microservices | ~$10-20 |
| PostgreSQL Server | 3 databases | ~$8-10 |
| Container Registry | Store Docker images | ~$0.20 |
| Log Analytics | Monitoring | ~$2 |

**Total: ~$20-30/day** (for demo/hackathon)

---

## Service URLs You'll Get:

After deployment completes, you'll get URLs like:

```
Hospital Service: https://hospital-service.RANDOM.eastus.azurecontainerapps.io
Ambulance Service: https://ambulance-service.RANDOM.eastus.azurecontainerapps.io
Validation Service: https://validation-service.RANDOM.eastus.azurecontainerapps.io
Emergency Request Service: https://emergency-request-service.RANDOM.eastus.azurecontainerapps.io
```

These will be saved in `deployment-info.txt`

---

## Credentials That Will Be Created:

**PostgreSQL Database:**
- Server: `citycare-db-server.postgres.database.azure.com`
- Username: `citycareadmin`
- Password: `CityCare2026!Secure`
- Databases: `hospital_db`, `ambulance_db`, `emergency_request_db`

**Container Registry:**
- Name: `citycareregistry.azurecr.io`
- Credentials: Auto-generated (script will show them)

---

## Testing After Deployment:

### Test Hospital Service:
```powershell
Invoke-RestMethod -Uri "https://YOUR-HOSPITAL-URL/health"
```

### Create a Hospital:
```powershell
$body = @{
    name = "Dhaka Medical"
    city = "Dhaka"
    icuBeds = 100
    ventilators = 50
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR-HOSPITAL-URL/hospitals" -Method Post -Body $body -ContentType "application/json"
```

---

## Troubleshooting:

### If Azure CLI Not Found:
1. Install from: https://aka.ms/installazurecliwindows
2. Restart PowerShell
3. Run: `az --version`

### If Docker Build Fails:
1. Make sure Docker Desktop is running
2. Run: `docker ps` (should work without errors)

### If Deployment Fails:
1. Check Azure Portal: https://portal.azure.com
2. View logs: `az containerapp logs show --name hospital-service --resource-group citycare-rg --tail 50`

---

## Cleanup (When Done):

**Delete everything:**
```powershell
az group delete --name citycare-rg --yes --no-wait
```

This removes ALL resources and stops billing.

---

## For Hackathon Demo:

After deployment, you can show judges:

1. **Live Azure Portal** - Show Container Apps running
2. **Service URLs** - Make API calls to live endpoints
3. **Auto-Scaling** - Show replicas in Azure Portal
4. **Monitoring** - Show logs and metrics
5. **Database** - Show PostgreSQL with data

---

## Need Help?

If you encounter any errors:
1. Copy the error message
2. Check `deployment-info.txt` for service URLs
3. Check Azure Portal > Resource Groups > citycare-rg
4. Share the error and I'll help troubleshoot

---

## Ready to Deploy?

Just run these 3 commands:

```powershell
cd G:\KUET\BCF_test\citycare
.\azure-deploy-simple.ps1
.\azure-migrate.ps1
```

That's it! Your microservices will be live on Azure.
