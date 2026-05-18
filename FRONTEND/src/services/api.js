import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const toDisplayStatus = (s) => {
  if (!s) return s;
  return s.replace('In_Progress', 'In Progress').replace('Awaiting_Parts', 'Awaiting Parts');
};

export const toDbStatus = (s) => {
  if (!s) return s;
  return s.replace('In Progress', 'In_Progress').replace('Awaiting Parts', 'Awaiting_Parts');
};

const normaliseStatuses = (obj) => {
  if (Array.isArray(obj)) return obj.map(normaliseStatuses);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) =>
        k === 'status' && typeof v === 'string'
          ? [k, toDisplayStatus(v)]
          : [k, normaliseStatuses(v)]
      )
    );
  }
  return obj;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => normaliseStatuses(response.data),
  (error) => {
    const message = error.response?.data?.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getRevenueChart: (range = '7d') => api.get(`/dashboard/revenue?range=${range}`),
};

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getHistory: (id) => api.get(`/customers/${id}/history`),
};

export const ticketsAPI = {
  getAll: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),

  create: (data) => api.post('/tickets', {
    ...data,
    customerId: data.customerId || undefined,
    status: toDbStatus(data.status ?? 'Received'),
  }),

  updateStatus: (id, status) =>
    api.patch(`/tickets/${id}/status`, {
      status: toDbStatus(status),
    }),

  updateWorkData: (id, data) =>
    api.patch(`/tickets/${id}/workdata`, {
      ...data,
      status: data.status ? toDbStatus(data.status) : undefined,
    }),

  addNote: (id, note) =>
    api.post(`/tickets/${id}/notes`, { note }),

  assignTechnician: (id, techId) =>
    api.patch(`/tickets/${id}/assign`, { technicianId: techId }),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getTechnicians: () => api.get('/users?role=technician'),
};

export default api;