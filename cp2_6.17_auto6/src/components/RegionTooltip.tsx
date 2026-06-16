import React from 'react';
import type { BrainRegion } from '../types';
import { REGION_INFO } from '../types';

interface RegionTooltipProps {
  region: BrainRegion;
  position: { x: number; y: number };
  avgSignal: number;
  peakFrequency: number;
}

function RegionTooltip({ region, position, avgSignal, peakFrequency }: RegionTooltipProps) {
  const info = REGION_INFO[region];

  return (
    <div
      style={{
        ...styles.tooltip,
        left: position.x + 15,
        top: position.y + 15
      }}
    >
      <div style={styles.header}>
        <div style={{ ...styles.dot, backgroundColor: info.color }} />
        <span style={styles.title}>{info.nameCN}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>英文名称</span>
        <span style={styles.value}>{info.name}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>平均信号</span>
        <span style={styles.value}>{avgSignal.toFixed(2)} µV</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>峰值频率</span>
        <span style={styles.value}>{peakFrequency.toFixed(1)} Hz</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tooltip: {
    position: 'fixed',
    zIndex: 1000,
    background: 'rgba(17, 17, 51, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #2a2a5a',
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '180px',
    pointerEvents: 'none',
    animation: 'fadeIn 0.2s ease',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #2a2a5a'
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  title: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px'
  },
  label: {
    color: '#8888aa',
    fontSize: '12px'
  },
  value: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 500
  }
};

export default RegionTooltip;
