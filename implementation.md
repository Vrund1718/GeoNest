# AI-Based Smart PG Recommendation and Accommodation Management System
## Step-by-Step Implementation Plan

> Target: Production-quality final-year project with geospatial search + AI recommendation.

---

## 0. Project Setup & Documentation

### 0.1. Initialize Repositories
- Create GitHub repository: `smart-pg-recommender`.
- Create folders:
  - `/frontend`
  - `/backend`
  - `/ml`
  - `/infra` (Docker, Nginx, CI/CD)
  - `/docs` (architecture, ER diagrams, API docs)

### 0.2. Base Documentation
- Add `README.md` describing:
  - Problem statement
  - Core features
  - Tech stack (React, Node.js/FastAPI, PostgreSQL + PostGIS, Leaflet/MapLibre, JWT)
- Add `PROJECT_PLAN.md` (this file).
- Add `ARCHITECTURE.md`:
  - High-level diagram + data flow (User → Frontend → Backend → DB + ML + Maps).

---

## 1. Authentication & User Model (Login → Signup → Dashboard Shell)

### 1.1. Backend: Auth Basics
- Set up backend framework:
  - Option A: Node.js + Express + TypeScript.
  - Option B: FastAPI (Python) for cleaner ML integration.
- Configure database connection (PostgreSQL).
- Create base tables:
  - `users` (id, name, email, phone, hashed_password, role, created_at, updated_at).
  - `roles`: `student`, `owner`, `admin`.
- Implement:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `GET /auth/me` (returns user profile).
- Use:
  - JWT for stateless auth (access + refresh tokens).
  - Password hashing (e.g., bcrypt/argon2).
- Add basic validation (email format, strong password).

### 1.2. Frontend: Auth Pages
- Create page: `LoginPage`:
  - Email, password fields.
  - Role selection (optional during signup).
- Create page: `SignupPage`:
  - Name, email, phone, password, confirm password, role.
- Implement:
  - Client-side validation.
  - API integration with `/auth/signup` and `/auth/login`.
  - Store JWT in `httpOnly` cookie or secure storage.
- Routing:
  - Public routes: `/login`, `/signup`.
  - Protected routes: `/dashboard/student`, `/dashboard/owner`, `/dashboard/admin`.

### 1.3. Basic Dashboards Shell
- Create base layout components:
  - `StudentDashboardLayout`
  - `OwnerDashboardLayout`
  - `AdminDashboardLayout`
- Each layout includes:
  - Sidebar (links to main pages).
  - Top navbar (profile, notifications icon, logout).
- Pages (empty placeholders for now):
  - Student: `SearchPage`, `PGDetailsPage`, `WishlistPage`, `BookingPage`, `ComplaintPage`, `NotificationsPage`, `ProfilePage`.
  - Owner: `OwnerPGListPage`, `OwnerPGFormPage`, `OwnerBookingRequestsPage`, `OwnerComplaintsPage`.
  - Admin: `AdminOverviewPage`, `AdminUsersPage`, `AdminPGVerificationPage`, `AdminComplaintsPage`.

---

## 2. Core Database Design & ER Implementation

### 2.1. Implement Main Tables
In PostgreSQL:

- `users`
- `owners` (FK `user_id`, owner-specific details).
- `pg_listings`:
  - id, owner_id, name, address, latitude, longitude, city, college_name (optional), total_rooms, available_rooms, gender_preference, price_per_month, security_deposit, is_verified, status, created_at, updated_at.
- `amenities`:
  - id, name, category.
- `pg_amenities` (junction table):
  - pg_id, amenity_id.
- `images`:
  - id, pg_id, url, is_primary, uploaded_by, created_at.
- `reviews`:
  - id, pg_id, user_id, rating, text, sentiment_score (nullable initially), is_flagged_fake (nullable), created_at.
- `bookings`:
  - id, pg_id, user_id, status (requested/confirmed/cancelled/completed), start_date, end_date, created_at.
- `wishlists`:
  - id, user_id, pg_id, created_at.
- `complaints`:
  - id, user_id, pg_id, type, description, status, created_at, resolved_at.
- `notifications`:
  - id, user_id, type, title, body, is_read, created_at.
