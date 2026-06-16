import { useState, useRef, useCallback } from 'react';
import type { Icon } from './types';
import './IconGrid.css';

interface IconGridProps {
  icons: Icon[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (id: string) => void;
  onEdit: (icon: Icon) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  selectedIcons: Icon[];
  onExportSuccess: () => void;
}

function IconGrid({
  icons,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDelete,
  onEdit,
  onReorder,
  selectedIcons,
  onExportSuccess,
}: IconGridProps) {
  const [iconSize, setIconSize] = useState(48);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      onReorder(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleExport = useCallback(async (format: 'svg' | 'png') => {
    if (selectedIcons.length === 0) return;

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ icons: selectedIcons, format }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'icons.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onExportSuccess();
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setShowExportMenu(false);
    }
  }, [selectedIcons, onExportSuccess]);

  return (
    <div className="icon-grid-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <label className="select-all-label">
            <input
              type="checkbox"
              checked={icons.length > 0 && selectedIds.size === icons.length}
              onChange={onSelectAll}
              className="select-all-checkbox"
            />
            <span>全选</span>
          </label>
        </div>
        <div className="toolbar-center">
          <span className="size-label">图标大小: {iconSize}px</span>
          <input
            type="range"
            min="32"
            max="128"
            value={iconSize}
            onChange={(e) => setIconSize(Number(e.target.value))}
            className="size-slider"
          />
        </div>
        <div className="toolbar-right">
          <div className="export-menu" ref={exportMenuRef}>
            <button
              className="export-button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={selectedIds.size === 0}
            >
              批量导出 ({selectedIds.size})
            </button>
            {showExportMenu && (
              <div className="export-dropdown">
                <button onClick={() => handleExport('svg')} className="export-option">
                  导出 SVG
                </button>
                <button onClick={() => handleExport('png')} className="export-option">
                  导出 PNG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="icon-grid">
        {icons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <p className="empty-text">还没有图标，在左侧输入描述开始生成吧！</p>
          </div>
        ) : (
          icons.map((icon, index) => (
            <div
              key={icon.id}
              className={`icon-card ${selectedIds.has(icon.id) ? 'selected' : ''} ${
                draggedIndex === index ? 'dragging' : ''
              } ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={() => setDragOverIndex(null)}
            >
              <div className="card-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(icon.id)}
                  onChange={() => onToggleSelect(icon.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="icon-wrapper" style={{ width: iconSize, height: iconSize }}>
                <svg
                  viewBox={icon.viewBox}
                  fill="none"
                  stroke="#e94560"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="100%"
                  height="100%"
                >
                  {icon.paths.map((path, i) => (
                    <path key={i} d={path} />
                  ))}
                </svg>
              </div>
              <div className="icon-name" title={icon.name}>
                {icon.name}
              </div>
              <div className="card-actions">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(icon)}
                  title="编辑"
                >
                  ✎
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => onDelete(icon.id)}
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default IconGrid;
