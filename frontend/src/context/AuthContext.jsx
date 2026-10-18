import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext();

export const getRoleDashboardPath = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'faculty':
      return '/faculty';
    case 'student':
      return '/student';
    case 'parent':
      return '/parent';
    default:
      return '/login';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smartattend_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('smartattend_access_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('smartattend_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Session verification failed:', err.message);
          localStorage.removeItem('smartattend_access_token');
          localStorage.removeItem('smartattend_user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.data) {
        const { access_token, user: userData } = res.data;
        localStorage.setItem('smartattend_access_token', access_token);
        localStorage.setItem('smartattend_user', JSON.stringify(userData));
        setUser(userData);
        setLoading(false);
        return { success: true, user: userData, targetPath: getRoleDashboardPath(userData.role) };
      }
      throw new Error(res.message || 'Login failed.');
    } catch (err) {
      setLoading(false);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('smartattend_access_token');
      localStorage.removeItem('smartattend_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, getRoleDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
