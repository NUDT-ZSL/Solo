import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager, type FPSCallback } from './SceneManager';
import { FractalEngine } from './FractalEngine';
import ControlPanel from './components/ControlPanel';
import ViewportSettings from './components/ViewportSettings';
import {
  DEFAULT_FRACTAL_PARAMS,
  DEFAULT_CAMERA_SETTINGS,
  type FractalParams,
  type CameraSettings,
  type SphereHole,
  type SliceConfig,
  type Julia3DParams,
  type VoxelData,
} from './types';
import { v4 as uuidv4 } from 'uuid';

interface StatusInfo {
  fps: number;
  voxelCount: number;
  algorithm: string;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const fractalEngineRef = useRef<FractalEngine>(new FractalEngine());
  const computeTimeoutRef = useRef<number | null>(null);
  const baseVoxelDataRef = useRef<VoxelData | null>(null);

  const [fractalParams, setFractalParams] = useState<FractalParams>({ ...DEFAULT_FRACTAL_PARAMS });
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({ ...DEFAULT_CAMERA_SETTINGS });
  const [sphereHoles, setSphereHoles] = useState<SphereHole[]>([]);
  const [sliceConfig, setSliceConfig] = useState<SliceConfig | null>(null);
  const [holeRadius, setHoleRadius] = useState<number>(0.25);
  const [juliaParams, setJuliaParams] = useState<Julia3DParams>(fractalEngineRef.current.getJuliaParams());
  const [status, setStatus] = useState<StatusInfo>({ fps: 0, voxelCount: 0, algorithm: 'mandelbulb' });
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const sceneManager = new SceneManager();
    sceneManagerRef.current = sceneManager;
    sceneManager.init(canvasRef.current);

    const fpsHandler: FPSCallback = (fps, voxelCount, algorithm) => {
      setStatus({ fps: Math.round(fps), voxelCount, algorithm });
    };
    sceneManager.setFPSCallback(fpsHandler);

    sceneManager.setClickCallback((pos) => {
      if (pos) {
        addHoleAtPosition(pos);
      }
    });

    recomputeFractal({ ...DEFAULT_FRACTAL_PARAMS });

