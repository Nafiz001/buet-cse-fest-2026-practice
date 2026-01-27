#!/bin/bash

# CityCare Platform - Quick Start Script
# This script sets up and starts the entire platform

set -e

echo "=========================================="
echo "CityCare Emergency Platform - Quick Start"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    exit 1
fi

echo "✅ docker-compose is available"
echo ""

echo "📦 Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "🏥 Checking service health..."

services=("hospital-service:3001" "ambulance-service:3002" "validation-service:3003" "emergency-request-service:3004")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    
    if curl -s "http://localhost:$port/health" > /dev/null; then
        echo "  ✅ $name is healthy"
    else
        echo "  ⚠️  $name is not responding yet (may need more time)"
    fi
done

echo ""
echo "=========================================="
echo "✅ CityCare Platform is running!"
echo "=========================================="
echo ""
echo "Service URLs:"
echo "  🏥 Hospital Service:     http://localhost:3001"
echo "  🚑 Ambulance Service:    http://localhost:3002"
echo "  ✅ Validation Service:   http://localhost:3003"
echo "  🚨 Emergency Service:    http://localhost:3004"
echo ""
echo "Monitoring:"
echo "  📊 Prometheus:           http://localhost:9090"
echo "  📈 Grafana:              http://localhost:3000 (admin/admin)"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose down"
echo ""
echo "Happy hacking! 🚀"
