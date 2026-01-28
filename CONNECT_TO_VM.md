# Connect to Your Azure VM - Quick Guide

## Your VM Details

**VM IP Address**: `40.81.240.99`  
**VM Name**: `citycare-vm` (or similar)  
**Region**: East US  
**Resource Group**: `citycare-rg` (or similar)

---

## 🔗 Connection Methods

### Method 1: Azure Bastion (Recommended - Most Secure)

1. **Open Azure Portal**
   - Go to https://portal.azure.com
   - Sign in with your Azure account

2. **Navigate to Your VM**
   ```
   Home → Virtual Machines → [Your VM Name]
   ```

3. **Connect via Bastion**
   - Click **"Connect"** button at the top
   - Select **"Bastion"**
   - Enter your VM credentials
   - Click **"Connect"**
   
   This opens a browser-based terminal session!

### Method 2: SSH (If Enabled)

If you set up SSH keys during VM creation:

```powershell
# From your local machine
ssh azureuser@40.81.240.99

# Or with specific key
ssh -i ~/.ssh/your-key.pem azureuser@40.81.240.99
```

### Method 3: Azure Cloud Shell

1. Open Azure Portal
2. Click the **Cloud Shell** icon (>_) at the top
3. Run:
   ```bash
   ssh azureuser@40.81.240.99
   ```

---

## 📦 Check Current Deployment Status

Once connected to your VM:

### 1. Check Running Containers

```bash
# See all running containers
docker ps

# See all containers (including stopped)
docker ps -a

# Check specific service status
docker ps | grep hospital
docker ps | grep ambulance
```

### 2. Check Docker Compose Status

```bash
# Navigate to project directory
cd ~/actions-runner/_work/buet-cse-fest-2026-practice/buet-cse-fest-2026-practice/citycare

# View status
docker compose ps

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f hospital-service
```

### 3. Test Services

```bash
# Check if services are responding
curl http://localhost:3001/health  # Hospital Service
curl http://localhost:3002/health  # Ambulance Service
curl http://localhost:3004/health  # Emergency Request Service

# From your local machine (external access)
curl http://40.81.240.99:3001/health
curl http://40.81.240.99:3002/health
```

---

## 🚀 Start/Stop/Restart Services

### Start All Services

```bash
cd ~/actions-runner/_work/buet-cse-fest-2026-practice/buet-cse-fest-2026-practice/citycare

# Start everything
docker compose up -d

# Start with logs visible
docker compose up

# Start with scaling
docker compose up -d \
  --scale hospital-service=3 \
  --scale ambulance-service=3 \
  --scale emergency-request-service=3
```

### Stop All Services

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (fresh start)
docker compose down -v
```

### Restart Specific Service

```bash
# Restart one service
docker compose restart hospital-service

# Rebuild and restart
docker compose up -d --build hospital-service
```

### View Real-time Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f hospital-service
docker compose logs -f nginx
docker compose logs -f rabbitmq

# Last 100 lines
docker compose logs --tail=100
```

---

## 🔄 Deploy New Changes

### If You Updated Code Locally

**Option 1: GitHub Actions (Automatic)**

Your VM has a GitHub Actions runner configured. Simply:

1. Commit and push changes to GitHub:
   ```powershell
   # On your local machine
   git add .
   git commit -m "Updated services"
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Pull latest code on the VM
   - Rebuild containers
   - Restart services

3. Check deployment status:
   - Go to GitHub → Actions tab
   - Watch the workflow run

**Option 2: Manual Deployment**

If you want to deploy manually:

1. **Connect to VM** (via Bastion)

2. **Pull latest code**:
   ```bash
   cd ~/actions-runner/_work/buet-cse-fest-2026-practice/buet-cse-fest-2026-practice/citycare
   git pull origin main
   ```

3. **Rebuild and restart**:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

---

## 📊 Access Services from Browser

Your services are publicly accessible at:

- **Hospital Service**: http://40.81.240.99:3001
- **Ambulance Service**: http://40.81.240.99:3002
- **Validation Service**: http://40.81.240.99:3003
- **Emergency Request**: http://40.81.240.99:3004
- **Orchestrator**: http://40.81.240.99:3005
- **Admin Frontend**: http://40.81.240.99:3000
- **Grafana**: http://40.81.240.99:3006
- **Prometheus**: http://40.81.240.99:9090
- **RabbitMQ Management**: http://40.81.240.99:15672

**RabbitMQ Credentials**: citycare/citycare123  
**Grafana Credentials**: admin/admin

---

## 🔧 Deploy New Scaled Setup

To deploy the new RabbitMQ + Nginx scaling setup on your VM:

### Option 1: From Local Machine (Push to GitHub)

```powershell
# On your local machine
cd G:\KUET\BCF_test\citycare

