import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTeam } from '../hooks/useTeam';
import type { Task, TaskStatus } from '../utils/types';
import TaskColumn from '../components/TaskColumn';
import ClaimModal from '../components/ClaimModal';

const COLUMN_CONFIG: { status: TaskStatus; title: string }[] = [
  { status: 'pending', title: '待认领' },
  { status: 'in_progress', title: '进行中' },
  { status: 'completed', title: '已完成' },
];

const TaskBoard: React.FC = () => {
  const { tasks, loading: tasksLoading, error: tasksError, handleUpdateStatus, handleClaim } = useTasks();
  const { team, loading: teamLoading } = useTeam();

  const [isDragging, setIsDragging] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [highlightedColumn, setHighlightedColumn] = useState<TaskStatus | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimingTask, setClaimingTask] = useState<Task | null>(null);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);

  const columnRefs = useRef<Map<TaskStatus, HTMLDivElement | null>>(new Map());
  const rafRef = useRef<number | null>(null);
  const latestPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const setColumnRef = useCallback((status: TaskStatus, el: HTMLDivElement | null) => {
    columnRefs.current.set(status, el);
  }, []);

  const getColumnUnderCursor = useCallback((x: number, y: number): TaskStatus | null => {
    for (const config of COLUMN_CONFIG) {
      const colEl = columnRefs.current.get(config.status);
      if (colEl) {
        const rect = colEl.getBoundingClientRect();
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return config.status;
        }
      }
    }
    return null;
  }, []);

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    latestPosition.current = { x: clientX, y: clientY };

    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        const pos = latestPosition.current;
        setDragPosition({ x: pos.x, y: pos.y });

        const column = getColumnUnderCursor(pos.x, pos.y);
        setHighlightedColumn(column);

        rafRef.current = null;
      });
    }
  }, [getColumnUnderCursor]);

  const handleCardMouseDown = useCallback((task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggingTask(task);
    setDragPosition({ x: e.clientX, y: e.clientY });
    latestPosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleCardTouchStart = useCallback((task: Task, e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDraggingTask(task);
    setDragPosition({ x: touch.clientX, y: touch.clientY });
    latestPosition.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateDragPosition(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      updateDragPosition(touch.clientX, touch.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      handleDragEnd(e.clientX, e.clientY);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      handleDragEnd(touch.clientX, touch.clientY);
    };

    const handleDragEnd = (x: number, y: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const targetStatus = getColumnUnderCursor(x, y);

      if (targetStatus && draggingTask && targetStatus !== draggingTask.status) {
        if (targetStatus === 'in_progress' && !draggingTask.assigneeId) {
          setClaimingTask(draggingTask);
          setPendingStatus(targetStatus);
          setShowClaimModal(true);
        } else {
          handleUpdateStatus(draggingTask.id, targetStatus);
        }
      }

      setIsDragging(false);
      setDraggingTask(null);
      setDragPosition(null);
      setHighlightedColumn(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isDragging, draggingTask, getColumnUnderCursor, handleUpdateStatus, updateDragPosition]);

  const handleClaimConfirm = (taskId: string, assigneeId: string) => {
    handleClaim(taskId, assigneeId);
    setShowClaimModal(false);
    setClaimingTask(null);
    setPendingStatus(null);
  };

  const handleClaimCancel = () => {
    setShowClaimModal(false);
    setClaimingTask(null);
    setPendingStatus(null);
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((t) => t.status === status);
  };

  const loading = tasksLoading || teamLoading;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>加载中...</div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.loading, color: '#ef4444' }}>
          加载失败：{tasksError}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>任务看板</h1>
        <div style={styles.taskCounts}>
          共 {tasks.length} 个任务
        </div>
      </div>

      <div style={styles.board}>
        {COLUMN_CONFIG.map((config) => (
          <TaskColumn
            key={config.status}
            title={config.title}
            status={config.status}
            tasks={getTasksByStatus(config.status)}
            teamMembers={team}
            isHighlighted={highlightedColumn === config.status}
            onColumnRef={setColumnRef}
            onCardMouseDown={handleCardMouseDown}
            onCardTouchStart={handleCardTouchStart}
            draggingTaskId={draggingTask?.id || null}
            isDragging={isDragging}
            dragPosition={dragPosition}
          />
        ))}
      </div>

      <ClaimModal
        isOpen={showClaimModal}
        task={claimingTask}
        teamMembers={team}
        onConfirm={handleClaimConfirm}
        onCancel={handleClaimCancel}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    maxWidth: 1400,
    margin: '0 auto',
  },
  loading: {
    textAlign: 'center',
    padding: 80,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  taskCounts: {
    fontSize: 14,
    color: '#64748b',
  },
  board: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
};

export default TaskBoard;
