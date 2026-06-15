import { useState, useEffect, useCallback } from 'react';
import MapView from './MapView';
import BeaconForm from './BeaconForm';
import type { Visibility } from '../../server/beaconModel';

interface Beacon {
  id: string;
  x: number;
  y: number;
  text: string;
  visibility: Visibility;
  visits: number;
  createdAt: number;
  initialHue: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  startTime: number;
}

function App() {
  const [beacons, setBeacons] = useState<Beacon[]>([]);
  const [formPosition, setFormPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedBeacon, setSelectedBeacon] = useState<Beacon | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const fetchBeacons = useCallback(async () => {
    try {
      const res = await fetch('/api/beacons');
      const data = await res.json();
      setBeacons(data);
    } catch (err) {
      console.error('Failed to fetch beacons:', err);
    }
  }, []);

  useEffect(() => {
    fetchBeacons();
    const interval = setInterval(fetchBeacons, 10000);
    return () => clearInterval(interval);
  }, [fetchBeacons]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const addRipple = useCallback((x: number, y: number) => {
    const ripple: Ripple = {
      id: Date.now() + Math.random(),
      x,
      y,
      startTime: Date.now()
    };
    setRipples(prev => [...prev, ripple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== ripple.id));
    }, 800);
  }, []);

  const handleMapClick = useCallback((x: number, y: number) => {
    setFormPosition({ x, y });
    setSelectedBeacon(null);
  }, []);

  const handleBeaconClick = useCallback(async (beacon: Beacon) => {
    addRipple(beacon.x, beacon.y);
    try {
      const res = await fetch(`/api/beacons/${beacon.id}/visit`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setBeacons(prev => prev.map(b => b.id === updated.id ? updated : b));
        setSelectedBeacon(updated);
      }
    } catch (err) {
      console.error('Failed to record visit:', err);
      setSelectedBeacon(beacon);
    }
  }, [addRipple]);

  const handleFormSubmit = useCallback(async (text: string, visibility: Visibility) => {
    if (!formPosition) return;
    try {
      const res = await fetch('/api/beacons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: formPosition.x,
          y: formPosition.y,
          text,
          visibility
        })
      });
      if (res.ok) {
        const newBeacon = await res.json();
        addRipple(formPosition.x, formPosition.y);
        setBeacons(prev => [...prev, newBeacon]);
        setFormPosition(null);
        showToast('信标已点亮');
      }
    } catch (err) {
      console.error('Failed to create beacon:', err);
    }
  }, [formPosition, addRipple, showToast]);

  const handleFormCancel = useCallback(() => {
    setFormPosition(null);
  }, []);

  const handleCloseCard = useCallback(() => {
    setSelectedBeacon(null);
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>余烬信标</h1>
        <div style={styles.viewToggle}>
          <button
            onClick={() => setView('map')}
            style={{ ...styles.toggleBtn, ...(view === 'map' ? styles.toggleBtnActive : {}) }}
          >
            地图视图
          </button>
          <button
            onClick={() => setView('list')}
            style={{ ...styles.toggleBtn, ...(view === 'list' ? styles.toggleBtnActive : {}) }}
          >
            列表视图
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'map' ? (
          <div style={styles.mapContainer}>
            <MapView
              beacons={beacons}
              ripples={ripples}
              onMapClick={handleMapClick}
              onBeaconClick={handleBeaconClick}
            />
            {toast && (
              <div style={styles.toast}>
                {toast}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.listContainer}>
            {beacons.length === 0 ? (
              <p style={styles.emptyText}>暂无信标，前往地图视图点亮第一个信标吧</p>
            ) : (
              beacons.map(beacon => (
                <div key={beacon.id} style={styles.listItem}>
                  <div style={styles.listItemText}>{beacon.text}</div>
                  <div style={styles.listItemMeta}>
                    <span style={styles.visibilityTag(beacon.visibility)}>
                      {beacon.visibility === 'public' ? '公开' : beacon.visibility === 'friends' ? '好友' : '仅自己'}
                    </span>
                    <span style={styles.visitCount}>点燃 {beacon.visits} 次</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {formPosition && (
        <div style={styles.modalOverlay} onClick={handleFormCancel}>
          <div onClick={e => e.stopPropagation()}>
            <BeaconForm
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}

      {selectedBeacon && (
        <div style={styles.modalOverlay} onClick={handleCloseCard}>
          <div style={styles.beaconCard} onClick={e => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={handleCloseCard}>
              关闭
            </button>
            <div style={styles.cardContent}>
              <p style={styles.cardText}>{selectedBeacon.text}</p>
              <div style={styles.cardFooter}>
                <span style={styles.visibilityTag(selectedBeacon.visibility)}>
                  {selectedBeacon.visibility === 'public' ? '公开' :
                   selectedBeacon.visibility === 'friends' ? '好友' : '仅自己'}
                </span>
                <span style={styles.visitCount}>
                  点燃 {selectedBeacon.visits} 次
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px',
    '@media (max-width: 799px)': {
      padding: '8px'
    }
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '12px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#ff6b6b',
    textShadow: '0 0 20px rgba(255, 107, 107, 0.5)',
    letterSpacing: '4px'
  },
  viewToggle: {
    display: 'flex',
    gap: '8px',
    background: 'rgba(26, 26, 46, 0.6)',
    padding: '4px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  toggleBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#a0a0c0',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  toggleBtnActive: {
    background: 'rgba(255, 107, 107, 0.2)',
    color: '#ff6b6b'
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center' as const,
    alignItems: 'flex-start' as const
  },
  mapContainer: {
    position: 'relative' as const
  },
  toast: {
    position: 'absolute' as const,
    bottom: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    background: 'rgba(26, 26, 46, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: '#e0e0ff',
    fontSize: '14px',
    animation: 'fadeInOut 2s ease-out',
    pointerEvents: 'none' as const
  },
  listContainer: {
    width: '100%',
    maxWidth: '600px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },
  emptyText: {
    textAlign: 'center' as const,
    color: '#8080a0',
    padding: '40px',
    fontSize: '16px'
  },
  listItem: {
    padding: '16px',
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  listItemText: {
    fontSize: '14px',
    lineHeight: 1.6,
    marginBottom: '12px',
    color: '#e0e0ff'
  },
  listItemMeta: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const
  },
  visibilityTag: (v: string) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    background: v === 'public' ? 'rgba(76, 175, 80, 0.2)' :
                v === 'friends' ? 'rgba(33, 150, 243, 0.2)' : 'rgba(255, 107, 107, 0.2)',
    color: v === 'public' ? '#4caf50' :
           v === 'friends' ? '#2196f3' : '#ff6b6b'
  }),
  visitCount: {
    fontSize: '13px',
    color: '#a0a0c0'
  },
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 100,
    padding: '16px'
  },
  beaconCard: {
    position: 'relative' as const,
    minWidth: '320px',
    maxWidth: '440px',
    width: '100%',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(16px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    padding: '20px'
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '12px',
    left: '12px',
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#a0a0c0',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease-out'
  },
  cardContent: {
    marginTop: '32px'
  },
  cardText: {
    fontSize: '16px',
    lineHeight: 1.7,
    marginBottom: '20px',
    color: '#e0e0ff',
    whiteSpace: 'pre-wrap' as const
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '16px'
  }
};

export default App;