- `nearby_places`:
  - id, pg_id, place_type (hospital, atm, gym, etc.), name, latitude, longitude, distance_meters, created_at.
- `recommendation_logs`:
  - id, user_id, pg_id, score, algorithm_version, created_at.

### 2.2. Relationships & Indexes
- Foreign keys:
  - `owners.user_id → users.id`
  - `pg_listings.owner_id → owners.id`
  - `reviews.pg_id → pg_listings.id`, `reviews.user_id → users.id`
  - etc.
- Indexes:
  - `pg_listings`:
    - Index on `(city, college_name)`.
    - PostGIS spatial index on `geom` (POINT from latitude/longitude).
  - `reviews`:
    - Index on `(pg_id, rating)`.
  - `bookings`:
    - Index on `(pg_id, status)` for vacancy calculation.
- Normalization:
  - Ensure repeating data (amenities, places) is in separate tables.
- Add ER diagram to `docs/ERD.png` and refer to it in `ARCHITECTURE.md`.

---

## 3. Owner Panel: PG CRUD & Image Upload

### 3.1. Backend: Owner APIs
- `POST /owners/pg`:
  - Create new PG listing (owner-only).
- `GET /owners/pg`:
  - List PGs for logged-in owner.
- `GET /owners/pg/:id`:
  - Get single PG details.
- `PUT /owners/pg/:id`:
  - Update PG details.
- `DELETE /owners/pg/:id`:
  - Soft delete or deactivate PG.
- `POST /owners/pg/:id/images`:
  - Upload images (multipart/form-data).
  - Store in cloud storage (e.g. Cloudinary/S3-like service).
  - Save URL in `images` table.
- Validation:
  - Only owners can access these endpoints.
  - Size/type checks on images.

### 3.2. Frontend: Owner Dashboard Pages
- `OwnerPGListPage`:
  - Table of PGs with basic info + status.
- `OwnerPGFormPage`:
  - Multi-step form: Basic info, Price & capacity, Location (map picker), Amenities, Images.
- Image upload component:
  - Preview + progress bar.
- Map picker:
  - Use Leaflet/MapLibre to select location; store coordinates.

---

## 4. Admin Panel: Verification & Moderation

### 4.1. Backend: Admin APIs
- `GET /admin/pg/pending`:
  - List PGs awaiting verification.
- `PUT /admin/pg/:id/verify`:
  - Mark PG as verified/approved.
- `GET /admin/complaints`:
  - List complaints.
- `PUT /admin/complaints/:id`:
  - Update status (in-progress, resolved).
- `GET /admin/users`:
  - List users (filters by role, active/inactive).

### 4.2. Frontend: Admin Pages
- `AdminOverviewPage`:
  - Simple metrics: total users, PGs, pending verifications, complaints.
- `AdminPGVerificationPage`:
  - Table of PGs pending verification + approve/reject actions.
- `AdminComplaintsPage`:
  - Complaints with filter by status.

---

## 5. Maps & Geolocation Integration (Search Workflow Skeleton)

### 5.1. Backend: Geospatial Capabilities
- Enable PostGIS extension.
- Add `geom` column to `pg_listings`:
  - Type: `GEOMETRY(Point, 4326)` representing latitude/longitude.
- On PG creation/update:
  - Convert lat/long to `geom`.
- Implement helper functions:
  - `find_pg_within_radius(center_lat, center_lng, radius_km)` using PostGIS `ST_DWithin`.

### 5.2. Frontend: Map Components
- Integrate Leaflet or MapLibre:
  - Map component for Search results (`MapPage`).
  - Markers for PG locations.
- Basic map features:
  - Pan, zoom.
  - Click marker → show PG card.

### 5.3. Geocoding & College/City Search
- Decide geocoding approach:
  - Option A: Use external API (e.g., Nominatim/OpenStreetMap for free geocoding).
  - Option B: Pre-store major colleges/cities with coordinates.
- Implement backend endpoint:
  - `GET /geo/search?query=Nirma+University`
    - Returns coordinates and standardized name.
- Integrate into `SearchPage`:
  - User types college/city.
  - Call `/geo/search`.
  - Store center coordinates in state.

---

