import React, { useState, useEffect } from 'react';
import type { TooltipProps } from 'recharts';

interface AnimatedTooltipProps extends TooltipProps<any, any> {
  unit?: string;
}

const AnimatedTooltip: React.FC<AnimatedTooltipProps> = ({
  active,
  payload,
  label,
  unit = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active && payload && payload.length) {
      const timer = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(timer);
    } else {
      setVisible(false);
    }
  }, [active, payload]);

  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className={`custom-tooltip ${visible ? 'visible' : ''}`}>
      <div className="tooltip-label">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="tooltip-item">
          <span
            className="tooltip-dot"
            style={{ backgroundColor: entry.color }}
          />
          <span className="tooltip-name">{entry.name}:</span>
          <span className="tooltip-value">
            {entry.value.toFixed(1)} {unit}
          </span>
        </div>
      ))}

      <style>{`
        .custom-tooltip {
          background: rgba(255, 255, 255, 0.98);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          border: 1px solid #e2e8f0;
          opacity: 0;
          transform: translateY(10px) scale(0.9);
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          pointer-events: none;
          min-width: 140px;
        }

        .custom-tooltip.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .tooltip-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 0.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #edf2f7;
        }

        .tooltip-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          margin-bottom: 0.25rem;
        }

        .tooltip-item:last-child {
          margin-bottom: 0;
        }

        .tooltip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .tooltip-name {
          color: #718096;
        }

        .tooltip-value {
          font-weight: 600;
          color: #2d3748;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
};

export default AnimatedTooltip;
