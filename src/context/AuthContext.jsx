import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken, getToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // ignore
    }
    setToken(null);
    setUser(null);
  };

  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('office_directory_demo_mode') === 'true';
  });

  const toggleDemoMode = () => {
    setDemoMode(prev => {
      const next = !prev;
      localStorage.setItem('office_directory_demo_mode', String(next));
      return next;
    });
  };

  const quickSwitch = async (role) => {
    const creds = role === 'admin' 
      ? { username: 'admin', password: 'admin123' }
      : { username: 'viewer', password: 'viewer123' };
    return login(creds.username, creds.password);
  };

  const value = {
    user,
    role: user?.role,
    isAdmin: user?.role === 'admin',
    isViewer: user?.role === 'viewer',
    loading,
    demoMode,
    toggleDemoMode,
    login,
    logout,
    quickSwitch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
