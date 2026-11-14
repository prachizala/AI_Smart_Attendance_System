import React, { createContext, useState, useEffect, useContext } from 'react';
import { api, setAuthToken } from '../api/client';
import { saveSecureToken, getSecureToken, deleteSecureToken } from '../utils/secureStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Restore secure session on startup
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const storedToken = await getSecureToken();
        if (storedToken && isMounted) {
          setAuthToken(storedToken);
          setToken(storedToken);
          try {
            const profile = await api.getProfile();
            if (isMounted) setUser(profile);
          } catch {
            await deleteSecureToken();
            setAuthToken(null);
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      } catch {
        // Safe fallback on initialization error
      }
    };
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  const login = async (identifier, password) => {
    setIsLoading(true);
    try {
      const data = await api.login(identifier, password);
      await saveSecureToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setAuthToken(data.access_token);
      return { success: true, user: data.user };
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || err.message || 'Login failed. Please check credentials.';
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await deleteSecureToken();
    setUser(null);
    setToken(null);
    setAuthToken(null);
  };

  const updateUserProfile = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
