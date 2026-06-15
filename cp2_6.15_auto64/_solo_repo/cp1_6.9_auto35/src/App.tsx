import React, { useState, useEffect, useCallback } from 'react';
import EmojiForge from './components/EmojiForge';
import SpiritGallery from './components/SpiritGallery';
import type { Spirit } from './types';

type View = 'forge' | 'gallery';

interface ToastMessage {
  text: string;
  type: 'success' | 'error';
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('forge');
  const [spirits, setSpirits] = useState<Spirit[]>([]);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const fetchSpirits = useCallback(async () => {
    try {
      const res = await fetch('/api/spirits');
      if (res.ok) {
        const data = await res.json();
        setSpirits(data);
      }
    } catch (err) {
      console.error('获取精灵列表失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchSpirits();
  }, [fetchSpirits]);

  const handleSpiritCreated = useCallback(() => {
    fetchSpirits();
    showToast('✨ 精灵锻造成功！已加入画廊');
    setActiveView('gallery');
  }, [fetchSpirits, showToast]);

  const handleSpiritDeleted = useCallback(() => {
    fetchSpirits();
    showToast('精灵已删除', 'success');
  }, [fetchSpirits, showToast]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <span>🧙‍♂️</span>
          <span>情绪精灵锻造工坊</span>
        </div>
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeView === 'forge' ? 'active' : ''}`}
            onClick={() => setActiveView('forge')}
          >
            ⚒️ 锻造
          </button>
          <button
            className={`nav-tab ${activeView === 'gallery' ? 'active' : ''}`}
            onClick={() => setActiveView('gallery')}
          >
            🖼️ 画廊 ({spirits.length})
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'forge' ? (
          <EmojiForge onCreated={handleSpiritCreated} onError={(msg) => showToast(msg, 'error')} />
        ) : (
          <SpiritGallery
            spirits={spirits}
            onDeleted={handleSpiritDeleted}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}
      </main>

      {toast && (
        <div className={`message-toast ${toast.type}`}>{toast.text}</div>
      )}
    </div>
  );
};

export default App;
