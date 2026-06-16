import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Header';
import Home from './pages/Home';
import Detail from './pages/Detail';
import Upload from './pages/Upload';
import Profile from './pages/Profile';
import Login from './pages/Login';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function AppContent() {
  const [user, setUser] = useState<{ id: string; username: string; avatar: string } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const avatar = localStorage.getItem('avatar');
    
    if (userId && username) {
      setUser({ id: userId, username, avatar: avatar || '' });
    }

    const handleAuthChange = () => {
      const userId = localStorage.getItem('userId');
      const username = localStorage.getItem('username');
      const avatar = localStorage.getItem('avatar');
      
      if (userId && username) {
        setUser({ id: userId, username, avatar: avatar || '' });
      } else {
        setUser(null);
      }
    };

    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('avatar');
    setUser(null);
    window.dispatchEvent(new Event('authChange'));
  };

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="app">
      {!isLoginPage && <Header user={user} onLogout={handleLogout} />}
      
      <main className="main-content">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/instrument/:id" element={<Detail />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      {!isLoginPage && (
        <footer className="app-footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-logo">
                <span>♪</span>
                <span>琴韵 · 二手乐器交易平台</span>
              </div>
              <p className="footer-copyright">© 2024 琴韵. 专业二手乐器交易服务平台</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
