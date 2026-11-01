import axios from 'axios';

export const API_BASE_URL = (() => {
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  // 1. Explicit production / environment URL has highest priority
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Local development fallback
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
  }

  return 'http://localhost:8000';
})();

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Initialize Authorization header from existing token in localStorage if available
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
if (initialToken) {
  adminClient.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

export const setAdminToken = (newToken) => {
  if (newToken) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', newToken);
    }
    adminClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  } else {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
    }
    delete adminClient.defaults.headers.common['Authorization'];
  }
};

// Automatic Request Interceptor: Ensures fresh token is always attached
adminClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const currentToken = localStorage.getItem('admin_token');
      if (currentToken) {
        config.headers['Authorization'] = `Bearer ${currentToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        const isLoginAttempt = error.config?.url?.includes('/api/auth/login');
        if (!isLoginAttempt) {
          // Token is expired or revoked during an authenticated operation
          setAdminToken(null);
          localStorage.removeItem('admin_user');
          const event = new CustomEvent('auth:expired', {
            detail: error.response?.data?.detail || 'Session expired. Please log in again.'
          });
          window.dispatchEvent(event);
        }
      }
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  // Auth
  login: async (identifier, password) => {
    const res = await adminClient.post('/api/auth/login', { identifier, password });
    return res.data;
  },
  getMe: async () => {
    const res = await adminClient.get('/api/auth/me');
    return res.data;
  },

  // Employees
  getEmployees: async () => {
    const res = await adminClient.get('/api/employees');
    return res.data;
  },
  createEmployee: async (data) => {
    const res = await adminClient.post('/api/employees', data);
    return res.data;
  },

  // Attendance
  getTodayStats: async () => {
    const res = await adminClient.get('/api/attendance/today-stats');
    return res.data;
  },
  getAttendanceLogs: async (date = null) => {
    const url = date ? `/api/attendance/logs?date=${date}` : '/api/attendance/logs';
    const res = await adminClient.get(url);
    return res.data;
  },
  getMonthlySummary: async (month = null, year = null) => {
    let url = '/api/attendance/monthly-summary';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const res = await adminClient.get(url);
    return res.data;
  },

  // Leaves
  getLeaves: async (status = null) => {
    const url = status ? `/api/leaves?status=${status}` : '/api/leaves';
    const res = await adminClient.get(url);
    return res.data;
  },
  reviewLeave: async (leaveId, status, rejectionReason = null) => {
    const res = await adminClient.put(`/api/leaves/${leaveId}/review`, {
      status,
      rejection_reason: rejectionReason,
    });
    return res.data;
  },

  // Payroll
  getPayrollSummary: async (month = null, year = null) => {
    let url = '/api/payroll/summary';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const res = await adminClient.get(url);
    return res.data;
  },
  processPayroll: async (data) => {
    const res = await adminClient.post('/api/payroll/process', data);
    return res.data;
  },
};

export default adminClient;
