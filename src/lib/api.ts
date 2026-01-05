import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string, role?: 'user' | 'driver') => {
    const response = await api.post('/auth/register', { email, password, name, role });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getDemoCredentials: async () => {
    const response = await api.get('/auth/demo-credentials');
    return response.data;
  },
};

// Orders API
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state?: string;
  zipCode?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export interface CreateOrderPayload {
  customerId: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  notes?: string;
}

export const ordersApi = {
  getAll: async () => {
    const response = await api.get('/orders');
    return response.data;
  },

  getMyOrders: async () => {
    const response = await api.get('/orders/my-orders');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (payload: CreateOrderPayload) => {
    const response = await api.post('/orders', payload);
    return response.data;
  },

  updateStatus: async (id: string, status: string, note?: string) => {
    const response = await api.patch(`/orders/${id}/status`, { status, note });
    return response.data;
  },

  assignDriver: async (orderId: string, driverId: string, driverName?: string) => {
    const response = await api.patch(`/orders/${orderId}/assign`, { driverId, driverName });
    return response.data;
  },
};

export default api;



