import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import { Shape, ShapeType } from '../types';
import { rafThrottle } from '../utils/performanceUtils';

interface LayerPanelProps {
  shapes: Shape[];
  selectedId: string | null;
  onSelectShape: (id: string | null) => void;
  onUpdateShape: (id: string, updates: Partial<Shape>) => void;
  onSetShapes: (shapes: Shape[]) => void;
  onDeleteShape: (id: string) => void;
}

const LayerItemIcon: React.FC<{ type: ShapeType }> = ({ type }) => {
  switch (type) {
    case 'rect':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="14" rx="2" />
        </svg>
      );
    case 'circle':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'triangle':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3L22 21H2L12 3Z" />
        </svg>
      );
    case 'star':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

const LayerPanel: React.FC<LayerPanelProps> = memo(function LayerPanel({
  shapes,
  selectedId,
  onSelectShape,
  onUpdateShape,
  onSetShapes,
  onDeleteShape,
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragStartIndex = useRef<number>(-1);

  const sortedShapes = useMemo(() => {
    return [...shapes].sort((a, b) => b.zIndex - a.zIndex);
  }, [shapes]);

  const handleDragStart = useCallback((e: React.DragEvent, shapeId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', shapeId);
    setDraggedId(shapeId);
    
    const index = sortedShapes.findIndex(s => s.id === shapeId);
    dragStartIndex.current = index;
  }, [sortedShapes]);

  const handleDragOver = useCallback(
    rafThrottle((e: React.DragEvent, shapeId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      if (shapeId !== draggedId) {
        setDragOverId(shapeId);
      }
    }),
    [draggedId]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceIndex = sortedShapes.findIndex(s => s.id === sourceId);
    const targetIndex = sortedShapes.findIndex(s => s.id === targetId);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newShapes = [...shapes];
    const currentMaxZ = Math.max(...newShapes.map(s => s.zIndex));
    const currentMinZ = Math.min(...newShapes.map(s => s.zIndex));
    const zRange = currentMaxZ - currentMinZ;
    
    const newSortedShapes = [...sortedShapes];
    const [removed] = newSortedShapes.splice(sourceIndex, 1);
    newSortedShapes.splice(targetIndex, 0, removed);
    
    for (let i = 0; i < newSortedShapes.length; i++) {
      const shape = newSortedShapes[i];
      const originalShape = newShapes.find(s => s.id === shape.id);
      if (originalShape) {
        originalShape.zIndex = currentMinZ + (zRange * (newSortedShapes.length - 1 - i) / Math.max(1, newSortedShapes.length - 1));
      }
    }
    
    onSetShapes(newShapes);
    setDraggedId(null);
    setDragOverId(null);
    dragStartIndex.current = -1;
  }, [shapes, sortedShapes, onSetShapes]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    dragStartIndex.current = -1;
  }, []);

  const handleToggleVisibility = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (shape) {
      onUpdateShape(shapeId, { visible: !shape.visible });
    }
  }, [shapes, onUpdateShape]);

  const handleToggleLock = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    const shape = shapes.find(s => s.id === shapeId);
    if (shape) {
      onUpdateShape(shapeId, { locked: !shape.locked });
    }
  }, [shapes, onUpdateShape]);

  const handleDelete = useCallback((e: React.MouseEvent, shapeId: string) => {
    e.stopPropagation();
    onDeleteShape(shapeId);
  }, [onDeleteShape]);

  const handleSelect = useCallback((shapeId: string) => {
    onSelectShape(shapeId);
  }, [onSelectShape]);

  if (shapes.length === 0) {
    return (
      <div className="layer-panel">
        <div className="layer-panel-header">
          <h3>图层</h3>
          <span style={{ fontSize: '11px', color: '#999' }}>{shapes.length} 个形状</span>
        </div>
        <div className="empty-layer-list">
          还没有添加任何形状
        </div>
      </div>
    );
  }

  return (
    <div className="layer-panel">
      <div className="layer-panel-header">
        <h3>图层</h3>
        <span style={{ fontSize: '11px', color: '#999' }}>{shapes.length} 个形状</span>
      </div>
      <div className="layer-list">
        {sortedShapes.map((shape) => (
          <div
            key={shape.id}
            className={`layer-item 
              ${shape.id === selectedId ? 'selected' : ''} 
              ${draggedId === shape.id ? 'dragging' : ''}
              ${dragOverId === shape.id ? 'drag-over' : ''}`}
            draggable
            onClick={() => handleSelect(shape.id)}
            onDragStart={(e) => handleDragStart(e, shape.id)}
            onDragOver={(e) => handleDragOver(e, shape.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, shape.id)}
            onDragEnd={handleDragEnd}
          >
            <div className="layer-item-icon">
              <LayerItemIcon type={shape.type} />
            </div>
            <div className="layer-item-name" style={{ opacity: shape.visible ? 1 : 0.4 }}>
              {shape.name}
            </div>
            <div className="layer-item-actions">
              <button
                className={`icon-btn ${!shape.visible ? 'active' : ''}`}
                onClick={(e) => handleToggleVisibility(e, shape.id)}
                title={shape.visible ? '隐藏' : '显示'}
              >
                {shape.visible ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
              <button
                className={`icon-btn ${shape.locked ? 'active' : ''}`}
                onClick={(e) => handleToggleLock(e, shape.id)}
                title={shape.locked ? '解锁' : '锁定'}
              >
                {shape.locked ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    <line x1="12" y1="16" x2="12" y2="16" />
                  </svg>
                )}
              </button>
              <button
                className="icon-btn danger"
                onClick={(e) => handleDelete(e, shape.id)}
                title="删除"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default LayerPanel;
