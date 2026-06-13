import React, { useState, useCallback, useRef, useEffect } from 'react';
import ParticleCanvas from './components/ParticleCanvas';
import ControlPanel from './components/ControlPanel';
import Toolbar, { ToolMode } from './components/Toolbar';
import CodeInput from './components/CodeInput';
import ExportModal from './components/ExportModal';
import { ParticleConfig, DEFAULT_CONFIG, ParticleEngine } from './utils/particleEngine';

type LayoutMode = 'full' | 'tablet' | 'mobile';

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
  const [controlPanelCollapsed, setControlPanelCollapsed] = useState(false);
  const engineRef = useRef<ParticleEngine | null>(null);

  useEffect(() => {
    const handleResize = () => setLayout(getLayoutMode());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    setConfig((prev) => {
      const next = { ...prev, ...parsed };
      if (engineRef.current) {
        engineRef.current.updateConfig(parsed);
      }
      return next;
    });
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

  const isMobile = layout === 'mobile';
  const isTablet = layout === 'tablet';

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
      {layout === 'full' && (
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
            bottom: isMobile ? '12px' : '16px',
            left: '16px',
            width: '120px',
            height: '32px',
            background: 'rgba(26,26,46,0.7)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            fontSize: '12px',
            zIndex: 20,
            letterSpacing: '0.5px',
          }}
        >
          {viewInfo.zoom.toFixed(1)}x · {viewInfo.count}
        </div>
      </div>

      {layout === 'full' && (
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
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            zIndex: 20,
            transition: 'transform 0.3s ease-out',
          }}
        >
          <div
            onClick={() => setControlPanelCollapsed(!controlPanelCollapsed)}
            style={{
              height: '40px',
              background: 'rgba(26,26,46,0.9)',
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
            }}
          >
            控制面板 {controlPanelCollapsed ? '▲' : '▼'}
          </div>
          {!controlPanelCollapsed && (
            <div style={{ padding: '0 16px 16px' }}>
              <ControlPanel config={config} onChange={handleConfigChange} />
            </div>
          )}
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
