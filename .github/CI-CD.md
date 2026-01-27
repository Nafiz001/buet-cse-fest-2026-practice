# CityCare - CI/CD Deployment Guide

## Overview

This guide explains how to set up a complete CI/CD pipeline for the CityCare application using GitHub Actions and Azure Virtual Machine (VM).

![CI/CD Workflow](https://raw.githubusercontent.com/nayeem-17/devops-workshop-demo/refs/heads/master/pics/workshop-cicd.png)

## Architecture

The CI/CD pipeline consists of two main parts:

1. **Continuous Integration (CI)** - Runs tests on pull requests
2. **Continuous Deployment (CD)** - Automatically deploys to Azure VM when code is pushed to main branch

## Prerequisites

1. **Azure Subscription** - Active with sufficient credits
2. **GitHub Repository** - Fork of CityCare repository
3. **Azure VM** - Ubuntu 20.04 or later (recommended: Standard_B2s or better)
4. **Domain/IP** - For accessing the deployed application

## Step 1: Create Azure Virtual Machine

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → "Virtual Machine"
3. Configure the VM:
   - **Basics:**
     - Resource Group: Create new (e.g., `citycare-rg`)
     - VM Name: `citycare-vm`
     - Region: Choose closest to your users
     - Image: Ubuntu Server 20.04 LTS
     - Size: Standard_B2s (2 vCPUs, 4 GB RAM minimum)
     - Authentication: SSH public key or Password
   - **Networking:**
     - Create new Virtual Network
     - Public IP: Yes
     - Inbound ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 3000-3010 (Services)
4. Review and Create

### Using Azure CLI (Alternative)

```bash
# Login to Azure
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

# Open required ports
az vm open-port --port 80 --resource-group citycare-rg --name citycare-vm --priority 1001
az vm open-port --port 443 --resource-group citycare-rg --name citycare-vm --priority 1002
az vm open-port --port 3000-3010 --resource-group citycare-rg --name citycare-vm --priority 1003
```

## Step 2: Configure Azure VM

### Option A: Using Azure Portal Extensions (Recommended)

1. **Install Docker Extension**
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to your VM (`citycare-vm`)
   - In the left menu, select **Extensions + applications**
   - Click **+ Add**
   - Search for **Docker**
   - Select **Docker Extension** (by Microsoft)
   - Click **Create** → **OK**
   - Wait for installation to complete (2-3 minutes)

2. **Install Additional Software via Run Command**
   - In your VM page, select **Run command** from the left menu
   - Select **RunShellScript**
   - Paste this script:
     ```bash
     # Update system
     sudo apt update && sudo apt upgrade -y
     
     # Install Docker if not already installed
     curl -fsSL https://get.docker.com -o get-docker.sh
     sudo sh get-docker.sh
     
     # Add user to docker group
     sudo usermod -aG docker azureuser
     
     # Install Docker Compose
     sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
     sudo chmod +x /usr/local/bin/docker-compose
     
     # Verify installations
     docker --version
     docker-compose --version
     ```
   - Click **Run**
   - Wait for completion (5-7 minutes)
   - Check the output to verify Docker and Docker Compose versions

### Option B: Using Azure Cloud Shell

1. **Open Azure Cloud Shell**
   - Go to [Azure Portal](https://portal.azure.com)
   - Click the **Cloud Shell** icon (>_) in the top navigation bar
   - Select **Bash** when prompted

2. **Find Your VM Username**
   - You need to know the username you created when setting up the VM
   - Common usernames: `azureuser`, `adminuser`, or your custom username
   - If you don't remember, check your VM page → **Overview** → **Properties**

3. **Run Setup Script**
   - **IMPORTANT**: Replace `YOUR_VM_USERNAME` with your actual username below
   - Copy and paste this command:
     ```bash
     az vm run-command invoke \
       --resource-group citycare-rg \
       --name citycare-vm \
       --command-id RunShellScript \
       --scripts "
       sudo apt update && sudo apt upgrade -y
       curl -fsSL https://get.docker.com -o get-docker.sh
       sudo sh get-docker.sh
       sudo usermod -aG docker YOUR_VM_USERNAME
       sudo curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
       sudo chmod +x /usr/local/bin/docker-compose
       docker --version
       docker-compose --version
       "
     ```
   - Press Enter and wait for completion (5-10 minutes)
   - Review the output for Docker and Docker Compose versions
   - Look for: `Docker version 29.x.x` and `Docker Compose version v5.x.x`

### Option C: Using SSH from Browser

1. **Connect via Azure Portal**
   - Go to your VM page in [Azure Portal](https://portal.azure.com)
   - Click **Connect** button at the top
   - Select **Connect** under "Native SSH"
   - If you don't have SSH client, select **Go to Bastion** for browser-based SSH
   
2. **Or use Azure Bastion (No SSH client needed)**
   - In your VM page, click **Connect** → **Bastion**
   - Enter your username and password/SSH key
   - Click **Connect**
   - A new browser tab will open with terminal access

3. **Run installation commands in the terminal:**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   
   # Verify installations
   docker --version
   docker-compose --version
   ```

4. **Reconnect for docker group to take effect**
   - Close the Bastion connection
   - Reconnect using the same method

## Step 3: Add VM as GitHub Self-Hosted Runner

1. Go to your GitHub repository
2. Navigate to **Settings** → **Actions** → **Runners**
3. Click **New self-hosted runner**
4. Select **Linux** as the operating system
5. Follow the commands shown on the screen. They will look like:

```bash
# Create a folder
mkdir actions-runner && cd actions-runner

# Download the latest runner package
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extract the installer
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Create the runner and start the configuration
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN

# Run the runner (for testing)
./run.sh
```

6. For production, run the runner as a service:

```bash
# Install as service
sudo ./svc.sh install

# Start the service
sudo ./svc.sh start

# Check status
sudo ./svc.sh status
```

## Step 4: Configure Environment Variables

Create a `.env` file in the VM for your services (optional, can be in docker-compose.yml):

```bash
cd ~
mkdir citycare-config
cd citycare-config
nano .env
```

Add your environment variables:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=citycare

# Service Ports
HOSPITAL_SERVICE_PORT=3001
AMBULANCE_SERVICE_PORT=3002
EMERGENCY_REQUEST_SERVICE_PORT=3003
ORCHESTRATOR_SERVICE_PORT=3004
VALIDATION_SERVICE_PORT=3005
ADMIN_FRONTEND_PORT=3000

# Other configurations
NODE_ENV=production
```

## Step 5: Update GitHub Repository Settings

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**
2. Add repository secrets if needed (e.g., database passwords, API keys)

## Step 6: Test CI Pipeline

1. Create a new branch:
   ```bash
   git checkout -b test-ci
   ```

2. Make a small change to any file

3. Push and create a pull request:
   ```bash
   git add .
   git commit -m "Test CI pipeline"
   git push origin test-ci
   ```

4. Go to your repository → **Pull Requests** → Create new PR

5. GitHub Actions will automatically run tests

6. Check the **Actions** tab to see the CI workflow running

## Step 7: Deploy Application

### Option A: Manual Trigger (Recommended for first deployment)

1. Go to your repository → **Actions** tab
2. Click on **Continuous Deployment** workflow
3. Click **Run workflow** → Select `main` branch → **Run workflow**
4. Wait for deployment to complete (5-10 minutes first time)

### Option B: Automatic on Push (Enable after testing)

1. Edit [.github/workflows/cd.yml](.github/workflows/cd.yml)
2. Uncomment the push trigger:
   ```yaml
   on:
     push:  # Uncomment these lines
       branches:
         - main
     workflow_dispatch:
   ```
3. Commit and push changes
4. Now every push to main will trigger automatic deployment

## Step 8: Verify Deployment

Once deployment is complete, access your services:

- **Admin Frontend**: `http://<YOUR_VM_IP>:3000`
- **Hospital Service**: `http://<YOUR_VM_IP>:3001`
- **Ambulance Service**: `http://<YOUR_VM_IP>:3002`
- **Emergency Request Service**: `http://<YOUR_VM_IP>:3003`
- **Orchestrator Service**: `http://<YOUR_VM_IP>:3004`
- **Validation Service**: `http://<YOUR_VM_IP>:3005`

Check service health:
```bash
curl http://<YOUR_VM_IP>:3004/health
```

## Continuous Integration Workflow

The CI workflow ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs automatically on every pull request:

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
    steps:
      - Checkout code
      - Set up Node.js 20
      - Install dependencies
      - Run tests (validation-service)
```

**What it does:**
- ✅ Runs on every PR to main branch
- ✅ Tests validation-service
- ✅ Prevents merging if tests fail

## Continuous Deployment Workflow

The CD workflow ([.github/workflows/cd.yml](.github/workflows/cd.yml)) deploys to your Azure VM:

```yaml
name: Continuous Deployment

on:
  workflow_dispatch:  # Manual trigger
  # Uncomment to enable automatic deployment:
  # push:
  #   branches:
  #     - main

jobs:
  deploy:
    runs-on: self-hosted  # Runs on your Azure VM
    steps:
      - Checkout code
      - Update Docker Compose
      - Deploy: docker-compose down -v && up -d --build
```

**What it does:**
- ✅ Pulls latest code from main branch
- ✅ Ensures Docker Compose is up to date
- ✅ Stops old containers
- ✅ Builds fresh images
- ✅ Starts all services

## Monitoring Deployments

### View Logs on VM

```bash
# SSH into VM
ssh azureuser@<YOUR_VM_IP>

# View all container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f hospital-service

# View runner logs
cd ~/actions-runner
tail -f _diag/Runner_*.log
```

### GitHub Actions Dashboard

1. Go to repository → **Actions** tab
2. See all workflow runs
3. Click on any run to see detailed logs
4. Green ✓ = Success, Red ✗ = Failed

## Troubleshooting

### Runner Not Connecting

```bash
# Check runner service
sudo ./svc.sh status

# Restart runner
sudo ./svc.sh stop
sudo ./svc.sh start

# Check logs
tail -f _diag/Runner_*.log
```

### Deployment Fails

```bash
# Check Docker status
docker ps -a

# Check compose logs
docker-compose logs

# Restart services manually
docker-compose down -v
docker-compose up -d --build
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>
```

### Database Connection Issues

```bash
# Check PostgreSQL container
docker-compose ps postgres

# Access database
docker-compose exec postgres psql -U postgres -d citycare

# Run migrations manually
cd ~/actions-runner/_work/YOUR_REPO/YOUR_REPO
npm install
npx prisma db push
```

## Security Best Practices

1. **Use SSH Keys** instead of passwords
2. **Configure Firewall** - Only allow necessary ports
3. **Use Secrets** - Store sensitive data in GitHub Secrets
4. **Regular Updates** - Keep VM and Docker updated
5. **Monitor Logs** - Check for unusual activity
6. **Backup Database** - Regular PostgreSQL backups
7. **HTTPS** - Set up SSL/TLS certificates (Let's Encrypt)

## Setting Up HTTPS (Optional)

```bash
# Install Nginx
sudo apt install nginx -y

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

## Cost Optimization

1. **VM Size**: Start with Standard_B1ms ($7.6/month) for testing
2. **Auto-Shutdown**: Configure in Azure Portal to stop VM during off-hours
3. **Resource Cleanup**: Delete unused resources
4. **Monitoring**: Set up billing alerts in Azure

## Scaling Up

When you need more capacity:

1. **Vertical Scaling**: Increase VM size in Azure Portal
2. **Horizontal Scaling**: Add more VMs with load balancer
3. **Database**: Migrate to Azure Database for PostgreSQL
4. **Container Orchestration**: Consider Azure Kubernetes Service (AKS)

## Demo URLs

After deployment, share these URLs:

- **Admin Dashboard**: `http://<YOUR_VM_IP>:3000`
- **API Health Check**: `http://<YOUR_VM_IP>:3004/health`
- **Grafana Monitoring**: `http://<YOUR_VM_IP>:3100` (if enabled)
- **Prometheus Metrics**: `http://<YOUR_VM_IP>:9090` (if enabled)

## Next Steps

1. ✅ Set up monitoring with Prometheus & Grafana
2. ✅ Configure custom domain name
3. ✅ Set up HTTPS with SSL certificate
4. ✅ Implement database backups
5. ✅ Add more comprehensive tests
6. ✅ Set up logging aggregation
7. ✅ Configure alerts for failures

## Support

For issues or questions:
- Check GitHub Actions logs
- Review VM logs: `docker-compose logs`
- Check runner status: `sudo ./svc.sh status`
- Verify network security group rules in Azure Portal

---

**Congratulations!** 🎉 You now have a fully automated CI/CD pipeline deploying CityCare to Azure VM!
