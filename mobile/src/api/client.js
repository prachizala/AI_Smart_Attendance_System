import axios from 'axios';
import { Platform } from 'react-native';

// Configured for local Wi-Fi LAN IP (192.168.1.3) for physical mobile device
const LAN_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:8000';
export const DEFAULT_API_BASE_URL = Platform.select({
  android: LAN_API_URL,
  ios: LAN_API_URL,
  default: LAN_API_URL,
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

  // Attendance (Dual-factor Biometric & Geofencing)
  checkIn: async (...args) => {
    let payload = {};
    if (args.length === 1 && typeof args[0] === 'object') {
      payload = args[0];
    } else if (typeof args[0] === 'number' && typeof args[3] === 'string') {
      // (userId, latitude, longitude, faceImageBase64)
      payload = {
        user_id: args[0],
        latitude: args[1],
        longitude: args[2],
        face_image_base64: args[3],
      };
    } else {
      // (latitude, longitude, faceImageBase64, userId)
      payload = {
        latitude: args[0],
        longitude: args[1],
        face_image_base64: args[2],
        user_id: args[3] || undefined,
      };
    }

    try {
      const res = await apiClient.post('/attendance/check-in', payload);
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const res = await apiClient.post('/api/attendance/check-in', payload);
        return res.data;
      }
      throw err;
    }
  },

  checkOut: async (...args) => {
    let payload = {};
    if (args.length === 1 && typeof args[0] === 'object') {
      payload = args[0];
    } else if (typeof args[0] === 'number' && typeof args[1] === 'number' && typeof args[2] === 'number') {
      // (userId, latitude, longitude)
      payload = {
        user_id: args[0],
        latitude: args[1],
        longitude: args[2],
      };
    } else {
      // (latitude, longitude, faceImageBase64, userId)
      payload = {
        latitude: args[0],
        longitude: args[1],
        face_image_base64: args[2] || undefined,
        user_id: args[3] || undefined,
      };
    }

    try {
      const res = await apiClient.post('/attendance/check-out', payload);
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        const res = await apiClient.post('/api/attendance/check-out', payload);
        return res.data;
      }
      throw err;
    }
  },
  getHistory: async (employeeIdOrUserId) => {
    try {
      const res = await apiClient.get(`/attendance/history/${employeeIdOrUserId}`);
      return res.data;
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const res = await apiClient.get(`/api/attendance/history/${employeeIdOrUserId}`);
          return res.data;
        } catch (subErr) {
          const res = await apiClient.get(`/api/attendance/user/${employeeIdOrUserId}`);
          return res.data;
        }
      }
      throw err;
    }
  },

  // Leaves
  applyLeave: async (userId, leaveType, startDate, endDate, reason) => {
    const res = await apiClient.post('/api/leaves/apply', {
      user_id: userId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason,
    });
    return res.data;
  },
  getMyLeaves: async (userId) => {
    const res = await apiClient.get(`/api/leaves/user/${userId}`);
    return res.data;
  },

  // Payroll
  getMyPayroll: async (userId) => {
    const res = await apiClient.get(`/api/payroll/user/${userId}`);
    return res.data;
  },
};

export default apiClient;
