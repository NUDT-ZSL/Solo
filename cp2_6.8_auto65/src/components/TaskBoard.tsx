import { useState, useRef, useEffect } from 'react';
import { Task, TEAM_MEMBERS } from '../App';

interface TaskBoardProps {
  tasks: Task[];
  onUpdateStatus: (id: string, status: 'todo' | 'in-progress' | 'done') => void;
  onCreate: (status: 'todo' | 'in-progress' | 'done') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assignee: string | null) => void;
}

const COLUMNS: { id: 'todo' | 'in-progress' | 'done'; title: string; className: string }[] = [
  { id: 'todo', title: '待办', className: 'todo' },
  { id: 'in-progress', title: '进行中', className: 'in-progress' },
  { id: 'done', title: '已完成', className: 'done' },
];

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function getInitials(name: string): string {
  return name.slice(0, 1);
}

function TaskBoard({ tasks, onUpdateStatus, onCreate, onEdit, onDelete, onAssign }: TaskBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: 'todo' | 'in-progress' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onUpdateStatus(taskId, columnId);
    }
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverColumn(null);
  };

  const renderTaskCard = (task: Task) => {
    const isDragging = draggingId === task.id;
    const isDropdownOpen = openDropdown === task.id;

    return (
      <div
        key={task.id}
        className={`task-card ${isDragging ? 'dragging' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="estimate-tag">{task.estimateHours}h</div>
        <div className="task-actions">
          <button onClick={() => onEdit(task)}>编辑</button>
          <button onClick={() => onDelete(task.id)}>删除</button>
        </div>
        <div className="task-title">{truncate(task.title, 15)}</div>
        <div className="task-desc">{task.description}</div>
        <div className="task-footer">
          <div className="assignee-badge" ref={isDropdownOpen ? dropdownRef : null}>
            <button
              className="assignee-btn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdown(isDropdownOpen ? null : task.id);
              }}
              title={task.assignee || '未分配'}
            >
              {task.assignee ? getInitials(task.assignee) : '?'}
            </button>
            {isDropdownOpen && (
              <div className="assignee-dropdown" onClick={(e) => e.stopPropagation()}>
                <div
                  className={`assignee-option ${!task.assignee ? 'selected' : ''}`}
                  onClick={() => { onAssign(task.id, null); setOpenDropdown(null); }}
                >
                  未分配
                </div>
                {TEAM_MEMBERS.map((member) => (
                  <div
                    key={member}
                    className={`assignee-option ${task.assignee === member ? 'selected' : ''}`}
                    onClick={() => { onAssign(task.id, member); setOpenDropdown(null); }}
                  >
                    {member}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="board-container">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((t) => t.status === column.id);
        return (
          <div
            key={column.id}
            className={`column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className={`column-header ${column.className}`}>
              <span>{column.title}</span>
              <span className="column-count">{columnTasks.length}</span>
            </div>
            <div className="column-body">
              {columnTasks.map(renderTaskCard)}
              {draggingId && dragOverColumn === column.id && !columnTasks.some((t) => t.id === draggingId) && (
                <div className="task-card placeholder" />
              )}
            </div>
            <button className="add-task-btn" onClick={() => onCreate(column.id)}>
              + 添加任务
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default TaskBoard;
