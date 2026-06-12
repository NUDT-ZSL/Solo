import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const db = Datastore.create(join(__dirname, 'data', 'levels.db'));

db.ensureIndex({ fieldName: 'name', unique: true })
  .catch(err => console.error('索引创建失败:', err));

app.get('/api/levels', async (req, res) => {
  try {
    const levels = await db.find({}).sort({ updatedAt: -1 }).exec();
    res.json(levels.map(level => ({
      _id: level._id,
      name: level.name,
      updatedAt: level.updatedAt,
      createdAt: level.createdAt,
    })));
  } catch (err) {
    console.error('获取关卡列表失败:', err);
    res.status(500).json({ error: '获取关卡列表失败' });
  }
});

app.get('/api/levels/:id', async (req, res) => {
  try {
    const level = await db.findOne({ _id: req.params.id });
    if (!level) {
      return res.status(404).json({ error: '关卡不存在' });
    }
    res.json(level);
  } catch (err) {
    console.error('获取关卡失败:', err);
    res.status(500).json({ error: '获取关卡失败' });
  }
});

app.post('/api/levels', async (req, res) => {
  try {
    const { name, elements } = req.body;
    if (!name || !Array.isArray(elements)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const now = Date.now();
    const level = {
      name,
      elements,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.insert(level);
    res.status(201).json(result);
  } catch (err) {
    if (err.errorType === 'uniqueViolated') {
      return res.status(400).json({ error: '关卡名称已存在' });
    }
    console.error('保存关卡失败:', err);
    res.status(500).json({ error: '保存关卡失败' });
  }
});

app.put('/api/levels/:id', async (req, res) => {
  try {
    const { name, elements } = req.body;
    if (!name || !Array.isArray(elements)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const existing = await db.findOne({ _id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: '关卡不存在' });
    }
    const updated = await db.update(
      { _id: req.params.id },
      { $set: { name, elements, updatedAt: Date.now() } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (err) {
    if (err.errorType === 'uniqueViolated') {
      return res.status(400).json({ error: '关卡名称已存在' });
    }
    console.error('更新关卡失败:', err);
    res.status(500).json({ error: '更新关卡失败' });
  }
});

app.delete('/api/levels/:id', async (req, res) => {
  try {
    const numRemoved = await db.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) {
      return res.status(404).json({ error: '关卡不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('删除关卡失败:', err);
    res.status(500).json({ error: '删除关卡失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
