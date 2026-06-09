import { useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { FurnitureId, StyleId, STYLE_PRESETS } from './types';
import { furnitureController } from './FurnitureController';
import Scene from './Scene';
import { StyleButtons, FurnitureInfo, LightSlider, ViewPresets } from './components/ControlPanel';
import './App.css';

function App() {
  const [currentStyle, setCurrentStyle] = useState<StyleId>('modern');
  const [selectedId, setSelectedId] = useState<FurnitureId | null>(null);
  const [lightValue, setLightValue] = useState<number>(50);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    furnitureController.setFurnitureStyle(currentStyle);
    forceTick((t) => t + 1);
  }, [currentStyle]);

  useEffect(() => {
    if (selectedId) {
      const interval = setInterval(() => {
        forceTick((t) => t + 1);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  const handleSelect = useCallback((id: FurnitureId | null) => {
    setSelectedId(id);
  }, []);

  const handleStyleChange = useCallback((style: StyleId) => {
    setCurrentStyle(style);
  }, []);

  const handleLightChange = useCallback((value: number) => {
    setLightValue(value);
  }, []);

  const handleViewPreset = useCallback((preset: string) => {
    setCameraPreset(preset);
  }, []);

  const handleCameraPresetDone = useCallback(() => {
    setCameraPreset(null);
  }, []);

  const currentPresetName = STYLE_PRESETS.find((s) => s.id === currentStyle)?.name || '';

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="brand">
          <span className="brand-logo">🏠</span>
          <div>
            <h1 className="brand-title">光影家居 · 3D配置器</h1>
            <p className="brand-sub">
              当前风格：<span className="brand-style">{currentPresetName}</span>
            </p>
          </div>
        </div>
        <div className="fps-hint">
          <span className="fps-dot" /> 实时渲染 · 拖拽家具预览光影效果
        </div>
      </header>

      <main className="app-main">
        <section className="canvas-area">
          <Canvas
            shadows
            camera={{ fov: 50, near: 0.1, far: 100, position: [0, 2.0, 6.2] }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: 'high-performance',
            }}
            dpr={[1, 2]}
            style={{ cursor: selectedId ? 'crosshair' : 'grab' }}
          >
            <color attach="background" args={['#2C2C2C']} />
            <Scene
              selectedId={selectedId}
              onSelect={handleSelect}
              lightValue={lightValue}
              cameraPreset={cameraPreset}
              onCameraPresetDone={handleCameraPresetDone}
            />
          </Canvas>
          <div className="canvas-overlay">
            <div className="coord-system">房间中心 (0, 0, 0)</div>
          </div>
        </section>

        <aside className="control-panel">
          <StyleButtons currentStyle={currentStyle} onStyleChange={handleStyleChange} />
          <FurnitureInfo selectedId={selectedId} />
          <LightSlider value={lightValue} onChange={handleLightChange} />
          <ViewPresets onSelect={handleViewPreset} />
        </aside>
      </main>
    </div>
  );
}

export default App;
