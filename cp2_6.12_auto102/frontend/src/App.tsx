import React from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from './context/AppContext';
import BookList from './components/BookList';
import BorrowRecord from './components/BorrowRecord';
import ReadingStats from './components/ReadingStats';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import NotificationBanner from './components/NotificationBanner';
import './styles/App.css';

const App: React.FC = () => {
  const { user, isAdmin, pickupNotifications } = useAppContext();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/', label: '图书检索', icon: '📚' },
    { path: '/borrow', label: '借阅记录', icon: '📖' },
    { path: '/stats', label: '阅读统计', icon: '📊' },
    { path: '/profile', label: '个人中心', icon: '👤' },
    ...(isAdmin ? [{ path: '/admin', label: '管理后台', icon: '⚙️' }] : [])
  ];

  return (
    <div className="app-container">
      {pickupNotifications.length > 0 && <NotificationBanner notifications={pickupNotifications} />}
      
      <nav className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-logo">📚</span>
          <h1 className="sidebar-title">社区图书馆</h1>
        </div>
        
        <div className="sidebar-user">
          <div className="user-avatar-small">
            {user?.name.charAt(0)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{isAdmin ? '管理员' : '读者'}</div>
          </div>
        </div>

        <ul className="menu-list">
          {menuItems.map(item => (
            <li key={item.path}>
              <NavLink 
                to={item.path}
                className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
              >
                <span className="menu-icon">{item.icon}</span>
                <span className="menu-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BookList />
              </motion.div>
            } />
            <Route path="/borrow" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <BorrowRecord />
              </motion.div>
            } />
            <Route path="/stats" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ReadingStats />
              </motion.div>
            } />
            <Route path="/profile" element={
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Profile />
              </motion.div>
            } />
            {isAdmin && (
              <Route path="/admin" element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AdminPanel />
                </motion.div>
              } />
            )}
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
