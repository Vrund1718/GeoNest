export type UserRole = 'student' | 'owner' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  role: UserRole;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Amenity {
  _id: string;
  name: string;
  category: string;
}

export interface Image {
  _id: string;
  pgId: string;
  url: string;
  isPrimary: boolean;
}

export interface PGListing {
  _id: string;
  ownerId: string | { userId?: { _id?: string; name?: string; email?: string } };
  name: string;
  address: string;
  city: string;
  collegeName?: string;
  location: { type: 'Point'; coordinates: [number, number] };
  totalRooms: number;
  availableRooms: number;
  genderPreference: 'male' | 'female' | 'unisex';
  pricePerMonth: number;
  securityDeposit: number;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'deleted';
  amenities: Amenity[];
  createdAt: string;
  updatedAt: string;
  averageRating?: number | null;
  reviewCount?: number;
  primaryImage?: string | null;
  imageCount?: number;
  distanceMeters?: number;
}

export interface Review {
  _id: string;
  pgId: string;
  userId: { _id: string; name: string };
  rating: number;
  text: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  pgId: PGListing | string;
  userId: User | string;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface WishlistEntry {
  _id: string;
  userId: string;
  pgId: PGListing;
}

export interface Complaint {
  _id: string;
  userId: { _id: string; name: string; email: string };
  pgId: { _id: string; name: string; city: string };
  type: 'hygiene' | 'noise' | 'safety' | 'staff' | 'amenity' | 'other';
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  resolvedAt?: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'booking_request' | 'booking_confirm' | 'booking_cancel' | 'pg_verified' | 'complaint_status' | 'general';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface NearbyPlace {
  _id: string;
  placeType: string;
  name: string;
  distanceMeters: number;
}

export interface SearchFilters {
  query: string;
  radiusKm: number;
  minPrice?: number;
  maxPrice?: number;
  genderPreference?: 'male' | 'female' | 'unisex';
  amenities: string[];
  sortBy: 'recommended' | 'distance' | 'price' | 'rating' | 'popularity';
}

export interface Recommendation {
  pg: PGListing;
  score: number;
  algorithmVersion: string;
}
