# CityCare Emergency Service Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A production-grade microservice system for national emergency response coordination.**

Built for BUET CSE Fest 2026 - Final Round Hackathon

---

## 🎯 Project Overview

CityCare is a mission-critical emergency response platform that coordinates:
- **Hospitals** (ICU bed availability)
- **Ambulances** (vehicle capacity and status)
- **Emergency Command Centers** (request validation and orchestration)

### Core Philosophy

**"Fail safely, reject impossible plans, never partially execute."**

This system prioritizes **reliability** and **correctness** over feature count. The Validation Service implements atomic decision-making without distributed transactions, ensuring emergency requests are either fully feasible or safely rejected.

---

## 🏗️ Architecture

### Microservice Design

```
┌─────────────────────────────────────────────────────────┐
│                  Emergency Request Service               │
│              (Orchestrator - Port 3004)                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │   Validation Service    │
         │  (Decision Maker - 3003)│
         └───────┬─────────┬───────┘
                 │         │
        ┌────────▼───┐  ┌──▼─────────┐
        │ Hospital   │  │ Ambulance  │
        │ Service    │  │ Service    │
        │ (3001)     │  │ (3002)     │
        └────────────┘  └────────────┘
```

### Service Responsibilities

| Service | Purpose | Database | Port |
|---------|---------|----------|------|
| **Hospital Service** | Manage hospital resources (ICU beds, ventilators) | PostgreSQL | 3001 |
| **Ambulance Service** | Track ambulance fleet (capacity, availability) | PostgreSQL | 3002 |
| **Validation Service** | **Core business logic** - atomic constraint validation | None | 3003 |
| **Emergency Request Service** | Orchestrate requests, delegate to Validation | PostgreSQL | 3004 |

---

## 🔑 Key Features

### ✅ Atomic Validation (No Distributed Transactions)

The **Validation Service** implements single-authority decision-making:

1. Fetch hospital data from Hospital Service
2. Fetch ambulance data from Ambulance Service
3. Validate **ALL** constraints together atomically
4. Return single APPROVE or REJECT decision

**If ANY constraint fails → entire request is rejected**  
**If ALL constraints pass → request is approved**

This prevents partial resource allocation without complex 2PC or saga patterns.

### 🔒 Fail-Safe Design

- Downstream service unavailable? **Reject the request.**
- Timeout during validation? **Reject the request.**
- Invalid response format? **Reject the request.**

We never guess. We validate or we reject.

### 📊 Production-Grade Observability

- **Structured logging** with Pino (request IDs, context)
- **Prometheus metrics** (request duration, success/failure rates)
- **Grafana dashboards** for real-time monitoring
- Health check endpoints on all services

### 🧪 Test Coverage

Comprehensive Jest unit tests for Validation Service covering:
- ✅ Approval scenarios
- ❌ Rejection scenarios (insufficient resources)
- 🚨 Downstream failure scenarios
- 🔄 Edge cases

### 🚀 CI/CD Pipeline

GitHub Actions workflows for all services:
- Install dependencies
- Run tests with coverage
- Build Docker images
- Deploy to Fly.io (optional)

---

## 🛠️ Tech Stack

### Backend
- **Node.js 20** (JavaScript, not TypeScript)
- **Express.js** (REST APIs)
- **Prisma ORM** (type-safe database access)
- **PostgreSQL** (one DB per service)

### Communication
- **Axios** for HTTP inter-service calls
- **REST only** (no gRPC, no message queues)

### DevOps
- **Docker** (multi-stage builds, non-root users, health checks)
- **Docker Compose** (local orchestration)
- **GitHub Actions** (automated testing and building)

### Observability
- **Pino** (structured JSON logging)
- **Prometheus** (metrics collection)
- **Grafana** (visualization dashboards)

### Testing
- **Jest** (unit tests with mocking)
- Focus on validation logic and failure scenarios

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/citycare.git
cd citycare
```

### 2. Start with Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

**Services will be available at:**
- Hospital Service: http://localhost:3001
- Ambulance Service: http://localhost:3002
- Validation Service: http://localhost:3003
- Emergency Request Service: http://localhost:3004
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### 3. Run Locally (Development)

#### Hospital Service

```bash
cd hospital-service
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

#### Ambulance Service

```bash
cd ambulance-service
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

#### Validation Service

```bash
cd validation-service
cp .env.example .env
npm install
npm run dev
```

#### Emergency Request Service

```bash
cd emergency-request-service
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

---

## 📡 API Documentation

### Hospital Service (Port 3001)

#### Create Hospital
```http
POST /hospitals
Content-Type: application/json

{
  "name": "Dhaka Medical College Hospital",
  "city": "dhaka",
  "icuBeds": 50,
  "ventilators": 30
}
```

#### Get Hospitals
```http
GET /hospitals?city=dhaka
```

---

### Ambulance Service (Port 3002)

#### Create Ambulance
```http
POST /ambulances
Content-Type: application/json

{
  "vehicleId": "AMB-001",
  "city": "dhaka",
  "capacity": 4,
  "status": "AVAILABLE"
}
```

#### Get Ambulances
```http
GET /ambulances?city=dhaka&status=AVAILABLE
```

---

### Validation Service (Port 3003) ⭐

#### Validate Emergency Request
```http
POST /validate
Content-Type: application/json

{
  "city": "dhaka",
  "requiredIcuBeds": 50,
  "requiredAmbulanceCapacity": 10
}
```

