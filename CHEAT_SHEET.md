# CityCare - Quick Reference Cheat Sheet

## 🚀 Quick Start

```bash
# Windows
.\start-scaled.ps1

# Linux/Mac
./start-scaled.sh
```

## 📍 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Admin Frontend | http://localhost:3000 | - |
| Hospital Service | http://localhost:3001 | - |
| Ambulance Service | http://localhost:3002 | - |
| Validation Service | http://localhost:3003 | - |
| Emergency Request | http://localhost:3004 | - |
| Orchestrator | http://localhost:3005 | - |
| Grafana | http://localhost:3006 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| Nginx Status | http://localhost:8080 | - |
| RabbitMQ Management | http://localhost:15672 | citycare/citycare123 |

## 🐳 Docker Commands

```bash
# Start all services with scaling
docker-compose up -d --scale hospital-service=3 --scale ambulance-service=3 --scale emergency-request-service=3

# View running containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f hospital-service
docker-compose logs -f nginx
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Restart a service
docker-compose restart hospital-service

# Rebuild and restart
docker-compose up -d --build

# Scale a service
docker-compose up -d --scale hospital-service=5 --no-recreate

# View resource usage
docker stats
```

## 🔄 Scaling Commands

```bash
# Scale up
docker-compose up -d --scale hospital-service=5 --no-recreate
docker-compose up -d --scale ambulance-service=5 --no-recreate
docker-compose up -d --scale emergency-request-service=5 --no-recreate

# Scale down
docker-compose up -d --scale hospital-service=1 --no-recreate

# Scale multiple services at once
docker-compose up -d \
  --scale hospital-service=5 \
  --scale ambulance-service=5 \
  --scale validation-service=3 \
  --no-recreate
```

## 🔍 Health Checks

```bash
# Check Nginx load balancer
curl http://localhost:8080

# Check service health (through load balancer)
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health

# Check Nginx status page
curl http://localhost:8080/nginx_status
```

## 📊 Monitoring

```bash
# RabbitMQ Management
open http://localhost:15672
# Username: citycare, Password: citycare123

# View queues
docker-compose exec rabbitmq rabbitmqctl list_queues

# View connections
docker-compose exec rabbitmq rabbitmqctl list_connections

# View exchanges
docker-compose exec rabbitmq rabbitmqctl list_exchanges

# Grafana dashboards
open http://localhost:3006
# Username: admin, Password: admin

# Prometheus targets
open http://localhost:9090/targets
```

## 🐛 Troubleshooting

```bash
# Check if all services are healthy
docker-compose ps

# View detailed container info
docker inspect citycare-nginx
docker inspect citycare-rabbitmq

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Reload Nginx config (after changes)
docker-compose exec nginx nginx -s reload

# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmqctl status

# Access database
docker-compose exec hospital-db psql -U postgres -d hospital_db

# View Nginx error logs
docker-compose logs nginx | grep error

# View RabbitMQ logs
docker-compose logs rabbitmq

# Check resource usage
docker stats

# Free up disk space
docker system prune -a
```

## 🧪 Testing

```bash
# Load test with curl (100 requests)
for i in {1..100}; do curl http://localhost:3001/health; done

# With Apache Bench
ab -n 1000 -c 10 http://localhost:3001/health

# With hey (install: go install github.com/rakyll/hey@latest)
hey -n 10000 -c 50 http://localhost:3001/api/hospitals

# Test RabbitMQ connection
docker-compose exec rabbitmq rabbitmq-diagnostics ping
```

## 📦 Database Operations

```bash
# Connect to hospital database
docker-compose exec hospital-db psql -U postgres -d hospital_db

# Connect to ambulance database
docker-compose exec ambulance-db psql -U postgres -d ambulance_db

# Backup database
docker-compose exec hospital-db pg_dump -U postgres hospital_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T hospital-db psql -U postgres -d hospital_db

# View database connections
docker-compose exec hospital-db psql -U postgres -c "SELECT * FROM pg_stat_activity"
```

## 🔧 Development

```bash
# Run migrations
docker-compose exec hospital-service npx prisma migrate dev

# View Prisma schema
docker-compose exec hospital-service cat prisma/schema.prisma

# Generate Prisma client
docker-compose exec hospital-service npx prisma generate

# Seed database
docker-compose exec hospital-service node seed.js
```

## 📝 Logs Filtering

```bash
# Show only errors
docker-compose logs | grep -i error

# Follow logs with timestamp
docker-compose logs -f -t

# Last 100 lines
docker-compose logs --tail=100

# Logs from specific time
docker-compose logs --since 2026-01-29T10:00:00

# Export logs to file
docker-compose logs > logs.txt
```

## 🌐 Network

```bash
# List Docker networks
docker network ls

# Inspect citycare network
docker network inspect citycare_citycare-network

# Test connectivity between services
docker-compose exec hospital-service ping ambulance-service
docker-compose exec validation-service curl http://hospital-service:3001/health
```

## 🗑️ Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all

# Remove unused Docker resources
docker system prune -a --volumes

# Remove specific volume
docker volume rm citycare_hospital-db-data
```

## ⚡ Performance Tuning

```bash
# Increase Nginx worker connections (edit nginx/nginx.conf)
worker_connections  8192;

# Increase RabbitMQ connection limit
docker-compose exec rabbitmq rabbitmqctl set_vm_memory_high_watermark 0.6

# Set Docker memory limits (in docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

## 🔐 Security

```bash
# Change RabbitMQ password
docker-compose exec rabbitmq rabbitmqctl change_password citycare newpassword123

# View RabbitMQ users
docker-compose exec rabbitmq rabbitmqctl list_users

# Change database password (in docker-compose.yml, then recreate)
POSTGRES_PASSWORD: newpassword

# Generate secure passwords
openssl rand -base64 32
```

## 📚 Documentation

- [SCALING_GUIDE.md](SCALING_GUIDE.md) - Complete scaling setup guide
- [RABBITMQ_GUIDE.md](RABBITMQ_GUIDE.md) - RabbitMQ integration examples
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What was implemented
- [README.md](README.md) - Main project documentation

## 🆘 Emergency Commands

```bash
# Force restart everything
docker-compose down && docker-compose up -d --build

# Force recreate specific service
docker-compose up -d --force-recreate hospital-service

# Kill all Docker processes (nuclear option)
docker kill $(docker ps -q)

# Remove all stopped containers
docker container prune -f

# Check what's using port 3001
# Windows
netstat -ano | findstr :3001
# Linux/Mac
lsof -i :3001
```

## 📊 Useful Queries

```sql
-- List all hospitals
SELECT * FROM hospitals;

-- Count ambulances by status
SELECT status, COUNT(*) FROM ambulances GROUP BY status;

-- Recent emergency requests
SELECT * FROM emergency_requests ORDER BY created_at DESC LIMIT 10;

-- Active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## 🎯 Recommended Scaling for Demo

```bash
# High-load demo (recommended)
docker-compose up -d \
  --scale hospital-service=5 \
  --scale ambulance-service=5 \
  --scale emergency-request-service=5 \
  --scale validation-service=3 \
  --scale orchestrator-service=2

# Low-resource environment
docker-compose up -d \
  --scale hospital-service=2 \
  --scale ambulance-service=2 \
  --scale emergency-request-service=2 \
  --scale validation-service=1 \
  --scale orchestrator-service=1
```

---

**Pro Tip**: Bookmark this file! It contains all the commands you'll need during development and demos.
