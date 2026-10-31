import axios from 'axios';
import { demoAdapter } from './demo';

export const DEMO = import.meta.env.VITE_DEMO === 'true';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// In demo mode the request never leaves the browser; the interceptors below still run.
if (DEMO) api.defaults.adapter = demoAdapter;

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLogin) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// the API always answers errors as { error: "message" }
export const errMsg = (e) => e.response?.data?.error || 'Cannot reach the server';
