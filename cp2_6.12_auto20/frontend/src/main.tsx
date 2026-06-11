import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import GalleryScene from './components/GalleryScene';
import AdminPanel from './components/AdminPanel';
import ArtworkPopup from './components/ArtworkPopup';
import { fetchHalls, Hall, Artwork } from './services/api';

function App() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [activeHallId, setActiveHallId] = useState<string>('');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [adminVisible, setAdminVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);

  const loadHalls = useCallback(async () => {
    try {
      const data = await fetchHalls();
      setHalls(data);
      if (data.length > 0 && !activeHallId) {
        setActiveHallId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load halls:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHalls();
  }, [loadHalls]);

  const handleArtworkClick = useCallback((artwork: Artwork) => {
    setSelectedArtwork(artwork);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedArtwork(null);
  }, []);

  const handleHallChange = useCallback((hallId: string) => {
    setActiveHallId(hallId);
  }, []);

  if (loading) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: '#C5A55A',
        fontFamily: 'Georgia, serif',
        fontSize: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛️</div>
          <div>展览馆加载中...</div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2520 50%, #1a1a1a 100%)',
        color: '#FAF8F2',
        fontFamily: 'Georgia, serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 500 }}>
          <div style={{ fontSize: 64, marginBottom: 24 }}>🏛️</div>
          <h1 style={{ fontSize: 36, color: '#C5A55A', marginBottom: 12, fontWeight: 'normal' }}>
            虚拟展览馆
          </h1>
          <p style={{ color: '#8D6E63', marginBottom: 32, lineHeight: 1.8, fontSize: 16 }}>
            漫步于数字展厅之间，近距离欣赏每一幅画作
          </p>
          <button
            onClick={() => setStarted(true)}
            style={{
              background: 'linear-gradient(135deg, #C5A55A, #D4AF37)',
              color: '#3E2723',
              border: 'none',
              padding: '14px 48px',
              fontSize: 18,
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontWeight: 'bold',
              letterSpacing: 2,
            }}
          >
            进入展馆
          </button>
          <div style={{ marginTop: 24, color: '#5D4037', fontSize: 13 }}>
            WASD 移动 · 鼠标拖动旋转视野 · 点击画作查看详情
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <GalleryScene
        halls={halls}
        activeHallId={activeHallId}
        onHallChange={handleHallChange}
        onArtworkClick={handleArtworkClick}
      />

      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'linear-gradient(180deg, rgba(26,26,26,0.8), transparent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        pointerEvents: 'none',
        zIndex: 100,
      }}>
        <div style={{
          color: '#C5A55A',
          fontFamily: 'Georgia, serif',
          fontSize: 16,
          fontWeight: 'bold',
          letterSpacing: 2,
        }}>
          🏛️ 虚拟展览馆
        </div>
        <div style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
          {halls.map(hall => (
            <button
              key={hall.id}
              onClick={() => setActiveHallId(hall.id)}
              style={{
                background: activeHallId === hall.id
                  ? 'linear-gradient(135deg, #C5A55A, #D4AF37)'
                  : 'rgba(62, 39, 35, 0.7)',
                color: activeHallId === hall.id ? '#3E2723' : '#D7CCC8',
                border: '1px solid #C5A55A',
                padding: '6px 16px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: 13,
              }}
            >
              {hall.name}
            </button>
          ))}
          <button
            onClick={() => setAdminVisible(true)}
            style={{
              background: 'rgba(62, 39, 35, 0.7)',
              color: '#C5A55A',
              border: '1px solid #C5A55A',
              padding: '6px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'Georgia, serif',
              fontSize: 13,
            }}
          >
            ⚙️ 管理
          </button>
        </div>
      </div>

      {/* Crosshair */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 6,
        height: 6,
        borderRadius: '50%',
        border: '1.5px solid rgba(197, 165, 90, 0.5)',
        pointerEvents: 'none',
        zIndex: 50,
      }} />

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(215, 204, 200, 0.5)',
        fontFamily: 'Georgia, serif',
        fontSize: 12,
        pointerEvents: 'none',
        zIndex: 50,
      }}>
        点击屏幕锁定鼠标 · ESC 释放 · WASD 移动
      </div>

      <ArtworkPopup artwork={selectedArtwork} onClose={handleClosePopup} />
      <AdminPanel visible={adminVisible} onClose={() => setAdminVisible(false)} halls={halls} onRefresh={loadHalls} />
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
