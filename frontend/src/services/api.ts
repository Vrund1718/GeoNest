const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ApiRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string;
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
  { method, body, token }: ApiRequestOptions
) => {
  const url = `${API_URL}${endpoint}`;
  console.log(`[API] ${method} ${url}`, { body });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
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
