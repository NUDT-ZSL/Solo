import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SceneManager, type SceneParams } from './SceneManager';
import { ControlPanel, BurstInfoCard } from './ControlPanel';

const DEFAULT_PARAMS: SceneParams = {
  tideSpeed: 1.0,
  glowIntensity: 1.0,
  particleDensity: 3000,
};

interface BurstInfo {
  phase: number;
  density: number;
  intensity: number;
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [params, setParams] = useState<SceneParams>(DEFAULT_PARAMS);
  const [burstInfo, setBurstInfo] = useState<BurstInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = new SceneManager(containerRef.current, DEFAULT_PARAMS);
    sceneManagerRef.current = manager;

    manager.setBurstInfoCallback((info) => {
      setBurstInfo(info);
    });

    manager.start();

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleParamsChange = useCallback((newParams: SceneParams) => {
    setParams(newParams);
    sceneManagerRef.current?.updateParams(newParams);
  }, []);

  const handleCloseBurstInfo = useCallback(() => {
    setBurstInfo(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      <ControlPanel params={params} onParamsChange={handleParamsChange} />
      <BurstInfoCard info={burstInfo} onClose={handleCloseBurstInfo} />
      <div style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.4)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '13px',
        letterSpacing: '2px',
        pointerEvents: 'none',
        zIndex: 50,
        textShadow: '0 0 20px rgba(0,150,255,0.3)',
      }}>
        潮 汐 回 廊
      </div>
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        color: 'rgba(255,255,255,0.25)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        fontSize: '11px',
        pointerEvents: 'none',
        zIndex: 50,
        lineHeight: 1.6,
      }}>
        拖拽旋转 · 滚轮缩放 · 点击粒子团触发潮涌回响
      </div>
    </div>
  );
};

export default App;
