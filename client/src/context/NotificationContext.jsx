import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.getUnreadNotificationsCount();
      if (res.success) setUnreadCount(res.unreadCount);
    } catch (err) {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.success) setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        loading,
        refreshUnreadCount,
        fetchNotifications,
        markRead,
        markAllRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
