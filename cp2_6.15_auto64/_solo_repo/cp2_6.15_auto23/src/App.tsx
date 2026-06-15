import React, { useEffect } from 'react';
import { useStore } from './store';
import GridRenderer from './GridRenderer';
import ControlsPanel from './ControlsPanel';

export default function App() {
  const initWorker = useStore((state) => state.initWorker);

  useEffect(() => {
    initWorker();
  }, [initWorker]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 'calc(100% - 280px)',
          height: '100%',
        }}
      >
        <GridRenderer />
      </div>
      <ControlsPanel />
    </div>
  );
}
