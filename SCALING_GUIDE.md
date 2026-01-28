# CityCare - Scaling with RabbitMQ and Nginx

## Architecture Overview

This deployment uses **RabbitMQ** for asynchronous message processing and **Nginx** as a load balancer, replacing Kubernetes orchestration with a simpler, hackathon-friendly setup.

### Why This Approach?

- ✅ **Simpler than Kubernetes** - No cluster management overhead
- ✅ **Production-ready** - Handles high load with horizontal scaling
- ✅ **Easy debugging** - Direct access to all services
- ✅ **Resource efficient** - Lower memory footprint
- ✅ **Fast deployment** - Single `docker-compose up` command

## Architecture Diagram

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │
       ▼
┌─────────────────┐         ┌──────────────┐
│  Nginx (Port    │◄────────┤  RabbitMQ    │
│  Load Balancer) │         │  (Message    │
└────────┬────────┘         │   Broker)    │
         │                  └──────────────┘
         │
    ┌────┴─────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Hospital │ │Hospital │ │Ambulance│ │Ambulance│ │Emergency│
│Service  │ │Service  │ │Service  │ │Service  │ │Request  │
│   #1    │ │   #2    │ │   #1    │ │   #2    │ │Service  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
     │            │           │           │            │
     └────────────┴───────────┴───────────┴────────────┘
                          │
                          ▼
                 ┌──────────────┐
                 │  PostgreSQL  │
                 │  (3 DBs)     │
                 └──────────────┘
```

## Service Scaling

| Service | Replicas | Load Balancer | Port |
|---------|----------|---------------|------|
| Hospital Service | 3 | Nginx | 3001 |
| Ambulance Service | 3 | Nginx | 3002 |
| Validation Service | 2 | Nginx | 3003 |
| Emergency Request | 3 | Nginx | 3004 |
| Orchestrator | 2 | Nginx | 3005 |
| Admin Frontend | 1 | - | 3000 |

## Components

### 1. Nginx Load Balancer

**Configuration**: [nginx/nginx.conf](nginx/nginx.conf)

Features:
- **Least Connections** algorithm for optimal load distribution
- **Health checks** for automatic failover
- **Connection pooling** (keepalive) for better performance
- **Gzip compression** for reduced bandwidth
- **Request timeout** configuration
- **Status page** at `http://localhost:8080/nginx_status`

### 2. RabbitMQ Message Broker

Features:
- **Asynchronous processing** of emergency requests
- **Priority queues** (high/normal priority)
- **Dead letter queues** for failed messages
- **Persistent messages** for reliability
- **Management UI** at `http://localhost:15672`

Credentials:
- Username: `citycare`
- Password: `citycare123`

### 3. Docker Compose Orchestration

The `docker-compose.yml` now includes:
- RabbitMQ with management plugin
- Nginx load balancer
- Scaled microservices (no container_name for replicas)
- Health checks for all services
- Automatic restarts

## Setup Instructions

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 8GB RAM minimum
- 20GB free disk space

### Step 1: Clone and Navigate

```bash
cd citycare
```

### Step 2: Configure Environment

No additional configuration needed! Environment variables are set in `docker-compose.yml`.

### Step 3: Start All Services

```bash
# Start all services with scaling
docker-compose up -d --scale hospital-service=3 --scale ambulance-service=3 --scale emergency-request-service=3 --scale validation-service=2 --scale orchestrator-service=2
```

Or use the provided script:

**Windows (PowerShell)**:
```powershell
.\start.ps1
```

**Linux/Mac**:
```bash
./start.sh
```

### Step 4: Verify Deployment

Check all services are running:
```bash
docker-compose ps
```

Expected output:
```
NAME                              STATUS    PORTS
citycare-nginx                    Up        0.0.0.0:3001-3005->3001-3005/tcp
citycare-rabbitmq                 Up        0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
citycare-hospital-service-1       Up        3001/tcp
citycare-hospital-service-2       Up        3001/tcp
citycare-hospital-service-3       Up        3001/tcp
...
```

### Step 5: Verify Health

Check Nginx status:
```bash
curl http://localhost:8080/nginx_status
```

Check individual service health through Nginx:
```bash
curl http://localhost:3001/health  # Hospital (load balanced)
curl http://localhost:3002/health  # Ambulance (load balanced)
curl http://localhost:3003/health  # Validation (load balanced)
curl http://localhost:3004/health  # Emergency Request (load balanced)
```

### Step 6: Access Management UIs

- **Admin Frontend**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (citycare/citycare123)
- **Grafana**: http://localhost:3006 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Nginx Status**: http://localhost:8080/nginx_status

## Scaling Services

### Scale Up

```bash
# Scale hospital service to 5 instances
docker-compose up -d --scale hospital-service=5 --no-recreate

# Scale multiple services
docker-compose up -d \
  --scale hospital-service=5 \
  --scale ambulance-service=5 \
  --scale emergency-request-service=5 \
  --no-recreate
```

### Scale Down

```bash
# Scale hospital service to 2 instances
docker-compose up -d --scale hospital-service=2 --no-recreate
```

### View Service Distribution

