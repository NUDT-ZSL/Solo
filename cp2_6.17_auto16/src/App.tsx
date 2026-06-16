import React, { useCallback } from 'react';
import { Scene3D } from './components/Scene3D';
import { ControlPanel } from './components/ControlPanel';
import { useLightSimulation } from './hooks/useLightSimulation';

const appContainerStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'relative',
  overflow: 'hidden',
  background: '#0b0f1a'
};

const App: React.FC = () => {
  const simulation = useLightSimulation();

  const handleDragStart = useCallback(() => {
    console.log('Light source drag initiated from toolbar');
  }, []);

  return (
    <div style={appContainerStyle}>
      <Scene3D simulation={simulation} />
      <ControlPanel simulation={simulation} onDragStart={handleDragStart} />
    </div>
  );
};

export default App;
