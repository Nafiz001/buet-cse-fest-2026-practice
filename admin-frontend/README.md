# CityCare Admin Frontend

Admin console for the CityCare Emergency Service Platform.

## Features

- **Dashboard**: Overview and navigation
- **Hospital Management**: Create and view hospitals with ICU bed capacity
- **Ambulance Management**: Track ambulances and their availability
- **Emergency Requests**: Submit and validate emergency resource requests

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- Axios for API calls

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your backend service URLs.

3. Run development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Docker

Build and run with Docker:

```bash
docker build -t citycare-admin-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_HOSPITAL_API_URL=http://hospital-service:3001 \
  -e NEXT_PUBLIC_AMBULANCE_API_URL=http://ambulance-service:3002 \
  -e NEXT_PUBLIC_REQUEST_API_URL=http://emergency-request-service:3004 \
  citycare-admin-frontend
```

## Architecture

This is a thin admin layer that:
- Displays backend responses
- Never duplicates business logic
- Respects backend validation decisions
- Handles errors gracefully

All critical validation and decision-making happens in backend microservices.
