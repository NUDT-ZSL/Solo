import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import BookClubList from './components/BookClubList';
import DiscussionBoard from './components/DiscussionBoard';

interface User {
  id: string;
  username: string;
  nickname: string;
  createdAt: string;
}

interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  bookAuthor: string;
  description: string;
  hostId: string;
  hostName: string;
  memberCount: number;
  memberIds?: string[];
  members?: { id: string; nickname: string }[];
  createdAt: string;
}

interface AppContextType {
  user: User | null;
  login: (username: string, nickname?: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

type View = 
  | { type: 'list' }
  | { type: 'club'; clubId: string }
  | { type: 'topic'; clubId: string; topicId: string };

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>({ type: 'list' });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginNickname, setLoginNickname] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('bookclub_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = useCallback(async (username: string, nickname?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, nickname })
    });
    const data = await res.json();
    if (data.user) {
      setUser(data.user);
      localStorage.setItem('bookclub_user', JSON.stringify(data.user));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('bookclub_user');
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser) {
      await login(loginUsername, loginNickname);
    } else {
      try {
        await login(loginUsername);
      } catch {
        setIsNewUser(true);
        return;
      }
    }
    setShowLoginModal(false);
    setLoginUsername('');
    setLoginNickname('');
    setIsNewUser(false);
  };

  const goToList = () => setView({ type: 'list' });
  const goToClub = (clubId: string) => setView({ type: 'club', clubId });
  const goToTopic = (clubId: string, topicId: string) => 
    setView({ type: 'topic', clubId, topicId });

  return (
    <AppContext.Provider value={{ user, login, logout }}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1 className="app-title" onClick={goToList} style={{ cursor: 'pointer' }}>
              📚 读书会
            </h1>
            <div className="header-right">
              {user ? (
                <div className="user-info">
                  <span className="user-nickname">{user.nickname}</span>
                  <button className="btn btn-secondary" onClick={logout}>
                    退出
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
                  登录 / 注册
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="app-main">
          {view.type === 'list' && (
            <BookClubList 
              onSelectClub={goToClub} 
              user={user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}
          {view.type === 'club' && (
            <DiscussionBoard
              clubId={view.clubId}
              mode="club"
              onBack={goToList}
              onSelectTopic={(topicId) => goToTopic(view.clubId, topicId)}
              user={user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}
          {view.type === 'topic' && (
            <DiscussionBoard
              clubId={view.clubId}
              topicId={view.topicId}
              mode="topic"
              onBack={() => goToClub(view.clubId)}
              user={user}
              onRequireLogin={() => setShowLoginModal(true)}
            />
          )}
        </main>

        {showLoginModal && (
          <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>{isNewUser ? '注册新账号' : '登录'}</h2>
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label>用户名</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    placeholder="请输入用户名"
                    required
                  />
                </div>
                {isNewUser && (
                  <div className="form-group">
                    <label>昵称</label>
                    <input
                      type="text"
                      value={loginNickname}
                      onChange={e => setLoginNickname(e.target.value)}
                      placeholder="请输入昵称"
                      required
                    />
                  </div>
                )}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {isNewUser ? '注册' : '登录'}
                  </button>
                  {!isNewUser && (
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => setIsNewUser(true)}
                    >
                      新用户？点击注册
                    </button>
                  )}
                  {isNewUser && (
                    <button
                      type="button"
                      className="btn btn-link"
                      onClick={() => setIsNewUser(false)}
                    >
                      返回登录
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

export default App;
export type { User, BookClub };
