import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

type TaskStatus = 'todo' | 'in-progress' | 'done';

interface Task {
  id: string;
  title: string;
  description: string;
  estimateHours: number;
  status: TaskStatus;
  assignee: string | null;
  createdAt: string;
  actualHours?: number;
}

interface ProjectSettings {
  name: string;
  startDate: string;
  dailyHours: number;
}

interface BurndownPoint {
  date: string;
  ideal: number;
  actual: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const today = new Date().toISOString().split('T')[0];
const getDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

let settings: ProjectSettings = {
  name: '我的项目',
  startDate: getDate(-5),
  dailyHours: 8,
};

let tasks: Task[] = [
  { id: uuidv4(), title: '需求分析文档编写', description: '完成项目需求分析和规格说明文档', estimateHours: 8, status: 'todo', assignee: null, createdAt: getDate(-5) },
  { id: uuidv4(), title: '数据库架构设计', description: '设计数据库表结构和关系模型', estimateHours: 6, status: 'todo', assignee: '张伟', createdAt: getDate(-4) },
  { id: uuidv4(), title: '用户界面原型', description: '制作主要页面的UI原型', estimateHours: 4, status: 'todo', assignee: null, createdAt: getDate(-3) },
  { id: uuidv4(), title: '登录模块开发', description: '实现用户登录和认证功能', estimateHours: 10, status: 'in-progress', assignee: '李娜', createdAt: getDate(-2), actualHours: 5 },
  { id: uuidv4(), title: 'API接口开发', description: '开发后端RESTful API接口', estimateHours: 16, status: 'in-progress', assignee: '王强', createdAt: getDate(-1), actualHours: 8 },
  { id: uuidv4(), title: '项目初始化', description: '搭建项目框架和开发环境', estimateHours: 3, status: 'done', assignee: '赵敏', createdAt: getDate(-5), actualHours: 3 },
];

const burndownHistory: Record<string, number> = {};

app.get('/tasks', (_req, res) => {
  res.json(tasks);
});

app.post('/tasks', (req, res) => {
  const { title, description, estimateHours, status } = req.body;
  if (!title || estimateHours === undefined) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const newTask: Task = {
    id: uuidv4(),
    title,
    description: description || '',
    estimateHours: Math.max(1, Math.min(40, parseInt(estimateHours))),
    status: status || 'todo',
    assignee: null,
    createdAt: today,
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  const existing = tasks[taskIndex];
  const updated: Task = { ...existing, ...req.body, id: existing.id };
  tasks[taskIndex] = updated;
  res.json(updated);
});

app.delete('/tasks/:id', (req, res) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }
  tasks.splice(taskIndex, 1);
  res.json({ success: true });
});

app.get('/settings', (_req, res) => {
  res.json(settings);
});

app.put('/settings', (req, res) => {
  settings = { ...settings, ...req.body };
  res.json(settings);
});

function calcBurndown(): BurndownPoint[] {
  const result: BurndownPoint[] = [];
  const startDate = new Date(settings.startDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const totalEstimate = tasks.reduce((s, t) => s + t.estimateHours, 0);
  const totalDays = Math.ceil(totalEstimate / settings.dailyHours) + 5;

  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    const progress = Math.min(1, i / Math.max(1, totalDays));
    const ideal = totalEstimate * (1 - progress);

    let actual = totalEstimate;
    if (d <= now) {
      const completed = tasks.filter((t) => t.status === 'done');
      const completedHours = completed.reduce((s, t) => s + t.estimateHours, 0);
      const inProgress = tasks.filter((t) => t.status === 'in-progress');
      const inProgressHours = inProgress.reduce((s, t) => s + (t.actualHours || t.estimateHours * 0.5), 0);
      actual = totalEstimate - completedHours - inProgressHours * 0.5;
      actual = Math.max(0, actual);
    }

    result.push({ date: dateStr, ideal: Math.round(ideal * 10) / 10, actual: Math.round(actual * 10) / 10 });
    if (d > now) break;
  }

  return result;
}

app.get('/burndown', (_req, res) => {
  res.json(calcBurndown());
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
