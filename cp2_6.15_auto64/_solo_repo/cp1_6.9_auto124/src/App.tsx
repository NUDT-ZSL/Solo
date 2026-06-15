import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Task, ApiResponse, TaskCreateRequest } from '@shared/types';
import TaskCard from './TaskCard';

const POLL_INTERVAL = 10000;

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [remindHours, setRemindHours] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const json: ApiResponse<Task[]> = await res.json();
      if (json.success && json.data) {
        setTasks(json.data);
      }
    } catch (err) {
      console.error('获取任务失败:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body: TaskCreateRequest = { title, remindHours };
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: ApiResponse<Task> = await res.json();
      if (!json.success) {
        setError(json.error || '创建失败');
      } else {
        setTitle('');
        setRemindHours(1);
        fetchTasks();
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}/complete`, { method: 'PUT' });
      fetchTasks();
    } catch (err) {
      console.error('标记完成失败:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  const handleClearExpired = async () => {
    try {
      const res = await fetch('/api/tasks/expired', { method: 'DELETE' });
      const json: ApiResponse<{ deletedCount: number }> = await res.json();
      if (json.success && json.data && json.data.deletedCount > 0) {
        fetchTasks();
      }
    } catch (err) {
      console.error('清空过期失败:', err);
    }
  };

  const now = Date.now();

  const { inProgress, expired, completed } = useMemo(() => {
    const result = { inProgress: [] as Task[], expired: [] as Task[], completed: [] as Task[] };
    for (const t of tasks) {
      if (t.completed) {
        result.completed.push(t);
      } else if (t.remindAt < now) {
        result.expired.push(t);
      } else {
        result.inProgress.push(t);
      }
    }
    result.inProgress.sort((a, b) => a.remindAt - b.remindAt);
    result.expired.sort((a, b) => b.remindAt - a.remindAt);
    result.completed.sort((a, b) => b.createdAt - a.createdAt);
    return result;
  }, [tasks, now]);

  const hourOptions = useMemo(() => {
    const opts: { label: string; value: number }[] = [];
    const baseHour = Math.ceil(now / 3600000);
    for (let h = 1; h <= 24; h++) {
      const ts = (baseHour + h - 1) * 3600000;
      const date = new Date(ts);
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      opts.push({ label: `${h}小时后 (${hh}:${mm})`, value: h });
    }
    return opts;
  }, [now]);

  return (
    <div className="app-container">
      <div className="clock-watermark" aria-hidden="true">
        <div className="clock-roman">ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ</div>
      </div>

      <header className="top-bar">
        <div className="title-wrap">
          <span className="mini-hourglass" aria-hidden="true"></span>
          <h1 className="app-title">沙漏任务板</h1>
          <span className="title-decoration"></span>
        </div>
        <button
          type="button"
          className="btn-clear"
          onClick={handleClearExpired}
          disabled={expired.length === 0}
        >
          一键清空过期 ({expired.length})
        </button>
      </header>

      <main className="main-content">
        <section className="create-section glass-card">
          <form className="create-form" onSubmit={handleSubmit}>
            <div className="form-group form-title">
              <label htmlFor="task-title">任务标题</label>
              <input
                id="task-title"
                type="text"
                maxLength={20}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入要完成的任务（最多20字）"
                className="input-glass"
              />
              <span className="char-counter">{title.length}/20</span>
            </div>
            <div className="form-group form-time">
              <label htmlFor="remind-time">提醒时间</label>
              <select
                id="remind-time"
                value={remindHours}
                onChange={(e) => setRemindHours(Number(e.target.value))}
                className="select-glass"
              >
                {hourOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? '提交中...' : '创建任务'}
            </button>
          </form>
          {error && <div className="error-message">{error}</div>}
        </section>

        <section className="tasks-section">
          <div className="task-group">
            <h2 className="group-title group-in-progress">
              <span className="group-icon hourglass-icon" aria-hidden="true"></span>
              进行中 <span className="group-count">{inProgress.length}</span>
            </h2>
            <div className="task-grid">
              {inProgress.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  status="inProgress"
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  now={now}
                />
              ))}
              {inProgress.length === 0 && (
                <div className="empty-state glass-card">暂无进行中的任务，创建一个开始吧</div>
              )}
            </div>
          </div>

          <div className="task-group">
            <h2 className="group-title group-expired">
              <span className="group-icon warn-icon" aria-hidden="true"></span>
              已过期 <span className="group-count">{expired.length}</span>
            </h2>
            <div className="task-grid">
              {expired.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  status="expired"
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  now={now}
                />
              ))}
              {expired.length === 0 && (
                <div className="empty-state glass-card">没有过期任务，时间管理棒棒哒</div>
              )}
            </div>
          </div>

          {completed.length > 0 && (
            <div className="task-group completed-group">
              <button
                type="button"
                className="group-title toggle-title"
                onClick={() => setShowCompleted((v) => !v)}
              >
                <span className={`chevron ${showCompleted ? 'open' : ''}`} aria-hidden="true"></span>
                已完成 <span className="group-count">{completed.length}</span>
              </button>
              {showCompleted && (
                <div className="task-grid completed-grid">
                  {completed.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      status="completed"
                      onComplete={handleComplete}
                      onDelete={handleDelete}
                      now={now}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
