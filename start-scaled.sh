#!/bin/bash

echo "========================================"
echo "  CityCare - Starting with Scaling"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Pulling latest images...${NC}"
docker-compose pull

echo ""
echo -e "${BLUE}🏗️  Building services...${NC}"
docker-compose build

echo ""
echo -e "${BLUE}🚀 Starting services with scaling...${NC}"
docker-compose up -d \
  --scale hospital-service=3 \
  --scale ambulance-service=3 \
  --scale emergency-request-service=3 \
  --scale validation-service=2 \
  --scale orchestrator-service=2

echo ""
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 15

echo ""
echo -e "${GREEN}✅ Checking service health...${NC}"
echo ""

# Check Nginx
if curl -s http://localhost:8080 > /dev/null; then
    echo -e "${GREEN}✓${NC} Nginx Load Balancer: http://localhost:8080"
else
    echo -e "${YELLOW}⚠${NC} Nginx Load Balancer: Not responding"
fi

# Check Hospital Service
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Hospital Service: http://localhost:3001"
else
    echo -e "${YELLOW}⚠${NC} Hospital Service: Not responding"
fi

# Check Ambulance Service
if curl -s http://localhost:3002/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Ambulance Service: http://localhost:3002"
else
    echo -e "${YELLOW}⚠${NC} Ambulance Service: Not responding"
fi

# Check Validation Service
if curl -s http://localhost:3003/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Validation Service: http://localhost:3003"
else
    echo -e "${YELLOW}⚠${NC} Validation Service: Not responding"
fi

# Check Emergency Request Service
if curl -s http://localhost:3004/health > /dev/null; then
    echo -e "${GREEN}✓${NC} Emergency Request Service: http://localhost:3004"
else
    echo -e "${YELLOW}⚠${NC} Emergency Request Service: Not responding"
fi

# Check RabbitMQ
if curl -s http://localhost:15672 > /dev/null; then
    echo -e "${GREEN}✓${NC} RabbitMQ Management: http://localhost:15672 (citycare/citycare123)"
else
    echo -e "${YELLOW}⚠${NC} RabbitMQ Management: Not responding"
fi

# Check Admin Frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓${NC} Admin Frontend: http://localhost:3000"
else
    echo -e "${YELLOW}⚠${NC} Admin Frontend: Not responding"
fi

echo ""
echo -e "${GREEN}📊 Monitoring:${NC}"
echo "  • Grafana: http://localhost:3006 (admin/admin)"
echo "  • Prometheus: http://localhost:9090"
echo "  • Nginx Status: http://localhost:8080/nginx_status"
echo ""

echo -e "${BLUE}📈 Service Scaling:${NC}"
docker-compose ps | grep -E "(hospital-service|ambulance-service|emergency-request-service|validation-service|orchestrator-service)" | wc -l | xargs -I {} echo "  Running {} service instances"

echo ""
echo -e "${GREEN}✨ CityCare is ready!${NC}"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop all: docker-compose down"
echo ""
