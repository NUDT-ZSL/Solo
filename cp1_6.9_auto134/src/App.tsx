import React, { useState, useMemo, useEffect } from 'react';
import { SandSystem, PARTICLE_COUNT } from './SandSystem';
import SceneView from './SceneView';
import UIOverlay from './UIOverlay';

const App: React.FC = () => {
  const [fps, setFps] = useState(0);
  const [clickPulse, setClickPulse] = useState(0);
  const sandSystem = useMemo(() => new SandSystem(), []);

  const handleFpsUpdate = (newFps: number) => {
    setFps(newFps);
  };

  useEffect(() => {
    const handleWindowClick = () => {
      setClickPulse((prev) => prev + 1);
    };

    window.addEventListener('click', handleWindowClick);
    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, []);

  const appStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #0B0C10 0%, #1F2833 100%)',
    transform: clickPulse > 0 ? `scale(${1 - 0.002 * Math.min(clickPulse % 2, 1)})` : 'scale(1)',
    transition: 'transform 0.1s ease-out',
  };

  useEffect(() => {
    if (clickPulse > 0) {
      const timer = setTimeout(() => {
        setClickPulse(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [clickPulse]);

  return (
    <div style={appStyle}>
      <SceneView sandSystem={sandSystem} onFpsUpdate={handleFpsUpdate} />
      <UIOverlay fps={fps} particleCount={PARTICLE_COUNT} />
    </div>
  );
};

export default App;
