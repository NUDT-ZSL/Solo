import React, { useRef } from 'react';
import type { Task, TeamMember } from '../utils/types';
import Avatar from './Avatar';

interface TaskCardProps {
  task: Task;
  teamMembers: TeamMember[];
  isDragging?: boolean;
  dragPosition?: { x: number; y: number } | null;
  onMouseDown?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  teamMembers,
  isDragging,
  dragPosition,
  onMouseDown,
  onTouchStart,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const assignee = teamMembers.find((m) => m.id === task.assigneeId);

  const baseStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    cursor: 'grab',
    transition: isDragging ? 'none' : 'all 0.2s ease-out',
    border: '1px solid #e2e8f0',
    userSelect: 'none',
    touchAction: 'none',
  };

  const draggingStyle: React.CSSProperties | undefined = isDragging && dragPosition
    ? {
        position: 'fixed',
        left: dragPosition.x + 5,
        top: dragPosition.y + 5,
        width: 288,
        zIndex: 1000,
        opacity: 0.9,
        transform: 'scale(1.02)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
        cursor: 'grabbing',
        pointerEvents: 'none',
      }
    : undefined;

  return (
    <div
      ref={cardRef}
      style={{
        ...baseStyle,
        ...draggingStyle,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
        }
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        {task.title}
      </div>

      <div
        style={{
          fontSize: 14,
          color: '#64748b',
          marginBottom: 12,
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {task.description}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginBottom: 12,
        }}
      >
        {task.tags.map((tag) => (
          <span
            key={tag}
            style={{
              padding: '3px 10px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 999,
              lineHeight: 1.4,
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 10,
          borderTop: '1px solid #f1f5f9',
        }}
      >
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {new Date(task.createdAt).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric',
          })}
        </div>
        {assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>{assignee.name}</span>
            <Avatar
              initial={assignee.avatarInitial}
              color={assignee.avatarColor}
              size={28}
            />
          </div>
        ) : (
          <div
            style={{
              fontSize: 12,
              color: '#94a3b8',
              padding: '3px 10px',
              backgroundColor: '#f8fafc',
              borderRadius: 999,
            }}
          >
            待认领
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
