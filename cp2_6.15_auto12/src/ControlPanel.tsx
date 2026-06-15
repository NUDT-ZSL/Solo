import React from 'react';
import type { RenderParams } from './RenderManager';

interface ControlPanelProps {
  params: RenderParams;
  onParamsChange: (params: Partial<RenderParams>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ params, onParamsChange }) => {
  const handleMinRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onParamsChange({ minRadius: value });
  };

  const handleMaxRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onParamsChange({ maxRadius: value });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onParamsChange({ speedMultiplier: value });
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    onParamsChange({ hueShift: value });
  };

  return (
    <div className="control-panel">
      <div className="control-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="control-label">最小半径</span>
          <span className="control-value">{Math.round(params.minRadius)}px</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min="4"
          max="48"
          step="1"
          value={params.minRadius}
          onChange={handleMinRadiusChange}
        />
      </div>

      <div className="control-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="control-label">最大半径</span>
          <span className="control-value">{Math.round(params.maxRadius)}px</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min="4"
          max="48"
          step="1"
          value={params.maxRadius}
          onChange={handleMaxRadiusChange}
        />
      </div>

      <div className="control-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="control-label">运动速度</span>
          <span className="control-value">{params.speedMultiplier.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min="0.5"
          max="2.0"
          step="0.1"
          value={params.speedMultiplier}
          onChange={handleSpeedChange}
        />
      </div>

      <div className="control-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="control-label">色相偏移</span>
          <span className="control-value">{Math.round(params.hueShift)}°</span>
        </div>
        <input
          type="range"
          className="control-slider"
          min="0"
          max="360"
          step="1"
          value={params.hueShift}
          onChange={handleHueChange}
        />
      </div>
    </div>
  );
};

export default ControlPanel;
