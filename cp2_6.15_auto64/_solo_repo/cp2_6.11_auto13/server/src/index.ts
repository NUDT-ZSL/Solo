import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Capsule {
  id: string;
  title: string;
  content: string;
  images: string[];
  musicStyle: string;
  unlockDate: string;
  createdAt: string;
  isUnlocked: boolean;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let capsules: Capsule[] = [];

app.get('/api/capsules', (req, res) => {
  const now = new Date();
  capsules = capsules.map((c) => ({
    ...c,
    isUnlocked: new Date(c.unlockDate) <= now,
  }));
  res.json(capsules);
});

app.get('/api/capsules/:id', (req, res) => {
  const capsule = capsules.find((c) => c.id === req.params.id);
  if (!capsule) {
    return res.status(404).json({ error: '胶囊不存在' });
  }
  const now = new Date();
  const updatedCapsule = {
    ...capsule,
    isUnlocked: new Date(capsule.unlockDate) <= now,
  };
  res.json(updatedCapsule);
});

app.post('/api/capsules', (req, res) => {
  const { title, content, images, musicStyle, unlockDate } = req.body;

  if (!title || !content || !musicStyle || !unlockDate) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const now = new Date();
  const unlock = new Date(unlockDate);
  const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  if (unlock < minDate || unlock > maxDate) {
    return res.status(400).json({ error: '解锁日期必须在1天到10年之间' });
  }

  if (images && images.length > 3) {
    return res.status(400).json({ error: '最多上传3张图片' });
  }

  const newCapsule: Capsule = {
    id: uuidv4(),
    title,
    content,
    images: images || [],
    musicStyle,
    unlockDate: unlock.toISOString(),
    createdAt: now.toISOString(),
    isUnlocked: false,
  };

  capsules.push(newCapsule);
  res.status(201).json(newCapsule);
});

app.delete('/api/capsules/:id', (req, res) => {
  const index = capsules.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '胶囊不存在' });
  }

  capsules.splice(index, 1);
  res.json({ message: '胶囊已删除' });
});

app.listen(PORT, () => {
  console.log(`时光信使服务器运行在 http://localhost:${PORT}`);
});
