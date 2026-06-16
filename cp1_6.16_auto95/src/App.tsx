import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import EventsCalendar from './pages/EventsCalendar';
import EventDetail from './pages/EventDetail';
import Admin from './pages/Admin';
import { getEvents, EventItem } from './api/events';

function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const location = useLocation();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const result = await getEvents();
    if (!('error' in result)) {
      setEvents(result);
    }
  };

  const navStyle: React.CSSProperties = {
    background: '#2C3E50',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  };

  const brandStyle: React.CSSProperties = {
    color: '#fff',
    fontSize: '22px',
    fontWeight: 700,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const navLinksStyle: React.CSSProperties = {
    display: 'flex',
    gap: '24px',
    marginLeft: 'auto',
  };

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    color: isActive ? '#FDF5E6' : '#95A5A6',
    textDecoration: 'none',
    fontSize: '15px',
    fontWeight: isActive ? 600 : 400,
    transition: 'color 0.2s ease',
    cursor: 'pointer',
  });

  const mainStyle: React.CSSProperties = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '24px',
    animation: 'fadeIn 0.3s ease',
  };

  return (
    <div>
      <nav style={navStyle}>
        <Link to="/" style={brandStyle}>
          📅 BookEvents
        </Link>
        <div style={navLinksStyle}>
          <Link to="/" style={navLinkStyle(location.pathname === '/')}>活动日历</Link>
          <Link to="/admin" style={navLinkStyle(location.pathname === '/admin')}>管理</Link>
        </div>
      </nav>
      <main style={mainStyle}>
        <Routes>
          <Route path="/" element={<EventsCalendar events={events} onRefresh={loadEvents} />} />
          <Route path="/event/:id" element={<EventDetail events={events} onRefresh={loadEvents} />} />
          <Route path="/admin" element={<Admin events={events} onRefresh={loadEvents} />} />
        </Routes>
      </main>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
