# Entity Relationship Diagram (ERD)

(Textual ERD for Smart PG.)

```
┌───────────────────────────┐        ┌──────────────────────────────┐
│ User                      │ 1───1  │ Owner                        │
│───────────────────────────│        │──────────────────────────────│
│ PK _id                    │◄───┐   │ PK _id                       │
│ name, email (UNIQUE)      │    │   │ FK userId → User (UNIQUE)   │
│ phone, hashedPassword     │    │   │ verificationStatus          │
│ role: student|owner|admin │    │   │ govIdUrl                    │
│ tokenVersion              │    │   │ timestamps                  │
│ timestamps                │    │   └──────────────┬───────────────┘
└───────────┬───────────────┘    │                  │ FK ownerId
            │                    │                  │ (1:N)
            │ 1 ──── N           │          ┌───────▼──────────────────┐
            │ (author of)        │          │ PGListing                │
            │                    │          │──────────────────────────│
            ▼                    ▼          │ PK _id                   │
 ┌──────────────────────────────┐  N:1       │ FK ownerId → Owner      │
 │ Review                       │◄───────────│ name, address, city      │
 │──────────────────────────────│            │ collegeName              │
 │ PK _id                       │            │ location: GeoJSON Point  │
 │ UNIQUE (pgId, userId)        │            │ totalRooms, available   │
 │ FK pgId → PGListing          │            │ genderPreference         │
 │ FK userId → User             │            │ pricePerMonth, deposit  │
 │ rating (1-5), text           │            │ isVerified, status       │
 │ sentimentScore (NULL)        │            │ amenities[] → Amenity    │
 │ isFlaggedFake (NULL)         │            │ timestamps               │
 │ timestamps                   │            └─────────┬────────────────┘
 └──────────────────────────────┘                      │
                                                       │
 ┌──────────────────────────────┐  N:1               1 │
 │ Booking                      │◄─────────────────────┤
 │──────────────────────────────│                      │ 1:N
 │ PK _id                       │                      │
 │ FK pgId → PGListing          │          ┌──────────▼───────────────┐
 │ FK userId → User             │          │ Image                    │
 │ status                       │          │──────────────────────────│
 │ startDate, endDate           │          │ PK _id                   │
 │ timestamps                   │          │ FK pgId → PGListing      │
 └──────────────────────────────┘          │ url, isPrimary           │
                                            │ FK uploadedBy → User     │
 ┌──────────────────────────────┐  N:1     │ timestamps               │
 │ Wishlist (UNIQUE user+pg)    │◄─────────┴──────────────────────────┘
 │──────────────────────────────│
 │ FK userId → User             │          ┌──────────────────────────┐
 │ FK pgId → PGListing          │     N:1  │ Amenity                  │
 │ timestamps                   │◄───┐      │──────────────────────────│
 └──────────────────────────────┘    │      │ PK _id                   │
                                     └──────│ name (UNIQUE), category │
 ┌──────────────────────────────┐  N:1     │ timestamps               │
 │ Complaint                    │◄─────────┴──────────────────────────┘
 │──────────────────────────────│
 │ FK userId → User             │          ┌──────────────────────────┐
 │ FK pgId → PGListing          │     N:1  │ NearbyPlace              │
 │ type, description, status    │◄─────────│──────────────────────────│
 │ resolvedAt                   │          │ PK _id                   │
 │ timestamps                   │          │ FK pgId → PGListing      │
 └──────────────────────────────┘          │ placeType ENUM, name     │
                                            │ location GeoJSON Point   │
 ┌──────────────────────────────┐  N:1     │ distanceMeters           │
 │ Notification                 │◄──┐       │ timestamps               │
 │──────────────────────────────│   │       └──────────────────────────┘
 │ FK userId → User             │   │
 │ type ENUM                    │   │       ┌──────────────────────────┐
 │ title, body, isRead          │   │  N:1  │ RecommendationLog        │
 │ timestamps                   │   └───────│──────────────────────────│
 └──────────────────────────────┘           │ PK _id                   │
                                            │ FK userId → User         │
                                            │ FK pgId → PGListing      │
                                            │ score (0-1), algoVersion │
                                            │ timestamps               │
                                            └──────────────────────────┘
```
