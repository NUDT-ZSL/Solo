import React, { useState, useRef, useCallback } from 'react';
import { Task, Priority } from '../data/mockData';

interface TaskListProps {
  tasks: Task[];
  onAddTask: (name: string, assignee: string, priority: Priority, estimatedHours: number) => void;
  onToggleTask: (taskId: string) => void;
  onReorderTasks: (taskId: string, newOrder: number) => void;
  loading: boolean;
  contentVisible: boolean;
}

const priorityColors: Record<Priority, string> = {
  '高': '#e94560',
  '中': '#f39c12',
  '低': '#27ae60'
};

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onAddTask,
  onToggleTask,
  onReorderTasks,
  loading,
  contentVisible
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    assignee: '',
    priority: '中' as Priority,
    estimatedHours: 1
  });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverTask, setDragOverTask] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'above' | 'below' | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return a.order - b.order;
  });

  const uncompletedTasks = sortedTasks.filter(t => !t.completed);
  const completedTasks = sortedTasks.filter(t => t.completed);

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
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (draggedTask === taskId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;
    const position = e.clientY < middleY ? 'above' : 'below';

    setDragOverTask(taskId);
    setDragPosition(position);
  };

  const handleDragLeave = () => {
    setDragOverTask(null);
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTask || draggedTask === targetTaskId) {
      setDraggedTask(null);
      setDragOverTask(null);
      setDragPosition(null);
      return;
    }

    const draggedItem = tasks.find(t => t.id === draggedTask);
    const targetItem = tasks.find(t => t.id === targetTaskId);

    if (!draggedItem || !targetItem) return;

    let newOrder = targetItem.order;
    if (dragPosition === 'below') {
      newOrder = draggedItem.order < targetItem.order ? targetItem.order : targetItem.order + 1;
    } else {
      newOrder = draggedItem.order < targetItem.order ? targetItem.order - 1 : targetItem.order;
    }

    onReorderTasks(draggedTask, newOrder);
    setDraggedTask(null);
    setDragOverTask(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverTask(null);
    setDragPosition(null);
  };

  const handleToggle = useCallback((taskId: string, completed: boolean) => {
    if (!completed) {
      setCompletingTask(taskId);
      setTimeout(() => {
        onToggleTask(taskId);
        setCompletingTask(null);
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
              transition: 'width 0.5s ease'
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
        {loading ? (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton" style={styles.skeletonTask} />
          ))
        ) : (
          <div style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
            {uncompletedTasks.map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, task.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                style={{
                  ...styles.taskCard,
                  opacity: draggedTask === task.id ? 0.4 : 1,
                  transform: completingTask === task.id ? 'scaleY(0)' : 'scaleY(1)',
                  transformOrigin: 'top',
                  transition: draggedTask === task.id
                    ? 'opacity 0.2s ease'
                    : completingTask === task.id
                    ? 'transform 0.3s ease, opacity 0.3s ease'
                    : dragOverTask === task.id
                    ? `transform 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)`
                    : 'all 0.3s ease',
                  marginTop: dragOverTask === task.id && dragPosition === 'above' ? '60px' : '0',
                  marginBottom: dragOverTask === task.id && dragPosition === 'below' ? '60px' : '0'
                }}
              >
                <div style={styles.dragHandle} title="拖拽排序">⋮⋮</div>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggle(task.id, task.completed)}
                    style={styles.checkbox}
                  />
                  <span style={styles.checkmark} />
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
                {draggedTask === task.id && (
                  <div style={styles.dragGhost} />
                )}
              </div>
            ))}

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
                      ...styles.completedTaskCard,
                      opacity: completingTask === task.id ? 0.5 : 1
                    }}
                  >
                    <div style={styles.dragHandle} />
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggle(task.id, task.completed)}
                        style={styles.checkbox}
                      />
                      <span style={styles.checkmark} />
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
    marginBottom: '12px',
    position: 'relative',
    transition: 'all 0.3s ease',
    cursor: 'grab',
    userSelect: 'none'
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
    marginTop: '4px'
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
    cursor: 'pointer'
  },
  checkmark: {
    display: 'inline-block',
    width: '18px',
    height: '18px',
    border: '2px solid #3a3a5a',
    borderRadius: '4px',
    position: 'relative',
    transition: 'all 0.3s ease'
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
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
    pointerEvents: 'none'
  },
  completedSection: {
    marginTop: '20px'
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
