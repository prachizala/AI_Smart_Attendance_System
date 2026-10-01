import axios from 'axios';

export const API_BASE_URL = (() => {
  const envUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL;

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:8000`;
    }
    if (hostname) {
      return `http://${hostname}:8000`;
    }
  }

  return envUrl || 'http://192.168.1.2:8000';
})();

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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

// Automatic Response Interceptor: Catches 401/403 and dispatches session expiration
adminClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isLoginEndpoint = error.config?.url?.includes('/api/auth/login');
      if (!isLoginEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.dispatchEvent(
          new CustomEvent('auth:expired', {
            detail:
              error.response.status === 403
                ? 'Access denied: Admin privileges required.'
                : 'Session expired or invalid. Please sign in again.',
          })
        );
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

  // Analytics & Today's logs
  getStats: async () => {
    const res = await adminClient.get('/api/attendance/stats');
    return res.data;
  },
  getTodayAttendance: async () => {
    const res = await adminClient.get('/api/attendance/today');
    return res.data;
  },

  // Employees
  getEmployees: async () => {
    const res = await adminClient.get('/api/auth/users');
    return res.data;
  },
  createEmployee: async (data) => {
    const res = await adminClient.post('/api/auth/register', data);
    return res.data;
  },

  // Leaves
  getLeaves: async () => {
    const res = await adminClient.get('/api/leaves/all');
    return res.data;
  },
  getPendingLeaves: async () => {
    const res = await adminClient.get('/api/admin/leaves/pending');
    return res.data;
  },
  reviewLeave: async (leaveId, status, remarks = '') => {
    const res = await adminClient.put(
      `/api/leaves/${leaveId}/review?status_update=${status}&remarks=${encodeURIComponent(remarks)}`
    );
    return res.data;
  },

  // Payroll
  generatePayroll: async (month, year, workingDays = 30) => {
    const res = await adminClient.post('/api/payroll/generate', { month, year, working_days: workingDays });
    return res.data;
  },
  getPayrolls: async () => {
    const res = await adminClient.get('/api/payroll/all');
    return res.data;
  },
  getPayrollSummary: async (employeeId, month, year) => {
    let url = `/payroll/summary/${employeeId}`;
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) url += `?${params.join('&')}`;
    const res = await adminClient.get(url);
    return res.data;
  },
};

export default adminClient;
