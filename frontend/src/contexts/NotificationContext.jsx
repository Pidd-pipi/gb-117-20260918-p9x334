import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    refreshUnread();
    if (!user) return;
    const timer = setInterval(refreshUnread, 30000);
    return () => clearInterval(timer);
  }, [user, refreshUnread]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};
