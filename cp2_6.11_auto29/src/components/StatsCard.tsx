import { useState, useEffect } from 'react';

interface StatsCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}

export default function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const [animate, setAnimate] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value !== displayValue) {
      setAnimate(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <div
      className="glass-card"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {color && (
        <div
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: `${color}22`,
            filter: 'blur(20px)'
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: color || 'var(--text-primary)',
          fontFamily: "'Noto Serif SC', serif",
          transform: animate ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.3s ease',
          display: 'inline-block'
        }}
      >
        {displayValue}
      </span>
    </div>
  );
}
