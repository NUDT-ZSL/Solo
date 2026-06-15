import React from 'react';
import { COLOR_PALETTE, ToolMode } from './types';

interface ToolbarProps {
  color: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  toolMode: ToolMode;
  onToolModeChange: (mode: ToolMode) => void;
  onUndo: () => void;
  onClear: () => void;
  onToggleMenu?: () => void;
  showMenuButton?: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  toolMode,
  onToolModeChange,
  onUndo,
  onClear,
  onToggleMenu,
  showMenuButton = false,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>白板</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="color-palette">
          {COLOR_PALETTE.map((c) => (
            <div
              key={c}
              className={`color-dot ${color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="line-width-control">
          <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}>粗细</span>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => onLineWidthChange(Number(e.target.value))}
            className="line-width-slider"
          />
          <div className="line-width-preview">
            <div
              className="line-width-preview-dot"
              style={{
                width: `${lineWidth}px`,
                height: `${lineWidth}px`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${toolMode === 'draw' ? 'active' : ''}`}
          onClick={() => onToolModeChange('draw')}
        >
          🖌️ 画笔
        </button>
        <button
          className={`toolbar-btn ${toolMode === 'sticky' ? 'active' : ''}`}
          onClick={() => onToolModeChange('sticky')}
        >
          📝 便签
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button className="toolbar-btn" onClick={onUndo}>
          ↩️ 撤销
        </button>
        <button className="toolbar-btn danger" onClick={onClear}>
          🗑️ 清空
        </button>
      </div>

      {showMenuButton && (
        <>
          <div style={{ marginLeft: 'auto' }} />
          <button className="hamburger-btn" onClick={onToggleMenu}>
            ☰
          </button>
        </>
      )}
    </div>
  );
};

export default Toolbar;
