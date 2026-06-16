import React, { useEffect, useState } from 'react';

export const CHEMICAL_COLORS = [
  { name: '紫色', color: '#6f00ff' },
  { name: '绿色', color: '#00ff87' },
  { name: '红色', color: '#ff4757' },
  { name: '蓝色', color: '#00d4ff' },
  { name: '黄色', color: '#ffd93d' },
];

interface ControlPanelProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  temperature: number;
  onTemperatureChange: (value: number) => void;
  humidity: number;
  onHumidityChange: (value: number) => void;
  mergeCount: number;
  maxRadius: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedColor,
  onColorChange,
  temperature,
  onTemperatureChange,
  humidity,
  onHumidityChange,
  mergeCount,
  maxRadius,
}) => {
  const [mergeBump, setMergeBump] = useState(false);
  const [radiusBump, setRadiusBump] = useState(false);
  const [prevMerge, setPrevMerge] = useState(mergeCount);
  const [prevRadius, setPrevRadius] = useState(maxRadius);

  useEffect(() => {
    if (mergeCount !== prevMerge) {
      setMergeBump(true);
      setPrevMerge(mergeCount);
      const timer = setTimeout(() => setMergeBump(false), 200);
      return () => clearTimeout(timer);
    }
  }, [mergeCount, prevMerge]);

  useEffect(() => {
    if (Math.abs(maxRadius - prevRadius) > 0.5) {
      setRadiusBump(true);
      setPrevRadius(maxRadius);
      const timer = setTimeout(() => setRadiusBump(false), 200);
      return () => clearTimeout(timer);
    }
  }, [maxRadius, prevRadius]);

  const tempGradient = (() => {
    const t = (temperature - 10) / 40;
    const low = { r: 0, g: 0.83, b: 1 };
    const high = { r: 1, g: 0.28, b: 0.34 };
    const r = Math.round((low.r + (high.r - low.r) * t) * 255);
    const g = Math.round((low.g + (high.g - low.g) * t) * 255);
    const b = Math.round((low.b + (high.b - low.b) * t) * 255);
    return `linear-gradient(to right, #00d4ff, rgb(${r},${g},${b}))`;
  })();

  const humidityGradient = (() => {
    const t = (humidity - 30) / 60;
    const low = { r: 1, g: 0.85, b: 0.24 };
    const high = { r: 0, g: 1, b: 0.53 };
    const r = Math.round((low.r + (high.r - low.r) * t) * 255);
    const g = Math.round((low.g + (high.g - low.g) * t) * 255);
    const b = Math.round((low.b + (high.b - low.b) * t) * 255);
    return `linear-gradient(to right, #ffd93d, rgb(${r},${g},${b}))`;
  })();

  return (
    <div className="control-panel">
      <div>
        <h2 className="panel-title">液滴显微镜模拟器</h2>
      </div>

      <div>
        <div className="section-title">化学试剂</div>
        <div className="color-selector">
          {CHEMICAL_COLORS.map(({ name, color }) => (
            <button
              key={name}
              className={`color-btn ${selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color, color }}
              onClick={() => onColorChange(color)}
              title={name}
            />
          ))}
        </div>
      </div>

      <div className="slider-group">
        <div className="section-title">环境参数</div>
        <div className="slider-label">
          <span>温度</span>
          <span className="slider-value">{temperature.toFixed(0)}°C</span>
        </div>
        <input
          type="range"
          min={10}
          max={50}
          step={1}
          value={temperature}
          onChange={(e) => onTemperatureChange(Number(e.target.value))}
          className="slider"
          style={{ background: tempGradient }}
        />
      </div>

      <div className="slider-group">
        <div className="slider-label">
          <span>湿度</span>
          <span className="slider-value">{humidity.toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={30}
          max={90}
          step={1}
          value={humidity}
          onChange={(e) => onHumidityChange(Number(e.target.value))}
          className="slider"
          style={{ background: humidityGradient }}
        />
      </div>

      <div className="stats-group">
        <div className="stat-item">
          <span className="stat-label">液滴合并次数</span>
          <span className={`stat-value ${mergeBump ? 'bump' : ''}`}>
            {mergeCount}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">最大液滴半径</span>
          <span className={`stat-value ${radiusBump ? 'bump' : ''}`}>
            {maxRadius.toFixed(1)} px
          </span>
        </div>
      </div>
    </div>
  );
};