## 6. Search & Filter System (Core User Feature)

### 6.1. Backend: Search API
- `GET /pg/search`:
  - Query params:
    - `query` (college/city name)
    - `radius_km`
    - `min_price`, `max_price`
    - `gender_preference`
    - `amenities` (comma-separated IDs)
    - `sort_by` (distance, price, rating, popularity)
  - Steps:
    1. Geocode `query` → center coordinates.
    2. Use PostGIS to find PGs within `radius_km`.
    3. Filter by price, gender, amenities.
    4. Exclude PGs with zero `available_rooms`.
    5. Order by default ranking (basic version before ML).

### 6.2. Frontend: Search & Results Pages
- `SearchPage`:
  - Components:
    - Search bar (college/city).
    - Filters panel (price range slider, gender, amenities).
    - Button: `Search`.
  - On submit:
    - Call `/pg/search`.
    - Navigate to `MapPage` with results.
- `MapPage`:
  - Map view + list view (cards) side by side.
  - Each card:
    - Name, price, rating, distance, key amenities.
    - Click → `PGDetailsPage`.

---

## 7. PG Details, Booking, Wishlist & Reviews

### 7.1. Backend: PG Details & Booking APIs
- `GET /pg/:id`:
  - Returns PG details, amenities, images, nearby_places, aggregated rating.
- `POST /pg/:id/book`:
  - Create booking request by student.
- `GET /bookings/me`:
  - List bookings for logged-in user.
- `POST /pg/:id/wishlist`:
  - Add PG to wishlist.
- `GET /wishlist/me`:
  - Get wishlist items.
- `POST /pg/:id/reviews`:
  - Add review (rating + text).
- `GET /pg/:id/reviews`:
  - List reviews.

### 7.2. Frontend: PG Details Flow
- `PGDetailsPage`:
  - Sections:
    - Images gallery.
    - Price & capacity.
    - Amenities list.
    - Map with PG location.
    - Nearby places (simple list).
    - Reviews section.
    - Buttons: `Book`, `Add to Wishlist`, `Complain`.
- `BookingPage`:
  - Shows booking requests + their statuses.
- `WishlistPage`:
  - List of PGs saved by the user.
- Review form component:
  - Rating stars + text area.

---

## 8. Nearby Places Discovery (Location Intelligence)

### 8.1. Backend: Nearby Places Module
- Choose API:
  - Option A: OpenStreetMap + Overpass API (free, some limits).
  - Option B: Google Places API (paid tier after free trial).
- Implement service:
  - For each PG, when created/verified:
    - Call Overpass/Places API for types:
      - hospital, atm, gym, restaurant, medical_store, bus_stop, metro_station, police_station.
    - Store results in `nearby_places` table.
- Add endpoint:
  - `GET /pg/:id/nearby-places`
    - Returns all places categorized by type.

### 8.2. Frontend: Nearby Places Display
- In `PGDetailsPage`:
  - Section with icons and distance (e.g., “Hospital: 0.8 km”).
- On map:
  - Optional: toggle to show nearby places markers.

---

## 9. Notifications & Complaints

### 9.1. Backend: Notifications
- Implement notification creation:
  - On booking request, confirmation, cancellation, admin verification, complaint status change.
- Endpoints:
  - `GET /notifications`
  - `PUT /notifications/:id/read`
- Consider simple email integration (optional).

### 9.2. Backend: Complaints
- `POST /pg/:id/complaints`:
  - Student submits complaint.
- `GET /complaints/me`:
  - Student views own complaints.
- Owner/Admin views complaints via their panels (already planned in steps 3 & 4).

### 9.3. Frontend: Complaints & Notifications Pages
- `ComplaintPage`:
  - Form + list of user’s complaints.
- `NotificationsPage`:
  - List of notifications with read/unread state.

---

## 10. Recommendation Engine (Phase 1: Rule-Based + Scoring)

### 10.1. Backend: Basic Recommendation API
- `GET /recommendations`:
  - Input:
    - User id (from token).
    - Optional: current location, preferred college.
  - Logic (rule-based initial version):
    - Use user’s past bookings, wishlists, ratings to infer:
      - Preferred price range.
      - Preferred amenities.
      - Preferred distance range.
    - Calculate a score for each candidate PG:
      - `score = w1*distance_score + w2*price_score + w3*amenities_score + w4*rating_score + w5*popularity_score + w6*freshness_score`.
    - Return top N PGs.

