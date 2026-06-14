import React, { useState, useEffect } from 'react';
import UserPanel from './UserPanel';
import SessionRoom from './SessionRoom';
import { userAPI, sessionAPI } from './http';

interface User {
  id: string;
  nickname: string;
  nativeLanguage: string;
  targetLanguage: string;
  avatarColor: string;
  createdAt: number;
  isOnline: boolean;
}

type View = 'home' | 'session' | 'history';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<User | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    const userId = localStorage.getItem('lingoloop_userId');
    if (userId) {
      try {
        const res: any = await userAPI.getUser(userId);
        if (res.success) {
          setCurrentUser(res.user);
        }
      } catch (e) {
        console.error('Auto login error:', e);
        localStorage.removeItem('lingoloop_userId');
      }
    }
    setLoading(false);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('home');
  };

  const handleStartSession = (sessionId: string, partner: User) => {
    setActiveSessionId(sessionId);
    setActivePartner(partner);
    setIsReadOnly(false);
    setCurrentView('session');
  };

  const handleViewHistory = async (sessionId: string) => {
    try {
      const res: any = await sessionAPI.getSession(sessionId);
      if (res.success) {
        const session = res.session;
        const partnerId = session.participants.find(
          (p: string) => p !== currentUser?.id
        );
        if (partnerId) {
          const userRes: any = await userAPI.getUser(partnerId);
          if (userRes.success) {
            setActiveSessionId(sessionId);
            setActivePartner(userRes.user);
            setIsReadOnly(true);
            setCurrentView('history');
          }
        }
      }
    } catch (e) {
      console.error('View history error:', e);
    }
  };

  const handleBack = () => {
    setCurrentView('home');
    setActiveSessionId(null);
    setActivePartner(null);
    setIsReadOnly(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('lingoloop_userId');
    setCurrentUser(null);
    setCurrentView('home');
    setActiveSessionId(null);
    setActivePartner(null);
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-left">
          <h1 className="logo">LingoLoop</h1>
        </div>
        <div className="nav-right">
          {currentUser && (
            <div className="nav-user">
              <div
                className="nav-avatar"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.nickname.charAt(0).toUpperCase()}
              </div>
              <span className="nav-nickname">{currentUser.nickname}</span>
              <button className="logout-btn" onClick={handleLogout}>
                退出
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'home' && (
          <UserPanel
            currentUser={currentUser}
            onLogin={handleLogin}
            onStartSession={handleStartSession}
            onViewHistory={handleViewHistory}
          />
        )}

        {(currentView === 'session' || currentView === 'history') &&
          activeSessionId &&
          activePartner && (
            <SessionRoom
              sessionId={activeSessionId}
              currentUser={currentUser!}
              partner={activePartner}
              isReadOnly={isReadOnly}
              onBack={handleBack}
            />
          )}
      </main>
    </div>
  );
};

export default App;
