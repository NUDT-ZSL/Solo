import { useEffect } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import { useTrafficStore } from './store/trafficStore';

export default function App() {
  const { startSimulation, sceneOpacity, isTransitioning } = useTrafficStore();

  useEffect(() => {
    startSimulation();
  }, [startSimulation]);

  return (
    <div style={appStyle}>
      <div 
        style={{
          ...sceneContainerStyle,
          opacity: sceneOpacity,
          transition: 'opacity 0.5s ease'
        }}
      >
        <Scene />
      </div>
      <ControlPanel />
      <StatsPanel />
      {isTransitioning && (
        <div style={overlayStyle}>
          <div style={loadingTextStyle}>切换模式中...</div>
        </div>
      )}
    </div>
  );
}

const appStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'relative',
  overflow: 'hidden',
  minWidth: '1024px',
  display: 'flex',
  flexWrap: 'wrap'
};

const sceneContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  position: 'absolute',
  top: 0,
  left: 0
};

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 200,
  pointerEvents: 'none'
};

const loadingTextStyle: React.CSSProperties = {
  color: '#dfe6e9',
  fontSize: '18px',
  fontWeight: 500,
  letterSpacing: '2px'
};
