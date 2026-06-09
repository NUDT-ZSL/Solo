import React, { useState, useEffect, useRef, useCallback } from 'react';
import VineScene from './components/VineScene';
import { useVineGrowth } from './hooks/useVineGrowth';

export default function App() {
  const { state, placeSeed, splitNode } = useVineGrowth();

  const [fps, setFps] = useState(60);
  const [, forceRender] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(performance.now());

  const updateUI = useCallback(() => {
    forceRender(t => t + 1);
  }, []);

  useEffect(() => {
    let rafId: number;
    let running = true;

    const measureFps = () => {
      if (!running) return;

      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastFpsUpdateRef.current;

      if (elapsed >= 500) {
        const currentFps = Math.round((frameCountRef.current * 1000) / elapsed);
        setFps(currentFps);
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
        updateUI();
      }

      rafId = requestAnimationFrame(measureFps);
    };

    rafId = requestAnimationFrame(measureFps);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
    };
  }, [updateUI]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 10,
    pointerEvents: 'none',
    textShadow: '0 0 4px rgba(0,0,0,0.8)'
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0A0A2E 0%, #1A1A3E 100%)'
      }}
    >
      <VineScene
        seeds={state.seeds}
        vines={state.vines}
        collisions={state.collisions}
        splitParticles={state.splitParticles}
        trailParticles={state.trailParticles}
        gridFlash={state.gridFlash}
        sunPosition={state.sunPosition}
        onPlaceSeed={placeSeed}
        onSplitNode={splitNode}
      />

      <div
        style={{
          ...overlayStyle,
          top: '12px',
          left: '16px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontFamily: 'monospace, "Microsoft YaHei", sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}
      >
        FPS: {fps}
      </div>

      <div
        style={{
          ...overlayStyle,
          bottom: '16px',
          right: '16px',
          color: 'rgba(255, 255, 255, 0.65)',
          fontFamily: 'monospace, "Microsoft YaHei", sans-serif',
          fontSize: '12px',
          lineHeight: '1.8',
          textAlign: 'right'
        }}
      >
        <div>藤蔓总数: {state.vines.length} / 100</div>
        <div>生长时间: {formatTime(state.growthTime)}</div>
      </div>

      <div
        style={{
          ...overlayStyle,
          bottom: '16px',
          left: '16px',
          color: 'rgba(255, 255, 255, 0.45)',
          fontFamily: 'monospace, "Microsoft YaHei", sans-serif',
          fontSize: '11px',
          lineHeight: '1.7'
        }}
      >
        <div>点击地面放置种子</div>
        <div>点击藤蔓节点分裂</div>
        <div>拖拽旋转 · 滚轮缩放</div>
        <div>按 R 重置视角</div>
      </div>
    </div>
  );
}
