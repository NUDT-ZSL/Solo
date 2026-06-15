import React from 'react';
import { PerformanceStats } from '../engine/ParticleEngine';

interface PerformancePanelProps {
  stats: PerformanceStats;
  visible: boolean;
}

export const PerformancePanel: React.FC<PerformancePanelProps> = ({ stats, visible }) => {
  const getFpsColor = (fps: number): string => {
    if (fps < 20) return '#ef4444';
    if (fps < 30) return '#eab308';
    return '#cbd5e1';
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: 16,
    right: visible ? 16 : -220,
    width: 200,
    background: 'rgba(30, 41, 59, 0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: 8,
    padding: 12,
    color: '#cbd5e1',
    fontSize: 12,
    fontFamily: 'monospace',
    transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 100,
    pointerEvents: 'none',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '4px 0',
  };

  return (
    <div style={panelStyle}>
      {stats.performanceMode && (
        <div style={{
          background: '#eab308',
          color: '#000',
          padding: '4px 8px',
          borderRadius: 4,
          marginBottom: 8,
          textAlign: 'center',
          fontWeight: 'bold',
        }}>
          性能模式
        </div>
      )}
      <div style={rowStyle}>
        <span>FPS</span>
        <span style={{ color: getFpsColor(stats.fps), fontWeight: 'bold' }}>
          {stats.fps.toFixed(0)}
        </span>
      </div>
      <div style={rowStyle}>
        <span>粒子数</span>
        <span>{stats.particleCount}</span>
      </div>
      <div style={rowStyle}>
        <span>CPU负载</span>
        <span>{(stats.cpuLoad * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};
