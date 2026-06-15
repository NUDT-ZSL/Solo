import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Task, Priority, updateTaskOrder, toggleTaskCompletion } from '../data/mockData';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  skeletonVisible: boolean;
  onTasksChange: (tasks: Task[]) => void;
}

const TASK_CARD_HEIGHT = 72;
const TASK_CARD_GAP = 12;

const priorityColors: Record<Priority, string> = {
  'high': '#e94560',
  'medium': '#e67e22',
  'low': '#27ae60'
};

const priorityLabels: Record<Priority, string> = {
  'high': '高',
  'medium': '中',
  'low': '低'
};

const TaskList: React.FC<TaskListProps> = ({ tasks, loading, skeletonVisible, onTasksChange }) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedOrder, setDraggedOrder] = useState<number | null>(null);
  const [draggedOverOrder, setDraggedOverOrder] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsingTaskIds, setCollapsingTaskIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return a.order - b.order;
  });

  const getTaskTranslateY = useCallback((task: Task): number => {
    if (draggedTaskId === null || draggedOrder === null || draggedOverOrder === null) {
      return 0;
    }

    if (task.id === draggedTaskId) {
      return 0;
    }

    if (task.completed) {
      return 0;
    }

    const dragOrder = draggedOrder;
    const targetOrder = draggedOverOrder;

    if (dragOrder === targetOrder) {
      return 0;
    }

    if (dragOrder < targetOrder) {
      if (task.order > dragOrder && task.order <= targetOrder) {
        return -(TASK_CARD_HEIGHT + TASK_CARD_GAP);
      }
    } else if (dragOrder > targetOrder) {
      if (task.order >= targetOrder && task.order < dragOrder) {
        return (TASK_CARD_HEIGHT + TASK_CARD_GAP);
      }
    }

    return 0;
  }, [draggedTaskId, draggedOrder, draggedOverOrder]);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    if (task.completed) {
      e.preventDefault();
      return;
    }

    setDraggedTaskId(task.id);
    setDraggedOrder(task.order);
    setDraggedOverOrder(task.order);
    setIsDragging(true);
    dragCounterRef.current = 0;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);

    setTimeout(() => {
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.opacity = '0.5';
        target.style.transform = 'scale(1.02)';
        target.style.boxShadow = '0 8px 24px rgba(233, 69, 96, 0.4)';
      }
    }, 0);
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (target) {
      target.style.opacity = '';
      target.style.transform = '';
      target.style.boxShadow = '';
    }

    if (draggedTaskId !== null && draggedOverOrder !== null && draggedOrder !== null && draggedOrder !== draggedOverOrder) {
      try {
        await updateTaskOrder(draggedTaskId, draggedOverOrder);

        const updatedTasks = tasks.map(t => {
          if (t.id === draggedTaskId) {
            return { ...t, order: draggedOverOrder };
          }

          if (t.completed) return t;

          if (draggedOrder < draggedOverOrder) {
            if (t.order > draggedOrder && t.order <= draggedOverOrder) {
              return { ...t, order: t.order - 1 };
            }
          } else if (draggedOrder > draggedOverOrder) {
            if (t.order >= draggedOverOrder && t.order < draggedOrder) {
              return { ...t, order: t.order + 1 };
            }
          }

          return t;
        });

        onTasksChange(updatedTasks);
      } catch (err) {
        console.error('Failed to update task order:', err);
      }
    }

    setDraggedTaskId(null);
    setDraggedOrder(null);
    setDraggedOverOrder(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, task: Task) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedTaskId === null || task.completed || task.id === draggedTaskId) {
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const isBottomHalf = mouseY > rect.height / 2;

    let newTargetOrder = task.order;
    if (draggedOrder !== null && draggedOrder < task.order) {
      newTargetOrder = isBottomHalf ? task.order : task.order - 1;
    } else if (draggedOrder !== null && draggedOrder > task.order) {
      newTargetOrder = isBottomHalf ? task.order : task.order - 0;
    }

    if (newTargetOrder !== draggedOverOrder) {
      setDraggedOverOrder(newTargetOrder);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
  };

  const handleTaskToggle = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.completed) {
      setCollapsingTaskIds(prev => new Set(prev).add(taskId));

      setTimeout(async () => {
        try {
          await toggleTaskCompletion(taskId);
          const updatedTasks = tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          );
          onTasksChange(updatedTasks);
        } catch (err) {
          console.error('Failed to toggle task:', err);
        } finally {
          setCollapsingTaskIds(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
          });
        }
      }, 300);
    } else {
      try {
        await toggleTaskCompletion(taskId);
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        onTasksChange(updatedTasks);
      } catch (err) {
        console.error('Failed to toggle task:', err);
      }
    }
  };

  const renderSkeletonTasks = () => {
    const items = [];
    for (let i = 0; i < 6; i++) {
      items.push(
        <div
          key={i}
          style={{
            ...styles.taskItem,
            height: TASK_CARD_HEIGHT,
            padding: '16px',
            opacity: skeletonVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: skeletonVisible ? 'auto' : 'none'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #2a2a4a 25%, #3a3a5a 50%, #2a2a4a 75%)',
              backgroundSize: '200% 100%',
              animation: 'pulse 1.5s infinite',
              borderRadius: '6px'
            }}
          />
        </div>
      );
    }
    return items;
  };

  const renderTaskItem = (task: Task, index: number) => {
    const translateY = getTaskTranslateY(task);
    const isCollapsing = collapsingTaskIds.has(task.id);
    const isDragged = task.id === draggedTaskId;
    const isDropTarget = !isDragging && false;
    const shouldShowIndicator = isDragging && draggedOverOrder === task.order && task.id !== draggedTaskId;

    return (
      <div
        key={task.id}
        draggable={!task.completed}
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, task)}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...styles.taskItem,
          padding: '16px',
          transform: `translateY(${translateY}px) scaleY(${isCollapsing ? 0 : 1})`,
          opacity: isCollapsing ? 0 : 1,
          transformOrigin: 'top',
          transition: !isDragging
            ? 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.3s ease'
            : 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          zIndex: isDragged ? 10 : 1,
          cursor: task.completed ? 'default' : 'grab',
          userSelect: isDragged ? 'none' : 'auto'
        }}
      >
        {shouldShowIndicator && (
          <div style={styles.dropIndicator} />
        )}
        <label style={styles.checkboxContainer}>
          <input
            type="checkbox"
            className="checkbox-custom"
            checked={task.completed}
            onChange={() => handleTaskToggle(task.id)}
            style={styles.checkboxInput}
          />
          <span className="checkbox-visual" style={styles.checkboxVisual} />
        </label>
        <div style={styles.taskContent}>
          <p style={{
            ...styles.taskTitle,
            textDecoration: task.completed ? 'line-through' : 'none',
            opacity: task.completed ? 0.5 : 1
          }}>
            {task.title}
          </p>
          {task.description && (
            <p style={{
              ...styles.taskDesc,
              opacity: task.completed ? 0.5 : 1
            }}>
              {task.description}
            </p>
          )}
        </div>
        <span style={{
          ...styles.priorityTag,
          backgroundColor: priorityColors[task.priority] + '20',
          color: priorityColors[task.priority],
          opacity: task.completed ? 0.5 : 1
        }}>
          {priorityLabels[task.priority]}
        </span>
      </div>
    );
  };

  const incompleteTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);

  return (
    <div ref={listRef} style={styles.list}>
      <style>{`
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .checkbox-custom:checked + .checkbox-visual {
          background-color: #e94560;
          border-color: #e94560;
        }
        .checkbox-custom:checked + .checkbox-visual::after {
          content: '';
          position: absolute;
          left: 6px;
          top: 2px;
          width: 6px;
          height: 12px;
          border: solid #ffffff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      `}</style>

      <h2 style={styles.title}>进度列表</h2>

      {loading && (
        <div style={styles.skeletonList}>
          {renderSkeletonTasks()}
        </div>
      )}

      <div style={{
        ...styles.taskList,
        opacity: loading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: loading ? 'none' : 'auto'
      }}>
        {!loading && incompleteTasks.map((task, index) => renderTaskItem(task, index))}

        {!loading && completedTasks.length > 0 && (
          <>
            <div style={styles.completedDivider}>
              <span style={styles.completedText}>已完成 ({completedTasks.length})</span>
            </div>
            {completedTasks.map((task, index) => renderTaskItem(task, index + incompleteTasks.length))}
          </>
        )}

        {!loading && tasks.length === 0 && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>暂无待办事项</p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  list: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '24px',
    position: 'relative',
    minHeight: '400px'
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#ffffff'
  },
  skeletonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${TASK_CARD_GAP}px`,
    position: 'absolute',
    top: '72px',
    left: '24px',
    right: '24px',
    zIndex: 5
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: `${TASK_CARD_GAP}px`,
    position: 'relative'
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    position: 'relative',
    willChange: 'transform, opacity'
  },
  checkboxContainer: {
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxInput: {
    opacity: 0,
    position: 'absolute',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    zIndex: 1
  },
  checkboxVisual: {
    width: '20px',
    height: '20px',
    border: '2px solid #4a4a6a',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
    position: 'relative'
  },
  taskContent: {
    flex: 1,
    minWidth: 0
  },
  taskTitle: {
    margin: '0 0 4px 0',
    fontSize: '15px',
    fontWeight: 500,
    color: '#ffffff',
    lineHeight: 1.4,
    transition: 'all 0.3s ease'
  },
  taskDesc: {
    margin: 0,
    fontSize: '13px',
    color: '#8080a0',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  priorityTag: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
    transition: 'all 0.3s ease'
  },
  dropIndicator: {
    position: 'absolute',
    top: -6,
    left: '16px',
    right: '16px',
    height: '3px',
    backgroundColor: '#e94560',
    borderRadius: '2px',
    boxShadow: '0 0 8px rgba(233, 69, 96, 0.6)'
  },
  completedDivider: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    marginTop: '16px',
    borderTop: '1px solid #2a2a4a'
  },
  completedText: {
    fontSize: '12px',
    color: '#606080',
    fontWeight: 500
  },
  emptyState: {
    padding: '48px 16px',
    textAlign: 'center'
  },
  emptyText: {
    margin: 0,
    fontSize: '14px',
    color: '#606080'
  }
};

export default TaskList;
