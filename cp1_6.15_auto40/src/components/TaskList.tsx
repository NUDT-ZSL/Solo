import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Task, Priority } from '../data/mockData';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (name: string, assignee: string, priority: Priority, estimatedHours: number) => void;
  onToggleTask: (taskId: string) => void;
  onReorderTasks: (taskId: string, newOrder: number) => void;
  loading: boolean;
  skeletonVisible: boolean;
  contentVisible: boolean;
}

const priorityColors: Record<Priority, string> = {
  '高': '#e94560',
  '中': '#f39c12',
  '低': '#27ae60'
};

const TASK_CARD_HEIGHT = 84;
const TASK_CARD_GAP = 12;

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onReorderTasks,
  loading,
  skeletonVisible,
  contentVisible
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    assignee: '',
    priority: '中' as Priority,
    estimatedHours: 1
  });
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'above' | 'below' | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.order - b.order;
    });
  }, [tasks]);

  const uncompletedTasks = useMemo(() => sortedTasks.filter(t => !t.completed), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter(t => t.completed), [sortedTasks]);

  const getTaskTranslateY = useCallback((task: Task): number => {
    if (!draggedTaskId || draggedTaskId === task.id || task.completed) return 0;

    const draggedTask = uncompletedTasks.find(t => t.id === draggedTaskId);
    if (!draggedTask || !dragOverTaskId || !dragPosition) return 0;

    const draggedOrder = draggedTask.order;
    const targetTask = uncompletedTasks.find(t => t.id === dragOverTaskId);
    if (!targetTask) return 0;

    const targetOrder = targetTask.order + (dragPosition === 'below' ? 1 : 0);

    if (draggedOrder < targetOrder) {
      if (task.order > draggedOrder && task.order < targetOrder) {
        return -(TASK_CARD_HEIGHT + TASK_CARD_GAP);
      }
      if (task.order === targetOrder - 1) {
        return -(TASK_CARD_HEIGHT + TASK_CARD_GAP);
      }
    } else if (draggedOrder > targetOrder) {
      if (task.order >= targetOrder && task.order < draggedOrder) {
        return (TASK_CARD_HEIGHT + TASK_CARD_GAP);
      }
    }

    return 0;
  }, [draggedTaskId, dragOverTaskId, dragPosition, uncompletedTasks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name.trim() || !newTask.assignee.trim()) return;
    onAddTask(
      newTask.name.trim(),
      newTask.assignee.trim(),
      newTask.priority,
      newTask.estimatedHours
    );
    setNewTask({ name: '', assignee: '', priority: '中', estimatedHours: 1 });
    setShowAddForm(false);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.4';
    e.dataTransfer.setDragImage(target, 20, 20);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTaskId === taskId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;
    const position = e.clientY < middleY ? 'above' : 'below';

    setDragOverTaskId(taskId);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverTaskId(null);
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragPosition(null);
      return;
    }

    const draggedItem = uncompletedTasks.find(t => t.id === draggedTaskId);
    const targetItem = uncompletedTasks.find(t => t.id === targetTaskId);

    if (!draggedItem || !targetItem) return;

    let newOrder = targetItem.order;
    if (dragPosition === 'below') {
      newOrder = draggedItem.order < targetItem.order ? targetItem.order : targetItem.order + 1;
    } else {
      newOrder = draggedItem.order < targetItem.order ? targetItem.order - 1 : targetItem.order;
    }

    setReordering(true);
    onReorderTasks(draggedTaskId, newOrder);

    setTimeout(() => {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      setDragPosition(null);
      setReordering(false);
    }, 200);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragPosition(null);
  };

  const handleToggle = useCallback((taskId: string, completed: boolean) => {
    if (!completed) {
      setCompletingTaskId(taskId);
      setTimeout(() => {
        onToggleTask(taskId);
        setTimeout(() => {
          setCompletingTaskId(null);
        }, 100);
      }, 300);
    } else {
      onToggleTask(taskId);
    }
  }, [onToggleTask]);

  const progress = tasks.length > 0
    ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100)
    : 0;

  const totalHours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
  const completedHours = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.estimatedHours, 0);

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes bounceIn {
          0% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        @keyframes slideToBottom {
          0% { transform: scaleY(1); opacity: 1; margin-bottom: 12px; }
          50% { transform: scaleY(0.3); opacity: 0.5; margin-bottom: 6px; }
          100% { transform: scaleY(0); opacity: 0; margin-bottom: 0; padding: 0; height: 0; overflow: hidden; }
        }
        .task-card-dragging {
          opacity: 0.4 !important;
          transform: scale(0.98);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4) !important;
        }
        .checkbox-custom:checked + .checkmark-custom::after {
          display: block;
        }
        .checkmark-custom::after {
          content: '';
          position: absolute;
          display: none;
          left: 5px;
          top: 1px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .checkbox-custom:checked + .checkmark-custom {
          background-color: #27ae60;
          border-color: #27ae60 !important;
        }
      `}</style>

      <div style={styles.header}>
        <h3 style={styles.title}>✅ 进度列表</h3>
        <button
          style={styles.addButton}
          onClick={() => setShowAddForm(true)}
        >
          + 添加任务
        </button>
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressInfo}>
          <span style={styles.progressLabel}>项目进度</span>
          <span style={styles.progressValue}>{progress}%</span>
        </div>
        <div style={styles.progressBarWrapper}>
          <div
            style={{
              ...styles.progressBarFill,
              width: `${progress}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />
        </div>
        <div style={styles.hoursInfo}>
          <span style={styles.hoursText}>
            已完成 {completedHours}h / 总工时 {totalHours}h
          </span>
        </div>
      </div>

      {showAddForm && (
        <div style={styles.addForm}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              placeholder="任务名称"
              value={newTask.name}
              onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
              style={styles.input}
              required
            />
            <div style={styles.formRow}>
              <input
                type="text"
                placeholder="负责人"
                value={newTask.assignee}
                onChange={(e) => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                style={{ ...styles.input, flex: 1 }}
                required
              />
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as Priority }))}
                style={styles.select}
              >
                <option value="高">高优</option>
                <option value="中">中优</option>
                <option value="低">低优</option>
              </select>
            </div>
            <div style={styles.formRow}>
              <label style={styles.hoursLabel}>预计工时:</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={newTask.estimatedHours}
                onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) }))}
                style={{ ...styles.input, width: '80px' }}
              />
              <span style={styles.hoursUnit}>小时</span>
            </div>
            <div style={styles.formActions}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ ...styles.btn, ...styles.cancelBtn }}
              >
                取消
              </button>
              <button type="submit" style={styles.btn}>
                添加
              </button>
            </div>
          </form>
        </div>
      )}

      <div ref={listRef} style={styles.taskList}>
        {loading || skeletonVisible ? (
          <div style={{
            animation: skeletonVisible && !loading ? 'fadeOut 0.4s ease forwards' : undefined
          }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={styles.skeletonTask} />
            ))}
          </div>
        ) : (
          <div style={{
            opacity: contentVisible ? 1 : 0,
            transition: 'opacity 0.4s ease'
          }}>
            {uncompletedTasks.map(task => {
              const translateY = getTaskTranslateY(task);
              const isCompleting = completingTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className={`task-card-item ${draggedTaskId === task.id ? 'task-card-dragging' : ''}`}
                  draggable={!isCompleting}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, task.id)}
                  onDragEnd={handleDragEnd}
                  style={{
                    ...styles.taskCard,
                    transform: isCompleting
                      ? 'scaleY(0) translateY(100px)'
                      : `translateY(${translateY}px)`,
                    transformOrigin: 'top center',
                    opacity: isCompleting ? 0 : 1,
                    transition: draggedTaskId === task.id
                      ? 'opacity 0.1s ease'
                      : isCompleting
                      ? 'transform 0.3s ease, opacity 0.3s ease, margin 0.3s ease, padding 0.3s ease'
                      : reordering
                      ? 'transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                      : draggedTaskId !== null && translateY !== 0
                      ? `transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.2s ease`
                      : 'transform 0.3s ease, opacity 0.3s ease',
                    marginBottom: isCompleting ? 0 : TASK_CARD_GAP,
                    height: isCompleting ? 0 : 'auto',
                    padding: isCompleting ? '0 16px' : undefined,
                    overflow: isCompleting ? 'hidden' : 'visible',
                    zIndex: draggedTaskId === task.id ? 10 : 1,
                    position: draggedTaskId === task.id ? 'relative' : 'static'
                  }}
                >
                  <div style={styles.dragHandle} title="拖拽排序">⋮⋮</div>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={task.completed}
                      onChange={() => handleToggle(task.id, task.completed)}
                      style={styles.checkbox}
                      disabled={isCompleting}
                    />
                    <span
                      className="checkmark-custom"
                      style={{
                        ...styles.checkmark,
                        backgroundColor: task.completed ? '#27ae60' : 'transparent',
                        borderColor: task.completed ? '#27ae60' : '#3a3a5a'
                      }}
                    />
                  </label>
                  <div style={styles.taskContent}>
                    <span style={styles.taskName}>{task.name}</span>
                    <div style={styles.taskMeta}>
                      <span style={{
                        ...styles.priorityTag,
                        backgroundColor: priorityColors[task.priority]
                      }}>
                        {task.priority}
                      </span>
                      <span style={styles.assignee}>👤 {task.assignee}</span>
                      <span style={styles.hours}>⏱ {task.estimatedHours}h</span>
                    </div>
                  </div>
                  {draggedTaskId === task.id && (
                    <div style={styles.dragGhost} />
                  )}
                  {dragOverTaskId === task.id && (
                    <div style={{
                      ...styles.dropIndicator,
                      top: dragPosition === 'above' ? '-2px' : 'auto',
                      bottom: dragPosition === 'below' ? '-2px' : 'auto'
                    }} />
                  )}
                </div>
              );
            })}

            {completedTasks.length > 0 && (
              <div style={styles.completedSection}>
                <div style={styles.completedDivider}>
                  <span style={styles.completedLabel}>已完成 ({completedTasks.length})</span>
                </div>
                {completedTasks.map(task => (
                  <div
                    key={task.id}
                    style={{
                      ...styles.taskCard,
                      ...styles.completedTaskCard
                    }}
                  >
                    <div style={styles.dragHandle} />
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className="checkbox-custom"
                        checked={task.completed}
                        onChange={() => handleToggle(task.id, task.completed)}
                        style={styles.checkbox}
                      />
                      <span
                        className="checkmark-custom"
                        style={{
                          ...styles.checkmark,
                          backgroundColor: '#27ae60',
                          borderColor: '#27ae60'
                        }}
                      />
                    </label>
                    <div style={styles.taskContent}>
                      <span style={{ ...styles.taskName, ...styles.completedTaskName }}>
                        {task.name}
                      </span>
                      <div style={styles.taskMeta}>
                        <span style={{
                          ...styles.priorityTag,
                          backgroundColor: priorityColors[task.priority],
                          opacity: 0.5
                        }}>
                          {task.priority}
                        </span>
                        <span style={styles.assignee}>👤 {task.assignee}</span>
                        <span style={styles.hours}>⏱ {task.estimatedHours}h</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 280px)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  progressSection: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    flexShrink: 0
  },
  progressInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  progressLabel: {
    fontSize: '13px',
    color: '#a0a0a0'
  },
  progressValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e94560'
  },
  progressBarWrapper: {
    height: '6px',
    backgroundColor: '#2a2a4a',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e94560',
    borderRadius: '3px'
  },
  hoursInfo: {
    textAlign: 'right'
  },
  hoursText: {
    fontSize: '12px',
    color: '#606080'
  },
  addForm: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    flexShrink: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  formRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  input: {
    padding: '10px 14px',
    backgroundColor: '#16213e',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    transition: 'all 0.3s ease'
  },
  select: {
    padding: '10px 14px',
    backgroundColor: '#16213e',
    border: '1px solid #3a3a5a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  hoursLabel: {
    fontSize: '13px',
    color: '#a0a0a0'
  },
  hoursUnit: {
    fontSize: '13px',
    color: '#606080'
  },
  formActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  btn: {
    padding: '8px 16px',
    backgroundColor: '#e94560',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.3s ease'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #3a3a5a'
  },
  taskList: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px'
  },
  skeletonTask: {
    height: '72px',
    marginBottom: '12px'
  },
  taskCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    position: 'relative',
    cursor: 'grab',
    userSelect: 'none',
    willChange: 'transform, opacity'
  },
  completedTaskCard: {
    opacity: 0.5,
    cursor: 'default'
  },
  dragHandle: {
    color: '#404060',
    fontSize: '16px',
    cursor: 'grab',
    padding: '2px 4px',
    lineHeight: 1,
    flexShrink: 0,
    marginTop: '4px',
    transition: 'color 0.2s ease'
  },
  checkboxLabel: {
    position: 'relative',
    cursor: 'pointer',
    flexShrink: 0,
    marginTop: '2px'
  },
  checkbox: {
    position: 'absolute',
    opacity: 0,
    cursor: 'pointer',
    width: 0,
    height: 0
  },
  checkmark: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    border: '2px solid #3a3a5a',
    borderRadius: '4px',
    position: 'relative',
    transition: 'all 0.25s ease'
  },
  taskContent: {
    flex: 1,
    minWidth: 0
  },
  taskName: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  completedTaskName: {
    textDecoration: 'line-through',
    color: '#606080'
  },
  taskMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  priorityTag: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#ffffff',
    transition: 'all 0.3s ease'
  },
  assignee: {
    fontSize: '12px',
    color: '#a0a0a0'
  },
  hours: {
    fontSize: '12px',
    color: '#a0a0a0'
  },
  dragGhost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '2px dashed #e94560',
    borderRadius: '8px',
    backgroundColor: 'rgba(233, 69, 96, 0.08)',
    pointerEvents: 'none',
    zIndex: 5
  },
  dropIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: '#e94560',
    borderRadius: '2px',
    zIndex: 20,
    boxShadow: '0 0 8px rgba(233, 69, 96, 0.6)'
  },
  completedSection: {
    marginTop: '24px'
  },
  completedDivider: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px'
  },
  completedLabel: {
    fontSize: '12px',
    color: '#606080',
    padding: '0 8px'
  }
};

export default TaskList;
