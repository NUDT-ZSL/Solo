import React, { useCallback } from 'react';
import { SunEngine, EngineParams } from './SunEngine';
import { SunRenderer } from './SunRenderer';

interface ControlPanelProps {
  engine: SunEngine;
  renderer: SunRenderer;
}

const SLIDER_CONFIG: { key: keyof EngineParams; label: string; min: number; max: number; step: number }[] = [
  { key: 'flowSpeed', label: '流速', min: 0.1, max: 2.0, step: 0.05 },
  { key: 'density', label: '密度', min: 0.2, max: 2.0, step: 0.05 },
  { key: 'glowIntensity', label: '光晕强度', min: 0.2, max: 2.0, step: 0.05 },
];

export const ControlPanel: React.FC<ControlPanelProps> = ({ engine, renderer }) => {
  const handleChange = useCallback(
    (key: keyof EngineParams, value: number) => {
      engine.setParam(key, value);
    },
    [engine]
  );

  const handleReset = useCallback(() => {
    renderer.resetView();
  }, [renderer]);

  return (
    <div className="control-panel">
      <div className="control-panel-title">控制面板</div>
      {SLIDER_CONFIG.map(({ key, label, min, max, step }) => (
        <div className="slider-group" key={key}>
          <div className="slider-header">
            <span className="slider-label">{label}</span>
            <span className="slider-value">
              {engine.params[key].toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            className="slider-input"
            min={min}
            max={max}
            step={step}
            value={engine.params[key]}
            onChange={(e) => handleChange(key, parseFloat(e.target.value))}
          />
        </div>
      ))}
      <button className="reset-btn" onClick={handleReset}>
        重置视角
      </button>
    </div>
  );
};
