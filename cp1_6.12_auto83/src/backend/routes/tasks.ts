import { Router, Request, Response } from 'express';
import { tasksDB, Task } from '../models/db.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/goal/:goalId', (req: Request, res: Response) => {
  tasksDB.find<Task>({ goalId: req.params.goalId }).sort({ order: 1, createdAt: 1 }).exec((err, tasks) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(tasks);
  });
});

router.post('/', (req: Request<{}, {}, Partial<Task>>, res: Response) => {
  const { goalId, title, parentId = null, description = '', userId = null, assigneeName, deadline, order = 0 } = req.body;
  if (!goalId || !title) return res.status(400).json({ error: 'goalId and title required' });

  const task: Task = {
    goalId,
    parentId,
    title,
    description,
    status: 'pending',
    userId,
    assigneeName,
    createdAt: Date.now(),
    timeSpent: 0,
    likes: [],
    attachments: [],
    deadline,
    order,
  };
  tasksDB.insert(task, (err, newTask) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json(newTask);
  });
});

router.patch('/:id/time', (req: Request, res: Response) => {
  const { increment } = req.body;
  if (typeof increment !== 'number') return res.status(400).json({ error: 'increment required' });

  tasksDB.findOne<Task>({ _id: req.params.id }, (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const newTime = (task.timeSpent || 0) + increment;
    tasksDB.update({ _id: req.params.id }, { $set: { timeSpent: newTime } }, { returnUpdatedDocs: true }, (_e, _n, docs) => {
      res.json(docs);
    });
  });
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['pending', 'in-progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const updates: Partial<Task> & Record<string, any> = { status };
  if (status === 'in-progress') updates.startedAt = Date.now();
  if (status === 'completed') updates.completedAt = Date.now();
  tasksDB.update({ _id: req.params.id }, { $set: updates }, { returnUpdatedDocs: true }, (err, n, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(docs);
  });
});

router.patch('/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  tasksDB.findOne<Task>({ _id: req.params.id }, (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const likes = [...(task.likes || [])];
    const idx = likes.indexOf(userId);
    if (idx >= 0) likes.splice(idx, 1); else likes.push(userId);
    tasksDB.update({ _id: req.params.id }, { $set: { likes } }, { returnUpdatedDocs: true }, (_e, _n, docs) => {
      res.json(docs);
    });
  });
});

router.patch('/:id', (req: Request, res: Response) => {
  const allowed = ['title', 'description', 'userId', 'assigneeName', 'deadline', 'order'];
  const updates: Record<string, any> = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  tasksDB.update({ _id: req.params.id }, { $set: updates }, { returnUpdatedDocs: true }, (err, _n, docs) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(docs);
  });
});

router.delete('/:id', (req: Request, res: Response) => {
  tasksDB.remove({ _id: req.params.id }, {}, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

router.post('/:id/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/${req.file.filename}`;
  tasksDB.findOne<Task>({ _id: req.params.id }, (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const attachments = [...(task.attachments || []), url];
    tasksDB.update({ _id: req.params.id }, { $set: { attachments } }, { returnUpdatedDocs: true }, (_e, _n, docs) => {
      res.json({ url, task: docs });
    });
  });
});

export default router;