    return () => {
      sceneManager.dispose();
      if (computeTimeoutRef.current) {
        clearTimeout(computeTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneManagerRef.current?.setCameraSettings(cameraSettings);
  }, [cameraSettings]);

  const recomputeFractal = useCallback(
    async (params: FractalParams) => {
      if (computeTimeoutRef.current) {
        clearTimeout(computeTimeoutRef.current);
      }
      setIsComputing(true);

      fractalEngineRef.current.setJuliaParams(juliaParams);
      sceneManagerRef.current?.setAlgorithmName(params.algorithm);

      computeTimeoutRef.current = window.setTimeout(async () => {
        try {
          const data = await fractalEngineRef.current.generateVoxels(params);
          baseVoxelDataRef.current = data;
          applyAllHolesAndSlice();
        } finally {
          setIsComputing(false);
        }
      }, 200);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [juliaParams],
  );

  const applyAllHolesAndSlice = useCallback(() => {
    const baseData = baseVoxelDataRef.current;
    const sceneManager = sceneManagerRef.current;
    if (!baseData || !sceneManager) return;

    const dataWithHoles =
      sphereHoles.length > 0 ? fractalEngineRef.current.applySphereHoles(baseData, sphereHoles) : baseData;

    sceneManager.updateFractal(dataWithHoles, true);
    sceneManager.clearHoleVisuals();
    for (const hole of sphereHoles) {
      sceneManager.addHoleVisual(hole.center, hole.radius);
    }

    if (sliceConfig?.enabled) {
      const sliceData = fractalEngineRef.current.computeSliceDensity(dataWithHoles, sliceConfig);
      sceneManager.setSlice(sliceData);
    } else {
      sceneManager.setSlice(null);
    }
  }, [sphereHoles, sliceConfig]);

  useEffect(() => {
    applyAllHolesAndSlice();
  }, [applyAllHolesAndSlice]);

  const handleParamsChange = useCallback(
    (key: keyof FractalParams, value: number | string) => {
      const newParams = { ...fractalParams, [key]: value } as FractalParams;
      setFractalParams(newParams);
      recomputeFractal(newParams);
    },
    [fractalParams, recomputeFractal],
  );

  const handleAlgorithmChange = useCallback(
    (algorithm: FractalParams['algorithm']) => {
      const newParams = { ...fractalParams, algorithm };
      setFractalParams(newParams);
      recomputeFractal(newParams);
    },
    [fractalParams, recomputeFractal],
  );

  const handleJuliaParamsChange = useCallback(
    (key: keyof Julia3DParams, value: number) => {
      const newParams = { ...juliaParams, [key]: value } as Julia3DParams;
      setJuliaParams(newParams);
      const engine = fractalEngineRef.current;
      engine.setJuliaParams(newParams);
      recomputeFractal(fractalParams);
    },
    [juliaParams, fractalParams, recomputeFractal],
  );

  const addHoleAtPosition = useCallback(
    (pos: { x: number; y: number; z: number }) => {
      const newHole: SphereHole = {
        id: uuidv4(),
        center: { ...pos },
        radius: holeRadius,
      };
      setSphereHoles((prev) => [...prev, newHole]);
    },
    [holeRadius],
  );

  const handleAddHole = useCallback(() => {
    addHoleAtPosition({ x: 0, y: 0, z: 0 });
  }, [addHoleAtPosition]);

  const handleRemoveHole = useCallback((id: string) => {
    setSphereHoles((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const handleClearHoles = useCallback(() => {
    setSphereHoles([]);
  }, []);

  const handleSliceChange = useCallback((config: Partial<SliceConfig>) => {
    setSliceConfig((prev) => {
      const base = prev ?? { axis: 'x', position: 0, enabled: false };
      const next = { ...base, ...config };
      return next.enabled && next.position === undefined ? base : next;
    });
  }, []);

  const handleExportScreenshot = useCallback(async () => {
    try {
      const blob = await sceneManagerRef.current?.exportScreenshot(1920, 1080);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fractal-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export screenshot:', e);
    }
  }, []);

  const handleExportOBJ = useCallback(() => {
    const obj = sceneManagerRef.current?.exportOBJ();
    if (!obj) return;
    const blob = new Blob([obj], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fractal-${Date.now()}.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div style={styles.appContainer}>
      <div ref={canvasRef} style={styles.canvas} />

      <div style={{ ...styles.leftPanel, ...(panelCollapsed ? styles.leftPanelCollapsed : {}) }}>
        <div
          style={styles.collapseBtn}
          onClick={() => setPanelCollapsed((c) => !c)}
          title={panelCollapsed ? '展开面板' : '收起面板'}
        >
          {panelCollapsed ? '»' : '«'}
        </div>
        {!panelCollapsed && (
          <ControlPanel
            fractalParams={fractalParams}
            juliaParams={juliaParams}
            onParamsChange={handleParamsChange}
            onAlgorithmChange={handleAlgorithmChange}
            onJuliaParamsChange={handleJuliaParamsChange}
            sphereHoles={sphereHoles}
            holeRadius={holeRadius}
            onHoleRadiusChange={setHoleRadius}
            onAddHole={handleAddHole}
            onRemoveHole={handleRemoveHole}
            onClearHoles={handleClearHoles}
            sliceConfig={sliceConfig}
            onSliceChange={handleSliceChange}
            onExportScreenshot={handleExportScreenshot}
            onExportOBJ={handleExportOBJ}
            isComputing={isComputing}
          />
        )}
      </div>

      <div style={styles.topBar}>
        <ViewportSettings
          settings={cameraSettings}
          onSettingsChange={setCameraSettings}
          onExportScreenshot={handleExportScreenshot}
        />
      </div>

      <div style={styles.statusBar}>
        <span style={styles.statusItem}>
          <span style={styles.statusLabel}>算法:</span>
          <span style={{ ...styles.statusValue, color: '#e94560', fontWeight: 600 }}>
            {status.algorithm === 'mandelbulb' ? 'Mandelbulb' : 'Julia 3D'}
          </span>
        </span>
        <span style={styles.statusItem}>
          <span style={styles.statusLabel}>体素:</span>
          <span style={styles.statusValue}>{status.voxelCount.toLocaleString()}</span>
        </span>
        <span style={styles.statusItem}>
          <span style={styles.statusLabel}>FPS:</span>
          <span
            style={{
              ...styles.statusValue,
              color: status.fps >= 35 ? '#3cff8b' : status.fps >= 20 ? '#ffcc00' : '#ff4444',
              fontWeight: 600,
            }}
          >
            {status.fps}
          </span>
        </span>
        {isComputing && (
          <span style={{ ...styles.statusItem, animation: 'pulse-glow 1.5s ease-in-out infinite' }}>
            <span style={{ ...styles.statusSpinner, display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(233,69,96,0.3)', borderTopColor: '#e94560', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6 }} />
            <span style={{ color: '#e94560' }}>计算中...</span>
          </span>
        )}
      </div>

      <div style={styles.hintBar}>
        <span>💡 拖拽旋转 | 滚轮缩放 | 右键平移 | 单击视口添加球体空洞</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minWidth: 800,
    minHeight: 600,
    background:
      'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a1a 70%, #050510 100%)',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'grab',
  },
  leftPanel: {
    position: 'absolute',
    top: 70,
    left: 16,
    bottom: 60,
    width: 340,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: 16,
    paddingRight: 8,
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
    animation: 'fadeIn 0.4s ease-out',
    zIndex: 10,
  },
  leftPanelCollapsed: {
    width: 40,
    padding: 8,
    overflow: 'hidden',
  },
  collapseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    cursor: 'pointer',
    color: 'rgba(255,255,255,0.6)',
    background: 'rgba(233,69,96,0.15)',
    borderRadius: 6,
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  topBar: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    animation: 'fadeIn 0.4s ease-out',
  },
  statusBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    gap: 28,
    padding: '0 20px',
    background: 'rgba(10,10,26,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    zIndex: 15,
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    color: 'rgba(255,255,255,0.5)',
  },
  statusValue: {
    color: 'rgba(255,255,255,0.9)',
    fontVariantNumeric: 'tabular-nums',
  },
  statusSpinner: {
    width: 12,
    height: 12,
  },
  hintBar: {
    position: 'absolute',
    bottom: 48,
    right: 20,
    padding: '6px 14px',
    background: 'rgba(15,52,96,0.5)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    zIndex: 12,
    pointerEvents: 'none',
  },
};

export default App;
