# Reusing Azure VM for Hackathon Project
**Guide to Prepare Existing VM for New Project**

*How to remove CityCare and deploy your actual hackathon project*

---

## 📋 Overview

You already have a working Azure VM with:
- ✅ Docker and Docker Compose installed
- ✅ GitHub Actions runner configured
- ✅ Ports opened in firewall
- ✅ All system dependencies ready

**Goal**: Remove CityCare and deploy your new hackathon project on the same VM.

**Time Required**: 15-20 minutes

---

## Option 1: Clean Slate (Recommended)

### Step 1: Stop and Remove CityCare

**Connect to your VM** (via Azure Bastion)

```bash
# Navigate to CityCare project
cd ~/actions-runner/_work/buet-cse-fest-2026-practice/buet-cse-fest-2026-practice

# Stop all containers
docker compose down -v

# Remove all stopped containers, networks, and volumes
docker system prune -a --volumes -f

# Go back to home
cd ~
```

### Step 2: Remove GitHub Runner Configuration

```bash
cd ~/actions-runner

# Stop the runner service
sudo ./svc.sh stop

# Uninstall the service
sudo ./svc.sh uninstall

# Get removal token from GitHub:
# Old Repo → Settings → Actions → Runners → Click ... on your runner → Remove
# Copy the removal token from the command shown

# Remove runner from old repository
./config.sh remove --token YOUR_REMOVAL_TOKEN

# Clean up work directory
rm -rf _work/*
```

### Step 3: Configure Runner for New Repository

1. **Go to Your New Hackathon Repository**
   - Navigate to your actual hackathon repo on GitHub
   - Click **Settings** → **Actions** → **Runners**
   - Click **New self-hosted runner**
   - Select **Linux**
   - Copy the configuration token

2. **Configure Runner**
   ```bash
   cd ~/actions-runner
   
   # Configure with new repository
   ./config.sh --url https://github.com/YOUR_USERNAME/YOUR_HACKATHON_REPO --token YOUR_NEW_TOKEN
   
   # Answer prompts (PRESS ENTER FOR ALL!):
   # - Runner group: [Enter]
   # - Runner name: [Enter]
   # - Additional labels: [Enter]
   # - Work folder: [Enter]  ← IMPORTANT!
   
   # Install and start service
   sudo ./svc.sh install
   sudo ./svc.sh start
   sudo ./svc.sh status
   ```

3. **Verify in GitHub**
   - Go to your new repo → Settings → Actions → Runners
   - Should see your runner with green dot (Idle)

### Step 4: Prepare Your Hackathon Repository

**On your local machine**, ensure your hackathon repo has:

1. **CI/CD Workflows**
   
   Create `.github/workflows/ci.yml`:
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
           working-directory: ./YOUR_SERVICE_WITH_TESTS
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

   Create `.github/workflows/cd.yml`:
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

2. **Update docker-compose.yml**
   
   Replace all `localhost` references with `YOUR_VM_IP`:
   ```yaml
   # Example for frontend environment variables
   environment:
     NEXT_PUBLIC_API_URL: http://YOUR_VM_IP:3001
     # Replace YOUR_VM_IP with actual IP (e.g., 40.81.240.99)
   ```

3. **Ensure All package-lock.json Files Exist**
   ```bash
   # In each service directory
   cd service-name
   npm install
   git add package-lock.json
   ```

4. **Commit and Push**
   ```bash
   git add .
   git commit -m "Add CI/CD workflows for Azure VM deployment"
   git push origin main
   ```

### Step 5: Deploy Your Hackathon Project

1. **Automatic Deployment** (if push trigger enabled)
   - Just push to main branch
   - GitHub Actions will automatically deploy

2. **Manual Deployment**
   - Go to GitHub → Actions → Continuous Deployment
   - Click "Run workflow" → Select main → Run

3. **Monitor Deployment**
   - Watch Actions tab for progress
   - Wait 5-10 minutes for first deployment

### Step 6: Run Database Migrations (if applicable)

```bash
# Connect to VM
cd ~/actions-runner/_work/YOUR_REPO_NAME/YOUR_REPO_NAME

# Run Prisma migrations for each service
docker compose exec service-name npx prisma db push

# Or run custom migration scripts
docker compose exec service-name npm run migrate
```

### Step 7: Update Firewall Rules (if needed)

If your project uses different ports:

```bash
# Azure Cloud Shell
az vm open-port --port YOUR_PORT --resource-group citycare-rg --name citycare-vm --priority 1200
```

Or via Azure Portal:
- VM → Networking → Add inbound port rule

---

## Option 2: Keep VM for Future Use

If you want to keep the VM but switch projects temporarily:

### Quick Switch Process

