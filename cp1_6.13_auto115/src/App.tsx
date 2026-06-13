import React, { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { ParticleEngine, EngineConfig, PerformanceStats } from './engine/ParticleEngine';
import { Preset, builtInPresets, presetToConfig } from './presets';
import { ControlPanel } from './components/ControlPanel';
import { PerformancePanel } from './components/PerformancePanel';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ParticleEngine | null>(null);
  const [config, setConfig] = useState<EngineConfig>(presetToConfig(builtInPresets[0]));
  const [savedPresets, setSavedPresets] = useState<Preset[]>([]);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    particleCount: 0,
    cpuLoad: 0,
    performanceMode: false,
  });

  const loadPresets = useCallback(async () => {
    try {
      const res = await axios.get('/api/presets');
      setSavedPresets(res.data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new ParticleEngine(canvasRef.current, config);
    engineRef.current = engine;
    engine.setStatsCallback(setStats);
    engine.start();

    const handleResize = () => engine.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setConfig(config);
    }
  }, [config]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setPanelsVisible(v => !v);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (engineRef.current && document.activeElement?.tagName !== 'INPUT') {
          engineRef.current.deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    engineRef.current?.handleMouseDown(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasPos(e);
    engineRef.current?.handleMouseMove(x, y);
  };

  const handleMouseUp = () => {
    engineRef.current?.handleMouseUp();
  };

  const handlePresetSelect = (preset: Preset) => {
    setConfig(presetToConfig(preset));
  };

  const handleSavePreset = async (name: string) => {
    try {
      const res = await axios.post('/api/presets', {
        name,
        colors: config.colors,
        sizeRange: config.sizeRange,
        speedRange: config.speedRange,
        chargeBias: config.chargeBias,
      });
      setSavedPresets(prev => [res.data, ...prev]);
    } catch {
      // silently ignore
    }
  };

  const handleDeletePreset = async (id: string) => {
    try {
      await axios.delete(`/api/presets/${id}`);
      setSavedPresets(prev => prev.filter(p => p._id !== id));
    } catch {
      // silently ignore
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <ControlPanel
        visible={panelsVisible}
        config={config}
        savedPresets={savedPresets}
        onPresetSelect={handlePresetSelect}
        onConfigChange={setConfig}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
      />
      <PerformancePanel
        stats={stats}
        visible={panelsVisible}
      />
    </div>
  );
};

export default App;
