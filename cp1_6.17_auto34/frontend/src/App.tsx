import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, HiddenMenu } from './types';
import { getCurrentUser } from './api';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import OrderPlaza from './pages/OrderPlaza';
import WallPage from './pages/WallPage';
import FlavorExplore from './pages/FlavorExplore';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wallRefreshTrigger, setWallRefreshTrigger] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = getCurrentUser();
    if (saved) {
      setUser(saved);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleHiddenMenuUnlock = (_menu: HiddenMenu) => {
  };

  const handlePostShared = () => {
    setWallRefreshTrigger((n) => n + 1);
  };

  if (!user) {
    return (
      <div className="app">
        <AuthPage onLogin={handleLogin} showToast={showToast} />
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<HomePage user={user} />} />
        <Route
          path="/orders"
          element={
            <OrderPlaza
              user={user}
              showToast={showToast}
              onHiddenMenuUnlock={handleHiddenMenuUnlock}
            />
          }
        />
        <Route
          path="/wall"
          element={
            <WallPage
              user={user}
              showToast={showToast}
              refreshTrigger={wallRefreshTrigger}
            />
          }
        />
        <Route
          path="/explore"
          element={
            <FlavorExplore
              user={user}
              showToast={showToast}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

export default App;
