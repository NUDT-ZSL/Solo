import { useState, useEffect, useCallback } from 'react';
import ClassList from './components/ClassList';
import Profile from './components/Profile';
import AdminPanel from './components/AdminPanel';
import Toast from './components/Toast';
import Navbar from './components/Navbar';
import { ToastMessage } from './types';

type Page = 'classes' | 'profile' | 'admin';

const MEMBER_ID = 'user-001';
const COACH_ID = 'coach-001';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('classes');
  const [userId, setUserId] = useState<string>(MEMBER_ID);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    if (page === 'admin') {
      setUserId(COACH_ID);
    } else {
      setUserId(MEMBER_ID);
    }
  };

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
  }, [refreshKey]);

  return (
    <div className="app">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} userId={userId} />
      
      <main className="main-content">
        {currentPage === 'classes' && (
          <ClassList userId={userId} onToast={showToast} onBookingChange={refreshData} />
        )}
        {currentPage === 'profile' && (
          <Profile userId={userId} onToast={showToast} onBookingChange={refreshData} />
        )}
        {currentPage === 'admin' && (
          <AdminPanel userId={userId} onToast={showToast} refreshKey={refreshKey} />
        )}
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>

      <style>{`
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .main-content {
          flex: 1;
          padding: 24px;
          padding-top: 84px;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          z-index: 1000;
        }

        @media (max-width: 768px) {
          .main-content {
            padding: 16px;
            padding-top: 76px;
          }
          
          .toast-container {
            bottom: 16px;
            right: 16px;
            left: 16px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
