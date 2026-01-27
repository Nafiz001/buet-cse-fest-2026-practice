# CityCare Platform - API Usage Examples

This guide provides practical examples of using the CityCare Emergency Platform APIs.

---

## Prerequisites

Make sure all services are running:

```bash
docker-compose up -d
```

---

## Complete Workflow Example

### Step 1: Set Up Hospitals

```bash
# Add Hospital in Dhaka
curl -X POST http://localhost:3001/hospitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dhaka Medical College Hospital",
    "city": "dhaka",
    "icuBeds": 80,
    "ventilators": 40
  }'

# Add Another Hospital in Dhaka
curl -X POST http://localhost:3001/hospitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Square Hospital",
    "city": "dhaka",
    "icuBeds": 50,
    "ventilators": 30
  }'

# Add Hospital in Chittagong
curl -X POST http://localhost:3001/hospitals \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chittagong Medical College",
    "city": "chittagong",
    "icuBeds": 60,
    "ventilators": 25
  }'

# List All Hospitals in Dhaka
curl http://localhost:3001/hospitals?city=dhaka
```

---

### Step 2: Set Up Ambulances

```bash
# Add Available Ambulances in Dhaka
curl -X POST http://localhost:3002/ambulances \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "AMB-DH-001",
    "city": "dhaka",
    "capacity": 4,
    "status": "AVAILABLE"
  }'

curl -X POST http://localhost:3002/ambulances \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "AMB-DH-002",
    "city": "dhaka",
    "capacity": 6,
    "status": "AVAILABLE"
  }'

# Add Busy Ambulance (won't be used in validation)
curl -X POST http://localhost:3002/ambulances \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "AMB-DH-003",
    "city": "dhaka",
    "capacity": 4,
    "status": "BUSY"
  }'

# Add Ambulance in Chittagong
curl -X POST http://localhost:3002/ambulances \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "AMB-CTG-001",
    "city": "chittagong",
    "capacity": 5,
    "status": "AVAILABLE"
  }'

# List Available Ambulances in Dhaka
curl "http://localhost:3002/ambulances?city=dhaka&status=AVAILABLE"
```

---

### Step 3: Test Validation Service Directly

```bash
# Test Case 1: Should APPROVE (resources sufficient)
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 8
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "approved": true,
#     "city": "dhaka",
#     "resources": {
#       "icuBeds": {
#         "required": 50,
#         "available": 130,
#         "sufficient": true
#       },
#       "ambulanceCapacity": {
#         "required": 8,
#         "available": 10,
#         "sufficient": true
#       }
#     }
#   }
# }

# Test Case 2: Should REJECT (insufficient ICU beds)
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 200,
    "requiredAmbulanceCapacity": 5
  }'

# Test Case 3: Should REJECT (insufficient ambulance capacity)
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 50
  }'

# Test Case 4: Should REJECT (no resources in city)
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "sylhet",
    "requiredIcuBeds": 10,
    "requiredAmbulanceCapacity": 5
  }'
```

---

### Step 4: Create Emergency Requests (Full Workflow)

```bash
# Request 1: Should be APPROVED
curl -X POST http://localhost:3004/requests \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 8
  }' | jq

# Save the ID from response for later
REQUEST_ID_1="<id-from-response>"

# Request 2: Should be REJECTED (insufficient resources)
curl -X POST http://localhost:3004/requests \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 200,
    "requiredAmbulanceCapacity": 8
  }' | jq

# Request 3: Feasible request in Chittagong
curl -X POST http://localhost:3004/requests \
  -H "Content-Type: application/json" \
  -d '{
    "city": "chittagong",
    "requiredIcuBeds": 30,
    "requiredAmbulanceCapacity": 4
  }' | jq
```

---

### Step 5: Query Emergency Requests

```bash
# Get specific request by ID
curl http://localhost:3004/requests/$REQUEST_ID_1 | jq

# Get all requests
curl http://localhost:3004/requests | jq

# Get only APPROVED requests
curl "http://localhost:3004/requests?status=APPROVED" | jq

# Get only REJECTED requests
curl "http://localhost:3004/requests?status=REJECTED" | jq

# Get requests for specific city
curl "http://localhost:3004/requests?city=dhaka" | jq

# Limit results
curl "http://localhost:3004/requests?limit=10" | jq
```

---

## Health Checks

```bash
# Check all services
curl http://localhost:3001/health | jq
curl http://localhost:3002/health | jq
curl http://localhost:3003/health | jq
curl http://localhost:3004/health | jq
```

---

## Metrics

```bash
# Get Prometheus metrics from each service
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics
curl http://localhost:3003/metrics
curl http://localhost:3004/metrics

# Access Prometheus UI
open http://localhost:9090

# Access Grafana
open http://localhost:3000
# Login: admin / admin
```

---

## Testing Failure Scenarios

### Test 1: Stop Hospital Service (Validation should fail safely)

```bash
# Stop hospital service
docker-compose stop hospital-service

# Try validation (should reject with DOWNSTREAM_SERVICE_UNAVAILABLE)
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 8
  }' | jq

# Restart hospital service
docker-compose start hospital-service

# Wait for health check, then retry validation
sleep 5
curl -X POST http://localhost:3003/validate \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": 50,
    "requiredAmbulanceCapacity": 8
  }' | jq
```

### Test 2: Invalid Input Handling

```bash
# Missing required fields
curl -X POST http://localhost:3004/requests \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka"
  }' | jq

# Negative values
curl -X POST http://localhost:3004/requests \
  -H "Content-Type: application/json" \
  -d '{
    "city": "dhaka",
    "requiredIcuBeds": -10,
    "requiredAmbulanceCapacity": 5
  }' | jq
```

---

## Load Testing (Optional)

Using Apache Bench:

```bash
# Install Apache Bench
# Ubuntu: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Create a test payload file
echo '{"city":"dhaka","requiredIcuBeds":50,"requiredAmbulanceCapacity":8}' > payload.json

# Run load test on Validation Service
ab -n 1000 -c 10 -p payload.json -T application/json \
  http://localhost:3003/validate

# Check Prometheus metrics after load test
curl http://localhost:3003/metrics | grep validation
```

---

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

---

## PowerShell Examples (Windows)

```powershell
# Create Hospital
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/hospitals" `
  -ContentType "application/json" `
  -Body '{"name":"Dhaka Medical","city":"dhaka","icuBeds":80,"ventilators":40}'

# Get Hospitals
Invoke-RestMethod -Uri "http://localhost:3001/hospitals?city=dhaka"

# Create Emergency Request
Invoke-RestMethod -Method Post -Uri "http://localhost:3004/requests" `
  -ContentType "application/json" `
  -Body '{"city":"dhaka","requiredIcuBeds":50,"requiredAmbulanceCapacity":8}'

# Get All Requests
Invoke-RestMethod -Uri "http://localhost:3004/requests"
```

---

## Postman Collection

Import these endpoints into Postman:

1. Create a new collection "CityCare Platform"
2. Add requests for each endpoint shown above
3. Set base URL as variable: `{{base_url}}` = `http://localhost`
4. Use `{{base_url}}:3001`, `{{base_url}}:3002`, etc.

---

## Next Steps

1. Monitor services in Grafana: http://localhost:3000
2. Query metrics in Prometheus: http://localhost:9090
3. Run the test suite: `cd validation-service && npm test`
4. Check CI pipeline in GitHub Actions

---

**Remember:** The Validation Service is the heart of the system. All decisions flow through it!
