import React, { useState, useEffect, useRef } from 'react';
import { EEGProvider, useEEGContext } from './context/EEGContext';
import BrainScene from './modules/scene/BrainScene';
import ControlPanel from './modules/panel/ControlPanel';
import AlertBar from './components/AlertBar';
import RegionTooltip from './components/RegionTooltip';
import type { BrainRegion } from './types';

function computeAvgSignal(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

function computePeakFrequency(data: number[]): number {
  const n = data.length;
  if (n === 0) return 0;

  let maxCorr = 0;
  let peakPeriod = 1;

  for (let lag = 1; lag < Math.min(n / 2, 50); lag++) {
    let corr = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += data[i] * data[i + lag];
    }
    corr /= (n - lag);
    if (corr > maxCorr) {
      maxCorr = corr;
      peakPeriod = lag;
    }
  }

  const sampleRate = 256;
  return sampleRate / peakPeriod;
}

function AppContent() {
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { alertRegions, hoveredRegion, eegData } = useEEGContext();
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsPanelOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getRegionStats = (region: BrainRegion) => {
    const data = eegData?.data[region] || [];
    return {
      avgSignal: computeAvgSignal(data),
      peakFrequency: computePeakFrequency(data)
    };
  };

  return (
    <div style={styles.container}>
      <div
        ref={sceneRef}
        style={{
          ...styles.sceneContainer,
          width: isMobile ? '100%' : '65%'
        }}
      >
        <BrainScene />
      </div>

      {isMobile && (
        <button
          style={styles.mobileToggle}
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = '#4f46e5';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = '#6366f1';
          }}
        >
          {isPanelOpen ? '收起面板' : '展开面板'}
        </button>
      )}

      <div
        style={{
          ...styles.panelContainer,
          width: isMobile ? '100%' : '35%',
          height: isMobile ? (isPanelOpen ? '300px' : '0') : '100%',
          opacity: isMobile ? (isPanelOpen ? 1 : 0) : 1,
          pointerEvents: isMobile && !isPanelOpen ? 'none' : 'auto',
          transition: 'all 0.3s ease'
        }}
      >
        <ControlPanel />
      </div>

      {alertRegions.length > 0 && (
        <AlertBar regions={alertRegions} />
      )}

      {hoveredRegion && eegData && (
        <RegionTooltip
          region={hoveredRegion}
          position={mousePosition}
          avgSignal={getRegionStats(hoveredRegion).avgSignal}
          peakFrequency={getRegionStats(hoveredRegion).peakFrequency}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <EEGProvider>
      <AppContent />
    </EEGProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    position: 'relative',
    overflow: 'hidden'
  },
  sceneContainer: {
    height: '100%',
    position: 'relative',
    borderRight: '1px solid #2a2a5a'
  },
  panelContainer: {
    position: 'relative',
    background: 'rgba(17, 17, 51, 0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderLeft: '1px solid #2a2a5a',
    overflow: 'hidden',
    borderRadius: '16px 0 0 16px'
  },
  mobileToggle: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    padding: '10px 20px',
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
    transition: 'all 0.2s ease'
  }
};

export default App;
