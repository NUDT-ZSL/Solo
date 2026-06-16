import React, { useState, useEffect } from 'react';
import type { BrainRegion } from '../types';
import { REGION_INFO } from '../types';

interface AlertBarProps {
  regions: BrainRegion[];
}

function AlertBar({ regions }: AlertBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (regions.length > 0) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [regions.length]);

  if (!visible || regions.length === 0) return null;

  const alertText = regions
    .map(r => `${REGION_INFO[r].nameCN}信号过强`)
    .join('、');

  return (
    <div style={styles.container}>
      <div style={styles.alertBar}>
        <span style={styles.icon}>⚠</span>
        <span style={styles.text}>{alertText}</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  },
  alertBar: {
    width: '320px',
    height: '56px',
    background: 'rgba(255, 71, 87, 0.9)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: '12px',
    boxShadow: '0 8px 24px rgba(255, 71, 87, 0.4)',
    animation: 'pulse 0.5s ease-in-out infinite alternate'
  },
  icon: {
    fontSize: '20px',
    color: '#ffffff'
  },
  text: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  }
};

export default AlertBar;
