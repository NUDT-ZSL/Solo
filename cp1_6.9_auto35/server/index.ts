import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Spirit, SpiritCreatePayload } from '../src/types';

const app = express();
const PORT = 3001;

app.use(express.json());

const spiritsStore = new Map<string, Spirit>();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.post('/api/spirits', (req: Request<{}, {}, SpiritCreatePayload>, res: Response) => {
  try {
    const { name, fusedColor, expression, blockOrder } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: '精灵名称是必填项' });
    }

    if (name.length > 10) {
      return res.status(400).json({ error: '精灵名称不能超过10个字符' });
    }

    if (!fusedColor || typeof fusedColor !== 'string') {
      return res.status(400).json({ error: '融合颜色是必填项' });
    }

    if (!expression || typeof expression !== 'object') {
      return res.status(400).json({ error: '表情特征是必填项' });
    }

    if (!blockOrder || !Array.isArray(blockOrder) || blockOrder.length === 0) {
      return res.status(400).json({ error: '色块叠放顺序是必填项' });
    }

    const id = uuidv4();
    const spirit: Spirit = {
      id,
      name,
      fusedColor,
      expression,
      blockOrder,
      createdAt: Date.now(),
    };

    spiritsStore.set(id, spirit);
    res.status(201).json({ id, ...spirit });
  } catch (error) {
    console.error('创建精灵失败:', error);
    res.status(500).json({ error: '服务器内部错误，创建精灵失败' });
  }
});

app.get('/api/spirits', (_req: Request, res: Response) => {
  try {
    const spirits = Array.from(spiritsStore.values()).sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json(spirits);
  } catch (error) {
    console.error('获取精灵列表失败:', error);
    res.status(500).json({ error: '服务器内部错误，获取精灵列表失败' });
  }
});

app.delete('/api/spirits/:id', (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;

    if (!spiritsStore.has(id)) {
      return res.status(404).json({ error: '未找到指定的精灵' });
    }

    spiritsStore.delete(id);
    res.status(200).json({ message: '精灵删除成功', deletedId: id });
  } catch (error) {
    console.error('删除精灵失败:', error);
    res.status(500).json({ error: '服务器内部错误，删除精灵失败' });
  }
});

app.listen(PORT, () => {
  console.log(`🧙‍♂️ 情绪精灵锻造工坊后端服务已启动: http://localhost:${PORT}`);
});
