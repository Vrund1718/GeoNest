# Architecture

## Data Flow (one paragraph)
React frontend (Vite + TS) calls the Express backend over HTTP through an `/api` proxy. The backend uses JWT cookies (access + refresh token rotation via `tokenVersion` on User) to authenticate requests, authorizes by role, and validates every body/query with `zod`. PG listings, bookings, reviews, and related data live in MongoDB with a `2dsphere` index on `PGListing.location`; the `/pg/search` pipeline geocodes a free-text query with Nominatim, runs a `$geoNear` aggregation, then filters by price, gender preference, and amenities, and finally sorts by the default weighted recommendation score or a user-chosen axis (distance/price/rating/popularity). When an admin verifies a PG, the backend queries Overpass for nearby places (hospitals, ATMs, restaurants, etc.) and stores them in `NearbyPlace` with distances. The rule-based `/recommendations` endpoint infers a user's preferred price/amenities/location cluster from past bookings and wishlist entries, then scores candidates with a weighted sum (distance + price + amenities + rating + popularity + freshness) normalized 0–1, and logs each recommendation to `RecommendationLog`. Notification records are auto-created on booking state changes, PG verification, and complaint status transitions and are surfaced in a global bell widget and dedicated notification page per role.

## Models
- `User` — name, email (unique), phone, hashedPassword, role (`student`|`owner`|`admin`), tokenVersion
- `Owner` — userId → User, verificationStatus, govIdUrl
- `PGListing` — ownerId → Owner, name, address, city, collegeName, location (GeoJSON Point, 2dsphere), totalRooms, availableRooms, genderPreference, pricePerMonth, securityDeposit, isVerified, status, amenities[] → Amenity
- `Amenity` — name (unique), category
- `Image` — pgId → PGListing, url, isPrimary, uploadedBy → User
- `Review` — pgId, userId, rating (1-5), text, sentimentScore (null), isFlaggedFake (null); unique (pgId, userId)
- `Booking` — pgId, userId, status (`requested`|`confirmed`|`cancelled`|`completed`), startDate, endDate
- `Wishlist` — userId, pgId (unique compound)
- `Complaint` — userId, pgId, type, description, status, resolvedAt
- `Notification` — userId, type, title, body, isRead
- `NearbyPlace` — pgId, placeType, name, location (GeoJSON Point), distanceMeters
- `RecommendationLog` — userId, pgId, score, algorithmVersion
