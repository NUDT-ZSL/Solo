import { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import StationPanel from './components/StationPanel';
import { simulatedDataProvider } from './services/SimulatedDataProvider';
import { stationMonitor } from './services/StationMonitor';

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function App() {
  const [currentTime, setCurrentTime] = useState(formatTime(new Date()));
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime(new Date()));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    stationMonitor.start();
    simulatedDataProvider.start();

    return () => {
      simulatedDataProvider.stop();
      stationMonitor.stop();
    };
  }, []);

  const handleRefresh = useCallback(() => {
    simulatedDataProvider.refresh();
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0f0f23',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div
        style={{
          height: 48,
          background: '#0f0f23',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          zIndex: 200
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button
              onClick={togglePanel}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: '#1e293b',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                transition: 'background 0.2s ease'
              }}
            >
              ☰
            </button>
          )}
          <span style={{ fontSize: 24 }}>🚇</span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              letterSpacing: 0.5
            }}
          >
            MetroFlow
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 14,
              color: '#94a3b8',
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace'
            }}
          >
            {currentTime}
          </span>
          <button
            onClick={handleRefresh}
            title="立即刷新数据"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: '#1e293b',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#334155';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e293b';
            }}
          >
            ⟳
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 48px)'
        }}
      >
        {!isMobile && <StationPanel />}
        {isMobile && (
          <StationPanel isMobile isOpen={panelOpen} onClose={closePanel} />
        )}

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: isMobile ? 0 : 352,
            right: 16,
            bottom: 16,
            transition: 'left 0.3s ease'
          }}
        >
          <MapView />
        </div>
      </div>
    </div>
  );
}
