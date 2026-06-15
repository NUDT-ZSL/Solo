import React, { useCallback, memo } from 'react';
import { ShapeType } from '../types';

interface ToolbarProps {
  onAddShape: (type: ShapeType) => void;
  onExportClick: () => void;
}

const ShapeIcon: React.FC<{ type: ShapeType }> = ({ type }) => {
  switch (type) {
    case 'rect':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
        </svg>
      );
    case 'circle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3L22 21H2L12 3Z" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

const shapeLabels: Record<ShapeType, string> = {
  rect: '矩形',
  circle: '圆形',
  triangle: '三角形',
  star: '星形',
};

const Toolbar: React.FC<ToolbarProps> = memo(function Toolbar({
  onAddShape,
  onExportClick,
}) {
  const handleAddShape = useCallback((type: ShapeType) => {
    onAddShape(type);
  }, [onAddShape]);

  return (
    <aside className="toolbar">
      <div className="toolbar-header">
        <h1>LogoLab</h1>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-section-title">添加形状</div>
        <div className="shape-buttons">
          {(['rect', 'circle', 'triangle', 'star'] as ShapeType[]).map((type) => (
            <button
              key={type}
              className="shape-btn"
              onClick={() => handleAddShape(type)}
              title={`添加${shapeLabels[type]}`}
            >
              <ShapeIcon type={type} />
              <span>{shapeLabels[type]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-section-title">导出</div>
        <button className="export-btn" onClick={onExportClick}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出设计
        </button>
      </div>

      <div className="toolbar-section" style={{ marginTop: 'auto' }}>
        <div className="toolbar-section-title">快捷键</div>
        <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.8' }}>
          <div>Delete - 删除选中</div>
          <div>Shift - 保持比例</div>
          <div>Shift+旋转 - 15°吸附</div>
        </div>
      </div>
    </aside>
  );
});

export default Toolbar;
