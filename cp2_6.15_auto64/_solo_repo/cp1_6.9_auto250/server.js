import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const capsules = [];

const VALID_MOOD_COLORS = [
  'duskOrange', 'starryBlue', 'mistPurple',
  'mintGreen', 'rosePink', 'lemonYellow',
  'deepSea', 'cherryPink', 'sunsetRed',
  'cloudGray', 'forestGreen', 'lavender'
];

function validateCreateCapsule(body) {
  const errors = [];
  const { title, content, imageUrl, moodColor, unlockDate } = body;

  if (!title || typeof title !== 'string' || title.length === 0) {
    errors.push('标题不能为空');
  } else if (title.length > 50) {
    errors.push('标题最多50个字');
  }

  if (!content || typeof content !== 'string' || content.length === 0) {
    errors.push('内容不能为空');
  } else if (content.length > 500) {
    errors.push('内容最多500个字');
  }

  if (imageUrl !== undefined && imageUrl !== null && imageUrl !== '') {
    try {
      new URL(imageUrl);
    } catch {
      errors.push('图片URL格式不正确');
    }
  }

  if (!moodColor || !VALID_MOOD_COLORS.includes(moodColor)) {
    errors.push('心情颜色必须从预设中选择');
  }

  if (!unlockDate) {
    errors.push('解锁日期不能为空');
  } else {
    const unlock = new Date(unlockDate);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const maxDate = new Date(now);
    maxDate.setDate(maxDate.getDate() + 365);

    if (isNaN(unlock.getTime())) {
      errors.push('解锁日期格式不正确');
    } else if (unlock < tomorrow) {
      errors.push('解锁日期必须至少是明天');
    } else if (unlock > maxDate) {
      errors.push('解锁日期最多只能是365天后');
    }
  }

  return errors;
}

app.post('/api/capsules', (req, res) => {
  try {
    const errors = validateCreateCapsule(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { title, content, imageUrl, moodColor, unlockDate } = req.body;
    const newCapsule = {
      id: uuidv4(),
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl || undefined,
      moodColor,
      unlockDate: new Date(unlockDate).toISOString(),
      createdAt: new Date().toISOString(),
      openedAt: undefined,
    };

    capsules.push(newCapsule);
    return res.status(201).json(newCapsule);
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/capsules', (_req, res) => {
  try {
    const sorted = [...capsules].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.json(sorted);
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/capsules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const capsule = capsules.find((c) => c.id === id);
    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }
    return res.json(capsule);
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.put('/api/capsules/:id/open', (req, res) => {
  try {
    const { id } = req.params;
    const capsule = capsules.find((c) => c.id === id);
    if (!capsule) {
      return res.status(404).json({ error: '胶囊不存在' });
    }

    const unlockTime = new Date(capsule.unlockDate).getTime();
    if (Date.now() < unlockTime) {
      return res.status(403).json({ error: '胶囊尚未解锁' });
    }

    if (!capsule.openedAt) {
      capsule.openedAt = new Date().toISOString();
    }

    return res.json(capsule);
  } catch (error) {
    return res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`时光胶囊后端服务运行在 http://localhost:${PORT}`);
});
