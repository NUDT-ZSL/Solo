import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CoreScene, type SceneParams } from './CoreScene';
import { ControlPanel } from './controls/ControlPanel';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CoreScene | null>(null);
  const [params, setParams] = useState<SceneParams>({
    flowSpeed: 1.0,
    heatWaveIntensity: 1.0,
    coolingRate: 0.5,
  });

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new CoreScene(containerRef.current);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleParamsChange = useCallback((newParams: Partial<SceneParams>) => {
    setParams((prev) => {
      const updated = { ...prev, ...newParams };
      if (sceneRef.current) {
        sceneRef.current.updateParams(updated);
      }
      return updated;
    });
  }, []);

  const handleResetCamera = useCallback(() => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <ControlPanel
        params={params}
        onParamsChange={handleParamsChange}
        onResetCamera={handleResetCamera}
      />
    </div>
  );
};

export default App;
