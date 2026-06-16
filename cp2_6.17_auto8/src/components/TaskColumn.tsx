import React from 'react';
import type { Task, TeamMember, TaskStatus } from '../utils/types';
import TaskCard from './TaskCard';

interface TaskColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  teamMembers: TeamMember[];
  isHighlighted: boolean;
  onColumnRef: (status: TaskStatus, el: HTMLDivElement | null) => void;
  onCardMouseDown: (task: Task, e: React.MouseEvent) => void;
  onCardTouchStart: (task: Task, e: React.TouchEvent) => void;
  draggingTaskId: string | null;
  isDragging: boolean;
  dragPosition: { x: number; y: number } | null;
}

const TASK_COUNT_COLORS: Record<TaskStatus, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#10b981',
};

const TaskColumn: React.FC<TaskColumnProps> = ({
  title,
  status,
  tasks,
  teamMembers,
  isHighlighted,
  onColumnRef,
  onCardMouseDown,
  onCardTouchStart,
  draggingTaskId,
  isDragging,
  dragPosition,
}) => {
  return (
    <div
      ref={(el) => onColumnRef(status, el)}
      style={{
        width: '100%',
        minWidth: 280,
        maxWidth: 320,
        flex: 1,
        borderRadius: 8,
        backgroundColor: isHighlighted ? '#dbeafe' : '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 64px - 48px)',
        transition: 'background-color 0.2s ease-out',
        border: isHighlighted ? '2px dashed #38bdf8' : '2px solid transparent',
      }}
    >
      <div
        style={{
          padding: '14px 18px',
          backgroundColor: '#e2e8f0',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #cbd5e1',
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {title}
          <span
            style={{
              minWidth: 24,
              height: 24,
              padding: '0 7px',
              borderRadius: 999,
              backgroundColor: TASK_COUNT_COLORS[status],
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div
        style={{
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {tasks.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: 14,
              border: '2px dashed #e2e8f0',
              borderRadius: 8,
            }}
          >
            暂无任务
          </div>
        )}

        {tasks.map((task) => {
          const isThisDragging = draggingTaskId === task.id && isDragging;
          return (
            <div key={task.id}>
              <TaskCard
                task={task}
                teamMembers={teamMembers}
                isDragging={isThisDragging}
                dragPosition={isThisDragging ? dragPosition : null}
                onMouseDown={(e) => onCardMouseDown(task, e)}
                onTouchStart={(e) => onCardTouchStart(task, e)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskColumn;