### 10.2. Frontend: Recommendation UI
- In `StudentDashboardLayout`:
  - Section: “Recommended PGs for you”.
  - Cards with PG suggestions based on the recommendation API.

---

## 11. ML Modules (Phase 2: Offline Training in /ml)

> Begin once core app features are stable.

### 11.1. ML Environment Setup
- Create `/ml` folder with:
  - `price_prediction.ipynb`
  - `vacancy_prediction.ipynb`
  - `popularity_prediction.ipynb`
  - `sentiment_analysis.ipynb`
  - `fake_review_detection.ipynb`
  - `recommendation_model.ipynb`
- Use Python with libraries:
  - pandas, scikit-learn, numpy, matplotlib, nltk/spaCy, transformers (for advanced NLP).

### 11.2. Data Extraction Scripts
- Backend or ETL scripts:
  - Export PG, bookings, reviews data from PostgreSQL to CSV.
- Basic datasets:
  - Price prediction:
    - Features: location features (distance to colleges/hospitals, city), amenities count, room type.
  - Vacancy prediction:
    - Features: bookings history, seasonality (month), popularity scores.
  - Sentiment:
    - Review texts, ratings.
  - Fake review detection:
    - Linguistic patterns from reviews + behavior features (review frequency, length, suspicious accounts).[web:4][web:5][web:9]

### 11.3. Model Training & Evaluation
- For each module:
  - Train baseline models (e.g., RandomForest, XGBoost).
  - Evaluate via cross-validation.
  - Save models as serialized files (e.g., `.pkl` using joblib).

### 11.4. ML Service Integration
- Build small ML microservice (FastAPI or Flask) exposing:
  - `/ml/sentiment` (POST review text → sentiment score).
  - `/ml/recommendation` (POST user profile + candidate PGs → ranked list).
- Deploy service separately and call from main backend.

---

## 12. Ranking Formula (Phase 3: Real Scoring)

### 12.1. Define Rank Score Components
- Implement in backend:
  - Distance score: inverse function of distance (closer = higher).
  - Price score: match user’s budget; penalize too expensive.
  - Amenities score: count of matched preferred amenities.
  - Safety score: derived from area statistics (if available) or owner verification.
  - Ratings score: average rating + sentiment.
  - Popularity score: bookings count, views, wishlists.
  - Freshness score: recently added or recently updated PGs.
- Composite formula:
  - `final_score = Σ (w_i * normalized_component_i)`
  - Tune weights manually at first; later with ML ideas from recommendation papers.[web:7][web:8][web:10]

### 12.2. Integrate Rank Formula
- Use rank score in:
  - `/pg/search` default sort.
  - `/recommendations` personalized sort.

---

## 13. Advanced Features (Optional but Impressive)

### 13.1. AI Chatbot & Voice Search
- Chatbot:
  - Provide Q&A on PG search (“Find PGs within 5 km of Nirma University under ₹8000 with AC.”).
  - Use intent detection + call existing search API.
- Voice search:
  - Simple integration with browser speech recognition; convert speech to text → search query.

### 13.2. Roommate Matching
- Algorithm:
  - Compare user preferences (budget, college, lifestyle tags) with other users looking for PGs.
- UI:
  - Page: `RoommateMatchingPage` with suggestions.

### 13.3. Heatmaps & Demand Forecasting
- Map heatmap:
  - Visualize demand (views/bookings) across areas.
- Demand forecasting:
  - Predict high-demand zones using bookings and location data (basic ML regression).

### 13.4. Scam & Owner Verification
- Owner verification:
  - Require government ID upload; admin verifies.
- Scam indicators:
  - Flag PGs with suspicious patterns (too good pricing, inconsistent reviews).

---

## 14. Security Hardening

### 14.1. Backend Security
- Implement middleware for:
  - Rate limiting on search/recommendation endpoints.
  - Input validation to prevent SQL injection, XSS.