```bash
# On VM
cd ~/actions-runner/_work/OLD_REPO/OLD_REPO
docker compose down -v

# Runner automatically pulls new code on next deployment
# Just push to different repo that uses this runner
```

**Note**: The runner can only be connected to ONE repository at a time. To switch repos, you must reconfigure (Option 1, Step 2-3).

---

## Option 3: Parallel Projects (Not Recommended)

You could run multiple projects on same VM using different ports, but this is complex and not recommended for hackathons.

---

## What to Keep vs What to Remove

### ✅ Keep (Already Configured)

- Azure VM instance
- Docker & Docker Compose
- Open firewall ports (3000-3010, 9090, etc.)
- Runner installation files
- System packages and dependencies

### ❌ Remove/Reconfigure

- Old project containers and volumes
- Runner connection to old repository
- Old project code in `_work` directory
- Old environment variables
- Old network configurations

### 🔄 Update

- Runner repository URL
- docker-compose.yml port mappings (if different)
- Frontend API URLs
- Firewall rules (if using different ports)

---

## Pre-Hackathon VM Preparation

**Do this 1-2 days before hackathon**:

### Checklist

- [ ] VM is running and accessible
- [ ] Docker and Docker Compose working
- [ ] Can SSH/Bastion into VM
- [ ] Runner files exist in `~/actions-runner`
- [ ] Know your VM public IP
- [ ] Have Azure login credentials ready
- [ ] Test removing CityCare and redeploying it
- [ ] Screenshot successful deployment
- [ ] Save this guide offline

### Test Run

```bash
# Practice the full process:
1. Remove CityCare (docker compose down -v)
2. Reconfigure runner for test repo
3. Deploy test project
4. Verify it works
5. Reconfigure back to CityCare (optional)
```

**Time this process** - should take 15-20 minutes when you're familiar with it.

---

## During Hackathon: Quick Start

### Fast Track (15 minutes)

```bash
# 1. Remove old project (3 minutes)
cd ~/actions-runner/_work/OLD_REPO/OLD_REPO
docker compose down -v
docker system prune -af --volumes

# 2. Reconfigure runner (5 minutes)
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
./config.sh remove --token OLD_TOKEN
./config.sh --url https://github.com/USER/NEW_REPO --token NEW_TOKEN
# Press Enter for all prompts!
sudo ./svc.sh install
sudo ./svc.sh start

# 3. Push code from local (2 minutes)
# (On your laptop)
git push origin main

# 4. Wait for deployment (5 minutes)
# Watch GitHub Actions

# 5. Run migrations
docker compose exec service npx prisma db push
```

---

## Troubleshooting

### Problem: "Repository mismatch"

**Error**: Runner trying to pull from old repo

**Solution**:
```bash
cd ~/actions-runner
sudo ./svc.sh stop
./config.sh remove --token REMOVAL_TOKEN
./config.sh --url NEW_REPO_URL --token NEW_TOKEN
sudo ./svc.sh start
```

### Problem: Port conflicts

**Error**: `port already in use`

**Solution**:
```bash
# Find what's using the port
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Problem: Old containers still running

**Error**: New deployment fails with name conflicts

**Solution**:
```bash
# Stop everything
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)
docker volume rm $(docker volume ls -q)
docker network prune -f
```

### Problem: Disk space full

**Error**: `no space left on device`

**Solution**:
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes -f

# Remove old images
docker image prune -a -f
```

---

## Emergency: Complete VM Reset

If everything breaks and you have time:

### Option A: Reset Runner Only (5 minutes)

```bash
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
rm -rf _work/*
./config.sh remove --token TOKEN
./config.sh --url NEW_URL --token NEW_TOKEN
sudo ./svc.sh install && sudo ./svc.sh start
```

### Option B: Clean Docker (10 minutes)

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove everything
docker system prune -a --volumes -f

# Restart Docker
sudo systemctl restart docker

# Verify
docker ps
docker images
```

### Option C: Reinstall Docker (15 minutes)

```bash
# Only if Docker is completely broken
sudo apt remove docker docker-engine docker.io containerd runc
sudo apt update
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### Option D: Create New VM (30 minutes)

Follow DEPLOYMENT_GUIDE.md from scratch with new VM.

---

## Cost Considerations

### Keeping VM Running

**Pros**:
- Ready to use immediately
- No setup time during hackathon
- Runner stays connected

**Cons**:
- Costs ~$60-70/month (Standard_B2s)
- Wastes money if not using

**Recommendation**: Stop VM when not in use

### Stopping VM

```bash
# Azure Portal
VM → Stop (deallocate)

# Azure CLI
az vm deallocate --resource-group citycare-rg --name citycare-vm
```

**Important**: 
- Stopped (deallocated) VM costs $0 for compute
- Still pay for disk storage (~$4/month)
- Public IP may change when restarted
- Need to update IP in docker-compose.yml after restart

