import React, { useRef, useEffect, useCallback, useState } from 'react';
import { BeaconEngine } from './BeaconEngine';
import { ParticleTrail } from './ParticleTrail';
import { ControlPanel } from './ControlPanel';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BeaconEngine | null>(null);
  const trailRef = useRef<ParticleTrail | null>(null);
  const [beaconCount, setBeaconCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const isDraggingRef = useRef(false);
  const mouseDownTargetRef = useRef<'beacon' | 'midpoint' | 'empty' | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new BeaconEngine();
    const trail = new ParticleTrail();
    engine.setParticleTrail(trail);
    engine.init(canvasRef.current);
    engineRef.current = engine;
    trailRef.current = trail;

    const syncState = () => {
      setBeaconCount(engine.getBeaconCount());
      setCanUndo(engine.canUndo());
    };
    engine.onChange(syncState);

    return () => {
      engine.destroy();
    };
  }, []);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0] || (e as React.TouchEvent<HTMLCanvasElement>).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    mouseDownPosRef.current = pos;
    const result = engineRef.current.handleMouseDown(pos.x, pos.y);
    mouseDownTargetRef.current = result;
    isDraggingRef.current = result === 'beacon';
  }, [getCanvasPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    engineRef.current.handleMouseMove(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    const engine = engineRef.current;

    if (isDraggingRef.current) {
      engine.handleMouseUp();
      isDraggingRef.current = false;
      mouseDownTargetRef.current = null;
      return;
    }

    if (mouseDownTargetRef.current === 'beacon') {
      const downPos = mouseDownPosRef.current;
      if (downPos) {
        const dist = Math.sqrt((pos.x - downPos.x) ** 2 + (pos.y - downPos.y) ** 2);
        if (dist < 5) {
          engine.handleClick(pos.x, pos.y);
        }
      }
      engine.handleMouseUp();
    } else if (mouseDownTargetRef.current === 'empty') {
      const downPos = mouseDownPosRef.current;
      if (downPos) {
        const dist = Math.sqrt((pos.x - downPos.x) ** 2 + (pos.y - downPos.y) ** 2);
        if (dist < 5) {
          engine.addBeacon(pos.x, pos.y);
        }
      }
    }

    isDraggingRef.current = false;
    mouseDownTargetRef.current = null;
  }, [getCanvasPos]);

  const handleMouseLeave = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.handleMouseUp();
    isDraggingRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    mouseDownPosRef.current = pos;
    const result = engineRef.current.handleTouchStart(pos.x, pos.y);
    mouseDownTargetRef.current = result;
    isDraggingRef.current = result === 'beacon';
  }, [getCanvasPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    engineRef.current.handleTouchMove(pos.x, pos.y);
  }, [getCanvasPos]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!engineRef.current) return;
    const pos = getCanvasPos(e);
    const engine = engineRef.current;

    if (isDraggingRef.current) {
      engine.handleTouchEnd();
      isDraggingRef.current = false;
      mouseDownTargetRef.current = null;
      return;
    }

    if (mouseDownTargetRef.current === 'beacon') {
      const downPos = mouseDownPosRef.current;
      if (downPos) {
        const dist = Math.sqrt((pos.x - downPos.x) ** 2 + (pos.y - downPos.y) ** 2);
        if (dist < 10) {
          engine.handleClick(pos.x, pos.y);
        }
      }
      engine.handleTouchEnd();
    } else if (mouseDownTargetRef.current === 'empty') {
      const downPos = mouseDownPosRef.current;
      if (downPos) {
        const dist = Math.sqrt((pos.x - downPos.x) ** 2 + (pos.y - downPos.y) ** 2);
        if (dist < 10) {
          engine.addBeacon(pos.x, pos.y);
        }
      }
    }

    isDraggingRef.current = false;
    mouseDownTargetRef.current = null;
  }, [getCanvasPos]);

  const handleClear = useCallback(() => {
    engineRef.current?.clearAll();
  }, []);

  const handleUndo = useCallback(() => {
    engineRef.current?.undo();
  }, []);

  const handleExport = useCallback(() => {
    if (!engineRef.current) return;
    const json = engineRef.current.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firefly-beacon-path.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"SF Pro Display", "PingFang SC", -apple-system, sans-serif',
      }}
    >
      <ControlPanel
        beaconCount={beaconCount}
        canUndo={canUndo}
        onClear={handleClear}
        onUndo={handleUndo}
        onExport={handleExport}
      />
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(160, 150, 200, 0.4)',
          fontSize: 12,
          pointerEvents: 'none',
          textAlign: 'center',
          userSelect: 'none',
        }}
      >
        点击空白放置信标 · 拖拽移动 · 点击删除 · 点击连线中点插入
      </div>
    </div>
  );
};
