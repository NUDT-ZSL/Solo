import React from 'react';
import type { ParticlePreset } from '../types';

interface ControlPanelProps {
  preset: ParticlePreset;
  onPresetChange: (preset: ParticlePreset) => void;
  onCapture: () => void;
}

const PRESETS: { value: ParticlePreset; label: string; description: string }[] = [
  { value: 'nebula', label: '星云弥散', description: '随机分布粒子' },
  { value: 'volcano', label: '火山喷发', description: '中心爆发粒子' },
  { value: 'deepSea', label: '深海漩涡', description: '底部上浮粒子' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  preset,
  onPresetChange,
  onCapture,
}) => {
  const handlePresetClick = (e: React.MouseEvent<HTMLButtonElement>, newPreset: ParticlePreset) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    ripple.style.width = ripple.style.height = '10px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
    
    onPresetChange(newPreset);
  };

  return (
    <>
      <div className="panel-section">
        <label className="section-label">粒子预设</label>
        <div className="preset-buttons">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={`preset-btn ${preset === p.value ? 'active' : ''}`}
              onClick={(e) => handlePresetClick(e, p.value)}
            >
              {p.label}
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="panel-section">
        <label className="section-label">快照</label>
        <button className="capture-btn" onClick={onCapture}>
          📷 捕获这一刻
        </button>
      </div>
    </>
  );
};

export default ControlPanel;
