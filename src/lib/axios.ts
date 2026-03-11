import axios from 'axios';
import { toast } from 'sonner';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api/website';

const api = axios.create({
  baseURL: API_BASE,
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
  baseURL:
    (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/admin',
});


export const staffApi = axios.create({
  baseURL:
    (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/staff',
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