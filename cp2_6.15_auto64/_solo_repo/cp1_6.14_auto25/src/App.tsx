import { useEffect, useState, useCallback, useRef } from 'react';
import Dashboard from './pages/Dashboard';
import BookDetail from './pages/BookDetail';
import { remindersApi, Reminder } from './api';

type Route =
  | { name: 'dashboard' }
  | { name: 'book-detail'; bookId: string };

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  const [animKey, setAnimKey] = useState(0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnimKey((k) => k + 1);
    onClick();
  };

  return (
    <div
      key={animKey}
      className={`nav-item ${active ? 'active' : ''} nav-click-anim`}
      onClick={handleClick}
    >
      <div className="nav-icon">{icon}</div>
      <span>{label}</span>
    </div>
  );
}

function ReminderTicker({ reminders }: { reminders: Reminder[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');
  const timerRef = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setPhase('exit');
    timerRef.current = window.setTimeout(() => {
      setCurrentIdx((idx) => (idx + 1) % reminders.length);
      setPhase('enter');
    }, 500);
  }, [reminders.length]);

  useEffect(() => {
    if (reminders.length === 0) return;

    if (phase === 'enter') {
      const t = window.setTimeout(() => setPhase('show'), 10);
      return () => clearTimeout(t);
    }
    if (phase === 'show') {
      timerRef.current = window.setTimeout(nextSlide, 2000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [phase, nextSlide, reminders.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (reminders.length === 0) return null;

  const current = reminders[currentIdx];

  return (
    <div className="reminder-ticker">
      <div
        className={`reminder-item reminder-phase-${phase}`}
        key={currentIdx}
      >
        {current.userName} 催更了《{current.bookTitle}》
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const isMobile = useIsMobile();

  const loadReminders = useCallback(async () => {
    try {
      const data = await remindersApi.list(true);
      setReminders(data);
    } catch (_e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const navigateToBook = (bookId: string) => {
    setRoute({ name: 'book-detail', bookId });
    if (isMobile) setSidebarOpen(false);
  };

  const navigateToDashboard = () => {
    setRoute({ name: 'dashboard' });
    if (isMobile) setSidebarOpen(false);
  };

  const currentNav = route.name === 'dashboard' ? 'dashboard' : 'books';

  const toggleSidebar = () => {
    setSidebarOpen((v) => !v);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const dashboardIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );

  const booksIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );

  const notesIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );

  const membersIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const settingsIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );

  return (
    <div className="app-layout">
      {isMobile && (
        <div
          className={`sidebar-mask ${sidebarOpen ? 'show' : ''}`}
          onClick={closeSidebar}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <div className="sidebar-title">ShelfMate</div>
        </div>
        <nav className="nav-list">
          <NavItem
            icon={dashboardIcon}
            label="共读面板"
            active={currentNav === 'dashboard'}
            onClick={navigateToDashboard}
          />
          <NavItem
            icon={booksIcon}
            label="当前共读"
            active={currentNav === 'books'}
            onClick={navigateToDashboard}
          />
          <NavItem icon={notesIcon} label="我的笔记" active={false} onClick={() => {}} />
          <NavItem icon={membersIcon} label="社团成员" active={false} onClick={() => {}} />
          <NavItem icon={settingsIcon} label="设置" active={false} onClick={() => {}} />
        </nav>
      </aside>

      <div className="main-area">
        {isMobile && (
          <div className="mobile-top">
            <button className="hamburger" onClick={toggleSidebar} aria-label="菜单">
              <span />
              <span />
              <span />
            </button>
            <div className="mobile-title">ShelfMate</div>
          </div>
        )}
        <div className="top-bar">
          <ReminderTicker reminders={reminders} />
        </div>
        <div className="content">
          {route.name === 'dashboard' && (
            <Dashboard onOpenBook={navigateToBook} onReminderPosted={loadReminders} />
          )}
          {route.name === 'book-detail' && (
            <BookDetail
              bookId={route.bookId}
              onBack={navigateToDashboard}
              onReminderPosted={loadReminders}
            />
          )}
        </div>
      </div>
    </div>
  );
}
