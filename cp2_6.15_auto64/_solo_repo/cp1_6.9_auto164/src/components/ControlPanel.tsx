import { useState, useEffect } from 'react';
import { FurnitureId, StyleId, STYLE_PRESETS, FURNITURE_NAMES } from '../types';
import { furnitureController } from '../FurnitureController';

interface StyleButtonsProps {
  currentStyle: StyleId;
  onStyleChange: (style: StyleId) => void;
}

interface LightSliderProps {
  value: number;
  onChange: (value: number) => void;
}

interface ViewPresetsProps {
  onSelect: (preset: string) => void;
}

export function StyleButtons({ currentStyle, onStyleChange }: StyleButtonsProps) {
  const [animatingId, setAnimatingId] = useState<StyleId | null>(null);

  const handleClick = (styleId: StyleId) => {
    setAnimatingId(styleId);
    onStyleChange(styleId);
    setTimeout(() => setAnimatingId(null), 320);
  };

  return (
    <div className="panel-card">
      <h3 className="panel-title">风格切换</h3>
      <div className="style-grid">
        {STYLE_PRESETS.map((preset) => {
          const isActive = currentStyle === preset.id;
          const isAnimating = animatingId === preset.id;
          return (
            <button
              key={preset.id}
              className={`style-btn ${isActive ? 'active' : ''} ${isAnimating ? 'animate' : ''}`}
              onClick={() => handleClick(preset.id)}
              style={{ backgroundColor: preset.buttonColor }}
              title={preset.name}
            >
              <span className="style-btn-label">{preset.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FurnitureInfo({ selectedId }: { selectedId: FurnitureId | null }) {
  const selectedName = selectedId ? FURNITURE_NAMES[selectedId] : null;
  const state = selectedId ? furnitureController.getState(selectedId) : null;

  return (
    <div className="panel-card">
      <h3 className="panel-title">家具属性</h3>
      {selectedName ? (
        <div className="furniture-info">
          <div className="furniture-name-row">
            <span className="furniture-dot" />
            <span className="furniture-name">{selectedName}</span>
          </div>
          <p className="furniture-hint">
            <strong>提示：</strong>按住家具在水平面上自由拖拽，释放后自动吸附到 0.1m 网格位置。
          </p>
          {state && (
            <div className="furniture-coords">
              <div className="coord-item">
                <span className="coord-label">X</span>
                <span className="coord-value">{state.position[0].toFixed(2)} m</span>
              </div>
              <div className="coord-item">
                <span className="coord-label">Y</span>
                <span className="coord-value">{state.position[1].toFixed(2)} m</span>
              </div>
              <div className="coord-item">
                <span className="coord-label">Z</span>
                <span className="coord-value">{state.position[2].toFixed(2)} m</span>
              </div>
            </div>
          )}
          <div className="furniture-material">
            <span className="material-label">材质颜色</span>
            <span
              className="material-swatch"
              style={{ backgroundColor: state?.material.color }}
            />
            <span className="material-color">{state?.material.color.toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <div className="furniture-empty">
          <div className="empty-icon">🛋️</div>
          <p className="empty-text">点击 3D 场景中的任意家具进行选中和编辑。</p>
        </div>
      )}
    </div>
  );
}

export function LightSlider({ value, onChange }: LightSliderProps) {
  const warm = '#FFF8E3';
  const cool = '#E3F0FF';
  const temp = 3500 + (value / 100) * 3000;
  const intensity = (0.8 + (value / 100) * 0.4).toFixed(2);

  return (
    <div className="panel-card">
      <h3 className="panel-title">光照调节</h3>
      <div className="light-row">
        <span className="light-temp" style={{ color: warm }} title="暖光 3500K">🌅</span>
        <div className="slider-wrapper">
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="light-slider"
          />
          <div className="slider-bg" style={{ background: `linear-gradient(to right, ${warm}, ${cool})` }} />
        </div>
        <span className="light-temp" style={{ color: cool }} title="冷光 6500K">❄️</span>
      </div>
      <div className="light-stats">
        <div className="stat-item">
          <span className="stat-label">色温</span>
          <span className="stat-value">{Math.round(temp)} K</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">亮度</span>
          <span className="stat-value">{intensity}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">档位</span>
          <span className="stat-value">{value}/100</span>
        </div>
      </div>
    </div>
  );
}

export function ViewPresets({ onSelect }: ViewPresetsProps) {
  const [active, setActive] = useState<string | null>(null);
  const views = [
    { id: 'top', label: '俯视图', icon: '⬇️', desc: '正上方 45°' },
    { id: 'living', label: '客厅视角', icon: '👁️', desc: '沙发平视' },
    { id: 'corner', label: '角落视角', icon: '📐', desc: '斜角透视' },
  ];

  const handleClick = (id: string) => {
    setActive(id);
    onSelect(id);
    setTimeout(() => setActive(null), 2100);
  };

  return (
    <div className="panel-card">
      <h3 className="panel-title">视角预设</h3>
      <div className="view-grid">
        {views.map((v) => (
          <button
            key={v.id}
            className={`view-btn ${active === v.id ? 'active' : ''}`}
            onClick={() => handleClick(v.id)}
            disabled={active !== null}
          >
            <span className="view-icon">{v.icon}</span>
            <span className="view-label">{v.label}</span>
            <span className="view-desc">{v.desc}</span>
          </button>
        ))}
      </div>
      <p className="view-hint">
        鼠标左键拖拽旋转 · 滚轮缩放 · 始终围绕房间中心旋转
      </p>
    </div>
  );
}
