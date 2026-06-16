import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import { User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('guqin_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('guqin_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRegister = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('guqin_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('guqin_user');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Home
            user={user}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onLogout={handleLogout}
          />
        }
      />
    </Routes>
  );
};

export default App;
