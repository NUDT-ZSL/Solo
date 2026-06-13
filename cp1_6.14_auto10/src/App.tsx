import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import MeetingRoom from './pages/MeetingRoom';

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
  },
  loginContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '24px',
    gap: '16px',
  },
  loginTitle: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '4px',
  },
  loginSubtitle: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '24px',
  },
  loginButton: {
    padding: '12px 32px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 32px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#6366f1',
    cursor: 'pointer',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
  },
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1e293b',
  },
};

const AppContent: React.FC = () => {
  const { currentUser, login, setCurrentMeeting } = useApp();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'meeting'>('dashboard');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await login('user1');
      } catch (error) {
        console.error('登录失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [login]);

  const handleMeetingClick = (meetingId: string) => {
    setSelectedMeetingId(meetingId);
    setCurrentPage('meeting');
  };

  const handleBackToDashboard = () => {
    setSelectedMeetingId(null);
    setCurrentMeeting(null);
    setCurrentPage('dashboard');
  };

  const handleLogoClick = () => {
    handleBackToDashboard();
  };

  if (isLoading) {
    return (
      <div style={styles.app}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>正在加载...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.app}>
        <div style={styles.loginContainer}>
          <h1 style={styles.loginTitle}>BookCollab</h1>
          <p style={styles.loginSubtitle}>在线选题协作与决策平台</p>
          <button style={styles.loginButton} onClick={() => login('user1')}>
            以张编辑身份登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logo} onClick={handleLogoClick}>
          📚 BookCollab
        </div>
        <div style={styles.userInfo}>
          <div style={{ ...styles.userAvatar, backgroundColor: currentUser.avatar }}>
            {currentUser.name.charAt(0)}
          </div>
          <span style={styles.userName}>{currentUser.name}</span>
        </div>
      </header>
      <main>
        {currentPage === 'dashboard' && (
          <Dashboard onMeetingClick={handleMeetingClick} />
        )}
        {currentPage === 'meeting' && selectedMeetingId && (
          <MeetingRoom meetingId={selectedMeetingId} onBack={handleBackToDashboard} />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
