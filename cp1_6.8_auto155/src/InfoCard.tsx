import React, { useEffect, useState } from 'react';
import { FlareInfo } from './SunEngine';

interface InfoCardProps {
  flare: FlareInfo | null;
  onClose: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({ flare, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (flare) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(timer);
    }
  }, [flare]);

  if (!visible) return null;

  const energyColor =
    flare!.energy === 'X'
      ? '#ff4444'
      : flare!.energy === 'M'
        ? '#ff9933'
        : '#ffcc44';

  return (
    <div className={`info-card-overlay ${animating ? 'info-card-visible' : ''}`}>
      <div className="info-card">
        <div className="info-card-header">
          <span className="info-card-title">耀斑数据</span>
          <button className="info-card-close" onClick={onClose}>✕</button>
        </div>
        <div className="info-card-body">
          <div className="info-row">
            <span className="info-label">能量等级</span>
            <span className="info-value" style={{ color: energyColor, fontWeight: 700 }}>
              {flare!.energy} 级
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">温度</span>
            <span className="info-value">{flare!.temperature.toFixed(1)} 百万 K</span>
          </div>
          <div className="info-row">
            <span className="info-label">速度</span>
            <span className="info-value">{flare!.velocity} km/s</span>
          </div>
          <div className="info-row">
            <span className="info-label">强度</span>
            <span className="info-value">{(flare!.intensity * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="info-card-glow" style={{ borderColor: energyColor }} />
      </div>
    </div>
  );
};
