import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

interface Course {
  id: number;
  name: string;
  topics: string;
  total_hours: number;
}

interface Task {
  id: number;
  plan_id: number;
  name: string;
  date: string;
  duration: number;
  status: string;
  detail?: string;
}

interface Plan {
  id: number;
  course_id: number;
  target_date: string;
  course_name: string;
}

interface DailyCompletion {
  date: string;
  all_completed: number;
}

interface TaskGroup {
  date: string;
  tasks: Task[];
}

const TaskCard = React.memo(({ task, onClick }: { task: Task; onClick: (t: Task) => void }) => {
  const statusClass = task.status === '已完成'
    ? 'task-card--completed'
    : task.status === '进行中'
    ? 'task-card--in-progress'
    : 'task-card--not-started';

  const statusTagClass = `status-tag status-tag--${task.status}`;

  return (
    <div className={`task-card ${statusClass}`} onClick={() => onClick(task)}>
      <div className="task-name">{task.name}</div>
      <div className="task-meta">
        <span>⏱ {task.duration}分钟</span>
        <span className={statusTagClass}>{task.status}</span>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';

const PlanningModule: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | ''>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ name: '', status: '未开始', detail: '', duration: 0 });
  const [starKey, setStarKey] = useState(0);

  useEffect(() => {
    axios.get('/api/courses').then(res => setCourses(res.data)).catch(() => {});
    loadLatestPlan();
  }, []);

  const loadLatestPlan = useCallback(() => {
    axios.get('/api/plan/latest').then(res => {
      if (res.data.plan) {
        setPlan(res.data.plan);
        setTasks(res.data.tasks || []);
      }
    }).catch(() => {});
    axios.get('/api/daily-completions').then(res => {
      setCompletions(res.data || []);
    }).catch(() => {});
  }, []);

  const taskGroups = useMemo<TaskGroup[]>(() => {
    const groups: Record<string, Task[]> = {};
    tasks.forEach(task => {
      if (!groups[task.date]) groups[task.date] = [];
      groups[task.date].push(task);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, tasks]) => ({ date, tasks }));
  }, [tasks]);

  const completionDates = useMemo(() => {
    return new Set(completions.filter(c => c.all_completed === 1).map(c => c.date));
  }, [completions]);

  const isDateCompleted = useCallback((date: string) => {
    if (completionDates.has(date)) return true;
    const dateTasks = tasks.filter(t => t.date === date);
    return dateTasks.length > 0 && dateTasks.every(t => t.status === '已完成');
  }, [completionDates, tasks]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCourse || !targetDate) {
      setError('请选择课程和目标日期');
      return;
    }
    const target = new Date(targetDate);
    if (target <= new Date()) {
      setError('目标日期必须在今天之后');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/plan', {
        course_id: selectedCourse,
        target_date: targetDate,
      });
      setPlan(res.data.plan);
      setTasks(res.data.tasks);
      await loadLatestPlan();
    } catch (err: any) {
      setError(err.response?.data?.error || '生成计划失败');
    } finally {
      setLoading(false);
    }
  }, [selectedCourse, targetDate, loadLatestPlan]);

  const handleTaskClick = useCallback((task: Task) => {
    setEditingTask(task);
    setEditForm({
      name: task.name,
      status: task.status,
      detail: task.detail || '',
      duration: task.duration,
    });
  }, []);

  const handleSaveTask = useCallback(async () => {
    if (!editingTask) return;
    try {
      await axios.put(`/api/task/${editingTask.id}`, editForm);
      setTasks(prev =>
        prev.map(t =>
          t.id === editingTask.id
            ? { ...t, ...editForm }
            : t
        )
      );
      setEditingTask(null);
      setTimeout(() => loadLatestPlan(), 200);
    } catch {
      setError('更新任务失败');
    }
  }, [editingTask, editForm, loadLatestPlan]);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🗺️ 学习路径规划</h1>
        <p className="page-subtitle">选择课程和目标日期，生成个性化学习计划</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">选择课程</label>
            <select
              className="form-select"
              value={selectedCourse}
              onChange={e => setSelectedCourse(Number(e.target.value))}
            >
              <option value="">-- 请选择课程 --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.total_hours}学时)</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">目标日期</label>
            <input
              type="date"
              className="form-input"
              value={targetDate}
              min={minDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>
          <button
            className="btn"
            onClick={handleGenerate}
            disabled={loading}
            style={{ marginBottom: '0' }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? '生成中...' : '生成计划'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="pulse-circle" />
        </div>
      )}

      {!loading && tasks.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📋 {plan?.course_name || '学习计划'}</span>
            <span style={{ fontSize: '13px', color: '#78909c', fontWeight: 400 }}>
              目标: {plan?.target_date}
            </span>
          </div>
          <div className="timeline">
            {taskGroups.map(group => (
              <div className="timeline-group" key={group.date}>
                <div className="timeline-date">
                  <span>{group.date}</span>
                  {isDateCompleted(group.date) && (
                    <span className="completion-badge" key={`badge-${group.date}-${starKey}`}>✓</span>
                  )}
                </div>
                {group.tasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={handleTaskClick} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tasks.length === 0 && !error && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-text">选择课程和目标日期，开始规划你的学习路径</div>
          </div>
        </div>
      )}

      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">编辑任务</h3>
            <div className="form-group">
              <label className="form-label">任务名称</label>
              <input
                type="text"
                className="form-input"
                value={editForm.name}
                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">状态</label>
              <select
                className="form-select"
                value={editForm.status}
                onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="未开始">未开始</option>
                <option value="进行中">进行中</option>
                <option value="已完成">已完成</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">预计耗时（分钟）</label>
              <input
                type="number"
                className="form-input"
                value={editForm.duration}
                min={5}
                max={480}
                onChange={e => setEditForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">备注详情</label>
              <textarea
                className="form-textarea"
                value={editForm.detail}
                onChange={e => setEditForm(prev => ({ ...prev, detail: e.target.value }))}
                placeholder="添加学习笔记或备注..."
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn--secondary" onClick={() => setEditingTask(null)}>取消</button>
              <button className="btn" onClick={handleSaveTask}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningModule;
