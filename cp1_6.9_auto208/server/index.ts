import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { analyzeEmotion, mapEmotionToPalette, generateCurves, generateShortId } from './semantic.js';
import { artStorage } from './storage.js';
import type { ArtSaveRequest } from '../shared/types.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/generate', (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: '请输入心情短语' });
      return;
    }

    if (text.length > 500) {
      res.status(400).json({ error: '输入内容过长（最多500字）' });
      return;
    }

    const emotion = analyzeEmotion(text.trim());
    const palette = mapEmotionToPalette(emotion);
    const curves = generateCurves(emotion, 800, 600);
    const id = generateShortId(6);

    res.json({
      id,
      emotion,
      palette,
      curves,
      curveCount: curves.length,
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: '生成画作时发生错误' });
  }
});

app.post('/api/save', (req: Request, res: Response) => {
  try {
    const body = req.body as ArtSaveRequest;

    if (!body.text || !body.emotion || !body.palette || !body.curves || !body.thumbnail) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const result = artStorage.save(body);

    res.json({
      id: result.id,
      shortUrl: result.shortUrl,
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: '保存画作时发生错误' });
  }
});

app.get('/api/art/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = artStorage.getById(id);

    if (!record) {
      res.status(404).json({ error: '画作不存在' });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error('Get art error:', error);
    res.status(500).json({ error: '获取画作时发生错误' });
  }
});

app.get('/api/arts', (_req: Request, res: Response) => {
  try {
    const records = artStorage.getRecent(10);
    res.json(records);
  } catch (error) {
    console.error('Get arts error:', error);
    res.status(500).json({ error: '获取画作列表时发生错误' });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║    语纹织机后端服务已启动                      ║
║    端口: ${PORT}                                ║
║    模式: ${process.env.NODE_ENV || 'development'}                    ║
║    API:  http://localhost:${PORT}/api/health       ║
╚══════════════════════════════════════════════╝
  `);
});

export default app;
