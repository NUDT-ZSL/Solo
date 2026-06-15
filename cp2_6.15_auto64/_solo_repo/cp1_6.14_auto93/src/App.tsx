import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProjectList from './modules/project/ProjectList';
import ProjectCreate from './modules/project/ProjectCreate';
import ChapterDetail from './modules/project/ChapterDetail';
import { Project } from './types';

const NAV_HEIGHT = 56;

const App: React.FC = () => {
  const [currentUser] = useState({ id: 'user1', name: '漫画师A', avatar: '' });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <BrowserRouter>
      <nav style={{
        height: NAV_HEIGHT,
        background: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#2d2d2d' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="24" height="24" rx="4" fill="#4a6cf7" />
            <rect x="6" y="6" width="7" height="7" rx="1" fill="#faf3e0" />
            <rect x="15" y="6" width="7" height="7" rx="1" fill="#faf3e0" opacity="0.7" />
            <rect x="6" y="15" width="7" height="7" rx="1" fill="#faf3e0" opacity="0.7" />
            <rect x="15" y="15" width="7" height="7" rx="1" fill="#faf3e0" opacity="0.4" />
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#2d2d2d' }}>漫画进度管理</span>
        </Link>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '2px solid #4a6cf7',
              background: currentUser.avatar ? `url(${currentUser.avatar})` : '#4a6cf7',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {currentUser.name.charAt(0)}
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 44,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: '8px 0',
              minWidth: 160,
              zIndex: 1001,
            }}>
              <div style={{ padding: '8px 16px', fontSize: 14, color: '#2d2d2d', fontWeight: 500 }}>{currentUser.name}</div>
              <div style={{ height: 1, background: '#eee', margin: '4px 0' }} />
              <button
                onClick={() => setMenuOpen(false)}
                style={{ width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#666' }}
              >
                个人设置
              </button>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#666' }}
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      </nav>
      <main style={{ minHeight: `calc(100vh - ${NAV_HEIGHT}px)` }}>
        <Routes>
          <Route path="/" element={<ProjectList />} />
          <Route path="/projects/new" element={<ProjectCreate />} />
          <Route path="/projects/:projectId" element={<ProjectList />} />
          <Route path="/projects/:projectId/chapters/:chapterId" element={<ChapterDetail currentUser={currentUser} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;
