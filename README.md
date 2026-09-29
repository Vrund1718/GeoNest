# GeoNest — Smart PG Recommendation & Accommodation Management System

GeoNest is a full-stack web application for discovering, reviewing, and managing Paying Guest (PG) accommodations with real-time geospatial search, AI voice search, intelligent chat assistance, and multi-factor recommendation scoring.

Live Demo: [https://geonest-alpha.vercel.app](https://geonest-alpha.vercel.app)

---

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, React Router 6, Tailwind CSS, Axios, Leaflet (react-leaflet), Lucide Icons, react-hot-toast, react-helmet-async, i18next
- **Backend**: Node.js, Express, TypeScript, MongoDB & Mongoose (2dsphere geospatial indexing), JWT (httpOnly cookies), bcryptjs, Multer / Cloudinary, Helmet, Express Rate Limit
- **AI & Integrations**: Web Speech API, Google Gemini / OpenAI API for natural language search parsing and AI chat assistant, OpenRouteService for commute estimation

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB instance running locally (`mongodb://localhost:27017/smart-pg-db`) or a MongoDB Atlas URI

### 1. Backend Setup
```bash
cd backend
cp .env.example .env
npm install
npm run seed     # Seeds demo users and PG listings around Ahmedabad
npm run dev      # Runs API server on http://localhost:5000
```

> [!NOTE]
> **Demo Accounts (Local Development Only)**:
> Password for all seed accounts: `StrongPass1`
> - **Admin**: `admin@smartpg.local`
> - **Owners**: `rajesh@smartpg.local`, `priya@smartpg.local`, `ajay@smartpg.local`
> - **Students**: `aarav@smartpg.local`, `diya@smartpg.local`, `aditya@smartpg.local`

### 2. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev      # Runs dev server on http://localhost:5173
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment Variables

### Frontend (`frontend/.env`)
| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | *(empty)* | Optional production backend API base URL (e.g., `https://geonest-backend.onrender.com`). If left empty, requests default to relative `/api` proxied by Vite dev server. |

### Backend (`backend/.env`)
| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `5000` | Server listening port |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `MONGODB_URI` | `mongodb://localhost:27017/smart-pg-db` | MongoDB connection URI |
| `JWT_ACCESS_SECRET` | `dev-access-secret` | Secret key for JWT access tokens (**Must be customized in production**) |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret` | Secret key for JWT refresh tokens (**Must be customized in production**) |
| `ACCESS_TOKEN_TTL_MIN` | `15` | Access token lifespan in minutes |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifespan in days |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed origin for CORS (comma-separated if multiple) |
| `CLOUDINARY_CLOUD_NAME` | *(optional)* | Cloudinary cloud name for cloud image uploads |
| `CLOUDINARY_API_KEY` | *(optional)* | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | *(optional)* | Cloudinary API secret |
| `AI_PROVIDER` | `gemini` | LLM provider (`gemini` or `openai`) |
| `AI_API_KEY` | *(optional)* | API key for AI features (Voice NLP search & Chat Assistant) |
| `ORS_API_KEY` | *(optional)* | OpenRouteService API key for walking/driving commute estimation |

---

## Production Security Controls

- In production (`NODE_ENV=production`), the backend refuses to start if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` use default development secrets.
- Authentication cookies use `sameSite: 'none'` and `secure: true` in production to support cross-origin frontend/backend deployments.
- Rate limiting is enforced on auth routes, search endpoints, and AI endpoints.

---

## Verification & Scripts

### Backend Commands
- `npm run dev`: Run server with hot reload
- `npm run seed`: Populate database with sample PGs and accounts
- `npm run build`: Compile TypeScript into `dist/`
- `npm run lint`: Perform type checking (`tsc --noEmit`)

### Frontend Commands
- `npm run dev`: Launch Vite dev server
- `npm run build`: Compile TypeScript and build production bundle
- `npm run lint`: Perform type checking (`tsc --noEmit`)
