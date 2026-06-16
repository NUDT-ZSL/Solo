import { useState, useEffect, useRef, useCallback } from 'react';
import { SceneModule } from './components/SceneModule';
import { UIPanel } from './components/UIPanel';
import { logicModule } from './logic/LogicModule';
import type { PlacedFurniture, LightingConfig, FurnitureTemplate, LightingPreset } from './logic/LogicModule';

function App() {
  const [furnitureList, setFurnitureList] = useState<PlacedFurniture[]>([]);
  const [lightingConfig, setLightingConfig] = useState<LightingConfig | null>(null);
  const [furnitureTemplates, setFurnitureTemplates] = useState<FurnitureTemplate[]>([]);
  const [lightingPresets, setLightingPresets] = useState<LightingPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const placingInstanceIdRef = useRef<string | null>(null);
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [furnitureRes, lightingRes] = await Promise.all([
          fetch('/api/furniture'),
          fetch('/api/lighting-presets'),
        ]);

        const furnitureData = await furnitureRes.json();
        const lightingData = await lightingRes.json();

        if (furnitureData.success) {
          logicModule.setFurnitureTemplates(furnitureData.data);
          setFurnitureTemplates(furnitureData.data);
        }

        if (lightingData.success) {
          logicModule.setLightingPresets(lightingData.data);
          setLightingPresets(lightingData.data);
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const unsubscribe = logicModule.subscribe(() => {
      setFurnitureList([...logicModule.getFurnitureList()]);
      setLightingConfig(logicModule.getCurrentLighting());
    });

    setFurnitureList([...logicModule.getFurnitureList()]);
    setLightingConfig(logicModule.getCurrentLighting());

    return unsubscribe;
  }, []);

  useEffect(() => {
    const updateFPS = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
          fpsElement.textContent = fpsRef.current.frames.toString();
        }
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;
      }
      requestAnimationFrame(updateFPS);
    };

    const animationId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(animationId);
  }, []);

  const handleDragStart = useCallback((templateId: string) => {
    const instance = logicModule.createPlacingInstance(templateId, { x: 0, z: 0 });
    if (instance) {
      placingInstanceIdRef.current = instance.instanceId;
    }
  }, []);

  const handleCanvasDragOver = useCallback((point: { x: number; z: number }) => {
    if (placingInstanceIdRef.current) {
      logicModule.updatePlacingPosition(placingInstanceIdRef.current, point);
    }
  }, []);

  const handleCanvasClick = useCallback((point: { x: number; z: number }) => {
  }, []);

  const handleDrop = useCallback(() => {
    if (placingInstanceIdRef.current) {
      logicModule.finalizePlacement(placingInstanceIdRef.current);
      placingInstanceIdRef.current = null;
    }
  }, []);

  const handleLightingChange = useCallback((presetId: string) => {
    logicModule.switchLighting(presetId);
  }, []);

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: '#ecf0f1',
        fontSize: '18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⏳</span>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <SceneModule
        furnitureList={furnitureList}
        lightingConfig={lightingConfig}
        roomBounds={logicModule.getRoomBounds()}
        onCanvasClick={handleCanvasClick}
        onCanvasDragOver={handleCanvasDragOver}
        onDrop={handleDrop}
      />
      <UIPanel
        furnitureTemplates={furnitureTemplates}
        lightingPresets={lightingPresets}
        currentLightingId={lightingConfig?.id || ''}
        onDragStart={handleDragStart}
        onLightingChange={handleLightingChange}
      />
    </div>
  );
}

export default App;
