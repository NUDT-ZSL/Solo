import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import {
  getUsers,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTimeLogs,
  getMemberStats,
  type TaskStatus,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 50) {
      console.log(`[${req.method}] ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// ========== Users ==========
app.get('/api/users', (_req: Request, res: Response) => {
  try {
    const users = getUsers();
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== Tasks ==========
app.get('/api/tasks', (req: Request, res: Response) => {
  try {
    const { status, assignee_id } = req.query;
    const options: { status?: TaskStatus; assignee_id?: string } = {};
    if (status && typeof status === 'string') {
      options.status = status as TaskStatus;
    }
    if (assignee_id && typeof assignee_id === 'string') {
      options.assignee_id = assignee_id;
    }
    const tasks = getTasks(options);
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const task = getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const { title, description, status, assignee_id, estimated_hours, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }
    const task = createTask({
      title,
      description: description || '',
      status: status || 'todo',
      assignee_id: assignee_id || null,
      estimated_hours: Number(estimated_hours) || 4,
      due_date: due_date || new Date().toISOString().split('T')[0],
    });
    res.status(201).json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const task = updateTask(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch('/api/tasks/:id/status', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    const task = updateTask(req.params.id, { status });
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const result = deleteTask(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== Time Logs ==========
app.get('/api/time-logs', (req: Request, res: Response) => {
  try {
    const { user_id, from_date, to_date } = req.query;
    const logs = getTimeLogs({
      user_id: user_id as string | undefined,
      from_date: from_date as string | undefined,
      to_date: to_date as string | undefined,
    });
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== Statistics ==========
app.get('/api/stats/members', (req: Request, res: Response) => {
  try {
    const { range } = req.query;
    const validRanges = ['7d', '30d', 'all'];
    const r = (validRanges.includes(range as string) ? range : 'all') as '7d' | '30d' | 'all';
    const stats = getMemberStats(r);
    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 TaskFleet API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
