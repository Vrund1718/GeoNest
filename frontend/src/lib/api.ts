import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const PUBLIC_AUTH_URLS = new Set([
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/auth/send-otp',
  '/auth/verify-otp',
]);

const urlMatches = (cfg: AxiosRequestConfig | undefined, suffixes: Set<string>) => {
  let u = cfg?.url ?? '';
  const base = (cfg?.baseURL ?? '') as string;
  if (base && u.startsWith(base)) u = u.slice(base.length);
  for (const s of suffixes) if (u === s || u.endsWith(s)) return true;
  return false;
};

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const originalRequest = err.config as any;
    if (
      status === 401 &&
      !originalRequest?._retry &&
      !urlMatches(originalRequest, PUBLIC_AUTH_URLS)
    ) {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh', {});
        return api.request(originalRequest);
      } catch (e: any) {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
