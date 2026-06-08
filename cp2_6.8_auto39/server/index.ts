import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Capsule {
  id: string;
  content: string;
  createdAt: number;
  releaseAt: number;
  isOpened: boolean;
  hasReply: boolean;
  reply?: string;
  replyAt?: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const capsules: Capsule[] = [];

const encodeContent = (text: string): string => {
  return Buffer.from(text, 'utf-8').toString('base64');
};

const decodeContent = (encoded: string): string => {
  return Buffer.from(encoded, 'base64').toString('utf-8');
};

app.post('/api/capsules', (req, res) => {
  try {
    const { content, releaseMonths } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: '内容不能为空' });
    }

    if (![1, 2, 3].includes(releaseMonths)) {
      return res.status(400).json({ error: '释放日期无效' });
    }

    const now = Date.now();
    const releaseAt = now + releaseMonths * 30 * 24 * 60 * 60 * 1000;

    const capsule: Capsule = {
      id: uuidv4(),
      content: encodeContent(content),
      createdAt: now,
      releaseAt,
      isOpened: false,
      hasReply: false,
    };

    capsules.push(capsule);

    return res.status(201).json({
      id: capsule.id,
      createdAt: capsule.createdAt,
      releaseAt: capsule.releaseAt,
    });
  } catch {
    return res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/capsules/random', (_req, res) => {
  try {
    const now = Date.now();
    const availableCapsules = capsules.filter(
      (c) => !c.isOpened && c.releaseAt <= now
    );

    if (availableCapsules.length === 0) {
      return res.status(404).json({ error: '海面空空' });
    }

    const randomIndex = Math.floor(Math.random() * availableCapsules.length);
    const capsule = availableCapsules[randomIndex];

    capsule.isOpened = true;

    return res.json({
      id: capsule.id,
      content: decodeContent(capsule.content),
      createdAt: capsule.createdAt,
      releaseAt: capsule.releaseAt,
    });
  } catch {
    return res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/capsules/:id/reply', (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || typeof reply !== 'string' || reply.length > 100) {
      return res.status(400).json({ error: '回复内容无效（最多100字）' });
    }

    const capsule = capsules.find((c) => c.id === id);

    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    capsule.hasReply = true;
    capsule.reply = encodeContent(reply);
    capsule.replyAt = Date.now();

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/capsules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const capsule = capsules.find((c) => c.id === id);

    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    const result: {
      id: string;
      createdAt: number;
      releaseAt: number;
      isOpened: boolean;
      hasReply: boolean;
      reply?: string;
      replyAt?: number;
    } = {
      id: capsule.id,
      createdAt: capsule.createdAt,
      releaseAt: capsule.releaseAt,
      isOpened: capsule.isOpened,
      hasReply: capsule.hasReply,
    };

    if (capsule.hasReply && capsule.reply) {
      result.reply = decodeContent(capsule.reply);
      result.replyAt = capsule.replyAt;
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`漂流瓶服务已启动: http://localhost:${PORT}`);
});
