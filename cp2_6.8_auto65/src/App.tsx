import { useState, useEffect } from 'react';
import TaskBoard from './components/TaskBoard';
import BurndownChart from './components/BurndownChart';

export interface Task {
  id: string;
  title: string;
  description: string;
  estimateHours: number;
  status: 'todo' | 'in-progress' | 'done';
  assignee: string | null;
  createdAt: string;
  actualHours?: number;
}

export interface ProjectSettings {
  name: string;
  startDate: string;
  dailyHours: number;
}

export interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

const API_BASE = '/api';

export const TEAM_MEMBERS = ['张伟', '李娜', '王强', '赵敏', '刘洋'];

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<ProjectSettings>({ name: '我的项目', startDate: new Date().toISOString().split('T')[0], dailyHours: 8 });
  const [burndown, setBurndown] = useState<BurndownPoint[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskStatus, setTaskStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');

  const [formData, setFormData] = useState({ title: '', description: '', estimateHours: 8 });
  const [settingsForm, setSettingsForm] = useState<ProjectSettings>({ name: '', startDate: '', dailyHours: 8 });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [tRes, sRes, bRes] = await Promise.all([
      fetch(`${API_BASE}/tasks`),
      fetch(`${API_BASE}/settings`),
      fetch(`${API_BASE}/burndown`),
    ]);
    const t = await tRes.json();
    const s = await sRes.json();
    const b = await bRes.json();
    setTasks(t);
    setSettings(s);
    setBurndown(b);
    setSettingsForm(s);
  };

  const refreshBurndown = async () => {
    const res = await fetch(`${API_BASE}/burndown`);
    const b = await res.json();
    setBurndown(b);
  };

  const createTask = async () => {
    if (!formData.title.trim()) return;
    await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, status: taskStatus }),
    });
    setFormData({ title: '', description: '', estimateHours: 8 });
    setShowTaskModal(false);
    await fetchAll();
  };

  const updateTask = async () => {
    if (!editingTask || !formData.title.trim()) return;
    await fetch(`${API_BASE}/tasks/${editingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setEditingTask(null);
    setShowTaskModal(false);
    setFormData({ title: '', description: '', estimateHours: 8 });
    await fetchAll();
  };

  const deleteTask = async (id: string) => {
    await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
    await fetchAll();
  };

  const updateTaskStatus = async (id: string, status: 'todo' | 'in-progress' | 'done') => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    let actualHours = task.actualHours;
    if (status === 'done' && !actualHours) actualHours = task.estimateHours;
    await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actualHours }),
    });
    await fetchAll();
  };

  const updateAssignee = async (id: string, assignee: string | null) => {
    await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignee }),
    });
    const t = await fetch(`${API_BASE}/tasks`).then((r) => r.json());
    setTasks(t);
  };

  const saveSettings = async () => {
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsForm),
    });
    setShowSettings(false);
    await fetchAll();
  };

  const openCreateTask = (status: 'todo' | 'in-progress' | 'done') => {
    setTaskStatus(status);
    setEditingTask(null);
    setFormData({ title: '', description: '', estimateHours: 8 });
    setShowTaskModal(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskStatus(task.status);
    setFormData({ title: task.title, description: task.description, estimateHours: task.estimateHours });
    setShowTaskModal(true);
  };

  return (
    <div className="app">
      <div className="app-header">
        <h1>{settings.name}</h1>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙ 项目设置</button>
      </div>

      <div className="main-content">
        <TaskBoard
          tasks={tasks}
          onUpdateStatus={updateTaskStatus}
          onCreate={openCreateTask}
          onEdit={openEditTask}
          onDelete={deleteTask}
          onAssign={updateAssignee}
        />
        <BurndownChart data={burndown} />
      </div>

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editingTask ? '编辑任务' : '新建任务'}</div>
            <div className="form-group">
              <label>任务标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入任务标题"
              />
            </div>
            <div className="form-group">
              <label>任务描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入任务描述"
              />
            </div>
            <div className="form-group">
              <label>预估工时（1-40小时）</label>
              <input
                type="number"
                min={1}
                max={40}
                value={formData.estimateHours}
                onChange={(e) => setFormData({ ...formData, estimateHours: Math.max(1, Math.min(40, Number(e.target.value))) })}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>取消</button>
              {editingTask ? (
                <>
                  <button className="btn btn-danger" onClick={() => { deleteTask(editingTask.id); setShowTaskModal(false); }}>删除</button>
                  <button className="btn btn-primary" onClick={updateTask}>保存</button>
                </>
              ) : (
                <button className="btn btn-primary" onClick={createTask}>创建</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">项目设置</div>
            <div className="form-group">
              <label>项目名称</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>开始日期</label>
              <input
                type="date"
                value={settingsForm.startDate}
                onChange={(e) => setSettingsForm({ ...settingsForm, startDate: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>每日可用工时（小时）</label>
              <input
                type="number"
                min={1}
                value={settingsForm.dailyHours}
                onChange={(e) => setSettingsForm({ ...settingsForm, dailyHours: Math.max(1, Number(e.target.value)) })}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => { setSettingsForm(settings); setShowSettings(false); }}>取消</button>
              <button className="btn btn-primary" onClick={saveSettings}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
