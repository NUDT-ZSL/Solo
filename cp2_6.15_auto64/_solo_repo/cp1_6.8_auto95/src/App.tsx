import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TimeCapsuleEngine } from './TimeCapsuleEngine';
import { NotificationScheduler } from './NotificationScheduler';

const LetterEditor = lazy(() =>
  import('./LetterEditor').then((m) => ({ default: m.LetterEditor }))
);
const LetterList = lazy(() =>
  import('./LetterList').then((m) => ({ default: m.LetterList }))
);

type View = 'home' | 'write' | 'list';

export const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [token, setToken] = useState<string | null>(null);
  const [inputToken, setInputToken] = useState('');
  const engine = TimeCapsuleEngine.getInstance();

  useEffect(() => {
    const saved = engine.getToken();
    if (saved) {
      setToken(saved);
    }
    const scheduler = NotificationScheduler.getInstance();
    scheduler.start();
    return () => {
      scheduler.stop();
    };
  }, []);

  const handleSubmitted = (newToken: string) => {
    setToken(newToken);
    setView('list');
  };

  const handleViewList = () => {
    if (token) {
      setView('list');
    } else if (inputToken.trim()) {
      setToken(inputToken.trim());
      engine.setToken(inputToken.trim());
      setView('list');
    }
  };

  return (
    <div className="app">
      {view === 'home' && (
        <div className="home-page fade-in">
          <div className="capsule-float">
            <div className="capsule-icon">
              <div className="capsule-body">
                <div className="capsule-top" />
                <div className="capsule-bottom" />
                <div className="capsule-glow" />
              </div>
              <div className="capsule-shadow" />
            </div>
          </div>

          <h1 className="app-title">时光胶囊</h1>
          <p className="app-subtitle">寄一封信给未来的自己</p>

          <div className="home-actions">
            <button
              className="home-btn primary"
              onClick={() => setView('write')}
              type="button"
            >
              ✉️ 写一封信
            </button>

            <div className="token-section">
              <p className="token-label">已有访问令牌？</p>
              <div className="token-input-group">
                <input
                  type="text"
                  className="token-input"
                  placeholder="输入你的令牌..."
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                />
                <button
                  className="home-btn secondary"
                  onClick={handleViewList}
                  type="button"
                >
                  查看信件
                </button>
              </div>
            </div>
          </div>

          <div className="home-footer">
            <p>信件加密封存 · 到期邮件通知 · 匿名安全</p>
          </div>
        </div>
      )}

      {view === 'write' && (
        <Suspense fallback={<div className="loading-state"><div className="loading-spinner" /></div>}>
          <div className="fade-in">
            <LetterEditor onSubmitted={handleSubmitted} />
            <button
              className="back-home-btn"
              onClick={() => setView('home')}
              type="button"
            >
              ← 返回首页
            </button>
          </div>
        </Suspense>
      )}

      {view === 'list' && (
        <Suspense fallback={<div className="loading-state"><div className="loading-spinner" /></div>}>
          <LetterList
            token={token}
            onBack={() => setView('home')}
          />
        </Suspense>
      )}
    </div>
  );
};
