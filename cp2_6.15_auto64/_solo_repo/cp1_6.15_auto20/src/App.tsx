import { useState, useCallback, useEffect } from 'react';
import { Music, BookOpen, Users } from 'lucide-react';
import ScoreEditor from './components/ScoreEditor';
import ScoreList from './components/ScoreList';
import CommunityPage from './components/CommunityPage';

type TabKey = 'editor' | 'myScores' | 'community';

const TABS: { key: TabKey; label: string; icon: typeof Music }[] = [
  { key: 'editor', label: '新建乐谱', icon: Music },
  { key: 'myScores', label: '我的乐谱', icon: BookOpen },
  { key: 'community', label: '社区乐谱', icon: Users },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('editor');
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState(0);

  const handleTabChange = useCallback((key: TabKey) => {
    if (key === activeTab) return;
    const idx = TABS.findIndex(t => t.key === activeTab);
    const newIdx = TABS.findIndex(t => t.key === key);
    setSlideDir(newIdx > idx ? 'left' : 'right');
    setActiveTab(key);
    setAnimKey(k => k + 1);
  }, [activeTab]);

  const [refreshList, setRefreshList] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshList(c => c + 1), []);

  const [toast, setToast] = useState<{ message: string; exiting: boolean } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ message, exiting: false });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, exiting: true } : null);
      setTimeout(() => setToast(null), 300);
    }, 2000);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {toast && (
        <div
          className={toast.exiting ? 'toast-exit' : 'toast-enter'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#22c55e',
            color: '#fff',
            textAlign: 'center',
            padding: '10px 20px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {toast.message}
        </div>
      )}

      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            height: 56,
            gap: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
            <Music size={22} color="#e94560" />
            <span style={{ fontWeight: 700, fontSize: 18, color: '#e94560' }}>乐谱工坊</span>
          </div>

          <div style={{ display: 'flex', position: 'relative', height: '100%' }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isActive ? '#e94560' : '#8888aa',
                    cursor: 'pointer',
                    padding: '0 16px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    position: 'relative',
                    transition: 'color 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: '#e94560',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          padding: '24px',
          overflow: 'auto',
        }}
      >
        <div
          key={animKey}
          className={slideDir === 'left' ? 'content-slide-left' : 'content-slide-right'}
        >
          {activeTab === 'editor' && (
            <ScoreEditor showToast={showToast} triggerRefresh={triggerRefresh} />
          )}
          {activeTab === 'myScores' && (
            <ScoreList refreshKey={refreshList} showToast={showToast} />
          )}
          {activeTab === 'community' && <CommunityPage />}
        </div>
      </main>
    </div>
  );
}
