import { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Icon } from './types';
import './IconGrid.css';

interface IconGridProps {
  icons: Icon[];
  selectedIds: Set<string>;
  iconSizes: Record<string, number>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDelete: (id: string) => void;
  onEdit: (icon: Icon) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onSizeChange: (id: string, size: number) => void;
  selectedIcons: Icon[];
  onExportSuccess: () => void;
}

interface SortableCardProps {
  icon: Icon;
  selected: boolean;
  size: number;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (icon: Icon) => void;
  onSizeChange: (id: string, size: number) => void;
}

function SortableCard({
  icon,
  selected,
  size,
  onToggleSelect,
  onDelete,
  onEdit,
  onSizeChange,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: icon.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`icon-card ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="card-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(icon.id)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="icon-wrapper" style={{ width: size, height: size }}>
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
      <div className="card-size-slider" onClick={(e) => e.stopPropagation()}>
        <input
          type="range"
          min="32"
          max="128"
          value={size}
          onChange={(e) => onSizeChange(icon.id, Number(e.target.value))}
          className="card-slider"
        />
        <span className="card-size-label">{size}px</span>
      </div>
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
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
  );
}

function IconCardStatic({ icon, size }: { icon: Icon; size: number }) {
  return (
    <div className="icon-card drag-overlay">
      <div className="icon-wrapper" style={{ width: size, height: size }}>
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
      <div className="icon-name">{icon.name}</div>
      <div className="card-actions">
        <div className="action-btn edit-btn">✎</div>
        <div className="action-btn delete-btn">✕</div>
      </div>
    </div>
  );
}

function IconGrid({
  icons,
  selectedIds,
  iconSizes,
  onToggleSelect,
  onSelectAll,
  onDelete,
  onEdit,
  onReorder,
  onSizeChange,
  selectedIcons,
  onExportSuccess,
}: IconGridProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = icons.findIndex((i) => i.id === active.id);
      const newIndex = icons.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  const handleExportSVG = useCallback(async () => {
    if (selectedIcons.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('icons');

    selectedIcons.forEach((icon) => {
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${icon.paths.map(p => `<path d="${p}"/>`).join('\n  ')}
</svg>`;
      if (folder) {
        folder.file(`${icon.name}.svg`, svgContent);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'icons-svg.zip');
    onExportSuccess();
    setShowExportMenu(false);
  }, [selectedIcons, onExportSuccess]);

  const svgToPng = (svgString: string, size: number = 128): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, size, size);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert to PNG'));
            }
          }, 'image/png');
        } else {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context not available'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG'));
      };

      img.src = url;
    });
  };

  const handleExportPNG = useCallback(async () => {
    if (selectedIcons.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('icons');

    for (const icon of selectedIcons) {
      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  ${icon.paths.map(p => `<path d="${p}"/>`).join('\n  ')}
</svg>`;

      try {
        const pngBlob = await svgToPng(svgContent, 128);
        if (folder) {
          folder.file(`${icon.name}.png`, pngBlob);
        }
      } catch (err) {
        console.error('PNG conversion error:', err);
        if (folder) {
          folder.file(`${icon.name}.svg`, svgContent);
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'icons-png.zip');
    onExportSuccess();
    setShowExportMenu(false);
  }, [selectedIcons, onExportSuccess]);

  const activeIcon = activeId ? icons.find(i => i.id === activeId) : null;
  const activeSize = activeId ? (iconSizes[activeId] || 48) : 48;

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
          <span className="toolbar-title">图标网格</span>
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
                <button onClick={handleExportSVG} className="export-option">
                  导出 SVG
                </button>
                <button onClick={handleExportPNG} className="export-option">
                  导出 PNG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="icon-grid-wrapper">
        {icons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎨</div>
            <p className="empty-text">还没有图标，在左侧输入描述开始生成吧！</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={icons.map(i => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="icon-grid">
                {icons.map((icon) => (
                  <SortableCard
                    key={icon.id}
                    icon={icon}
                    selected={selectedIds.has(icon.id)}
                    size={iconSizes[icon.id] || 48}
                    onToggleSelect={onToggleSelect}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onSizeChange={onSizeChange}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeIcon ? (
                <IconCardStatic icon={activeIcon} size={activeSize} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

export default IconGrid;
