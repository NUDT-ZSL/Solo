import React, { useRef, useState, useEffect } from 'react';
import ViewfinderScene, { ViewfinderSceneHandle } from './modules/viewfinder/ViewfinderScene';
import ControlPanel from './modules/controls/ControlPanel';
import { useParamStore, Snapshot } from './store/paramStore';
import { getSnapshots } from './api/mockApi';

const App: React.FC = () => {
  const viewRef = useRef<ViewfinderSceneHandle>(null);
  const [shutterAnimating, setShutterAnimating] = useState(false);
  const resetParams = useParamStore((s) => s.resetParams);
  const snapshots = useParamStore((s) => s.snapshots);
  const addSnapshot = useParamStore((s) => s.addSnapshot);

  useEffect(() => {
    (async () => {
      const loaded = await getSnapshots();
      if (loaded && loaded.length > 0) {
        loaded.slice(0, 20).forEach((s: Snapshot) => addSnapshot(s));
      }
    })();
  }, [addSnapshot]);

  const handleShutterClick = () => {
    viewRef.current?.capture();
  };

  return (
    <div style={styles.root}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <button
            onClick={resetParams}
            style={styles.resetBtn}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#90a4ae')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#78909c')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <path
                d="M3 12a9 9 0 1 0 3-6.7L3 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 3v5h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            重置参数
          </button>
        </div>
        <div style={styles.toolbarTitle}>
          <span style={styles.titleEmoji}>📷</span>
          <span style={styles.titleText}>复古取景器模拟器</span>
        </div>
        <div style={styles.toolbarRight}>
          <div style={styles.statusDot} />
          <span style={styles.statusText}>ONLINE</span>
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.leftArea}>
          <div style={styles.viewfinderContainer}>
            <ViewfinderScene ref={viewRef} onShutterAnimating={setShutterAnimating} />
          </div>
          <div style={styles.footerArea}>
            <ControlPanel onShutterClick={handleShutterClick} shutterAnimating={shutterAnimating} />
          </div>
        </div>

        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <span style={styles.sidebarTitle}>拍摄记录</span>
            <span style={styles.sidebarCount}>{snapshots.length}/20</span>
          </div>
          <div style={styles.sidebarDivider} />

          {snapshots.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🎞️</div>
              <div style={styles.emptyText}>暂无拍摄记录</div>
              <div style={styles.emptyHint}>调整参数并按快门按钮拍摄</div>
            </div>
          ) : (
            <div style={styles.snapshotsList}>
              {snapshots.map((snap) => (
                <div key={snap.id} style={styles.snapshotCard}>
                  <img src={snap.imageData} alt="snapshot" style={styles.snapshotImg} />
                  <div style={styles.snapshotParams}>
                    <div style={styles.paramLine}>
                      <span style={styles.paramKey}>光圈</span>
                      <span style={styles.paramVal}>F/{snap.aperture.toFixed(1)}</span>
                    </div>
                    <div style={styles.paramLine}>
                      <span style={styles.paramKey}>快门</span>
                      <span style={styles.paramVal}>{snap.shutter}</span>
                    </div>
                    <div style={styles.paramLine}>
                      <span style={styles.paramKey}>焦距</span>
                      <span style={styles.paramVal}>{snap.focalLength}mm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    minHeight: '100vh',
    background: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Courier New', Courier, monospace",
  },
  toolbar: {
    height: 56,
    background: '#37474f',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    borderBottom: '1px solid #263238',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    flexShrink: 0,
  },
  toolbarLeft: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  resetBtn: {
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    background: '#78909c',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s ease, transform 0.1s ease',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  toolbarTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  titleEmoji: {
    fontSize: 20,
  },
  titleText: {
    color: '#eceff1',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
    textShadow: '0 1px 2px rgba(0,0,0,0.4)',
  },
  toolbarRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#66bb6a',
    boxShadow: '0 0 8px #66bb6a',
    animation: 'blink 1.5s infinite',
  },
  statusText: {
    color: '#90a4ae',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
  },
  main: {
    flex: 1,
    display: 'flex',
    padding: 16,
    gap: 16,
    minHeight: 'calc(100vh - 56px)',
    alignItems: 'flex-start',
  },
  leftArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  },
  viewfinderContainer: {
    width: '100%',
    background: '#121212',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), 0 4px 20px rgba(0,0,0,0.4)',
    minHeight: 420,
    position: 'relative',
    padding: 20,
    overflow: 'hidden',
  },
  footerArea: {
    flexShrink: 0,
  },
  sidebar: {
    width: 300,
    background: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    flexShrink: 0,
    overflow: 'hidden',
    minHeight: 540,
    maxHeight: 'calc(100vh - 88px)',
    position: 'sticky',
    top: 16,
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    color: '#eceff1',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 1,
  },
  sidebarCount: {
    color: '#78909c',
    fontSize: 12,
    fontFamily: "'Courier New', monospace",
  },
  sidebarDivider: {
    height: 1,
    background: '#333',
    margin: '12px 0',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '32px 16px',
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyText: {
    color: '#78909c',
    fontSize: 14,
    fontWeight: 600,
  },
  emptyHint: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
  snapshotsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    paddingRight: 4,
  },
  snapshotCard: {
    background: '#262626',
    borderRadius: 8,
    overflow: 'hidden',
    border: '1px solid #333',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  snapshotImg: {
    width: '100%',
    height: 'auto',
    display: 'block',
    borderRadius: 8,
  },
  snapshotParams: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  paramLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
    lineHeight: 1.8,
  },
  paramKey: {
    color: '#90a4ae',
    fontFamily: "'Courier New', monospace",
  },
  paramVal: {
    color: '#e0e0e0',
    fontFamily: "'Courier New', monospace",
    fontWeight: 600,
  },
};

export default App;
