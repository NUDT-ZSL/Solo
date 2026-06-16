import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Entity, EntityType } from '../types';

interface EntityListProps {
  entities: Entity[];
  onDragStart: (entity: Entity, e: React.MouseEvent) => void;
  onDragEnd: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const typeLabels: Record<EntityType, string> = {
  character: '角色',
  location: '地点',
  event: '事件'
};

const typeColors: Record<EntityType, string> = {
  character: '#6c63ff',
  location: '#00bcd4',
  event: '#ff4081'
};

const EntityList: React.FC<EntityListProps> = ({
  entities,
  onDragStart,
  onDragEnd,
  collapsed,
  onToggleCollapse
}) => {
  const [dragTimeout, setDragTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEntity, setDragEntity] = useState<Entity | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const groupedEntities = entities.reduce((acc, entity) => {
    if (!acc[entity.type]) {
      acc[entity.type] = [];
    }
    acc[entity.type].push(entity);
    return acc;
  }, {} as Record<EntityType, Entity[]>);

  const handleMouseDown = useCallback((entity: Entity, e: React.MouseEvent) => {
    e.preventDefault();
    
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
      setDragEntity(entity);
      onDragStart(entity, e);
    }, 300);
  }, [onDragStart]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      setDragEntity(null);
      onDragEnd();
    }
  }, [isDragging, onDragEnd]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && dragEntity) {
      const ghost = document.querySelector('.drag-ghost') as HTMLElement;
      if (ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
      }
    }
  }, [isDragging, dragEntity]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const renderEntityCard = (entity: Entity) => (
    <div
      key={entity.id}
      className={`entity-card ${entity.type}`}
      style={{ '--card-color': entity.color || typeColors[entity.type] } as React.CSSProperties}
      onMouseDown={(e) => handleMouseDown(entity, e)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="entity-card-color-bar" />
      <div className="entity-card-content">
        <div className="entity-card-name">{entity.name}</div>
        <div className="entity-card-meta">
          出现 {entity.count} 次 · 第{entity.firstChapter}章
        </div>
      </div>
    </div>
  );

  if (collapsed) {
    return (
      <div className="entity-list-panel collapsed">
        <div className="entity-list-header">
          <button className="collapse-btn" onClick={onToggleCollapse}>
            {'>'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="entity-list-panel">
      <div className="entity-list-header">
        <span>实体列表</span>
        <button className="collapse-btn" onClick={onToggleCollapse}>
          {'<'}
        </button>
      </div>
      <div className="entity-list">
        {(['character', 'location', 'event'] as EntityType[]).map(type => (
          <div key={type} className="entity-section">
            <div className="entity-section-title">
              {typeLabels[type]} ({groupedEntities[type]?.length || 0})
            </div>
            {groupedEntities[type]?.map(renderEntityCard)}
          </div>
        ))}
      </div>
      {isDragging && dragEntity && (
        <div
          className="drag-ghost"
          style={{
            width: '240px',
            height: '60px',
            background: 'var(--bg-card-hover)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            opacity: 0.6
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              borderRadius: '8px 0 0 8px',
              background: dragEntity.color || typeColors[dragEntity.type]
            }}
          />
          <div style={{ marginLeft: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{dragEntity.name}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EntityList;
