import React, { useState, useCallback, useRef, useEffect } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import ControlPanel from './components/ControlPanel';
import Toolbar, { ToolMode } from './components/Toolbar';
import CodeInput from './components/CodeInput';
import ExportModal from './components/ExportModal';
import { ParticleConfig, DEFAULT_CONFIG, ParticleEngine } from './utils/particleEngine';

type LayoutMode = 'full' | 'tablet' | 'mobile';

const LOAD_START_TIME = performance.now();

function getLayoutMode(): LayoutMode {
  const width = window.innerWidth;
  if (width > 1024) return 'full';
  if (width > 640) return 'tablet';
  return 'mobile';
}

const App: React.FC = () => {
  const [config, setConfig] = useState<ParticleConfig>({ ...DEFAULT_CONFIG });
  const [mode, setMode] = useState<ToolMode>('select');
  const [showExport, setShowExport] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>(getLayoutMode());
  const [viewInfo, setViewInfo] = useState({ zoom: 1.0, count: DEFAULT_CONFIG.count });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fps, setFps] = useState<number>(0);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setLayout(getLayoutMode());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (loadTime === null) {
      const t = performance.now() - LOAD_START_TIME;
      setLoadTime(t);
      console.log(`[CodeCanvas] 首屏交互时间: ${t.toFixed(0)}ms`);
    }
  }, [loadTime]);

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  const handleConfigChange = useCallback((key: keyof ParticleConfig, value: number) => {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (engineRef.current) {
        engineRef.current.updateConfig({ [key]: value });
      }
      return next;
    });
  }, []);

  const handleCodeParse = useCallback((parsed: Partial<ParticleConfig>) => {
    const t0 = performance.now();
    setConfig((prev) => {
      const next = { ...prev, ...parsed };
      if (engineRef.current) {
        engineRef.current.updateConfig(parsed);
      }
      return next;
    });
    const elapsed = performance.now() - t0;
    console.log(`[CodeCanvas] 解析+渲染耗时: ${elapsed.toFixed(1)}ms (目标 <= 300ms, ${elapsed <= 300 ? '✅' : '⚠️'})`);
  }, []);

  const handleModeChange = useCallback((newMode: ToolMode) => {
    if (newMode === 'export') {
      setShowExport(true);
      return;
    }
    if (newMode === 'clear') {
      setConfig({ ...DEFAULT_CONFIG });
      if (engineRef.current) {
        engineRef.current.updateConfig(DEFAULT_CONFIG);
      }
      return;
    }
    setMode(newMode);
  }, []);

  const handleViewChange = useCallback((zoom: number, count: number) => {
    setViewInfo({ zoom, count });
  }, []);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((prev) => !prev);
  }, []);

  const isMobile = layout === 'mobile';
  const isTablet = layout === 'tablet';
  const isFull = layout === 'full';

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d0d1a',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: isMobile ? '14px' : '16px',
      }}
    >
      {isFull && (
        <div
          style={{
            width: '60px',
            height: '100%',
            background: '#16162a',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '16px',
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <Toolbar mode={mode} onModeChange={handleModeChange} />
        </div>
      )}

      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <ParticleCanvas
          config={config}
          onViewChange={handleViewChange}
          engineRef={engineRef}
          onFpsUpdate={handleFpsUpdate}
        />

        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CodeInput onParse={handleCodeParse} />
          </div>
        </div>

        {(isMobile || isTablet) && (
          <div
            style={{
              position: 'absolute',
              top: '72px',
              left: '12px',
              zIndex: 20,
            }}
          >
            <Toolbar mode={mode} onModeChange={handleModeChange} compact />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: isMobile ? '12px' : (isTablet ? (drawerOpen ? '260px' : '56px') : '16px'),
            left: '16px',
            zIndex: 20,
            transition: 'bottom 0.3s ease-out',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '32px',
              background: 'rgba(26,26,46,0.7)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '12px',
              letterSpacing: '0.5px',
            }}
          >
            {viewInfo.zoom.toFixed(1)}x · {viewInfo.count}
          </div>
          <div
            style={{
              width: '120px',
              height: '28px',
              background: 'rgba(26,26,46,0.7)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fps >= 50 ? '#22c55e' : (fps >= 30 ? '#fbbf24' : '#ef4444'),
              fontSize: '11px',
              fontFamily: "'Fira Code', monospace",
              letterSpacing: '0.5px',
              fontWeight: 600,
            }}
          >
            {fps.toFixed(0)} FPS
          </div>
        </div>
      </div>

      {isFull && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            right: '16px',
            zIndex: 20,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
          }}
        >
          <ControlPanel config={config} onChange={handleConfigChange} />
        </div>
      )}

      {isTablet && (
        <div
          ref={drawerRef}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            transform: drawerOpen ? 'translateY(0)' : 'translateY(calc(100% - 40px))',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            onClick={toggleDrawer}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(rgba(45,45,74,0.95), rgba(45,45,74,0.95)), linear-gradient(135deg, #6366f1, #ec4899)';
              (e.currentTarget as HTMLElement).style.color = '#c7d2fe';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'linear-gradient(rgba(26,26,46,0.9), rgba(26,26,46,0.9)), linear-gradient(135deg, #6366f1, #ec4899)';
              (e.currentTarget as HTMLElement).style.color = '#9ca3af';
            }}
            style={{
              height: '40px',
              flexShrink: 0,
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#9ca3af',
              fontSize: '13px',
              letterSpacing: '0.5px',
              backdropFilter: 'blur(12px)',
              border: '2px solid transparent',
              borderBottom: 'none',
              backgroundImage:
                'linear-gradient(rgba(26,26,46,0.9), rgba(26,26,46,0.9)), linear-gradient(135deg, #6366f1, #ec4899)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              userSelect: 'none',
              transition: 'background 0.2s ease-out, color 0.2s ease-out',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span>控制面板</span>
              <span
                style={{
                  display: 'inline-block',
                  transform: drawerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease-out',
                  width: '16px',
                  height: '16px',
                  textAlign: 'center',
                  lineHeight: '16px',
                }}
              >
                ▼
              </span>
            </span>
          </div>
          <div
            style={{
              overflow: 'auto',
              padding: '16px',
              paddingTop: '0',
              background: 'rgba(22, 22, 42, 0.95)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <ControlPanel config={config} onChange={handleConfigChange} />
          </div>
        </div>
      )}

      {isMobile && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 20,
          }}
        >
          <ControlPanel config={config} onChange={handleConfigChange} compact />
        </div>
      )}

      {showExport && (
        <ExportModal
          canvas={engineRef.current?.getCanvas() ?? null}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default App;
