import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import ActivityFeed from './components/ActivityFeed';
import Home from './pages/Home';
import Library from './pages/Library';
import BookDetailPage from './pages/BookDetail';
import Dashboard from './pages/Dashboard';
import Votes from './pages/Votes';
import Admin from './pages/Admin';
import Auth, { AuthUser } from './pages/Auth';

const STORAGE_KEY = 'readcircle_user';

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [page, setPage] = useState<string>('home');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    setTimeout(() => setLoading(false), 300);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    if (user) {
      const ping = async () => {
        try { await axios.get('/api/health', { timeout: 2000 }); } catch {}
      };
      ping();
      id = setInterval(ping, 60000);
    }
    return () => { if (id) clearInterval(id); };
  }, [user]);

  const handleNavigate = (key: string) => {
    if (key === 'library') {
      setSelectedBookId('');
    }
    setPage(key);
  };

  const handleBookClick = (id: string) => {
    setSelectedBookId(id);
    setPage('book-detail');
  };

  const handleLogout = () => {
    setUser(null);
    setPage('home');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#faf5ef', color: '#7a5a48'
      }}>
        <div style={{ fontSize: '18px' }}>📖 ReadCircle 正在加载...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={(u) => { setUser(u); setPage('home'); }} />;
  }

  const showActivityFeed = page !== 'auth' && !isMobile;
  const mainContentRightPad = showActivityFeed ? '300px' : '0';

  return (
    <div className="app">
      <Navbar
        active={page}
        onNavigate={handleNavigate}
        username={user.username}
        avatar={user.avatar}
        isAdmin={user.isAdmin}
        onLogout={handleLogout}
      />

      <div className="main-container">
        <div className="main-content" style={{ paddingRight: isMobile ? '24px' : '24px' }}>
          {page === 'home' && (
            <Home
              username={user.username}
              onNavigate={handleNavigate}
              onBookClick={handleBookClick}
            />
          )}
          {page === 'library' && (
            <Library
              userId={user.id}
              username={user.username}
              avatar={user.avatar}
              onBookClick={handleBookClick}
            />
          )}
          {page === 'book-detail' && selectedBookId && (
            <BookDetailPage
              bookId={selectedBookId}
              userId={user.id}
              username={user.username}
              avatar={user.avatar}
              onBack={() => { setPage('library'); }}
            />
          )}
          {page === 'dashboard' && (
            <Dashboard
              userId={user.id}
              username={user.username}
            />
          )}
          {page === 'votes' && (
            <Votes
              userId={user.id}
              username={user.username}
              avatar={user.avatar}
              isAdmin={user.isAdmin}
            />
          )}
          {page === 'admin' && user.isAdmin && (
            <Admin
              userId={user.id}
              username={user.username}
              avatar={user.avatar}
            />
          )}
        </div>

        {showActivityFeed && <ActivityFeed />}
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 60, left: 0, right: 0, zIndex: 90 }}>
          <ActivityFeed />
        </div>
      )}
    </div>
  );
};

export default App;
