import express from 'express';
import cors from 'cors';
import { storage, TagType } from './storage';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/inspirations', (_req, res) => {
  const items = storage.getAll();
  res.json(items);
});

app.post('/api/inspirations', (req, res) => {
  const { title, description, tags } = req.body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '标题不能为空' });
  }
  if (title.length > 20) {
    return res.status(400).json({ error: '标题不能超过20字' });
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({ error: '描述不能为空' });
  }
  if (description.length > 140) {
    return res.status(400).json({ error: '描述不能超过140字' });
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    return res.status(400).json({ error: '请至少选择一个标签' });
  }

  const validTags: TagType[] = ['技术', '设计', '商业', '生活', '其他'];
  const allValid = tags.every((t: string) => validTags.includes(t as TagType));
  if (!allValid) {
    return res.status(400).json({ error: '包含无效标签' });
  }

  const item = storage.create({
    title: title.trim(),
    description: description.trim(),
    tags: tags as TagType[],
  });

  res.status(201).json(item);
});

app.post('/api/inspirations/:id/vote', (req, res) => {
  const { id } = req.params;
  const item = storage.vote(id);
  if (!item) {
    return res.status(404).json({ error: '灵感不存在' });
  }
  res.json(item);
});

app.delete('/api/inspirations/:id', (req, res) => {
  const { id } = req.params;
  const success = storage.remove(id);
  if (!success) {
    return res.status(404).json({ error: '灵感不存在' });
  }
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🌳 灵感之森后端已启动: http://localhost:${PORT}`);
});
