import React from 'react';

interface ToolbarProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isClearing: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  onUndo,
  onRedo,
  onClear,
  onExport,
  canUndo,
  canRedo,
  isClearing,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <span className="brand-icon">🏞️</span>
        <span className="brand-title">微缩景观设计器</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-actions">
        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-15-6.7L3 13" />
          </svg>
          <span className="btn-label">撤销</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0115-6.7L21 13" />
          </svg>
          <span className="btn-label">重做</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-actions">
        <button
          className="toolbar-btn danger"
          onClick={onClear}
          disabled={isClearing}
          title="清空画布"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
          </svg>
          <span className="btn-label">{isClearing ? '清空中...' : '清空'}</span>
        </button>

        <button
          className="toolbar-btn primary"
          onClick={onExport}
          title="导出PNG"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="btn-label">导出PNG</span>
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-hint">
        <span>💡 拖拽素材到画布，Delete键删除选中</span>
      </div>
    </div>
  );
};

export default Toolbar;
