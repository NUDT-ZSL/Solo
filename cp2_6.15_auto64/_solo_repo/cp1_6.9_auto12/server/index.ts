import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

export interface Capsule {
  id: string;
  title: string;
  content: string;
  image?: string;
  audio?: string;
  unlockTime: number;
  createdAt: number;
  isUnlocked: boolean;
  shareUrl: string;
}

const capsules = new Map<string, Capsule>();

app.post('/api/capsules', (req, res) => {
  try {
    const { title, content, image, audio, unlockTime } = req.body;

    if (!title || !content || !unlockTime) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    if (title.length > 20) {
      return res.status(400).json({ error: '标题不能超过20字' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '正文不能超过500字' });
    }

    const id = uuidv4();
    const now = Date.now();
    const shareUrl = `${req.protocol}://${req.get('host')}/capsule/${id}`;

    const capsule: Capsule = {
      id,
      title,
      content,
      image: image || undefined,
      audio: audio || undefined,
      unlockTime: Number(unlockTime),
      createdAt: now,
      isUnlocked: false,
      shareUrl,
    };

    capsules.set(id, capsule);

    return res.status(201).json({
      id,
      shareUrl,
      unlockTime: capsule.unlockTime,
    });
  } catch (error) {
    console.error('创建胶囊失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/capsules', (req, res) => {
  try {
    const { status, search, page = '1', pageSize = '10' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const pageSizeNum = Math.max(1, Math.min(50, parseInt(pageSize as string)));

    let list = Array.from(capsules.values());

    list.sort((a, b) => b.createdAt - a.createdAt);

    if (status === 'locked') {
      list = list.filter(c => !isCapsuleUnlocked(c));
    } else if (status === 'unlocked') {
      list = list.filter(c => isCapsuleUnlocked(c));
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(searchLower));
    }

    const total = list.length;
    const totalPages = Math.ceil(total / pageSizeNum);
    const start = (pageNum - 1) * pageSizeNum;
    const pagedList = list.slice(start, start + pageSizeNum);

    return res.json({
      capsules: pagedList.map(c => ({
        id: c.id,
        title: c.title,
        unlockTime: c.unlockTime,
        createdAt: c.createdAt,
        isUnlocked: isCapsuleUnlocked(c),
        shareUrl: c.shareUrl,
      })),
      total,
      totalPages,
      currentPage: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (error) {
    console.error('获取胶囊列表失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

function isCapsuleUnlocked(capsule: Capsule): boolean {
  return Date.now() >= capsule.unlockTime;
}

app.get('/api/capsules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const capsule = capsules.get(id);

    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    const unlocked = isCapsuleUnlocked(capsule);

    return res.json({
      id: capsule.id,
      title: capsule.title,
      content: unlocked ? capsule.content : undefined,
      image: unlocked ? capsule.image : undefined,
      audio: unlocked ? capsule.audio : undefined,
      unlockTime: capsule.unlockTime,
      createdAt: capsule.createdAt,
      isUnlocked: unlocked,
      shareUrl: capsule.shareUrl,
    });
  } catch (error) {
    console.error('获取胶囊详情失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/capsules/:id/unlock', (req, res) => {
  try {
    const { id } = req.params;
    const capsule = capsules.get(id);

    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    const unlocked = isCapsuleUnlocked(capsule);

    if (!unlocked) {
      return res.status(403).json({
        error: '胶囊尚未到达解锁时间',
        unlockTime: capsule.unlockTime,
      });
    }

    capsule.isUnlocked = true;

    return res.json({
      success: true,
      id: capsule.id,
      title: capsule.title,
      content: capsule.content,
      image: capsule.image,
      audio: capsule.audio,
      unlockTime: capsule.unlockTime,
      createdAt: capsule.createdAt,
      shareUrl: capsule.shareUrl,
    });
  } catch (error) {
    console.error('解锁胶囊失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`时间胶囊服务器已启动: http://localhost:${PORT}`);
});
