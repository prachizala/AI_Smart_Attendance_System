import React, { createContext, useContext, useState, useEffect } from 'react';
import adminClient, { adminApi, setAdminToken } from '../api/adminClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('admin_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('admin_token') || null;
  });

  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null);

  // Validate existing token with /api/auth/me on mount
  useEffect(() => {
    let isMounted = true;

    const verifyExistingSession = async () => {
      const existingToken = localStorage.getItem('admin_token');
      if (!existingToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const profile = await adminApi.getMe();
        if (profile.role && profile.role.toLowerCase() === 'admin') {
          if (isMounted) {
            setUser(profile);
            localStorage.setItem('admin_user', JSON.stringify(profile));
          }
        } else {
          // Token belongs to non-admin user
          setAdminToken(null);
          localStorage.removeItem('admin_user');
          if (isMounted) {
            setUser(null);
            setToken(null);
            setSessionExpiredMessage('Access denied: Administrator privileges required.');
          }
        }
      } catch (err) {
        // Token invalid, expired, or backend rejected
        setAdminToken(null);
        localStorage.removeItem('admin_user');
        if (isMounted) {
          setUser(null);
          setToken(null);
          if (err.response?.status === 401 || err.response?.status === 403) {
            setSessionExpiredMessage('Session expired. Please log in again.');
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    verifyExistingSession();

    // Listen for auth expiration events dispatched by Axios response interceptor
    const handleAuthExpired = (event) => {
      setUser(null);
      setToken(null);
      setSessionExpiredMessage(event.detail || 'Session expired. Please log in again.');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, []);

  const login = async (identifier, password) => {
    setSessionExpiredMessage(null);

    const data = await adminApi.login(identifier, password);

    // Verify role returned from backend
    if (!data.user || data.user.role?.toLowerCase() !== 'admin') {
      throw new Error('Access denied: Administrator role required. Employee accounts cannot access this portal.');
    }

    setAdminToken(data.access_token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));

    setUser(data.user);
    setToken(data.access_token);

    return data.user;
  };

  const logout = (reason = null) => {
    setAdminToken(null);
    localStorage.removeItem('admin_user');
    setUser(null);
    setToken(null);
    if (reason) {
      setSessionExpiredMessage(reason);
    }
  };

  const clearSessionMessage = () => {
    setSessionExpiredMessage(null);
  };

  const isAuthenticated = Boolean(token && user && user.role?.toLowerCase() === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        sessionExpiredMessage,
        login,
        logout,
        clearSessionMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
