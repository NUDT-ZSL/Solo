import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task, TimerMode, WeeklyStat } from './types';
import PomodoroTimer, { type PomodoroTimerHandle } from './components/PomodoroTimer';
import TaskItem from './components/TaskItem';
import StatsChart from './components/StatsChart';

const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [timerMode, setTimerMode] = useState<TimerMode>('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [duration, setDuration] = useState(WORK_DURATION);
  const [remaining, setRemaining] = useState(WORK_DURATION);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEst, setNewEst] = useState(1);
  const [, setStats] = useState<WeeklyStat[]>([]);
  const timerRef = useRef<PomodoroTimerHandle>(null);
  const intervalRef = useRef<number | null>(null);

  const currentTask = tasks.find((t) => t.id === currentTaskId) || null;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      console.error('获取任务失败:', e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats/weekly');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('获取统计失败:', e);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  const startTick = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (remaining === 0 && isRunning) {
      handleTimerComplete();
    }
  }, [remaining, isRunning]);

  const handleTimerComplete = useCallback(async () => {
    stopTick();
    setIsRunning(false);
    timerRef.current?.playSound();

    if (timerMode === 'work' && currentTaskId) {
      try {
        await fetch(`/api/tasks/${currentTaskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addPomodoro: true }),
        });
        await fetchTasks();
        await fetchStats();
      } catch (e) {
        console.error('记录番茄钟失败:', e);
      }
      setTimerMode('break');
      setDuration(BREAK_DURATION);
      setRemaining(BREAK_DURATION);
      setTimeout(() => {
        setIsRunning(true);
        startTick();
      }, 500);
    } else if (timerMode === 'break') {
      setTimerMode('idle');
      setCurrentTaskId(null);
      setDuration(WORK_DURATION);
      setRemaining(WORK_DURATION);
    }
  }, [timerMode, currentTaskId, stopTick, startTick, fetchTasks, fetchStats]);

  const handleStart = (task: Task) => {
    if (isRunning && currentTaskId === task.id) {
      setIsRunning(false);
      stopTick();
      return;
    }
    if (isRunning && currentTaskId !== task.id) {
      return;
    }
    setCurrentTaskId(task.id);
    setTimerMode('work');
    setDuration(WORK_DURATION);
    setRemaining(WORK_DURATION);
    setTimeout(() => {
      setIsRunning(true);
      startTick();
    }, 100);
  };

  const handleReset = () => {
    stopTick();
    setIsRunning(false);
    setTimerMode('idle');
    setCurrentTaskId(null);
    setDuration(WORK_DURATION);
    setRemaining(WORK_DURATION);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          estimatedPomodoros: newEst,
        }),
      });
      setNewTitle('');
      setNewDesc('');
      setNewEst(1);
      await fetchTasks();
    } catch (e) {
      console.error('创建任务失败:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (currentTaskId === id) {
        handleReset();
      }
      await fetchTasks();
    } catch (e) {
      console.error('删除任务失败:', e);
    }
  };

  const handleToggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      await fetchTasks();
    } catch (e) {
      console.error('切换完成状态失败:', e);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Task>) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await fetchTasks();
    } catch (e) {
      console.error('更新任务失败:', e);
    }
  };

  const totalPomodoros = tasks.reduce((sum, t) => sum + t.completedPomodoros, 0);
  const pendingTasks = tasks.filter((t) => !t.completed).length;

  return (
    <div className="app">
      <div className="app-header">
        <h1>🍅 番茄专注</h1>
        <p>
          专注每一个25分钟 · 今日已获得 {totalPomodoros} 颗专注宝石 · 待完成 {pendingTasks} 项任务
        </p>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>任务管理</h2>

          <div className="task-form">
            <input
              type="text"
              placeholder="任务标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <textarea
              placeholder="任务描述（可选）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
            />
            <div className="form-row">
              <input
                type="number"
                min={1}
                max={8}
                value={newEst}
                onChange={(e) =>
                  setNewEst(Math.max(1, Math.min(8, Number(e.target.value))))
                }
                placeholder="预估番茄钟"
              />
              <button className="btn" onClick={handleCreate} style={{ flex: 1 }}>
                + 添加任务
              </button>
            </div>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-state">暂无任务，添加第一个任务开始专注吧！</div>
            ) : (
              tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onStart={handleStart}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  onUpdate={handleUpdate}
                  isCurrentTask={currentTaskId === task.id}
                  timerRunning={isRunning}
                />
              ))
            )}
          </div>
        </div>

        <div className="card timer-section">
          <h2>番茄钟</h2>

          <div className="timer-info">
            {currentTask ? (
              <div className="current-task">{currentTask.title}</div>
            ) : (
              <div className="current-task" style={{ color: '#666' }}>
                选择一个任务开始专注
              </div>
            )}
            <span className={`timer-mode ${timerMode === 'break' ? 'break' : ''}`}>
              {timerMode === 'work'
                ? '工作模式 25:00'
                : timerMode === 'break'
                ? '休息模式 05:00'
                : '待机中'}
            </span>
          </div>

          <PomodoroTimer
            ref={timerRef}
            duration={duration}
            remaining={remaining}
            isRunning={isRunning}
            mode={timerMode}
          />

          <div className="timer-controls">
            {currentTask && timerMode === 'work' && (
              <button className="btn" onClick={() => handleStart(currentTask)}>
                {isRunning ? '暂停' : '开始'}
              </button>
            )}
            {isRunning && (
              <button className="btn btn-secondary" onClick={handleReset}>
                重置
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card stats-section">
        <h2>本周专注趋势</h2>
        <StatsChart />
      </div>
    </div>
  );
}