**Response (Approved):**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "city": "dhaka",
    "timestamp": "2026-01-27T10:30:00.000Z",
    "resources": {
      "icuBeds": {
        "required": 50,
        "available": 80,
        "sufficient": true
      },
      "ambulanceCapacity": {
        "required": 10,
        "available": 15,
        "sufficient": true
      }
    }
  }
}
```

**Response (Rejected):**
```json
{
  "success": true,
  "data": {
    "approved": false,
    "city": "dhaka",
    "reason": "INSUFFICIENT_RESOURCES",
    "message": "Insufficient ICU beds (need 50, have 20)",
    "resources": {
      "icuBeds": {
        "required": 50,
        "available": 20,
        "sufficient": false
      },
      "ambulanceCapacity": {
        "required": 10,
        "available": 15,
        "sufficient": true
      }
    }
  }
}
```

---

### Emergency Request Service (Port 3004)

#### Create Emergency Request
```http
POST /requests
Content-Type: application/json

{
  "city": "dhaka",
  "requiredIcuBeds": 50,
  "requiredAmbulanceCapacity": 10
}
```

#### Get Request by ID
```http
GET /requests/:id
```

#### Get All Requests
```http
GET /requests?city=dhaka&status=APPROVED&limit=50
```

---

## 🧪 Testing

### Run Validation Service Tests

```bash
cd validation-service
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

**Test Coverage Goals:**
- Branches: 70%+
- Functions: 80%+
- Lines: 80%+
- Statements: 80%+

---

## 📊 Monitoring & Observability

### Prometheus Metrics

Each service exposes `/metrics` endpoint with:
- HTTP request duration
- HTTP request count
- Service-specific metrics (e.g., validation results, resource counts)

**Access Prometheus:** http://localhost:9090

### Grafana Dashboards

Pre-configured dashboards for:
- Service health
- Request latency
- Error rates
- Resource availability

**Access Grafana:** http://localhost:3000 (admin/admin)

### Structured Logging

All services log in JSON format with:
- Request IDs for tracing
- Contextual information
- Error stack traces (development only)

---

## 🔧 Configuration

### Environment Variables

Each service uses `.env` files. See `.env.example` in each service directory.

**Key variables:**

```env
# Common
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# Database (Prisma services)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Service URLs (Validation & Emergency Request)
HOSPITAL_SERVICE_URL=http://localhost:3001
AMBULANCE_SERVICE_URL=http://localhost:3002
VALIDATION_SERVICE_URL=http://localhost:3003
REQUEST_TIMEOUT_MS=5000
```

---

## 🐳 Docker Commands

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Start specific service
docker-compose up hospital-service

# View logs
docker-compose logs -f validation-service

# Run migrations
docker-compose exec hospital-service npx prisma migrate deploy

# Access database
docker-compose exec hospital-db psql -U postgres -d hospital_db

# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

---

## 🚀 Deployment

### Azure VM with CI/CD (Recommended) ⭐

For automated deployment with GitHub Actions and Azure Virtual Machine, see:

**[.github/CI-CD.md](.github/CI-CD.md)**

This approach provides:
- ✅ Automated CI/CD pipeline with GitHub Actions
- ✅ Cost-effective Azure VM deployment
- ✅ Self-hosted runner configuration
- ✅ Automatic testing on PRs
- ✅ One-click deployment to production

### Azure Container Apps (Alternative)

For fully managed Azure deployment, see:

**[AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md)**

This approach provides:
- ✅ Fully managed containers
- ✅ Auto-scaling
- ✅ Production-grade infrastructure
- ❌ Higher cost

### Local Development

See the Quick Start section above for local Docker Compose setup.

---

## 📁 Project Structure

```
citycare/
├── hospital-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── .env.example
│
├── ambulance-service/       # Same structure
├── validation-service/       # Same structure (no Prisma)
├── emergency-request-service/ # Same structure
│
├── prometheus/
│   └── prometheus.yml
│
├── grafana/
│   └── dashboards/
│
├── .github/
│   └── workflows/
│       ├── hospital-service.yml
│       ├── ambulance-service.yml
│       ├── validation-service.yml
│       └── emergency-request-service.yml
│
├── docker-compose.yml
└── README.md
```

---

## 🎓 Design Decisions

### Why Microservices?

- **Separation of concerns**: Each service has single responsibility
- **Independent scaling**: Scale validation service separately
- **Independent deployment**: Update one service without affecting others
- **Team autonomy**: Different teams can own different services

### Why No Distributed Transactions?

Distributed transactions (2PC, sagas) add complexity and failure modes. Instead:

- **Single authority**: Validation Service makes all decisions
- **Atomic validation**: All constraints checked together
- **Fail-safe**: Reject on any uncertainty
- **Simple to reason about**: Easy to debug and explain to judges

### Why REST over gRPC?

- **Simplicity**: HTTP is universally understood
- **Debugging**: Easy to test with curl/Postman
- **Time constraints**: REST is faster to implement correctly
- **Sufficient performance**: No extreme latency requirements

### Why Pino over Winston?

- **Performance**: Pino is faster (JSON-first)
- **Structured logging**: Native JSON output
- **Modern**: Better async support
- **Production-ready**: Used in high-traffic systems

---

## 🤝 Contributing

This is a hackathon project, but improvements are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ for BUET CSE Fest 2026

---

## 🙏 Acknowledgments

- **BUET CSE Fest** for the inspiring challenge
- **Node.js & Express communities** for excellent tools
- **Prisma team** for the best ORM in JavaScript
- **Prometheus & Grafana** for making observability accessible

---

## 📞 Contact

For questions or support, please open an issue on GitHub.

---

**Remember:** This system protects lives. Reliability > Features.
