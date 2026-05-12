/**
 * API Service Layer
 * All frontend data fetches route through here.
 * When the backend is ready, simply set VITE_API_BASE_URL in .env
 * and all pages will automatically use live data.
 */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password, role) =>
    api.post('/auth/login', { email, password, role }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getRevenueChart: (range = '7d') => api.get(`/dashboard/revenue?range=${range}`),
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getHistory: (id) => api.get(`/customers/${id}/history`),
};

// ─── Tickets ─────────────────────────────────────────────────────────────────
export const ticketsAPI = {
  getAll: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  updateStatus: (id, status, notes) =>
    api.patch(`/tickets/${id}/status`, { status, notes }),
  addNote: (id, note) => api.post(`/tickets/${id}/notes`, { note }),
  assignTechnician: (id, techId) =>
    api.patch(`/tickets/${id}/assign`, { technicianId: techId }),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  getTechnicians: () => api.get('/users?role=technician'),
};

export default api;
