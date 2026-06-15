import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Priority } from '../types';

export interface DraggableCardProps {
  card: Card;
  index: number;
  priorityColor: (priority: Priority) => string;
  priorityLabel: (priority: Priority) => string;
  getMemberName: (email: string | null) => string;
  isOverdue: (card: Card) => boolean;
  onClick: () => void;
}

export const SortableCard: React.FC<DraggableCardProps> = ({
  card,
  index,
  priorityColor,
  priorityLabel,
  getMemberName,
  isOverdue,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`sortable-card ${isDragging ? 'card-dragging' : ''}`}
      onClick={onClick}
    >
      <div
        className="card-priority-bar"
        style={{ backgroundColor: priorityColor(card.priority) }}
      />
      <div className="card-content">
        <h4 className="card-title">{card.title}</h4>
        {card.description && (
          <p className="card-description">{card.description}</p>
        )}
        <div className="card-meta">
          <span
            className="card-priority"
            style={{ color: priorityColor(card.priority) }}
          >
            {priorityLabel(card.priority)}优先级
          </span>
          {card.dueDate && (
            <span className={`card-due-date ${isOverdue(card) ? 'overdue' : ''}`}>
              📅 {card.dueDate}
            </span>
          )}
        </div>
        <div className="card-assignee">
          <span className="assignee-avatar">
            {getMemberName(card.assignee).charAt(0).toUpperCase()}
          </span>
          <span className="assignee-name">
            {getMemberName(card.assignee)}
          </span>
        </div>
      </div>

      <style>{`
        .sortable-card {
          background: var(--bg-color);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          cursor: grab;
          transition: all 0.15s ease;
          position: relative;
          overflow: hidden;
          user-select: none;
          touch-action: none;
        }

        .sortable-card:hover {
          box-shadow: var(--shadow-hover);
          transform: translateY(-2px);
        }

        .sortable-card:active {
          cursor: grabbing;
        }

        .sortable-card.card-dragging {
          opacity: 0;
          pointer-events: none;
        }

        .card-priority-bar {
          height: 4px;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .card-content {
          padding: 14px 16px 12px;
        }

        .card-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--primary-color);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .card-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .card-priority {
          font-size: 12px;
          font-weight: 500;
        }

        .card-due-date {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .card-due-date.overdue {
          color: #e74c3c;
          font-weight: 500;
        }

        .card-assignee {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .assignee-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-color);
          color: white;
          font-size: 11px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .assignee-name {
          font-size: 12px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
