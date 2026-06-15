import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FireflyManager, type StatsSnapshot } from './FireflyManager';
import { UIController } from './UIController';

const DEFAULT_BRIGHTNESS = 0.8;
const DEFAULT_SYNC_TOLERANCE = 0.2;
const DEFAULT_TIME_SPEED = 1.0;

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<FireflyManager | null>(null);

  const [brightness, setBrightness] = useState(DEFAULT_BRIGHTNESS);
  const [syncTolerance, setSyncTolerance] = useState(DEFAULT_SYNC_TOLERANCE);
  const [timeSpeed, setTimeSpeed] = useState(DEFAULT_TIME_SPEED);

  const [stats, setStats] = useState<StatsSnapshot>({
    activeCount: 0,
    syncRate: 0,
    simTime: '03:00',
    currentBrightness: 0,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    const manager = new FireflyManager(canvasRef.current);
    managerRef.current = manager;

    manager.setOnStatsUpdate((s) => setStats(s));
    manager.setBrightness(brightness);
    manager.setSyncTolerance(syncTolerance);
    manager.setTimeSpeed(timeSpeed);
    manager.start();

    const handleResize = () => {
      manager.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      manager.stop();
    };
    
  }, []);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setBrightness(brightness);
    }
  }, [brightness]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setSyncTolerance(syncTolerance);
    }
  }, [syncTolerance]);

  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.setTimeSpeed(timeSpeed);
    }
  }, [timeSpeed]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!managerRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    managerRef.current.handleClick(x, y);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!managerRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    managerRef.current.handleDoubleClick(x, y);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!managerRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    managerRef.current.handleMouseMove(x, y);
  }, []);

  const handleReset = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.reset();
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          if (managerRef.current) {
            managerRef.current.handleMouseMove(-1, -1);
          }
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />
      <UIController
        brightness={brightness}
        syncTolerance={syncTolerance}
        timeSpeed={timeSpeed}
        stats={stats}
        onBrightnessChange={setBrightness}
        onSyncToleranceChange={setSyncTolerance}
        onTimeSpeedChange={setTimeSpeed}
        onReset={handleReset}
      />
    </div>
  );
};
