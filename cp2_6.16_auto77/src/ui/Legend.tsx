import { useState, useEffect } from 'react';
import { OceanCurrent } from '@/utils/currentData';
import { calculateDistance } from '@/scene/Current';

interface LegendProps {
  selectedCurrent: OceanCurrent | null;
}

export default function Legend({ selectedCurrent }: LegendProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayCurrent, setDisplayCurrent] = useState<OceanCurrent | null>(null);

  useEffect(() => {
    if (selectedCurrent) {
      setDisplayCurrent(selectedCurrent);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setDisplayCurrent(null), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedCurrent]);

  if (!displayCurrent) return null;

  const distance = calculateDistance(displayCurrent.start, displayCurrent.end);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        width: '240px',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: '12px',
        padding: '16px',
        color: '#ffffff',
        fontSize: '14px',
        backdropFilter: 'blur(8px)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '12px',
          color: displayCurrent.color,
          textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
        }}
      >
        {displayCurrent.name}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          opacity: 0.9,
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>流速范围</span>
        <span style={{ fontWeight: 500 }}>
          {displayCurrent.speedRange[0]} - {displayCurrent.speedRange[1]} m/s
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          opacity: 0.9,
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>总长度</span>
        <span style={{ fontWeight: 500 }}>
          {(distance / 1000).toFixed(1)} 千公里
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          opacity: 0.9,
        }}
      >
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>类型</span>
        <span style={{ fontWeight: 500 }}>
          {displayCurrent.color === '#00d4ff' ? '寒流' : '暖流'}
        </span>
      </div>

      <div
        style={{
          marginTop: '12px',
          height: '3px',
          borderRadius: '2px',
          background: `linear-gradient(90deg, #00d4ff 0%, #ff6b35 50%, #e63946 100%)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: `${Math.min(100, Math.max(0, ((displayCurrent.speedRange[0] + displayCurrent.speedRange[1]) / 2 - 0.2) / 2.3 * 100))}%`,
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: displayCurrent.color,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px ${displayCurrent.color}`,
          }}
        />
      </div>
    </div>
  );
}
