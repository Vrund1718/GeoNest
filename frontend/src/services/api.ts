const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
  multipart?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiRequest = async (
  endpoint: string,
  { method, body, token, multipart }: ApiRequestOptions
) => {
  const url = `${API_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`, { body, multipart });

  const headers: Record<string, string> = {};
  if (!multipart) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body
        ? multipart
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    });

    console.log(`[API] Response status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      console.error('[API] Failed to parse response JSON', parseErr);
      throw new ApiError('Invalid response from server', 'PARSE_ERROR', response.status);
    }

    if (!response.ok) {
      console.error('[API] Request failed', data);
      throw new ApiError(
        data.error?.message || 'Request failed',
        data.error?.code,
        response.status
      );
    }

    console.log('[API] Request succeeded', data);
    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    console.error('[API] Network error', err);
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new ApiError('Unable to connect to server, please try again', 'NETWORK_ERROR');
    }

    throw new ApiError('An unexpected error occurred', 'UNEXPECTED_ERROR');
  }
};

export interface PgListingInput {
  id?: string;
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  collegeName?: string;
  latitude?: number;
  longitude?: number;
  pricePerMonth?: number;
  securityDeposit?: number;
  totalRooms?: number;
  availableRooms?: number;
  genderPreference?: 'MALE' | 'FEMALE' | 'CO_ED';
  foodIncluded?: boolean;
  amenityIds?: string[];
  status?: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
}

export interface PgListing {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city: string;
  collegeName?: string;
  latitude?: number;
  longitude?: number;
  pricePerMonth: number;
  securityDeposit?: number;
  totalRooms?: number;
  availableRooms?: number;
  genderPreference?: 'MALE' | 'FEMALE' | 'CO_ED';
  foodIncluded?: boolean;
  status: 'DRAFT' | 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  rejectionReason?: string;
  amenities?: { id: string; name: string; key: string; iconKey: string; category: string }[];
  images?: { id: string; url: string; isPrimary: boolean }[];
  owner?: { id: string; name: string; email: string; phone?: string; status?: string };
  distanceKm?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Amenity {
  id: string;
  key: string;
  name: string;
  iconKey: string;
  category: 'SAFETY' | 'CONNECTIVITY' | 'FOOD' | 'LIFESTYLE' | 'LAUNDRY' | 'OTHER';
}

export interface Complaint {
  id: string;
  userId: string;
  complainantName?: string;
  complainantEmail?: string;
  pgId: string;
  pgName?: string;
  type: string;
  description: string;
  status: 'REQUESTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  createdAt: string;
  resolvedAt?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'student' | 'owner' | 'admin';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalPGs: number;
  pendingVerifications: number;
  openComplaints: number;
}

export const ownerApi = {
  async createPg(data: PgListingInput) {
    return apiRequest('/owners/pg', { method: 'POST', body: data }) as Promise<{ data: PgListing }>;
  },
  async updatePg(id: string, data: PgListingInput) {
    return apiRequest(`/owners/pg/${id}`, { method: 'PUT', body: data }) as Promise<{ data: PgListing }>;
  },
  async listPgs() {
    return apiRequest('/owners/pg', { method: 'GET' }) as Promise<{ data: PgListing[] }>;
  },
  async getPg(id: string) {
    return apiRequest(`/owners/pg/${id}`, { method: 'GET' }) as Promise<{ data: PgListing }>;
  },
  async softDeletePg(id: string) {
    return apiRequest(`/owners/pg/${id}`, { method: 'DELETE' }) as Promise<{ success: boolean }>;
  },
  async uploadImages(pgId: string, files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append('images', f));
    return apiRequest(`/owners/pg/${pgId}/images`, {
      method: 'POST',
      body: form,
      multipart: true,
    }) as Promise<{ data: { id: string; url: string; isPrimary: boolean }[] }>;
  },
  async deleteImage(pgId: string, imageId: string) {
    return apiRequest(`/owners/pg/${pgId}/images/${imageId}`, { method: 'DELETE' }) as Promise<{ success: boolean }>;
  },
  async setPrimaryImage(pgId: string, imageId: string) {
    return apiRequest(`/owners/pg/${pgId}/images/${imageId}/primary`, { method: 'PUT' }) as Promise<{ success: boolean }>;
  },
  async listAmenities() {
    return apiRequest('/owners/amenities', { method: 'GET' }) as Promise<{ data: Amenity[] }>;
  },
};

export const adminApi = {
  async overview() {
    return apiRequest('/admin/overview', { method: 'GET' }) as Promise<{ data: AdminOverviewStats }>;
  },
  async listPending() {
    return apiRequest('/admin/pg/pending', { method: 'GET' }) as Promise<{ data: PgListing[] }>;
  },
  async getPgDetail(id: string) {
    return apiRequest(`/admin/pg/${id}`, { method: 'GET' }) as Promise<{ data: PgListing }>;
  },
  async verify(id: string, approve: boolean, reason?: string) {
    return apiRequest(`/admin/pg/${id}/verify`, {
      method: 'PUT',
      body: approve ? { approve } : { approve, reason },
    }) as Promise<{ success: boolean }>;
  },
  async listComplaints() {
    return apiRequest('/admin/complaints', { method: 'GET' }) as Promise<{ data: Complaint[] }>;
  },
  async updateComplaint(id: string, status: Complaint['status'], adminNote?: string) {
    return apiRequest(`/admin/complaints/${id}`, {
      method: 'PUT',
      body: adminNote !== undefined ? { status, adminNote } : { status },
    }) as Promise<{ data: Complaint }>;
  },
  async listUsers(filters?: { role?: string; status?: string; query?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.role) params.set('role', filters.role);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.query) params.set('query', filters.query);
    if (filters?.page != null) params.set('page', String(filters.page));
    if (filters?.limit != null) params.set('limit', String(filters.limit));
    const qs = params.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`, { method: 'GET' }) as Promise<{ data: UserSummary[]; total?: number; page?: number; limit?: number }>;
  },
  async toggleUserActive(id: string, active: boolean) {
    return apiRequest(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: { active },
    }) as Promise<{ success: boolean }>;
  },
};

export const authApi = {
  async me() {
    return apiRequest('/auth/me', { method: 'GET' });
  },
  async login(email: string, password: string) {
    return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  },
  async signup(name: string, email: string, password: string) {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    });
  },
  async sendOtp(phone: string) {
    return apiRequest('/auth/otp/send', { method: 'POST', body: { phone } });
  },
  async verifyOtp(phone: string, code: string) {
    return apiRequest('/auth/otp/verify', { method: 'POST', body: { phone, code } });
  },
  async logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  },
};

