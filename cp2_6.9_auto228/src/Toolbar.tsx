import React from 'react';
import { ToolState, ToolType } from './types';

interface ToolbarProps {
  toolState: ToolState;
  presetColors: string[];
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onAddFrame: () => void;
  onExport: () => void;
}

const BrushIcon = () => (
  <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 00-3-3.02z" />
  </svg>
);

const EraserIcon = () => (
  <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16a2 2 0 010-2.8L13.2 3a2 2 0 012.8 0L21 8a2 2 0 010 2.8L10 21.5" />
    <path d="M18 13L9 4" />
  </svg>
);

const PickerIcon = () => (
  <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

const FrameIcon = () => (
  <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M7 7h10v10H7z" />
    <path d="M3 7h4M3 17h4M17 3v4M17 17v4" />
  </svg>
);

const ExportIcon = () => (
  <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  toolState,
  presetColors,
  onToolChange,
  onColorChange,
  onSizeChange,
  onOpacityChange,
  onAddFrame,
  onExport
}) => {
  const tools: { type: ToolType; icon: React.ReactNode; label: string }[] = [
    { type: 'brush', icon: <BrushIcon />, label: '笔刷' },
    { type: 'eraser', icon: <EraserIcon />, label: '橡皮' },
    { type: 'picker', icon: <PickerIcon />, label: '取色' }
  ];

  return (
    <>
      <div className="panel-section">
        <div className="panel-section-title">工具</div>
        <div className="tool-grid">
          {tools.map(tool => (
            <button
              key={tool.type}
              className={`tool-btn ${toolState.tool === tool.type ? 'active' : ''}`}
              onClick={() => onToolChange(tool.type)}
            >
              {tool.icon}
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">颜色</div>
        <div className="color-palette">
          {presetColors.map(color => (
            <button
              key={color}
              className={`color-swatch ${toolState.color === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={color}
            />
          ))}
        </div>
        <input
          type="color"
          className="custom-color-picker"
          value={toolState.color}
          onChange={e => onColorChange(e.target.value)}
        />
      </div>

      <div className="panel-section">
        <div className="panel-section-title">笔刷大小</div>
        <div className="slider-container">
          <div className="slider-label">
            <span>{toolState.size}px</span>
            <span>{toolState.size <= 5 ? '细' : toolState.size <= 12 ? '中' : '粗'}</span>
          </div>
          <input
            type="range"
            className="slider"
            min="1"
            max="20"
            step="1"
            value={toolState.size}
            onChange={e => onSizeChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">透明度</div>
        <div className="slider-container">
          <div className="slider-label">
            <span>{Math.round(toolState.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            className="slider"
            min="0.6"
            max="1"
            step="0.05"
            value={toolState.opacity}
            onChange={e => onOpacityChange(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-section-title">帧控制</div>
        <button className="btn-secondary" onClick={onAddFrame}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <FrameIcon />
            新建帧
          </span>
        </button>
      </div>

      <div className="panel-section">
        <button className="btn-primary" onClick={onExport}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ExportIcon />
            导出动画
          </span>
        </button>
      </div>
    </>
  );
};

export default Toolbar;
