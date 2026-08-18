# Smart PG Recommendation & Accommodation Management System

A production-quality full-stack web application for finding, listing, and managing Paying Guest (PG) accommodations.

## Stack
- **Frontend:** React 18 + Vite, TypeScript, React Router 6, Tailwind CSS, Axios, Leaflet.js (react-leaflet)
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (local or Atlas) via Mongoose, native `2dsphere` geospatial indexes
- **Auth:** JWT (short-lived access ~15 min + long-lived refresh ~7 days) stored in `httpOnly` cookies, `bcryptjs` passwords
- **Image storage:** Cloudinary (if env vars set), otherwise local `/uploads` via `multer`
- **Geocoding:** Nominatim (OpenStreetMap) free API with built-in fallback for "Nirma University", "Ahmedabad", etc.
- **Nearby places:** Overpass API with deterministic fallback data

## Quick start

### 0. Prerequisites
- Node.js 18+
- MongoDB (local default: `mongodb://localhost:27017/smart-pg-db`) — or a MongoDB Atlas URI

### 1. Backend
```bash
cd backend
cp .env.example .env       # edit as needed
npm install
npm run seed               # creates demo users + 15 PGs around Ahmedabad
npm run dev                # runs on http://localhost:5000
```

**Seed credentials** (password: `StrongPass1`):
- Admin — `admin@smartpg.local`
- Owners — `rajesh@smartpg.local`, `priya@smartpg.local`, `ajay@smartpg.local`
- Students — `aarav@smartpg.local`, `diya@smartpg.local`, `aditya@smartpg.local`, `sneha@smartpg.local`, `rohan@smartpg.local`, `neha@smartpg.local`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                # runs on http://localhost:5173
```
Open http://localhost:5173 — the Vite dev server proxies `/api` to the backend.

### 3. Enable Cloudinary (optional)
Fill `CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET` in `backend/.env`. If unset, images fall back to `backend/uploads/` served at `/uploads`.

## Environment variables (backend)
| Name | Default | Description |
| --- | --- | --- |
| `PORT` | 5000 | Backend port |
| `MONGODB_URI` | `mongodb://localhost:27017/smart-pg-db` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | (dev default) | Short-lived access token signing key |
| `JWT_REFRESH_SECRET` | (dev default) | Long-lived refresh token signing key |
| `ACCESS_TOKEN_TTL_MIN` | 15 | Access token TTL (minutes) |
| `REFRESH_TOKEN_TTL_DAYS` | 7 | Refresh token TTL (days) |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `CLOUDINARY_CLOUD_NAME` | — | If set together with key/secret, enables Cloudinary |
| `CLOUDINARY_API_KEY` | — | Cloudinary key |
| `CLOUDINARY_API_SECRET` | — | Cloudinary secret |

## Scripts
**Backend**
- `npm run dev` — start dev server with ts-node-dev
- `npm run seed` — seed demo data
- `npm run build` — compile TS to `dist/`
- `npm start` — run compiled `dist/server.js`

**Frontend**
- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
