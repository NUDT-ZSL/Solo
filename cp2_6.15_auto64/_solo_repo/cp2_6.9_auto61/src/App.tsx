import { useEffect, useRef, useState } from 'react';
import { GalaxyEngine } from './GalaxyEngine';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GalaxyEngine | null>(null);
  const [particleCount, setParticleCount] = useState(0);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GalaxyEngine(canvas);
    engineRef.current = engine;

    engine.setStatsCallback((count, currentFps) => {
      setParticleCount(count);
      setFps(currentFps);
    });

    engine.generateGalaxy({ particleCount: 800, armCount: 4 });
    engine.start();

    const handleMouseDown = (e: MouseEvent) => engine.handleMouseDown(e);
    const handleMouseMove = (e: MouseEvent) => engine.handleMouseMove(e);
    const handleMouseUp = (e: MouseEvent) => engine.handleMouseUp(e);
    const handleWheel = (e: WheelEvent) => engine.handleWheel(e);
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleResize = () => engine.resize();

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRandomGalaxy = () => {
    engineRef.current?.randomizeGalaxy();
  };

  const handleResetView = () => {
    engineRef.current?.resetView();
  };

  const fpsColor = fps < 30 ? '#ff3333' : '#7fff7f';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        <button
          onClick={handleRandomGalaxy}
          style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            color: '#ffffff',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          随机星系
        </button>
        <button
          onClick={handleResetView}
          style={{
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            color: '#ffffff',
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          重置视角
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          padding: '10px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#ffffff',
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          粒子数: <span style={{ color: '#aaddff' }}>{particleCount}</span>
        </div>
        <div>
          FPS: <span style={{ color: fpsColor }}>{fps}</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '10px 16px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 6,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.7)',
          zIndex: 10,
          lineHeight: 1.6,
        }}
      >
        <div>左键点击/拖拽 - 生成粒子团簇</div>
        <div>滚轮 - 缩放视野</div>
        <div>右键/中键拖拽 - 平移视角</div>
      </div>
    </div>
  );
};

export default App;
