import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BrushEngine, BrushSettings, StrokePoint } from './BrushEngine';
import { Poem, getPoems, getPoemById, generatePoetryAnimation } from './PoetryManager';
import { InkCanvas, ParticleBackground, Toolbar, PoetrySelector, TitleOverlay } from './UI';

const GLOBAL_CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html, body, #root {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #f5f0e8;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .app-root {
    animation: fadeIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  ::-webkit-scrollbar {
    width: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: rgba(60, 50, 40, 0.3);
    border-radius: 2px;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255,255,255,0.1);
    border-radius: 2px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #c0a880;
    cursor: pointer;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    transition: background 0.2s;
  }
  input[type="range"]::-webkit-slider-thumb:hover {
    background: #d4b890;
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #c0a880;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  select option {
    background: #2a2520;
    color: #e8e0d4;
  }
`;

function StyleInjector() {
  return <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />;
}

export default function App() {
  const [brushEngine, setBrushEngine] = useState<BrushEngine | null>(null);
  const [settings, setSettings] = useState<BrushSettings>(new BrushEngine().getSettings());
  const [selectedPoemId, setSelectedPoemId] = useState<string | null>(null);
  const [uiVisible, setUiVisible] = useState(false);
  const animationTimerRef = useRef<number[]>([]);

  const poems = getPoems();

  useEffect(() => {
    const t = setTimeout(() => setUiVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (brushEngine) {
      brushEngine.updateSettings(settings);
    }
  }, [settings, brushEngine]);

  const handleCanvasReady = useCallback((engine: BrushEngine) => {
    setBrushEngine(engine);
  }, []);

  const handleSettingsChange = useCallback((newSettings: BrushSettings) => {
    setSettings(newSettings);
  }, []);

  const handleClear = useCallback(() => {
    if (brushEngine) {
      brushEngine.clear();
    }
  }, [brushEngine]);

  const handlePoemSelect = useCallback(
    (id: string) => {
      setSelectedPoemId(id);

      animationTimerRef.current.forEach((t) => clearTimeout(t));
      animationTimerRef.current = [];

      if (!brushEngine || !id) return;

      const poem = getPoemById(id);
      if (!poem) return;

      brushEngine.clear();

      const size = brushEngine.getCanvasSize();
      const frames = generatePoetryAnimation(poem, size.width, size.height);

      const startTime = performance.now();
      for (const frame of frames) {
        const timer = window.setTimeout(() => {
          brushEngine.addAnimatedStroke(frame.points);
        }, frame.delay);
        animationTimerRef.current.push(timer);
      }
    },
    [brushEngine]
  );

  useEffect(() => {
    return () => {
      animationTimerRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <div className="app-root" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <StyleInjector />
      <ParticleBackground />
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          zIndex: 10,
        }}
      >
        <InkCanvas brushEngine={brushEngine} onCanvasReady={handleCanvasReady} />
      </div>
      <Toolbar
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onClear={handleClear}
        visible={uiVisible}
      />
      <PoetrySelector
        poems={poems}
        selectedId={selectedPoemId}
        onSelect={handlePoemSelect}
        visible={uiVisible}
      />
      <TitleOverlay visible={uiVisible} />
    </div>
  );
}
