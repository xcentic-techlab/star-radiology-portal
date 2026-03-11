import axios from 'axios';
import { toast } from 'sonner';

// Agar env variable hai to use karo, warna local proxy
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE + '/api/website',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const adminApi = axios.create({
  baseURL: API_BASE + '/api/admin',
});

export const staffApi = axios.create({
  baseURL: API_BASE + '/api/staff',
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

staffApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dcms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;