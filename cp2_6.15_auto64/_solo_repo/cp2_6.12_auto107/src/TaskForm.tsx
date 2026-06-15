import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Task,
  TaskCategory,
  CATEGORY_LABELS,
  generateId,
  formatDate,
} from './types';

interface TaskFormProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
}

const today = new Date();
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

export default function TaskForm({ tasks, onAddTask }: TaskFormProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(formatDate(today));
  const [endDate, setEndDate] = useState(formatDate(nextWeek));
  const [category, setCategory] = useState<TaskCategory>('planned');
  const [deps, setDeps] = useState<string[]>([]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setIsCollapsed(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (end <= start) return;

    onAddTask({
      id: generateId(),
      name: name.trim(),
      startDate: start,
      endDate: end,
      category,
      dependencies: deps,
    });

    setName('');
    setStartDate(formatDate(today));
    setEndDate(formatDate(nextWeek));
    setCategory('planned');
    setDeps([]);
  };

  const toggleDep = (id: string) => {
    setDeps(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="task-form-inner">
      <div className="form-title">添加任务</div>

      <label className="form-label">
        任务名称
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="输入任务名称"
          className="form-input"
          required
        />
      </label>

      <div className="form-row">
        <label className="form-label" style={{ flex: 1 }}>
          开始日期
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="form-input"
            required
          />
        </label>
        <label className="form-label" style={{ flex: 1 }}>
          结束日期
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="form-input"
            required
          />
        </label>
      </div>

      <label className="form-label">
        类别
        <select
          value={category}
          onChange={e => setCategory(e.target.value as TaskCategory)}
          className="form-input"
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>

      {tasks.length > 0 && (
        <label className="form-label">
          前置依赖
          <div className="deps-grid">
            {tasks.map(t => (
              <label key={t.id} className="dep-item">
                <input
                  type="checkbox"
                  checked={deps.includes(t.id)}
                  onChange={() => toggleDep(t.id)}
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </label>
      )}

      <button type="submit" className="form-submit">添加任务</button>
    </form>
  );

  return (
    <div className="task-form-wrapper">
      {isMobile && (
        <button
          className="form-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="添加任务"
        >
          {isCollapsed ? '＋' : '✕'}
        </button>
      )}

      <AnimatePresence>
        {(!isMobile || !isCollapsed) && (
          <motion.div
            className="task-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {formContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
