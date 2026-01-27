# CityCare - Complete Azure VM Deployment Guide
**Step-by-Step Guide with CI/CD Pipeline**

*Based on successful deployment on January 28, 2026*

---

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Step 1: Create Azure Virtual Machine](#step-1-create-azure-virtual-machine)
3. [Step 2: Configure VM and Install Docker](#step-2-configure-vm-and-install-docker)
4. [Step 3: Setup GitHub Self-Hosted Runner](#step-3-setup-github-self-hosted-runner)
5. [Step 4: Configure GitHub Workflows](#step-4-configure-github-workflows)
6. [Step 5: Deploy Application](#step-5-deploy-application)
7. [Step 6: Run Database Migrations](#step-6-run-database-migrations)
8. [Common Problems and Solutions](#common-problems-and-solutions)
9. [Testing Your Deployment](#testing-your-deployment)
10. [Troubleshooting](#troubleshooting)

---

## 📌 Pre-Deployment Checklist

Before starting deployment, ensure you have:

- [ ] **Azure Account** with active subscription and credits
- [ ] **GitHub Repository** with your code pushed
- [ ] **All package-lock.json files** committed (run `npm install` in each service)
- [ ] **Docker Compose file** with correct environment variables
- [ ] **VM Public IP** ready to be used in frontend configuration
- [ ] **All ports** configured in docker-compose.yml

### ⚠️ Critical Files to Check

```bash
# Ensure these files exist in your repo:
hospital-service/package-lock.json
ambulance-service/package-lock.json
emergency-request-service/package-lock.json
orchestrator-service/package-lock.json      # ← Often missing!
validation-service/package-lock.json
admin-frontend/package-lock.json

# Generate if missing:
cd <service-folder>
npm install  # This creates package-lock.json
git add package-lock.json
git commit -m "Add package-lock.json"
```

---

## Step 1: Create Azure Virtual Machine

### Option A: Using Azure Portal (Recommended)

1. **Navigate to Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Azure account

2. **Create Resource Group**
   - Click **Resource groups** in left sidebar
   - Click **+ Create**
   - **Resource group name**: `citycare-rg`
   - **Region**: Choose closest to you (e.g., `East US`)
   - Click **Review + create** → **Create**

3. **Create Virtual Machine**
   - Click **+ Create a resource**
   - Search for **Ubuntu Server 20.04 LTS**
   - Click **Create**

4. **Configure VM - Basics Tab**
   - **Resource group**: `citycare-rg`
   - **Virtual machine name**: `citycare-vm`
   - **Region**: Same as resource group
   - **Image**: `Ubuntu Server 20.04 LTS - x64 Gen2`
   - **Size**: `Standard_B2s` (2 vCPUs, 4 GB RAM) - **Minimum recommended**
   - **Authentication type**: Password (easier) or SSH public key
   - **Username**: Choose a username (e.g., `azureuser`, `Nafiz`, etc.)
     - ⚠️ **REMEMBER THIS USERNAME** - you'll need it later
   - **Password**: Create a strong password
   - **Inbound port rules**: Select `HTTP (80)`, `HTTPS (443)`, `SSH (22)`

5. **Configure VM - Networking Tab**
   - Keep defaults
   - Ensure **Public IP** is enabled
   - Click **Review + create**

6. **Create VM**
   - Review settings
   - Click **Create**
   - Wait 3-5 minutes for deployment

7. **Get Public IP Address**
   - Go to your VM resource page
   - Note the **Public IP address** (e.g., `40.81.240.99`)
   - ⚠️ **SAVE THIS IP** - you'll use it throughout deployment

### Option B: Using Azure CLI

```bash
# Login
az login

# Create resource group
az group create --name citycare-rg --location eastus

# Create VM
az vm create \
  --resource-group citycare-rg \
  --name citycare-vm \
  --image Ubuntu2004 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# Get public IP
az vm show -d -g citycare-rg -n citycare-vm --query publicIps -o tsv
```

---

## Step 2: Configure VM and Install Docker

### Method 1: Azure Portal Run Command (Easiest)

1. **Go to Your VM in Azure Portal**
   - Navigate to `citycare-vm`
   - Click **Run command** in left menu
   - Select **RunShellScript**

2. **Copy and Paste Installation Script**
   
   ⚠️ **IMPORTANT**: Replace `YOUR_VM_USERNAME` with your actual username!

   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Add user to docker group (REPLACE YOUR_VM_USERNAME!)
   sudo usermod -aG docker YOUR_VM_USERNAME
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify installations
   docker --version
   docker-compose --version
   ```

3. **Click Run** and wait 5-7 minutes

4. **Verify Installation**
   - Check output for Docker and Docker Compose versions
   - Look for: `Docker version 29.x.x` and `Docker Compose version v5.x.x`

### Method 2: Azure Bastion (Browser-based SSH)

1. **Connect via Bastion**
   - Go to VM page → Click **Connect** → **Connect via Bastion**
   - Enter username and password
   - Terminal opens in browser

2. **Run Installation Commands**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify
   docker --version
   docker-compose --version
   
   # Logout and login again for docker group to take effect
   exit
   ```

3. **Reconnect to Bastion** after logout

### 🔴 Problem We Faced: User Not in Docker Group

**Error**: `usermod: user 'azureuser' does not exist`

**Solution**: Use the correct username you created during VM setup. Find your username:
- Azure Portal → VM → Connect → Look at username field
- Or connect and run: `whoami`

---

## Step 3: Setup GitHub Self-Hosted Runner

### 3.1: Get Runner Configuration Token

1. **Go to Your GitHub Repository**
   - Navigate to your repository (e.g., `github.com/Nafiz001/buet-cse-fest-2026-practice`)

2. **Access Runners Settings**
   - Click **Settings** tab
   - Click **Actions** in left sidebar
   - Click **Runners**

3. **Add New Runner**
   - Click **New self-hosted runner**
   - Select **Linux** as operating system
   - You'll see commands with a token like:
     ```bash
     ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token ABCDE12345...
     ```
   - ⚠️ **COPY THIS TOKEN** - it expires in 1 hour!

### 3.2: Configure Runner on VM

1. **Connect to VM** (via Bastion or SSH)

2. **Download and Setup Runner**
   ```bash
   # Create runner directory
   mkdir actions-runner && cd actions-runner
   
   # Download latest runner (check GitHub page for latest version)
   curl -o actions-runner-linux-x64-2.331.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.331.0/actions-runner-linux-x64-2.331.0.tar.gz
   
   # Extract
   tar xzf ./actions-runner-linux-x64-2.331.0.tar.gz
   ```

3. **Configure Runner**
   ```bash
   # Replace YOUR_TOKEN with the token from GitHub
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN
   ```

4. **Answer Configuration Prompts**
   
   ⚠️ **CRITICAL**: Just press Enter for all prompts, especially work folder!

   ```
   Enter the name of the runner group: [press Enter]
   Enter the name of runner: [press Enter for VM name]
   Enter any additional labels: [press Enter]
   Enter name of work folder: [press Enter]  ← IMPORTANT: Just press Enter!
   ```

5. **Install as Service** (Runs automatically)
   ```bash
   # Install service
   sudo ./svc.sh install
   
   # Start service
   sudo ./svc.sh start
   
   # Check status
   sudo ./svc.sh status
   ```

6. **Verify Installation**
   - You should see: `Active: active (running)`
   - Go to GitHub → Settings → Actions → Runners
   - Your runner should show with a green dot and status **"Idle"**

### 🔴 Problem We Faced: Work Folder Set to Comment

**Error**: `/usr/bin/bash: /home/Nafiz/actions-runner/#: No such file or directory`

**Root Cause**: During configuration, someone pasted `# Install as a service (so it runs automatically)` when prompted for work folder name.

**Solution**: 
1. When configuring runner, **just press Enter** for work folder prompt
2. Don't type anything - the default `_work` is correct
3. If you made this mistake, reconfigure:
   ```bash
   sudo ./svc.sh stop
   sudo ./svc.sh uninstall
   ./config.sh remove --token REMOVAL_TOKEN  # Get from GitHub → Runner → ... → Remove
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token NEW_TOKEN
   # Press Enter for all prompts!
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

4. Verify correct configuration:
   ```bash
   cat .runner
   # Should show: "workFolder": "_work"
   # NOT: "workFolder": "# Install as a service..."
   ```

---

## Step 4: Configure GitHub Workflows

### 4.1: Create Workflow Files

Create these files in your repository under `.github/workflows/`:

#### **CI Workflow** (`.github/workflows/ci.yml`)

```yaml
name: Continuous Integration

on:
  pull_request:
    branches:
      - main
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./validation-service
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm i

      - name: Run tests
        run: npm run test
```

#### **CD Workflow** (`.github/workflows/cd.yml`)

```yaml
name: Continuous Deployment

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Stop containers
        run: docker compose down -v
        continue-on-error: true

      - name: Start services
        run: docker compose up -d --build
```

### 4.2: Update docker-compose.yml

⚠️ **CRITICAL**: Update API URLs in docker-compose.yml with your VM's public IP

Find the `admin-frontend` service and update:

```yaml
  admin-frontend:
    build:
      context: ./admin-frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_HOSPITAL_API_URL: http://YOUR_VM_PUBLIC_IP:3001
        NEXT_PUBLIC_AMBULANCE_API_URL: http://YOUR_VM_PUBLIC_IP:3002
        NEXT_PUBLIC_REQUEST_API_URL: http://YOUR_VM_PUBLIC_IP:3004
    container_name: citycare-admin-frontend
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_HOSPITAL_API_URL: http://YOUR_VM_PUBLIC_IP:3001
      NEXT_PUBLIC_AMBULANCE_API_URL: http://YOUR_VM_PUBLIC_IP:3002
      NEXT_PUBLIC_REQUEST_API_URL: http://YOUR_VM_PUBLIC_IP:3004
```

Replace `YOUR_VM_PUBLIC_IP` with your actual IP (e.g., `40.81.240.99`)

### 4.3: Commit and Push Workflows

```bash
git add .github/workflows/
git add docker-compose.yml
git commit -m "Add CI/CD workflows and update API URLs"
git push origin main
```

### 🔴 Problem We Faced: Missing package-lock.json

**Error**: `npm ci` failed with "can only install with existing package-lock.json"

**Solution**:
```bash
# Check which services are missing package-lock.json
cd orchestrator-service
npm install  # This generates package-lock.json
git add package-lock.json
git commit -m "Add package-lock.json for orchestrator service"
git push origin main
```

### 🔴 Problem We Faced: Frontend Using localhost

**Error**: Frontend tried to connect to `localhost:3001` instead of VM IP

**Solution**: Update `docker-compose.yml` with correct IP in both `args` and `environment` sections (as shown above)

---

## Step 5: Deploy Application

### 5.1: Open Required Ports

**Option A: Azure Portal**

1. Go to VM → **Networking** or **Network settings**
2. Click **Add inbound port rule**
3. Configure:
   - **Destination port ranges**: `3000-3010,5432-5434,9090`
   - **Protocol**: TCP
   - **Action**: Allow
   - **Priority**: 1000
   - **Name**: `Allow-Application-Ports`
4. Click **Add**

**Option B: Azure Cloud Shell**

```bash
# Open all application ports
az vm open-port --port 3000 --resource-group citycare-rg --name citycare-vm --priority 1100
az vm open-port --port 3001 --resource-group citycare-rg --name citycare-vm --priority 1101
az vm open-port --port 3002 --resource-group citycare-rg --name citycare-vm --priority 1102
az vm open-port --port 3003 --resource-group citycare-rg --name citycare-vm --priority 1103
az vm open-port --port 3004 --resource-group citycare-rg --name citycare-vm --priority 1104
az vm open-port --port 3005 --resource-group citycare-rg --name citycare-vm --priority 1105
az vm open-port --port 3006 --resource-group citycare-rg --name citycare-vm --priority 1106
az vm open-port --port 9090 --resource-group citycare-rg --name citycare-vm --priority 1107
```

### 5.2: Trigger Deployment

**Automatic Deployment**:
- Every push to `main` branch automatically triggers deployment
- Just commit and push your code!

```bash
git add .
git commit -m "Your changes"
git push origin main
```

**Manual Deployment**:
1. Go to GitHub → **Actions** tab
2. Click **Continuous Deployment** workflow
3. Click **Run workflow** → Select `main` → **Run workflow**

### 5.3: Monitor Deployment

1. **Watch GitHub Actions**
   - Go to repository → **Actions** tab
   - Click on the running workflow
   - Expand steps to see progress
   - Wait 5-10 minutes for first deployment

2. **Check on VM** (Optional)
   ```bash
   # Connect to VM via Bastion
   cd ~/actions-runner/_work/YOUR_REPO_NAME/YOUR_REPO_NAME
   
   # Watch logs
   docker compose logs -f
   
   # Check container status
   docker ps
   ```

---

## Step 6: Run Database Migrations

After first deployment, you **MUST** run database migrations:

### Connect to VM and Run Migrations

```bash
# Connect via Azure Bastion
# Navigate to project directory
cd ~/actions-runner/_work/YOUR_REPO_NAME/YOUR_REPO_NAME

# Run migrations for each service
docker compose exec hospital-service npx prisma db push
docker compose exec ambulance-service npx prisma db push
docker compose exec emergency-request-service npx prisma db push

# Verify migrations succeeded
# You should see: "The database is now in sync with the Prisma schema"
```

### 🔴 Problem We Faced: 500 Errors on API Calls

**Error**: Frontend showed `500 Internal Server Error` when calling hospital API

**Root Cause**: Database tables didn't exist - migrations weren't run

**Solution**: Run `npx prisma db push` in each service container (as shown above)

---

## Testing Your Deployment

### 1. Check Container Status

```bash
# On VM
docker ps

# All containers should be "Up" and "(healthy)"
# You should see:
# - citycare-hospital-service (healthy)
# - citycare-ambulance-service (healthy)
# - citycare-emergency-request-service (healthy)
# - citycare-orchestrator (healthy)
# - citycare-validation-service (healthy)
# - citycare-admin-frontend
# - citycare-hospital-db (healthy)
# - citycare-ambulance-db (healthy)
# - citycare-emergency-request-db (healthy)
# - citycare-prometheus
# - citycare-grafana
```

### 2. Test API Endpoints

**From your local machine (PowerShell)**:

```powershell
# Test each service
curl http://YOUR_VM_IP:3001/health  # Hospital
curl http://YOUR_VM_IP:3002/health  # Ambulance
curl http://YOUR_VM_IP:3003/health  # Validation
curl http://YOUR_VM_IP:3004/health  # Emergency Request
curl http://YOUR_VM_IP:3005/health  # Orchestrator

# All should return: {"status":"ok"}
```

### 3. Access Web Interfaces

Open in your browser:

- **Admin Frontend**: `http://YOUR_VM_IP:3000`
- **Grafana Monitoring**: `http://YOUR_VM_IP:3006` (admin/admin)
- **Prometheus Metrics**: `http://YOUR_VM_IP:9090`

### 4. Test Full Functionality

**Create a Hospital**:
```bash
curl -X POST http://YOUR_VM_IP:3001/hospitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Hospital",
    "city": "dhaka",
    "icuBeds": 50,
    "ventilators": 30
  }'
```

**Get Hospitals**:
```bash
curl http://YOUR_VM_IP:3001/hospitals
```

**Test in Admin Frontend**:
1. Go to `http://YOUR_VM_IP:3000`
2. Add a hospital via the UI
3. Add ambulances
4. Create emergency requests
5. Verify all operations work

---

## Common Problems and Solutions

### Problem 1: "No such file or directory: #"

**Symptoms**: 
```
/usr/bin/bash: /home/user/actions-runner/#: No such file or directory
```

**Cause**: Work folder was set to a comment during runner configuration

**Solution**:
```bash
# Reconfigure runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token REMOVAL_TOKEN
./config.sh --url YOUR_REPO --token NEW_TOKEN
# PRESS ENTER FOR ALL PROMPTS!
sudo ./svc.sh install && sudo ./svc.sh start
```

### Problem 2: npm ci requires package-lock.json

**Symptoms**:
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Cause**: Missing package-lock.json in service directory

**Solution**:
```bash
cd <service-directory>
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Problem 3: Frontend Shows "Connection Refused"

**Symptoms**: Browser console shows `ERR_CONNECTION_REFUSED` to localhost

**Cause**: Frontend using localhost instead of VM IP

**Solution**: Update docker-compose.yml with VM's public IP in admin-frontend section (see Step 4.2)

### Problem 4: API Returns 500 Error

**Symptoms**: Frontend shows 500 errors when fetching data

**Cause**: Database tables not created

**Solution**:
```bash
docker compose exec hospital-service npx prisma db push
docker compose exec ambulance-service npx prisma db push
docker compose exec emergency-request-service npx prisma db push
```

### Problem 5: Cannot Access URLs

**Symptoms**: URLs timeout or connection refused

**Cause**: Ports not open in Azure firewall

**Solution**: Open ports 3000-3010, 9090 in Azure Network Security Group (see Step 5.1)

### Problem 6: usermod: user does not exist

**Symptoms**: `usermod: user 'azureuser' does not exist`

**Cause**: Using wrong username in docker group command

**Solution**: Find correct username:
```bash
# Connect to VM and run:
whoami

# Or check Azure Portal → VM → Connect → Username field
# Use that username in: sudo usermod -aG docker CORRECT_USERNAME
```

### Problem 7: Runner Shows Offline

**Symptoms**: GitHub shows runner as offline

**Cause**: Service not running or crashed

**Solution**:
```bash
cd ~/actions-runner
sudo ./svc.sh status
# If not running:
sudo ./svc.sh start
# Check logs:
tail -f _diag/Runner_*.log
```

### Problem 8: Deployment Hangs

**Symptoms**: GitHub Actions stuck on "Deploy" step

**Cause**: Docker build taking too long or failed

**Solution**:
```bash
# On VM, check what's happening
cd ~/actions-runner/_work/YOUR_REPO/YOUR_REPO
docker compose logs -f
# Look for errors in build process
```

---

## Troubleshooting Commands

### On VM

```bash
# Check runner status
cd ~/actions-runner
sudo ./svc.sh status

# View runner logs
tail -f _diag/Runner_*.log

# Check containers
docker ps -a

# View container logs
docker compose logs <service-name>
docker compose logs -f  # Follow all logs

# Restart containers
docker compose down
docker compose up -d

# Check disk space
df -h

# Check memory
free -h

# Test internal connectivity
docker compose exec hospital-service curl http://localhost:3001/health
```

### On GitHub

```bash
# Check workflow runs
# Go to: Repository → Actions tab

# Re-run failed workflow
# Click on failed run → "Re-run all jobs"

# View detailed logs
# Click on workflow run → Click on job → Expand steps
```

### On Local Machine

```bash
# Test connectivity
curl http://YOUR_VM_IP:3001/health
curl http://YOUR_VM_IP:3000

# Check if ports are open
telnet YOUR_VM_IP 3001
# (Ctrl+] then 'quit' to exit)

# Or use PowerShell
Test-NetConnection -ComputerName YOUR_VM_IP -Port 3001
```

---

## Quick Reference: Service Ports

| Service | Port | Health Check |
|---------|------|--------------|
| Admin Frontend | 3000 | http://VM_IP:3000 |
| Hospital Service | 3001 | http://VM_IP:3001/health |
| Ambulance Service | 3002 | http://VM_IP:3002/health |
| Validation Service | 3003 | http://VM_IP:3003/health |
| Emergency Request | 3004 | http://VM_IP:3004/health |
| Orchestrator | 3005 | http://VM_IP:3005/health |
| Grafana | 3006 | http://VM_IP:3006 |
| Prometheus | 9090 | http://VM_IP:9090 |
| Hospital DB | 5432 | Internal |
| Ambulance DB | 5433 | Internal |
| Emergency DB | 5434 | Internal |

---

## Pre-Hackathon Checklist

One day before hackathon:

- [ ] Test complete deployment flow on a fresh VM
- [ ] Verify all package-lock.json files are committed
- [ ] Confirm docker-compose.yml has placeholder for VM IP
- [ ] Test CI workflow on a PR
- [ ] Test CD workflow manual trigger
- [ ] Document your VM credentials securely
- [ ] Screenshot successful deployment for reference
- [ ] Prepare script to run migrations after deployment
- [ ] Test rollback: can you redeploy previous version?
- [ ] Have Azure CLI installed locally as backup
- [ ] Save this guide offline in case internet is slow

---

## During Hackathon Tips

1. **Create VM First** - Do this early while internet is fast
2. **Note Your Public IP** - Save it immediately
3. **Don't Rush Runner Config** - Press Enter carefully for work folder
4. **Generate All package-lock.json** - Before pushing any code
5. **Update IP in docker-compose** - Before first deployment
6. **Run Migrations Immediately** - After first successful deploy
7. **Test Before Demo** - Use health check endpoints
8. **Have Backup Plan** - Keep docker-compose up command ready

---

## Emergency Rollback

If deployment breaks:

```bash
# Connect to VM
cd ~/actions-runner/_work/YOUR_REPO/YOUR_REPO

# Stop all containers
docker compose down

# Pull previous working commit
git fetch origin
git checkout PREVIOUS_COMMIT_HASH

# Restart
docker compose up -d --build
```

---

## Success Indicators

Your deployment is successful when:

✅ All 11 containers show "Up" and "(healthy)" in `docker ps`  
✅ All health endpoints return `{"status":"ok"}`  
✅ Admin frontend loads without console errors  
✅ Can create hospitals and ambulances via UI  
✅ Database operations work (no 500 errors)  
✅ Grafana dashboard accessible  
✅ Prometheus shows metrics  
✅ GitHub runner shows "Idle" status  
✅ New push triggers automatic deployment  
✅ Deployment completes in 5-10 minutes  

---

## Cost Management

**Stop VM when not in use**:
- Azure Portal → VM → **Stop** (deallocate)
- This stops billing for compute (but storage still billed)
- **Restart** when needed

**Delete Everything After Hackathon**:
```bash
az group delete --name citycare-rg --yes --no-wait
```

---

## Final Notes

**What We Learned**:
1. ✅ Always press Enter for default values in runner config
2. ✅ Generate package-lock.json for ALL services before deployment
3. ✅ Frontend needs VM IP, not localhost, in environment variables
4. ✅ Run database migrations after first deployment
5. ✅ Open firewall ports before testing
6. ✅ Use correct username when adding to docker group

**Time Estimates**:
- VM Creation: 5 minutes
- Docker Installation: 7 minutes
- Runner Setup: 10 minutes
- First Deployment: 10 minutes
- Database Migrations: 2 minutes
- **Total**: ~35 minutes for complete setup

**Good Luck in Your Hackathon!** 🚀

---

*Last Updated: January 28, 2026*
*Tested on: Ubuntu 20.04, Docker 29.2.0, Docker Compose v5.0.2*
