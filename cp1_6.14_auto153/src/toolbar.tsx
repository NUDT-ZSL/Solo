import React from 'react';
import { ToolType } from './canvas-engine';

interface ToolbarProps {
  currentTool: ToolType;
  setTool: (tool: ToolType) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  shapeFillOpacity: number;
  setShapeFillOpacity: (opacity: number) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const COLOR_PALETTE = ['#000000', '#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

const ToolIcon: React.FC<{ tool: ToolType; size?: number }> = ({ tool, size = 24 }) => {
  const s = size;
  switch (tool) {
    case 'brush':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
          <path d="M2 2l7.586 7.586"></path>
          <circle cx="11" cy="11" r="2"></circle>
        </svg>
      );
    case 'rectangle':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        </svg>
      );
    case 'circle':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
    case 'text':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7"></polyline>
          <line x1="9" y1="20" x2="15" y2="20"></line>
          <line x1="12" y1="4" x2="12" y2="20"></line>
        </svg>
      );
    case 'eraser':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H7L3 16a2 2 0 0 1 0-2.83L13.17 3a2 2 0 0 1 2.83 0L21 8a2 2 0 0 1 0 2.83L12 20z"></path>
          <path d="M18 13L11 6"></path>
        </svg>
      );
    case 'sticky-note':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="15 3 15 9 21 9"></polyline>
        </svg>
      );
    case 'select':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
        </svg>
      );
    default:
      return null;
  }
};

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setTool,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  shapeFillOpacity,
  setShapeFillOpacity,
  fontSize,
  setFontSize,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}) => {
  const tools: { id: ToolType; label: string }[] = [
    { id: 'select', label: '选择' },
    { id: 'brush', label: '笔刷' },
    { id: 'rectangle', label: '矩形' },
    { id: 'circle', label: '圆形' },
    { id: 'text', label: '文字' },
    { id: 'eraser', label: '橡皮擦' },
    { id: 'sticky-note', label: '便签' }
  ];

  return (
    <div className="collabboard-toolbar">
      <div className="toolbar-tools">
        {tools.map(({ id, label }) => (
          <button
            key={id}
            className={`tool-btn ${currentTool === id ? 'active' : ''} ${id === 'sticky-note' ? 'sticky-note-btn' : ''}`}
            onClick={() => setTool(id)}
            title={label}
          >
            {id === 'sticky-note' ? (
              <div className="sticky-note-icon">
                <div className="sticky-note-icon-inner" />
              </div>
            ) : (
              <ToolIcon tool={id} />
            )}
          </button>
        ))}
      </div>

      <div className="toolbar-divider"></div>

      <div className="toolbar-section">
        <div className="color-palette">
          {COLOR_PALETTE.map(color => (
            <button
              key={color}
              className={`color-swatch ${brushColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => setBrushColor(color)}
              title={color}
            />
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <label className="slider-label">粗细: {brushWidth}px</label>
        <input
          type="range"
          className="slider"
          min="1"
          max="30"
          value={brushWidth}
          onChange={(e) => setBrushWidth(Number(e.target.value))}
        />
      </div>

      {(currentTool === 'rectangle' || currentTool === 'circle') && (
        <div className="toolbar-section">
          <label className="slider-label">填充: {shapeFillOpacity}%</label>
          <input
            type="range"
            className="slider"
            min="0"
            max="100"
            value={shapeFillOpacity}
            onChange={(e) => setShapeFillOpacity(Number(e.target.value))}
          />
        </div>
      )}

      {currentTool === 'text' && (
        <div className="toolbar-section">
          <label className="slider-label">字号: {fontSize}px</label>
          <input
            type="range"
            className="slider"
            min="12"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      )}

      <div className="toolbar-divider"></div>

      <div className="toolbar-history">
        <button
          className="history-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        </button>
        <button
          className="history-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Shift+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>
      </div>
    </div>
  );
};