```bash
# See all running containers
docker-compose ps

# See Nginx upstream status (requires nginx-plus or custom module)
curl http://localhost:8080/nginx_status
```

## Load Testing

### Using Apache Bench

```bash
# Test hospital service endpoint
ab -n 1000 -c 10 http://localhost:3001/api/hospitals

# Test emergency request endpoint
ab -n 1000 -c 10 -p request.json -T application/json http://localhost:3004/api/requests
```

### Using hey

```bash
# Install hey
go install github.com/rakyll/hey@latest

# Load test with 50 concurrent users
hey -n 10000 -c 50 http://localhost:3001/api/hospitals
```

### Expected Performance

With 3 replicas per service:
- **Throughput**: 500-1000 requests/second
- **Latency (p99)**: < 100ms
- **Error rate**: < 0.1%

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hospital-service

# Nginx logs
docker-compose logs -f nginx

# RabbitMQ logs
docker-compose logs -f rabbitmq
```

### Monitor Resource Usage

```bash
# CPU and Memory usage
docker stats

# Specific services
docker stats citycare-hospital-service-1 citycare-hospital-service-2
```

### RabbitMQ Monitoring

1. Open http://localhost:15672
2. Navigate to "Queues" tab
3. Monitor:
   - Message rate
   - Queue depth
   - Consumer count
   - Memory usage

### Grafana Dashboards

1. Open http://localhost:3006
2. Login (admin/admin)
3. View pre-configured dashboards:
   - Service metrics
   - Request rates
   - Error rates
   - Latency percentiles

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker-compose logs [service-name]

# Check health
docker inspect citycare-hospital-service-1 | grep -A 10 Health

# Restart specific service
docker-compose restart hospital-service
```

### Nginx Not Load Balancing

```bash
# Check Nginx config syntax
docker-compose exec nginx nginx -t

# Reload Nginx config
docker-compose exec nginx nginx -s reload

# Check upstream connections
docker-compose logs nginx | grep upstream
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmqctl status

# Check connections
docker-compose exec rabbitmq rabbitmqctl list_connections

# Check queues
docker-compose exec rabbitmq rabbitmqctl list_queues
```

### Database Issues

```bash
# Check database health
docker-compose exec hospital-db pg_isready

# Connect to database
docker-compose exec hospital-db psql -U postgres -d hospital_db

# View connections
docker-compose exec hospital-db psql -U postgres -c "SELECT * FROM pg_stat_activity"
```

### Performance Issues

1. **Scale up services**:
   ```bash
   docker-compose up -d --scale hospital-service=5 --no-recreate
   ```

2. **Check resource limits**:
   ```bash
   docker stats
   ```

3. **Optimize Nginx**:
   - Increase `worker_connections` in nginx.conf
   - Tune `keepalive` connections
   - Enable caching for static responses

4. **Optimize RabbitMQ**:
   - Increase `prefetch` count
   - Use multiple consumers per queue
   - Enable lazy queues for large backlogs

## Production Considerations

### Security

1. **Change default passwords**:
   - RabbitMQ credentials
   - Database passwords
   - Grafana admin password

2. **Enable TLS**:
   - Configure Nginx with SSL certificates
   - Use `amqps://` for RabbitMQ connections

3. **Network isolation**:
   - Use Docker networks
   - Restrict external access

### Backup

```bash
# Backup databases
docker-compose exec hospital-db pg_dump -U postgres hospital_db > hospital_backup.sql
docker-compose exec ambulance-db pg_dump -U postgres ambulance_db > ambulance_backup.sql
docker-compose exec emergency-request-db pg_dump -U postgres emergency_request_db > emergency_backup.sql
```

### Updates

```bash
# Update images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

## Comparison: This Setup vs Kubernetes

| Feature | This Setup | Kubernetes |
|---------|-----------|------------|
| Setup Time | 5 minutes | 1-2 hours |
| Resource Usage | ~4GB RAM | ~8GB RAM |
| Learning Curve | Low | High |
| Scaling | Manual/Script | Automatic |
| Load Balancing | Nginx | Built-in |
| Service Discovery | Docker DNS | Kube DNS |
| Health Checks | Docker + Nginx | Liveness/Readiness |
| Rolling Updates | Manual | Automatic |
| Self-healing | Docker restart | Full auto-healing |
| Multi-host | Limited | Native |

**Verdict**: For a hackathon or small deployment (< 10 services, < 20 replicas), this setup is simpler and sufficient!

## Next Steps

1. **Integrate RabbitMQ** - Follow [RABBITMQ_GUIDE.md](RABBITMQ_GUIDE.md)
2. **Add monitoring alerts** - Configure Prometheus alerting rules
3. **Implement auto-scaling** - Write script to scale based on CPU/memory
4. **Setup CI/CD** - Automate build and deployment
5. **Add rate limiting** - Implement in Nginx or application layer

## Support

For issues or questions:
1. Check logs: `docker-compose logs [service]`
2. Review health endpoints: `curl http://localhost:300X/health`
3. Check RabbitMQ management UI
4. Review Nginx access logs

## License

MIT License - See LICENSE file for details