### Starting Stopped VM

```bash
# Azure Portal
VM → Start

# Azure CLI
az vm start --resource-group citycare-rg --name citycare-vm

# Get new IP
az vm show -d -g citycare-rg -n citycare-vm --query publicIps -o tsv
```

---

## Recommended Approach for Hackathon

### Timeline

**1 Week Before**:
- ✅ Create VM and deploy CityCare
- ✅ Test complete CI/CD flow
- ✅ Document VM IP and credentials
- ✅ Practice cleanup and redeployment

**3 Days Before**:
- ✅ Prepare hackathon project locally
- ✅ Add CI/CD workflows
- ✅ Test on local Docker Compose
- ✅ Generate all package-lock.json files

**1 Day Before**:
- ✅ Stop VM to save costs
- ✅ Review this guide
- ✅ Have Azure credentials ready

**Day of Hackathon**:
- ✅ Start VM (get new IP if changed)
- ✅ Remove CityCare (5 min)
- ✅ Reconfigure runner (5 min)
- ✅ Update IP in code (2 min)
- ✅ Push and deploy (5-10 min)
- ✅ Run migrations (2 min)
- ✅ Verify deployment (3 min)

**Total**: ~30 minutes from VM start to working deployment

---

## Backup Plan

If VM approach fails:

### Plan B: Local Docker Compose

```bash
# On your laptop
docker compose up

# Share localhost via ngrok
ngrok http 3000
```

### Plan C: Quick Azure Container Instances

```bash
# Deploy single container quickly
az container create \
  --resource-group citycare-rg \
  --name hackathon-app \
  --image YOUR_DOCKER_IMAGE \
  --ip-address public \
  --ports 80
```

---

## Checklist: Switching to Hackathon Project

Print this and check off during hackathon:

- [ ] VM is running
- [ ] Can connect via Bastion
- [ ] Stop CityCare containers
- [ ] Clean Docker system
- [ ] Stop runner service
- [ ] Remove runner from old repo
- [ ] Get new runner token from hackathon repo
- [ ] Configure runner with new repo
- [ ] Start runner service
- [ ] Verify runner shows "Idle" in GitHub
- [ ] Update VM IP in hackathon code
- [ ] Push code to trigger deployment
- [ ] Monitor deployment in Actions tab
- [ ] Run database migrations
- [ ] Test all endpoints
- [ ] Verify UI loads correctly
- [ ] Create test data
- [ ] Prepare demo flow

---

## Quick Command Reference

### On VM

```bash
# Navigate to project
cd ~/actions-runner/_work/REPO_NAME/REPO_NAME

# Container operations
docker compose down -v              # Stop and remove
docker compose up -d --build        # Start with rebuild
docker compose logs -f              # View logs
docker compose ps                   # Check status
docker system prune -af --volumes   # Clean everything

# Runner operations
cd ~/actions-runner
sudo ./svc.sh status               # Check runner
sudo ./svc.sh stop                 # Stop runner
sudo ./svc.sh start                # Start runner
./config.sh remove --token TOKEN   # Disconnect repo
./config.sh --url REPO --token TOKEN  # Connect repo

# System info
docker ps                          # Running containers
docker images                      # Images
df -h                             # Disk space
free -h                           # Memory
```

### On Local Machine

```bash
# Update IP in code
find . -type f -name "*.yml" -o -name "*.yaml" | xargs sed -i 's/OLD_IP/NEW_IP/g'

# Or manually update docker-compose.yml

# Push changes
git add .
git commit -m "Update VM IP for deployment"
git push origin main
```

---

## Success Criteria

Hackathon project successfully deployed when:

✅ All containers running and healthy  
✅ Health endpoints return OK  
✅ Frontend/UI accessible via VM IP  
✅ Database operations working  
✅ No console errors  
✅ API calls successful  
✅ Can create/read/update/delete data  
✅ GitHub runner shows Idle (ready for new deploys)  
✅ Automatic deployment working on push  
✅ Complete demo flow works  

---

## Final Tips

1. **Document Everything**: Take screenshots of successful steps
2. **Time Box**: Don't spend > 30 minutes on deployment during hackathon
3. **Have Fallback**: Keep local docker-compose working
4. **Test Before**: Do a full dry run 1-2 days before
5. **Save Credentials**: Know your VM login, Azure creds, GitHub tokens
6. **Stay Calm**: If VM fails, deploy locally and present
7. **Focus on Code**: The deployment is infrastructure, your project is what matters

---

**Good Luck with Your Hackathon!** 🚀

*Remember: The deployment shows DevOps skills, but your actual project/solution is what wins the hackathon!*

---

*Last Updated: January 28, 2026*
