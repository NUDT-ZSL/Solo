import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { StarDustEngine, ClusterInfo, EngineParams } from './StarDustEngine';
import { InterstellarUI } from './InterstellarUI';

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StarDustEngine | null>(null);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new StarDustEngine(containerRef.current);
    engineRef.current = engine;

    engine.setOnClusterClick((info: ClusterInfo) => {
      setClusterInfo(info);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleParamsChange = useCallback((params: EngineParams) => {
    engineRef.current?.setParams(params);
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
  }, []);

  const handleDismissCluster = useCallback(() => {
    setClusterInfo(null);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }}
      />
      <InterstellarUI
        onParamsChange={handleParamsChange}
        onResetCamera={handleResetCamera}
        clusterInfo={clusterInfo}
        onDismissCluster={handleDismissCluster}
      />
    </>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
