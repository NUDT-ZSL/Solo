import React from 'react';
import { Tool } from '../types';
import {
  PenIcon,
  RectangleIcon,
  CircleIcon,
  StickyIcon,
  SelectIcon,
  EraserIcon,
  UndoIcon,
  RedoIcon,
  DownloadIcon,
  TrashIcon,
  MenuIcon,
} from './Icons';

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  fillColor: string;
  onFillColorChange: (color: string) => void;
  strokeColor: string;
  onStrokeColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onClear: () => void;
  onToggleSidebar: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onToolChange,
  fillColor,
  onFillColorChange,
  strokeColor,
  onStrokeColorChange,
  strokeWidth,
  onStrokeWidthChange,
  onUndo,
  onRedo,
  onExport,
  onClear,
  onToggleSidebar,
  canUndo,
  canRedo,
}) => {
  const tools: { id: Tool; icon: React.ReactNode; title: string }[] = [
    { id: 'select', icon: <SelectIcon />, title: '选择 (V)' },
    { id: 'pen', icon: <PenIcon />, title: '画笔 (P)' },
    { id: 'rectangle', icon: <RectangleIcon />, title: '矩形 (R)' },
    { id: 'circle', icon: <CircleIcon />, title: '圆形 (C)' },
    { id: 'sticky', icon: <StickyIcon />, title: '便签 (T)' },
    { id: 'eraser', icon: <EraserIcon />, title: '橡皮擦 (E)' },
  ];

  return (
    <div className="toolbar">
      <div className="logo">✏️ 协作白板</div>

      <button className="hamburger-btn" onClick={onToggleSidebar}>
        <MenuIcon />
      </button>

      <div className="toolbar-section">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => onToolChange(t.id)}
            title={t.title}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className="toolbar-section">
        <div className="prop-row" style={{ marginBottom: 0 }}>
          <div className="prop-label" style={{ marginBottom: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            填充
          </div>
          <div className="color-picker-wrapper">
            <input
              type="color"
              value={fillColor !== 'transparent' ? fillColor : '#ffffff'}
              onChange={(e) => onFillColorChange(e.target.value)}
            />
          </div>
        </div>
        <div className="prop-row" style={{ marginBottom: 0 }}>
          <div className="prop-label" style={{ marginBottom: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            边框
          </div>
          <div className="color-picker-wrapper">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => onStrokeColorChange(e.target.value)}
            />
          </div>
        </div>
        <div className="slider-wrapper">
          <div className="prop-label" style={{ marginBottom: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
            粗细
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={strokeWidth}
            onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          />
          <span className="slider-value">{strokeWidth}</span>
        </div>
      </div>

      <div className="toolbar-section">
        <button
          className="tool-btn"
          onClick={onUndo}
          title="撤销 (Ctrl+Z)"
          style={{ opacity: canUndo ? 1 : 0.4, cursor: canUndo ? 'pointer' : 'not-allowed' }}
          disabled={!canUndo}
        >
          <UndoIcon />
        </button>
        <button
          className="tool-btn"
          onClick={onRedo}
          title="重做 (Ctrl+Shift+Z)"
          style={{ opacity: canRedo ? 1 : 0.4, cursor: canRedo ? 'pointer' : 'not-allowed' }}
          disabled={!canRedo}
        >
          <RedoIcon />
        </button>
      </div>

      <div className="spacer" />

      <div className="toolbar-section">
        <button className="action-btn" onClick={onExport} title="导出为PNG">
          <DownloadIcon size={16} />
          <span>导出</span>
        </button>
        <button className="action-btn" onClick={onClear} title="清空画布" style={{ color: 'var(--danger-color)' }}>
          <TrashIcon size={16} />
          <span>清空</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