# Commit the new scaling setup
git add .
git commit -m "Add RabbitMQ and Nginx scaling"
git push origin main
```

Then on VM, the GitHub Actions runner will automatically deploy, OR you can manually:

```bash
# Connect to VM
cd ~/actions-runner/_work/buet-cse-fest-2026-practice/buet-cse-fest-2026-practice/citycare

# Pull latest code
git pull origin main

# Stop old setup
docker compose down

# Start with new scaling setup
docker compose up -d \
  --scale hospital-service=3 \
  --scale ambulance-service=3 \
  --scale emergency-request-service=3 \
  --scale validation-service=2 \
  --scale orchestrator-service=2

# Check status
docker compose ps
```

### Option 2: Copy Files Directly to VM

If you don't want to use Git:

```powershell
# On your local machine
# First, ensure you have SCP access or use Azure File Share

# Or manually copy via Azure Portal:
# 1. Go to VM in portal
# 2. Click "Run command"
# 3. Paste the file contents
```

---

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker compose logs [service-name]

# Check resource usage
docker stats

# Check if ports are in use
sudo netstat -tulpn | grep LISTEN
```

### Out of Memory

```bash
# Check memory usage
free -h

# Restart Docker
sudo systemctl restart docker

# Prune unused resources
docker system prune -a
```

### Firewall Issues

If services aren't accessible from outside:

```bash
# Check if ports are open
sudo ufw status

# Open ports (if needed)
sudo ufw allow 3000:3006/tcp
sudo ufw allow 15672/tcp
```

### GitHub Actions Runner Not Working

```bash
# Check runner status
cd ~/actions-runner
sudo ./svc.sh status

# Restart runner
sudo ./svc.sh restart

# View runner logs
journalctl -u actions.runner.* -f
```

---

## 💾 Backup Current State

Before making major changes:

```bash
# Backup databases
docker compose exec hospital-db pg_dump -U postgres hospital_db > hospital_backup.sql
docker compose exec ambulance-db pg_dump -U postgres ambulance_db > ambulance_backup.sql

# Backup docker-compose config
cp docker-compose.yml docker-compose.yml.backup

# Export all images
docker save -o citycare-images.tar $(docker images --format "{{.Repository}}:{{.Tag}}" | grep citycare)
```

---

## 🧹 Clean Up and Start Fresh

If you want to completely reset:

```bash
# Stop everything
docker compose down -v

# Remove all containers, images, volumes
docker system prune -a --volumes -f

# Start fresh
docker compose up -d --build
```

---

## 📱 Quick Commands Reference

```bash
# Status check
docker compose ps

# Start all
docker compose up -d

# Stop all
docker compose down

# View logs
docker compose logs -f

# Restart service
docker compose restart [service-name]

# Scale services
docker compose up -d --scale hospital-service=5 --no-recreate

# Check resource usage
docker stats

# Access database
docker compose exec hospital-db psql -U postgres -d hospital_db
```

---

## 💰 Cost Management

Your VM is running 24/7 and incurring costs. To save money:

### Stop VM When Not in Use

**From Azure Portal**:
1. Go to Virtual Machines
2. Select your VM
3. Click **"Stop"** (this deallocates and stops billing)
4. Click **"Start"** when you need it again

**From PowerShell** (on your local machine):
```powershell
# Stop VM (stops billing)
az vm deallocate --resource-group citycare-rg --name citycare-vm

# Start VM
az vm start --resource-group citycare-rg --name citycare-vm

# Check status
az vm show --resource-group citycare-rg --name citycare-vm -d
```

⚠️ **Note**: IP address might change after stop/start unless you have a static IP!

---

## 🎯 Next Steps

1. **Connect to your VM** using Azure Bastion
2. **Check current status**: `docker compose ps`
3. **Pull latest changes**: `git pull origin main`
4. **Deploy new scaling setup**: Use the commands in "Deploy New Scaled Setup" section
5. **Test**: Access http://40.81.240.99:3001/health

Need help? Check the other guides:
- [SCALING_GUIDE.md](SCALING_GUIDE.md) - Scaling and load balancing details
- [RABBITMQ_GUIDE.md](RABBITMQ_GUIDE.md) - Message queue integration
- [CHEAT_SHEET.md](CHEAT_SHEET.md) - Quick command reference
