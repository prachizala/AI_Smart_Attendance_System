import axios from 'axios';
import { Platform } from 'react-native';

// Default to live production HTTPS backend URL (with env var override)
const PRODUCTION_API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ai-smart-attendance-system-2m55.onrender.com';
export const DEFAULT_API_BASE_URL = Platform.select({
  android: PRODUCTION_API_URL,
  ios: PRODUCTION_API_URL,
  default: PRODUCTION_API_URL,
});

const apiClient = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

export const setCustomBaseUrl = (url) => {
  if (url) {
    apiClient.defaults.baseURL = url.trim();
  }
};

export const api = {
  // Auth
  login: async (identifier, password) => {
    const res = await apiClient.post('/api/auth/login', { identifier, password });
    return res.data;
  },
  getProfile: async () => {
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },
  registerFace: async (userId, faceImageBase64) => {
    const res = await apiClient.post('/api/auth/register-face', {
      user_id: userId,
      face_image_base64: faceImageBase64,
    });
    return res.data;
  },

  // Attendance
  checkIn: async (data) => {
    const res = await apiClient.post('/api/attendance/check-in', data);
    return res.data;
  },
  checkOut: async (data) => {
    const res = await apiClient.post('/api/attendance/check-out', data);
    return res.data;
  },
  biometricPunch: async (data) => {
    const res = await apiClient.post('/api/attendance/biometric-punch', data);
    return res.data;
  },
  getHistory: async () => {
    const res = await apiClient.get('/api/attendance/my-history');
    return res.data;
  },
  getTodayStatus: async () => {
    const res = await apiClient.get('/api/attendance/today-status');
    return res.data;
  },

  // Leaves
  getLeaveBalance: async () => {
    const res = await apiClient.get('/api/leaves/balance');
    return res.data;
  },
  applyLeave: async (data) => {
    const res = await apiClient.post('/api/leaves/apply', data);
    return res.data;
  },
  getMyLeaves: async () => {
    const res = await apiClient.get('/api/leaves/my-requests');
    return res.data;
  },

  // Payroll
  getMyPayroll: async (month, year) => {
    let url = '/api/payroll/my-slip';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const res = await apiClient.get(url);
    return res.data;
  },
};

export default apiClient;
