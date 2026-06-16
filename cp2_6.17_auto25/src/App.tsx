import { useEffect, useState, useRef } from 'react';
import Scene from './components/Scene';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import { useTrafficStore } from './store/trafficStore';

export default function App() {
  const { startSimulation, sceneOpacity, isTransitioning } = useTrafficStore();
  const [displayOpacity, setDisplayOpacity] = useState(1);
  const animationRef = useRef<number | null>(null);
  const prevOpacity = useRef(1);

  useEffect(() => {
    startSimulation();
  }, [startSimulation]);

  useEffect(() => {
    if (prevOpacity.current === sceneOpacity) return;

    const startValue = prevOpacity.current;
    const endValue = sceneOpacity;
    const duration = 500;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      
      setDisplayOpacity(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        prevOpacity.current = endValue;
      }
    };

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sceneOpacity]);

  return (
    <div style={appStyle}>
      <div 
        style={{
          ...sceneContainerStyle,
          opacity: displayOpacity
        }}
      >
        <Scene />
      </div>
      <ControlPanel />
      <StatsPanel />
      {isTransitioning && (
        <div style={{
          ...overlayStyle,
          opacity: displayOpacity < 0.8 ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}>
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
