import type { Task } from '@shared/types';

type TaskStatus = 'inProgress' | 'expired' | 'completed';

interface TaskCardProps {
  task: Task;
  status: TaskStatus;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  now: number;
}

const formatDuration = (ms: number): string => {
  if (ms < 0) {
    const abs = Math.abs(ms);
    const hours = Math.floor(abs / 3600000);
    const minutes = Math.floor((abs % 3600000) / 60000);
    if (hours > 0) return `过期 ${hours}小时${minutes}分钟`;
    return `过期 ${minutes}分钟`;
  }
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) return `剩余 ${hours}小时${minutes}分钟`;
  if (minutes > 0) return `剩余 ${minutes}分${seconds}秒`;
  return `剩余 ${seconds}秒`;
};

const formatTime = (ts: number): string => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

function TaskCard({ task, status, onComplete, onDelete, now }: TaskCardProps) {
  let progress = 0;
  if (status === 'completed') {
    progress = 100;
  } else {
    const total = task.remindAt - task.createdAt;
    const elapsed = now - task.createdAt;
    progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
  }

  const timeLabel =
    status === 'completed'
      ? `已完成 · ${formatTime(task.remindAt)}`
      : status === 'expired'
      ? formatDuration(task.remindAt - now)
      : formatDuration(task.remindAt - now);

  const cardClass = [
    'task-card',
    'glass-card',
    status === 'expired' ? 'card-expired' : '',
    status === 'completed' ? 'card-completed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClass} style={{ ['--progress' as string]: `${progress}%` }}>
      <div className="card-top-row">
        <span className="card-mini-hourglass" aria-hidden="true"></span>
        <div className="card-actions">
          {status !== 'completed' && (
            <button
              type="button"
              className="icon-btn btn-check"
              onClick={() => onComplete(task.id)}
              aria-label="标记完成"
              title="标记完成"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          )}
          <button
            type="button"
            className="icon-btn btn-delete"
            onClick={() => onDelete(task.id)}
            aria-label="删除任务"
            title="删除任务"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="hourglass-container" aria-hidden="true">
          <div className="hourglass-frame">
            <div className="hourglass-top">
              <div className="sand-top" style={{ height: `${100 - progress}%` }}></div>
            </div>
            <div className="hourglass-neck">
              <div className="sand-stream" style={{ opacity: status === 'completed' ? 0 : progress < 100 ? 1 : 0 }}></div>
            </div>
            <div className="hourglass-bottom">
              <div className="sand-bottom" style={{ height: `${progress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="card-content">
          <h3 className={`task-title ${status === 'completed' ? 'title-completed' : ''}`}>
            {task.title}
          </h3>
          <div className="task-meta">
            <span className={`time-label label-${status}`}>{timeLabel}</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar">
              <div
                className={`progress-fill fill-${status}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
