import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useVineDraw, BASE_COLORS } from './useVineDraw';
import { VineCanvas } from './VineCanvas';
import { ColorPalette, SpeedDisplay, ActionButtons } from './UIControls';

const App: React.FC = () => {
  const vineDraw = useVineDraw();
  const [fps, setFps] = useState<number>(60);
  const [displaySpeed, setDisplaySpeed] = useState<number>(0);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const speedAnimRef = useRef<number>(0);

  useEffect(() => {
    let running = true;
    const updateLoop = () => {
      if (!running) return;
      const state = vineDraw.getState();
      setDisplaySpeed(state.currentSpeed);
      setCanUndo(vineDraw.canUndo());
      setCanRedo(vineDraw.canRedo());
      speedAnimRef.current = requestAnimationFrame(updateLoop);
    };
    speedAnimRef.current = requestAnimationFrame(updateLoop);
    return () => {
      running = false;
      cancelAnimationFrame(speedAnimRef.current);
    };
  }, [vineDraw]);

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.key === 'z' || e.key === 'Z') {
        if (e.shiftKey) {
          e.preventDefault();
          vineDraw.redo();
        } else {
          e.preventDefault();
          vineDraw.undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vineDraw]);

  const getCanvasSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { width: window.innerWidth, height: window.innerHeight };
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(800, rect.width),
      height: Math.max(600, rect.height)
    };
  }, []);

  const handleExport = useCallback(() => {
    const { width, height } = getCanvasSize();
    const svgContent = vineDraw.exportSVG(width, height);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
    const filename = `vine_weaver_${timestamp}.svg`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [vineDraw, getCanvasSize]);

  const handleColorSelect = useCallback((color: string) => {
    vineDraw.setBaseColor(color);
  }, [vineDraw]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#1C261C',
        minWidth: 800,
        minHeight: 600
      }}
    >
      <VineCanvas vineDraw={vineDraw} onFpsUpdate={handleFpsUpdate} />

      <ColorPalette
        colors={BASE_COLORS}
        selectedColor={vineDraw.currentColor}
        onColorSelect={handleColorSelect}
      />

      <SpeedDisplay speed={displaySpeed} currentColor={vineDraw.currentColor} />

      <ActionButtons
        onUndo={() => vineDraw.undo()}
        onRedo={() => vineDraw.redo()}
        onExport={handleExport}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '6px 12px',
          background: 'rgba(46, 59, 46, 0.7)',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: fps >= 50 ? '#81C784' : fps >= 30 ? '#FFB74D' : '#E57373',
          fontWeight: 600,
          letterSpacing: 0.5
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: fps >= 50 ? '#81C784' : fps >= 30 ? '#FFB74D' : '#E57373',
            boxShadow: `0 0 8px ${fps >= 50 ? '#81C784' : fps >= 30 ? '#FFB74D' : '#E57373'}`
          }}
        />
        {fps} FPS
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          padding: '10px 16px',
          background: 'rgba(46, 59, 46, 0.8)',
          borderRadius: 12,
          backdropFilter: 'blur(8px)',
          zIndex: 10,
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: 'rgba(165, 214, 167, 0.9)',
          lineHeight: 1.8,
          maxWidth: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ fontWeight: 700, color: '#A5D6A7', marginBottom: 4, fontSize: 13 }}>🌿 藤蔓编织</div>
        <div>按住鼠标左键拖拽绘制主藤蔓</div>
        <div>系统会自动分支与生成卷须</div>
        <div style={{ marginTop: 6, opacity: 0.7 }}>
          Ctrl+Z 撤销 · Ctrl+Shift+Z 重做
        </div>
      </div>
    </div>
  );
};

export default App;