- Use `helmet`-like security headers, CSRF protection on sensitive endpoints.
- File upload checks:
  - Only image MIME types.
  - Size limit.

### 14.2. Auth & JWT
- Short-lived access tokens, long-lived refresh tokens.
- Ensure logout invalidates tokens (via blacklist or token versioning).

---

## 15. Testing Strategy

### 15.1. Unit Tests
- Backend:
  - Test services (e.g., geospatial queries, ranking formula).
- Frontend:
  - Test critical components (forms, search flow).

### 15.2. Integration & API Testing
- Use Postman or automated tests:
  - Auth flow.
  - PG CRUD.
  - Search & recommendation.
  - Bookings, reviews.

### 15.3. Load & Performance Testing
- Simulate:
  - Search operations under 100, 1,000, 10,000 users.
- Monitor:
  - Response time, CPU, memory.

### 15.4. Recommendation Accuracy Testing
- Offline:
  - Compare recommendation lists vs. actual user choices (bookings, clicks).
- Report:
  - Precision@k, recall@k (basic metrics).

---

## 16. Deployment & DevOps

### 16.1. Containerization
- Create Dockerfiles for:
  - Frontend (React build).
  - Backend (Node.js/FastAPI).
  - ML service (FastAPI).
- Docker Compose:
  - `frontend`, `backend`, `ml`, `db`.

### 16.2. Nginx Reverse Proxy
- Configure Nginx:
  - Route `/api` → backend.
  - Route `/ml` → ML service.
  - Serve frontend static files.

### 16.3. Cloud Hosting
- Option A: Free/low-cost:
  - Render/Fly.io for backend.
  - Railway/Neon for PostgreSQL.
  - Netlify/Vercel for frontend.
- Option B: Single VPS (e.g., DigitalOcean):
  - Deploy Docker Compose stack.
- Setup CI/CD:
  - GitHub Actions for build + basic tests.

---

## 17. Scalability Considerations

### 17.1. For 10k–1M Users
- Caching:
  - Cache geocoding results.
  - Cache frequent search queries.
- Load balancing:
  - Horizontal scaling of backend and ML services.
- DB optimization:
  - Use indexes, partitioning if needed.
- CDN:
  - Serve static assets via CDN.
- Microservices:
  - Separate core backend and ML recommendation into services.
- Message queues:
  - Use queue (e.g., RabbitMQ/Redis Streams) for async tasks: nearby places fetching, notification sending.

---

## 18. Final Review & Polish

### 18.1. UX Polish
- Improve:
  - Mobile responsiveness.
  - Clear feedback (loading spinners, success/error messages).
- Write onboarding tutorial:
  - Simple “How to use” steps for students and owners.

### 18.2. Academic & Industry-Ready Documentation
- Final documentation:
  - `SYSTEM_DESIGN.md`:
    - Architecture, sequence diagrams, maps module, recommendation logic.
  - `ML_DESIGN.md`:
    - Datasets, algorithms, evaluation, limitations.
  - `SECURITY.md`:
    - Auth, data protection.
- Prepare presentation:
  - Highlight: AI recommendation, geospatial search, ML modules, scalability.

---

## Suggested Implementation Order (Summary)

1. **Setup**: Repo, README, base architecture docs.
2. **Auth & Dashboards shell**: Login, signup, role-based dashboards.
3. **Database & ERD**: Implement core tables & relations.
4. **Owner panel**: PG CRUD, image upload, map picker.
5. **Admin panel**: PG verification, complaints, basic stats.
6. **Maps & Geospatial**: PostGIS, map components, geocoding.
7. **Search & Filters**: `/pg/search` API + Search/Map pages.
8. **PG details & bookings**: Wishlist, bookings, reviews.
9. **Nearby places**: Overpass/Places API integration.
10. **Notifications & complaints**: End-to-end flow.
11. **Rule-based recommendation**: Rank formula and `/recommendations`.
12. **ML modules**: Offline training + ML microservice.
13. **Advanced features**: chatbot, voice, roommate matching, heatmaps.
14. **Security & testing**: unit, integration, load, recommendation accuracy.
15. **Deployment & scalability**: Docker, Nginx, cloud hosting, basic CI/CD.

---