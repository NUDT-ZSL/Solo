import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface PomodoroRecord {
  timestamp: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  pomodoroRecords: PomodoroRecord[];
  completed: boolean;
  createdAt: number;
}

let tasks: Task[] = [
  {
    id: '1',
    title: '完成项目需求文档',
    description: '编写Q3季度新项目的详细需求文档',
    estimatedPomodoros: 4,
    completedPomodoros: 2,
    pomodoroRecords: [
      { timestamp: Date.now() - 86400000 * 2 },
      { timestamp: Date.now() - 86400000 },
    ],
    completed: false,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: '2',
    title: '代码审查',
    description: '审查前端团队提交的新功能PR',
    estimatedPomodoros: 2,
    completedPomodoros: 3,
    pomodoroRecords: [
      { timestamp: Date.now() - 86400000 * 3 },
      { timestamp: Date.now() - 86400000 * 2 },
      { timestamp: Date.now() - 3600000 },
    ],
    completed: true,
    createdAt: Date.now() - 86400000 * 4,
  },
];

let idCounter = 3;

function generateId(): string {
  return String(idCounter++);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

app.get('/tasks', (_req: Request, res: Response) => {
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return b.createdAt - a.createdAt;
  });
  res.json(sorted);
});

app.post('/tasks', (req: Request, res: Response) => {
  const { title, description, estimatedPomodoros } = req.body;

  if (!title || !estimatedPomodoros) {
    return res.status(400).json({ error: '标题和预估番茄钟数是必填项' });
  }

  if (estimatedPomodoros < 1 || estimatedPomodoros > 8) {
    return res.status(400).json({ error: '预估番茄钟数必须在1-8之间' });
  }

  const newTask: Task = {
    id: generateId(),
    title,
    description: description || '',
    estimatedPomodoros,
    completedPomodoros: 0,
    pomodoroRecords: [],
    completed: false,
    createdAt: Date.now(),
  };

  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.put('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  const { title, description, estimatedPomodoros, completed, addPomodoro } = req.body;

  const existing = tasks[taskIndex];

  if (title !== undefined) existing.title = title;
  if (description !== undefined) existing.description = description;
  if (estimatedPomodoros !== undefined) {
    if (estimatedPomodoros < 1 || estimatedPomodoros > 8) {
      return res.status(400).json({ error: '预估番茄钟数必须在1-8之间' });
    }
    existing.estimatedPomodoros = estimatedPomodoros;
  }
  if (completed !== undefined) existing.completed = completed;
  if (addPomodoro === true) {
    existing.completedPomodoros += 1;
    existing.pomodoroRecords.push({ timestamp: Date.now() });
  }

  res.json(existing);
});

app.delete('/tasks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const taskIndex = tasks.findIndex((t) => t.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ error: '任务不存在' });
  }

  tasks.splice(taskIndex, 1);
  res.status(204).send();
});

app.get('/stats/weekly', (_req: Request, res: Response) => {
  const today = new Date();
  const monday = getMondayOfWeek(today);
  const weeklyCounts: { day: string; date: string; count: number }[] = [];
  const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const dayStart = dayDate.getTime();
    const dayEnd = dayStart + 86400000;

    let count = 0;
    for (const task of tasks) {
      for (const record of task.pomodoroRecords) {
        if (record.timestamp >= dayStart && record.timestamp < dayEnd) {
          count++;
        }
      }
    }

    weeklyCounts.push({
      day: dayNames[i],
      date: dayDate.toISOString().split('T')[0],
      count,
    });
  }

  res.json(weeklyCounts);
});

app.listen(PORT, () => {
  console.log(`番茄专注后端服务器已启动: http://localhost:${PORT}`);
});
