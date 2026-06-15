import React, { useMemo, useState, useCallback } from 'react';
import ControlPanel from './components/ControlPanel';
import LightCanvas from './components/LightCanvas';
import {
  defaultParams,
  randomizeParams,
  takeSnapshot,
  downloadPNG,
  type LightParams,
  type LightPath
} from './utils/lightEngine';
import './index.css';

const App: React.FC = () => {
  const [params, setParams] = useState<LightParams>(defaultParams);
  const [paths, setPaths] = useState<LightPath[]>([]);

  const defaultPaths = useMemo<LightPath[]>(() => {
    if (typeof window === 'undefined') return [];
    const w = Math.max(window.innerWidth - 340, 800);
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;
    return [
      {
        id: 'init_1',
        startX: cx - 280,
        startY: cy - 120,
        endX: cx + 280,
        endY: cy + 120
      },
      {
        id: 'init_2',
        startX: cx + 260,
        startY: cy - 180,
        endX: cx - 260,
        endY: cy + 60
      }
    ];
  }, []);

  const activePaths = paths.length > 0 ? paths : defaultPaths;

  const handleRegister = useCallback((path: LightPath) => {
    setPaths((prev) => [...prev, path]);
  }, []);

  const handleClear = useCallback(() => {
    setPaths([]);
  }, []);

  const handleRandomize = useCallback(() => {
    setParams(randomizeParams());
  }, []);

  const handleExport = useCallback(() => {
    const frame = Math.floor(Math.random() * 10000);
    const canvas = takeSnapshot(activePaths, params, frame, 1920, 1080);
    downloadPNG(canvas, `light-atlas-${Date.now()}.png`);
  }, [activePaths, params]);

  return (
    <div className="app-root">
      <div className="bg-ambient">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </div>
      <ControlPanel
        params={params}
        onChange={setParams}
        onRandomize={handleRandomize}
        onExport={handleExport}
        onClearPaths={handleClear}
        pathCount={activePaths.length}
      />
      <main className="canvas-stage">
        <LightCanvas
          paths={activePaths}
          params={params}
          onRegisterPath={handleRegister}
        />
      </main>
    </div>
  );
};

export default App;
