import React, { useState, CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Priority } from '../types';

interface SortableCardProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
  index: number;
}

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  high: { label: '高', className: 'priority-high' },
  medium: { label: '中', className: 'priority-medium' },
  low: { label: '低', className: 'priority-low' },
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

export const SortableCard: React.FC<SortableCardProps> = ({
  card,
  onEdit,
  onDelete,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : isDeleting ? 0 : 1,
    animationDelay: isDragging || isDeleting ? undefined : `${index * 0.05}s`,
  };

  const priority = priorityConfig[card.priority];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(card.id);
    }, 280);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-item ${isDragging ? 'card-dragging' : ''} ${isDeleting ? 'card-deleting' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isDragging && (
        <div
          className="card-drag-handle"
          {...attributes}
          {...listeners}
          title="拖拽移动"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}

      {isHovered && !isDragging && (
        <div className="card-actions">
          <button
            className="card-action-btn card-edit-btn"
            onClick={handleEdit}
            title="编辑"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="card-action-btn card-delete-btn"
            onClick={handleDelete}
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      <div className="card-header">
        <span className={`priority-tag ${priority.className}`}>
          {priority.label}优先级
        </span>
        <div
          className="creator-badge"
          style={{ backgroundColor: card.creatorColor }}
          title={`创建者: ${card.createdBy}`}
        />
      </div>

      <h3 className="card-title">{card.title}</h3>

      {card.description && (
        <p className="card-description">{card.description}</p>
      )}

      <div className="card-footer">
        <span className="card-time" title={`创建于 ${formatTime(card.createdAt)}`}>
          创建: {formatTime(card.createdAt)}
        </span>
        {card.updatedAt !== card.createdAt && (
          <span className="card-time" title={`更新于 ${formatTime(card.updatedAt)}`}>
            更新: {formatTime(card.updatedAt)}
          </span>
        )}
        <span className="card-creator" title={card.createdBy}>
          <span
            className="creator-dot"
            style={{ backgroundColor: card.creatorColor }}
          />
          {card.createdBy}
        </span>
      </div>
    </div>
  );
};
