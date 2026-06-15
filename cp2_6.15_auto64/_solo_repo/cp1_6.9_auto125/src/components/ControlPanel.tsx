import React from 'react';
import type { LightParams } from '../utils/lightEngine';

interface ControlPanelProps {
  params: LightParams;
  onChange: (next: LightParams) => void;
  onRandomize: () => void;
  onExport: () => void;
  onClearPaths: () => void;
  pathCount: number;
}

interface SliderDef {
  key: keyof LightParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
}

const SLIDERS: SliderDef[] = [
  { key: 'angle', label: '角度', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'amplitude', label: '振幅', min: 10, max: 200, step: 1, unit: 'px' },
  { key: 'frequency', label: '频率', min: 1, max: 20, step: 1 },
  { key: 'colorShift', label: '颜色偏移', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'pointCount', label: '光点数量', min: 100, max: 5000, step: 50 },
  { key: 'trailLength', label: '拖尾长度', min: 50, max: 200, step: 5, unit: 'px' },
  { key: 'glowRadius', label: '发光半径', min: 8, max: 30, step: 1, unit: 'px' }
];

const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onChange,
  onRandomize,
  onExport,
  onClearPaths,
  pathCount
}) => {
  const update = (key: keyof LightParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <aside className="control-panel">
      <div className="panel-header">
        <h1 className="title">光绘图谱</h1>
        <p className="subtitle">LIGHT · PAINTING · ATLAS</p>
      </div>

      <div className="panel-section">
        <div className="section-label">参数调节</div>
        {SLIDERS.map((s) => {
          const value = params[s.key] as number;
          const display = s.format ? s.format(value) : `${value}${s.unit ?? ''}`;
          return (
            <div className="slider-row" key={s.key}>
              <div className="slider-head">
                <span className="slider-label">{s.label}</span>
                <span className="slider-value">{display}</span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={value}
                onChange={(e) => update(s.key, Number(e.target.value))}
                className="neon-slider"
              />
            </div>
          );
        })}
      </div>

      <div className="panel-section">
        <div className="section-label">操作</div>
        <div className="btn-row">
          <button className="neon-btn primary" onClick={onRandomize}>
            ✦ 随机生成
          </button>
          <button className="neon-btn accent" onClick={onExport}>
            ⬇ 导出 PNG
          </button>
        </div>
        <button className="neon-btn ghost full" onClick={onClearPaths}>
          清除路径 ({pathCount})
        </button>
      </div>

      <div className="panel-tip">
        在右侧画布上拖拽鼠标可注册新的光绘路径，多条路径独立运动。
      </div>

      <div className="panel-footer">
        <span>● 光绘引擎</span>
        <span>1920 × 1080</span>
      </div>
    </aside>
  );
};

export default ControlPanel;
