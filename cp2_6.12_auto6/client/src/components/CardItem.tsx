import React, { useState, useRef } from 'react';
import { Card, Priority } from '../types';

interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, card: Card) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
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

export const CardItem: React.FC<CardItemProps> = ({
  card,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  isDragging,
  index,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const priority = priorityConfig[card.priority];

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(card.id);
    }, 300);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card);
  };

  return (
    <div
      ref={cardRef}
      className={`card-item ${isDragging ? 'card-dragging' : ''} ${isDeleting ? 'card-deleting' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 0.05}s`,
      }}
    >
      {isHovered && (
        <div className="card-actions">
          <button
            className="card-action-btn card-edit-btn"
            onClick={handleEdit}
            title="编辑"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="card-action-btn card-delete-btn"
            onClick={handleDelete}
            title="删除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      <div className="card-header">
        <span className={`priority-tag ${priority.className}`}>
          {priority.label}
        </span>
        <div
          className="creator-badge"
          style={{ backgroundColor: card.creatorColor }}
          title={card.createdBy}
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
      </div>
    </div>
  );
};
