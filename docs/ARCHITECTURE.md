# GeoNest Architecture

## High-Level Diagram
```
User → Frontend (React + Vite) → Backend (Express + TypeScript) → MongoDB Atlas
```

## Data Flow
1. User interacts with React frontend
2. Frontend makes API calls to backend
3. Backend validates requests, interacts with MongoDB
4. Backend sends JSON responses back to frontend

## Current Phase
This phase implements only authentication and user model. Geospatial features, ML recommendations, and other advanced features are reserved for later phases.

## API Endpoints (Auth)

### Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "password123",
    "role": "student"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

### Get Current User
```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

### Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -b cookies.txt
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b cookies.txt -c cookies.txt
```
