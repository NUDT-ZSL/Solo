import { useState } from 'react';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onStart: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Task>) => void;
  isCurrentTask: boolean;
  timerRunning: boolean;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d
    .getHours()
    .toString()
    .padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function TaskItem({
  task,
  onStart,
  onDelete,
  onToggleComplete,
  onUpdate,
  isCurrentTask,
  timerRunning,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editEst, setEditEst] = useState(task.estimatedPomodoros);

  const handleSave = () => {
    onUpdate(task.id, {
      title: editTitle,
      description: editDesc,
      estimatedPomodoros: editEst,
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''} ${
        isCurrentTask ? 'current' : ''
      }`}
      style={isCurrentTask ? { borderColor: 'rgba(74, 144, 217, 0.6)' } : {}}
    >
      {isEditing ? (
        <>
          <div className="edit-form">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="任务标题"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="任务描述（可选）"
              rows={2}
            />
            <input
              type="number"
              min={1}
              max={8}
              value={editEst}
              onChange={(e) => setEditEst(Math.max(1, Math.min(8, Number(e.target.value))))}
              placeholder="预估番茄钟数"
            />
          </div>
          <div className="edit-buttons">
            <button className="btn btn-small" onClick={handleSave}>
              保存
            </button>
            <button
              className="btn btn-small btn-secondary"
              onClick={() => {
                setEditTitle(task.title);
                setEditDesc(task.description);
                setEditEst(task.estimatedPomodoros);
                setIsEditing(false);
              }}
            >
              取消
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="task-header">
            <div
              className="task-title"
              onClick={() => onToggleComplete(task.id)}
              style={{ cursor: 'pointer' }}
            >
              {task.title}
            </div>
          </div>
          {task.description && <div className="task-desc">{task.description}</div>}
          <div className="task-meta">
            <div className="pomodoro-badge">
              🍅 {task.completedPomodoros}/{task.estimatedPomodoros}
            </div>

            {task.pomodoroRecords.length > 0 && (
              <div
                className="gems-container"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <div className="gems-row">
                  {task.pomodoroRecords.slice(0, 10).map((_, i) => (
                    <span key={i} className="gem" />
                  ))}
                </div>
                <span className="gems-count">×{task.completedPomodoros}</span>
                {showTooltip && (
                  <div className="tooltip">
                    {task.pomodoroRecords
                      .slice()
                      .reverse()
                      .map((r, i) => (
                        <div key={i}>{formatTimestamp(r.timestamp)}</div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="task-actions">
              <button
                className="btn btn-small"
                onClick={() => onStart(task)}
                disabled={task.completed || (timerRunning && !isCurrentTask)}
                style={
                  task.completed || (timerRunning && !isCurrentTask)
                    ? { opacity: 0.4, cursor: 'not-allowed' }
                    : {}
                }
              >
                {isCurrentTask && timerRunning ? '进行中' : '开始'}
              </button>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => setIsEditing(true)}
                disabled={timerRunning}
                style={timerRunning ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                编辑
              </button>
              <button
                className="btn btn-small btn-danger"
                onClick={() => onDelete(task.id)}
                disabled={timerRunning}
                style={timerRunning ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                删除
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
