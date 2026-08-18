# API Reference

All routes are served from the backend origin; the Vite frontend proxies `/api/*` → `/*`. Auth uses `httpOnly` cookies; role-protected routes require an authenticated session.

## Auth
- `POST /auth/signup` — create user (body: name, email, phone, password, role) + set cookies
- `POST /auth/login` — authenticate + set cookies (body: email, password)
- `GET  /auth/me` — current user profile
- `POST /auth/refresh` — issue new access token using refresh cookie
- `POST /auth/logout` — bump tokenVersion + clear cookies

## Owner
- `POST /owners/pg` — create PG listing (body: name, address, city, collegeName, location GeoJSON, totalRooms, availableRooms, genderPreference, pricePerMonth, securityDeposit, amenities[])
- `GET  /owners/pg` — list owner's PGs with image stats
- `GET  /owners/pg/:id` — single PG + images
- `PUT  /owners/pg/:id` — update PG
- `DELETE /owners/pg/:id` — soft delete (sets status=deleted)
- `POST /owners/pg/:id/images` — multipart upload `images[]` (max 10 files × 5MB, JPG/PNG/WEBP/GIF)
- `GET  /owners/bookings` — bookings for owner's PGs
- `PUT  /owners/bookings/:id/status` — change booking status (requested/confirmed/cancelled/completed)
- `GET  /owners/complaints` — complaints for owner's PGs

## Admin
- `GET  /admin/overview` — aggregate metrics (total users, PGs, pending, open complaints, etc.)
- `GET  /admin/pg/pending` — PGs pending verification with owner user info
- `PUT  /admin/pg/:id/verify` — approve/reject PG (body: verified boolean); triggers nearby places if approved + notification
- `GET  /admin/complaints?status=` — list all complaints (optionally filtered by status)
- `PUT  /admin/complaints/:id` — update complaint status + notify student
- `GET  /admin/users?role=&active=` — list all users with bookings count (optionally filtered by role)

## Geospatial
- `GET /geo/search?query=` — geocode a college/city name via Nominatim → { lat, lng, displayName }
- `GET /pg/search` — main PG search pipeline with params: `query`, `radiusKm`, `minPrice`, `maxPrice`, `genderPreference`, `amenities` (comma-separated), `sortBy` (distance|price|rating|popularity; default=recommended score)

## PG details + student actions
- `GET /pg/:id` — full PG details, amenities, images, nearby places grouped by type, reviews with average rating
- `GET /pg/:id/nearby-places` — nearby places grouped by type + flat list
- `POST /pg/:id/book` — create booking request (body: startDate, endDate) + notify owner + student
- `POST /pg/:id/wishlist` — toggle wishlist entry for user
- `POST /pg/:id/reviews` — submit review (body: rating 1-5, text); sentimentScore/isFlaggedFake left null
- `GET  /pg/:id/reviews` — list reviews with average
- `POST /pg/:id/complaints` — file a complaint (body: type, description)

## User (general)
- `GET  /bookings/me` — current user's bookings
- `PUT  /bookings/:id/status` — cancel your own booking
- `GET  /wishlist/me` — current user's wishlist with populated PGs
- `GET  /complaints/me` — current user's complaints
- `GET  /notifications` — current user's notifications + unreadCount
- `PUT  /notifications/:id/read` — mark a notification read
- `PUT  /profile` — update name/phone

## Recommendations
- `GET  /recommendations?limit=12` — rule-based recommended PGs with match %, logged to RecommendationLog
