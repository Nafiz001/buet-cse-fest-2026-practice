#!/bin/bash

# CityCare Platform - Test Data Seed Script
# This script populates the system with sample data for testing

set -e

BASE_URL="http://localhost"

echo "=========================================="
echo "CityCare Platform - Seeding Test Data"
echo "=========================================="
echo ""

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

echo "🏥 Creating hospitals..."

# Dhaka Hospitals
curl -s -X POST "$BASE_URL:3001/hospitals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dhaka Medical College Hospital",
    "city": "dhaka",
    "icuBeds": 80,
    "ventilators": 40
  }' > /dev/null && echo "  ✅ Created: Dhaka Medical College Hospital"

curl -s -X POST "$BASE_URL:3001/hospitals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Square Hospital",
    "city": "dhaka",
    "icuBeds": 50,
    "ventilators": 30
  }' > /dev/null && echo "  ✅ Created: Square Hospital"

curl -s -X POST "$BASE_URL:3001/hospitals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "United Hospital",
    "city": "dhaka",
    "icuBeds": 60,
    "ventilators": 35
  }' > /dev/null && echo "  ✅ Created: United Hospital"

# Chittagong Hospitals
curl -s -X POST "$BASE_URL:3001/hospitals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chittagong Medical College",
    "city": "chittagong",
    "icuBeds": 70,
    "ventilators": 30
  }' > /dev/null && echo "  ✅ Created: Chittagong Medical College"

curl -s -X POST "$BASE_URL:3001/hospitals" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chevron Clinical Laboratory",
    "city": "chittagong",
    "icuBeds": 40,
    "ventilators": 20
  }' > /dev/null && echo "  ✅ Created: Chevron Clinical Laboratory"

echo ""
echo "🚑 Creating ambulances..."

# Dhaka Ambulances
for i in {1..5}; do
  curl -s -X POST "$BASE_URL:3002/ambulances" \
    -H "Content-Type: application/json" \
    -d "{
      \"vehicleId\": \"AMB-DH-00$i\",
      \"city\": \"dhaka\",
      \"capacity\": $((4 + RANDOM % 4)),
      \"status\": \"AVAILABLE\"
    }" > /dev/null && echo "  ✅ Created: AMB-DH-00$i (Dhaka)"
done

# Add some busy ambulances
for i in {6..7}; do
  curl -s -X POST "$BASE_URL:3002/ambulances" \
    -H "Content-Type: application/json" \
    -d "{
      \"vehicleId\": \"AMB-DH-00$i\",
      \"city\": \"dhaka\",
      \"capacity\": 4,
      \"status\": \"BUSY\"
    }" > /dev/null && echo "  ✅ Created: AMB-DH-00$i (Dhaka - BUSY)"
done

# Chittagong Ambulances
for i in {1..3}; do
  curl -s -X POST "$BASE_URL:3002/ambulances" \
    -H "Content-Type: application/json" \
    -d "{
      \"vehicleId\": \"AMB-CTG-00$i\",
      \"city\": \"chittagong\",
      \"capacity\": $((4 + RANDOM % 4)),
      \"status\": \"AVAILABLE\"
    }" > /dev/null && echo "  ✅ Created: AMB-CTG-00$i (Chittagong)"
done

echo ""
echo "🚨 Creating sample emergency requests..."

# Approved request
curl -s -X POST "$BASE_URL:3004/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 15
  }' > /dev/null && echo "  ✅ Created: Emergency request (should be APPROVED)"

# Rejected request (too many ICU beds)
curl -s -X POST "$BASE_URL:3004/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 500,
    "requiredAmbulanceCapacity": 10
  }' > /dev/null && echo "  ✅ Created: Emergency request (should be REJECTED - insufficient ICU)"

# Another approved request
curl -s -X POST "$BASE_URL:3004/requests" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "chittagong",
    "requiredIcuBeds": 60,
    "requiredAmbulanceCapacity": 8
  }' > /dev/null && echo "  ✅ Created: Emergency request (should be APPROVED)"

echo ""
echo "=========================================="
echo "✅ Test data seeded successfully!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  🏥 Hospitals: 5 (3 in Dhaka, 2 in Chittagong)"
echo "  🚑 Ambulances: 10 (7 in Dhaka, 3 in Chittagong)"
echo "  🚨 Emergency Requests: 3 (2 APPROVED, 1 REJECTED)"
echo ""
echo "View data:"
echo "  curl $BASE_URL:3001/hospitals | jq"
echo "  curl $BASE_URL:3002/ambulances | jq"
echo "  curl $BASE_URL:3004/requests | jq"
echo ""
