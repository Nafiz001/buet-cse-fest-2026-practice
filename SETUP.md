# CityCare Platform - Setup Guide

Complete setup instructions for development and production environments.

---

## Local Development Setup

### 1. Prerequisites

Install the following:

- **Node.js 20+**: https://nodejs.org/
- **PostgreSQL 16**: https://www.postgresql.org/download/
- **Docker Desktop** (optional): https://www.docker.com/products/docker-desktop/
- **Git**: https://git-scm.com/

### 2. Clone Repository

```bash
git clone https://github.com/yourusername/citycare.git
cd citycare
```

### 3. Setup Each Service

#### Hospital Service

```bash
cd hospital-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital_db?schema=public"

# Generate Prisma Client
npx prisma generate

# Run initial migration
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Service will be available at: http://localhost:3001

#### Ambulance Service

```bash
cd ambulance-service
npm install
cp .env.example .env
# Edit DATABASE_URL in .env (use different port or database)
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Service will be available at: http://localhost:3002

#### Validation Service

```bash
cd validation-service
npm install
cp .env.example .env
# Edit service URLs in .env
# HOSPITAL_SERVICE_URL=http://localhost:3001
# AMBULANCE_SERVICE_URL=http://localhost:3002
npm run dev
```

Service will be available at: http://localhost:3003

#### Emergency Request Service

```bash
cd emergency-request-service
npm install
cp .env.example .env
# Edit DATABASE_URL and VALIDATION_SERVICE_URL in .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Service will be available at: http://localhost:3004

---

## Docker Setup (Recommended)

### 1. Install Docker

- **Windows/Mac**: Install Docker Desktop
- **Linux**: Install Docker Engine and Docker Compose

### 2. Start All Services

```bash
# From project root
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 3. Check Service Health

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Check individual service
docker-compose logs -f validation-service
```

### 4. Access Services

- Hospital Service: http://localhost:3001
- Ambulance Service: http://localhost:3002
- Validation Service: http://localhost:3003
- Emergency Request Service: http://localhost:3004
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### 5. Run Database Migrations

```bash
# Migrations run automatically on container start
# To run manually:
docker-compose exec hospital-service npx prisma migrate deploy
docker-compose exec ambulance-service npx prisma migrate deploy
docker-compose exec emergency-request-service npx prisma migrate deploy
```

### 6. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (DELETES DATA)
docker-compose down -v
```

---

## Database Setup

### Option 1: Using Docker (Included in docker-compose.yml)

Databases are automatically created when running `docker-compose up`.

### Option 2: Manual PostgreSQL Setup

#### Install PostgreSQL

**Windows:**
```powershell
# Using Chocolatey
choco install postgresql

# Or download installer from postgresql.org
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Linux (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql-16
sudo systemctl start postgresql
```

#### Create Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases
CREATE DATABASE hospital_db;
CREATE DATABASE ambulance_db;
CREATE DATABASE emergency_request_db;

# Exit
\q
```

---

## Running Tests

### Validation Service (Main Tests)

```bash
cd validation-service

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm run test:watch

# Run specific test file
npm test -- validationService.test.js
```

### Other Services

```bash
# Hospital Service
cd hospital-service
npm test

# Ambulance Service
cd ambulance-service
npm test

# Emergency Request Service
cd emergency-request-service
npm test
```

---

## Environment Configuration

### Development Environment Variables

Create `.env` files in each service directory based on `.env.example`.

#### Hospital Service `.env`

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hospital_db?schema=public"
LOG_LEVEL=debug
```

#### Ambulance Service `.env`

```env
NODE_ENV=development
PORT=3002
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/ambulance_db?schema=public"
LOG_LEVEL=debug
```

#### Validation Service `.env`

```env
NODE_ENV=development
PORT=3003
HOSPITAL_SERVICE_URL=http://localhost:3001
AMBULANCE_SERVICE_URL=http://localhost:3002
REQUEST_TIMEOUT_MS=5000
LOG_LEVEL=debug
```

#### Emergency Request Service `.env`

```env
NODE_ENV=development
PORT=3004
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/emergency_request_db?schema=public"
VALIDATION_SERVICE_URL=http://localhost:3003
REQUEST_TIMEOUT_MS=5000
LOG_LEVEL=debug
```

---

## Prisma Commands

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name description_of_change
```

### Apply Migrations

```bash
npx prisma migrate deploy
```

### Reset Database

```bash
npx prisma migrate reset
```

### Open Prisma Studio (Database GUI)

```bash
npx prisma studio
```

---

## Monitoring Setup

### Prometheus

Configuration is in `prometheus/prometheus.yml`. It automatically scrapes all services.

Access at: http://localhost:9090

### Grafana

1. Access at: http://localhost:3000
2. Login: admin / admin
3. Add Prometheus data source:
   - URL: http://prometheus:9090
4. Import dashboards from `grafana/dashboards/`

---

## Common Issues & Solutions

### Issue: Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID <PID> /F

# Find process using port (macOS/Linux)
lsof -ti:3001

# Kill process (macOS/Linux)
kill -9 $(lsof -ti:3001)
```

### Issue: Database Connection Failed

```bash
# Check PostgreSQL is running
# Windows
pg_isready

# Check connection string format
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
```

### Issue: Prisma Client Not Generated

```bash
# Regenerate Prisma Client
npx prisma generate

# If still failing, delete and reinstall
rm -rf node_modules
npm install
npx prisma generate
```

### Issue: Docker Container Won't Start

```bash
# Check logs
docker-compose logs service-name

# Rebuild without cache
docker-compose build --no-cache service-name

# Remove all containers and volumes
docker-compose down -v
docker-compose up --build
```

### Issue: Tests Failing

```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests in verbose mode
npm test -- --verbose

# Check mock setup
# Ensure axios is properly mocked in tests
```

---

## Development Workflow

### 1. Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
# Edit files...

# Run tests
npm test

# Commit changes
git add .
git commit -m "Add feature: description"
```

### 2. Testing Changes

```bash
# Run service locally
npm run dev

# Test with curl
curl http://localhost:3001/health

# Run full test suite
npm test

# Check Docker build
docker build -t test-image .
```

### 3. Submitting Changes

```bash
# Push to GitHub
git push origin feature/your-feature

# Create Pull Request
# GitHub Actions will run CI pipeline automatically
```

---

## Production Deployment

### Fly.io Deployment

```bash
# Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Login
fly auth login

# Deploy Validation Service
cd validation-service
fly launch --name citycare-validation-prod
fly secrets set HOSPITAL_SERVICE_URL=https://your-hospital.fly.dev
fly secrets set AMBULANCE_SERVICE_URL=https://your-ambulance.fly.dev
fly deploy

# Check status
fly status
fly logs
```

### Environment Variables for Production

Set these via Fly.io secrets:

```bash
fly secrets set NODE_ENV=production
fly secrets set LOG_LEVEL=info
fly secrets set HOSPITAL_SERVICE_URL=https://...
fly secrets set AMBULANCE_SERVICE_URL=https://...
```

---

## Next Steps

1. ✅ Verify all services are running
2. ✅ Create test data (hospitals, ambulances)
3. ✅ Test validation flow end-to-end
4. ✅ Monitor metrics in Prometheus
5. ✅ View dashboards in Grafana
6. ✅ Run full test suite
7. ✅ Review logs for any errors

---

## Getting Help

- Check the [README.md](README.md) for architecture overview
- Check [API_EXAMPLES.md](API_EXAMPLES.md) for usage examples
- Open an issue on GitHub
- Review service logs: `docker-compose logs -f`

---

**Ready to build!** 🚀
