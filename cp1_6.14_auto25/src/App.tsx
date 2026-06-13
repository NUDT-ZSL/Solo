import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import BookDetail from './pages/BookDetail';
import { remindersApi, Reminder } from './api';

type Route =
  | { name: 'dashboard' }
  | { name: 'book-detail'; bookId: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'dashboard' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activeReminderIdx, setActiveReminderIdx] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    remindersApi.list().then((data) => setReminders(data));
  }, []);

  useEffect(() => {
    if (reminders.length === 0) return;
    const interval = setInterval(() => {
      setActiveReminderIdx((idx) => (idx + 1) % reminders.length);
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [reminders.length]);

  const navigateToBook = (bookId: string) => {
    setRoute({ name: 'book-detail', bookId });
    setSidebarOpen(false);
  };

  const navigateToDashboard = () => {
    setRoute({ name: 'dashboard' });
    setSidebarOpen(false);
  };

  const currentNav = route.name === 'dashboard' ? 'dashboard' : 'books';

  const refreshReminders = async () => {
    const data = await remindersApi.list();
    setReminders(data);
    setActiveReminderIdx(0);
  };

  const activeReminder = reminders[activeReminderIdx];

  return (
    <div className="app-layout">
      <div className={`sidebar-mask ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">S</div>
          <div className="sidebar-title">ShelfMate</div>
        </div>
        <nav className="nav-list">
          <div
            className={`nav-item ${currentNav === 'dashboard' ? 'active' : ''}`}
            onClick={navigateToDashboard}
          >
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <span>共读面板</span>
          </div>
          <div
            className={`nav-item ${currentNav === 'books' ? 'active' : ''}`}
            onClick={navigateToDashboard}
          >
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <span>当前共读</span>
          </div>
          <div className="nav-item">
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <span>我的笔记</span>
          </div>
          <div className="nav-item">
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span>社团成员</span>
          </div>
          <div className="nav-item">
            <div className="nav-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <span>设置</span>
          </div>
        </nav>
      </aside>

      <div className="main-area">
        <div className="mobile-top">
          <button className="hamburger" onClick={() => setSidebarOpen((v) => !v)}>
            <span />
            <span />
            <span />
          </button>
          <div className="mobile-title">ShelfMate</div>
        </div>
        <div className="top-bar">
          <div className="reminder-ticker" key={`r-${activeReminderIdx}`}>
            {activeReminder && (
              <div className="reminder-item">
                {activeReminder.userName} 催更了《{activeReminder.bookTitle}》
              </div>
            )}
          </div>
        </div>
        <div className="content">
          {route.name === 'dashboard' && (
            <Dashboard onOpenBook={navigateToBook} onReminderPosted={refreshReminders} />
          )}
          {route.name === 'book-detail' && (
            <BookDetail
              bookId={route.bookId}
              onBack={navigateToDashboard}
              onReminderPosted={refreshReminders}
            />
          )}
        </div>
      </div>
    </div>
  );
}
