import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import CollectionWall from './CollectionWall';
import DetailPage from './DetailPage';
import SwapMarket from './SwapMarket';
import NotificationCenter from './NotificationCenter';
import { Notification as NotificationType } from './types';
import './index.css';

const UserContext = createContext<{
  currentUser: string;
  setCurrentUser: (user: string) => void;
  refreshNotifications: () => void;
  unreadCount: number;
}>({
  currentUser: 'alice',
  setCurrentUser: () => {},
  refreshNotifications: () => {},
  unreadCount: 0
});

const ToastContext = createContext<{
  showToast: (message: string, type: 'success' | 'error') => void;
}>({
  showToast: () => {}
});

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={`toast ${type}`}>{message}</div>;
}

function Navbar() {
  const { currentUser, setCurrentUser, unreadCount } = useContext(UserContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        🪄 <span>CollectorsNook</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')} end>
          藏品墙
        </NavLink>
        <NavLink to="/swap" className={({ isActive }) => (isActive ? 'active' : '')}>
          交换广场
        </NavLink>
        <button className="notification-bell" onClick={handleNotificationClick}>
          🔔
          {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
        </button>
        <div className="user-selector">
          👤
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
          >
            <option value="alice">Alice</option>
            <option value="bob">Bob</option>
            <option value="charlie">Charlie</option>
          </select>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState('alice');
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/api/notifications/${currentUser}`);
      setNotifications(response.data);
    } catch (error) {
      console.error('获取通知失败:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        refreshNotifications: fetchNotifications,
        unreadCount
      }}
    >
      <ToastContext.Provider value={{ showToast }}>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<CollectionWall />} />
            <Route path="/collection/:id" element={<DetailPage />} />
            <Route path="/swap" element={<SwapMarket />} />
            <Route path="/notifications" element={<NotificationCenter />} />
          </Routes>
        </BrowserRouter>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </ToastContext.Provider>
    </UserContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppContent />
  </React.StrictMode>
);

export { UserContext, ToastContext };
