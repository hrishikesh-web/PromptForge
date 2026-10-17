import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);

/**
 * /auth/login returns { userId, ... } but /auth/me returns { user_id, ... }.
 * Normalise both so the rest of the app can always use user.userId.
 */
const normalizeUser = (u) => (u ? { ...u, userId: u.userId ?? u.user_id } : null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => tokenStore.get());
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (!cancelled) {
          setUser(normalizeUser(res.user));
          setSessionError('');
        }
      } catch (err) {
        if (cancelled) return;
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          logout(); // token expired or user no longer exists
        } else {
          // Server/database temporarily unavailable: keep the token, try again later.
          setSessionError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchUser();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const startSession = (res) => {
    tokenStore.set(res.token);
    setToken(res.token);
    setUser(normalizeUser(res.user));
    return res;
  };

  const login = async (email, password) => startSession(await api.login({ email, password }));
  const register = async (userData) => startSession(await api.register(userData));

  const refreshProfile = useCallback(async () => {
    try {
      const res = await api.getMe();
      setUser(normalizeUser(res.user));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    sessionError,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
