import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import BookList from './pages/BookList';
import MyLibrary from './pages/MyLibrary';
import ExchangeRequests from './pages/ExchangeRequests';
import { useUser, UserProvider } from './context/UserContext';
import { useSocket, SocketProvider } from './context/SocketContext';
import { USERS, User } from './types';

const Navbar: React.FC = () => {
  const { currentUser, setCurrentUser } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">📚 图书交换</div>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <NavLink to="/" end className="nav-link">
            浏览
          </NavLink>
          <NavLink to="/library" className="nav-link">
            我的图书馆
          </NavLink>
          <NavLink to="/exchanges" className="nav-link">
            交换请求
          </NavLink>
        </div>

        <div className="navbar-right">
          <select
            className="user-select"
            value={currentUser.id}
            onChange={(e) => {
              const user = USERS.find((u) => u.id === e.target.value);
              if (user) setCurrentUser(user);
            }}
          >
            {USERS.map((user: User) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
};

const NotificationList: React.FC = () => {
  const { notifications } = useSocket();

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}`}>
          <span className="notification-icon">
            {notification.type === 'success' ? '✓' : notification.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{notification.message}</span>
        </div>
      ))}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isTransitioning } = useUser();

  return (
    <div className={`page-wrapper ${isTransitioning ? 'slide-right' : ''}`}>
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<BookList />} />
          <Route path="/library" element={<MyLibrary />} />
          <Route path="/exchanges" element={<ExchangeRequests />} />
        </Routes>
      </div>
      <NotificationList />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppContent />
  );
};

export default App;
