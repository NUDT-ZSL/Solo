import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Task, TaskCreateRequest, ApiResponse } from '../shared/types';

const app = express();
const PORT = 3001;

app.use(express.json());

const tasks: Map<string, Task> = new Map();

const validateTaskCreate = (body: unknown): { valid: boolean; error?: string; data?: TaskCreateRequest } => {
  const req = body as TaskCreateRequest;
  if (!req || typeof req !== 'object') {
    return { valid: false, error: '请求体格式错误' };
  }
  if (typeof req.title !== 'string') {
    return { valid: false, error: '标题必须是字符串' };
  }
  const trimmedTitle = req.title.trim();
  if (trimmedTitle.length === 0) {
    return { valid: false, error: '标题不能为空' };
  }
  if (trimmedTitle.length > 20) {
    return { valid: false, error: '标题长度不能超过20字符' };
  }
  if (typeof req.remindHours !== 'number' || !Number.isInteger(req.remindHours)) {
    return { valid: false, error: '提醒时间必须是整数' };
  }
  if (req.remindHours < 1 || req.remindHours > 24) {
    return { valid: false, error: '提醒时间必须在1-24小时之间' };
  }
  return { valid: true, data: { title: trimmedTitle, remindHours: req.remindHours } };
};

app.get('/api/tasks', (_req: Request, res: Response<ApiResponse<Task[]>>) => {
  const allTasks = Array.from(tasks.values());
  res.json({ success: true, data: allTasks });
});

app.post('/api/tasks', (req: Request, res: Response<ApiResponse<Task>>) => {
  const validation = validateTaskCreate(req.body);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ success: false, error: validation.error });
    return;
  }
  const { title, remindHours } = validation.data;
  const now = Date.now();
  const nextHour = Math.ceil(now / 3600000) * 3600000;
  const remindAt = nextHour + (remindHours - 1) * 3600000;

  const newTask: Task = {
    id: uuidv4(),
    title,
    createdAt: now,
    remindAt,
    completed: false,
  };
  tasks.set(newTask.id, newTask);
  res.status(201).json({ success: true, data: newTask });
});

app.put('/api/tasks/:id/complete', (req: Request, res: Response<ApiResponse<Task>>) => {
  const { id } = req.params;
  const task = tasks.get(id);
  if (!task) {
    res.status(404).json({ success: false, error: '任务不存在' });
    return;
  }
  task.completed = true;
  tasks.set(id, task);
  res.json({ success: true, data: task });
});

app.delete('/api/tasks/expired', (_req: Request, res: Response<ApiResponse<{ deletedCount: number }>>) => {
  const now = Date.now();
  let deletedCount = 0;
  for (const [id, task] of tasks.entries()) {
    if (!task.completed && task.remindAt < now) {
      tasks.delete(id);
      deletedCount++;
    }
  }
  res.json({ success: true, data: { deletedCount } });
});

app.delete('/api/tasks/:id', (req: Request, res: Response<ApiResponse<{ deletedId: string }>>) => {
  const { id } = req.params;
  if (!tasks.has(id)) {
    res.status(404).json({ success: false, error: '任务不存在' });
    return;
  }
  tasks.delete(id);
  res.json({ success: true, data: { deletedId: id } });
});

app.listen(PORT, () => {
  console.log(`[Server] 沙漏任务板后端运行在 http://localhost:${PORT}`);
});
