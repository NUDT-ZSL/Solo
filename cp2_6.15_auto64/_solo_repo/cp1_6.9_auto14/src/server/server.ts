import express, { Request, Response } from 'express';
import { analyzeEmotion } from './emotionAnalyzer';
import { DiaryEntry, DiaryRequest } from '../shared/types';

const app = express();
const PORT = 3000;

app.use(express.json());

const diaries: DiaryEntry[] = [
  {
    id: '1',
    title: '春日漫步',
    content: '今天的阳光特别温暖，走在公园的小路上，看着樱花飘落，心里充满了幸福和喜悦。鸟儿在枝头欢快地歌唱，微风拂过脸颊，带着淡淡的花香。这样美好的日子，让人感恩生活的馈赠，希望每一天都能如此开心满足。',
    tags: ['快乐', '平静'],
    date: '2026-06-08',
    tendency: 'positive',
    score: 12,
    keywords: ['幸福', '喜悦', '开心', '美好', '满足'],
    favorite: true,
  },
  {
    id: '2',
    title: '雨中随想',
    content: '窗外下着淅淅沥沥的小雨，一杯热茶，一本旧书，时光仿佛慢了下来。听着雨声敲打玻璃，思绪飘得很远。平静的日子也有它独特的韵味，不需要太多波澜，安安静静就好。',
    tags: ['平静', '怀念'],
    date: '2026-06-07',
    tendency: 'neutral',
    score: 2,
    keywords: ['平静', '回忆', '安静', '时光', '过去'],
    favorite: false,
  },
  {
    id: '3',
    title: '离别的日子',
    content: '送别了相处多年的好友，心里空落落的。那些一起欢笑的日子仿佛就在昨天，如今却要各奔东西。虽然难过，但也为彼此的未来祝福。希望下一次重逢，我们都能成为更好的自己。',
    tags: ['忧伤', '怀念'],
    date: '2026-06-06',
    tendency: 'negative',
    score: -6,
    keywords: ['忧伤', '难过', '回忆', '孤独', '祝福'],
    favorite: false,
  },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getCurrentDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

app.post('/api/diary', (req: Request, res: Response) => {
  try {
    const { title, content, tags }: DiaryRequest = req.body;

    if (!title || title.length > 30) {
      return res.status(400).json({ error: '标题长度必须在1-30字之间' });
    }
    if (!content || content.length < 100 || content.length > 500) {
      return res.status(400).json({ error: '正文长度必须在100-500字之间' });
    }
    if (!tags || tags.length < 1 || tags.length > 3) {
      return res.status(400).json({ error: '请选择1-3个情感标签' });
    }

    const result = analyzeEmotion(content, tags);

    const newDiary: DiaryEntry = {
      id: generateId(),
      title,
      content,
      tags,
      date: getCurrentDate(),
      tendency: result.tendency,
      score: result.score,
      keywords: result.keywords,
      favorite: false,
    };

    diaries.unshift(newDiary);

    res.json(result);
  } catch (error) {
    console.error('Error processing diary:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/diaries', (_req: Request, res: Response) => {
  try {
    const sorted = [...diaries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(sorted);
  } catch (error) {
    console.error('Error fetching diaries:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/diary/:id/favorite', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const diary = diaries.find(d => d.id === id);
    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }
    diary.favorite = !diary.favorite;
    res.json({ favorite: diary.favorite });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.listen(PORT, () => {
  console.log(`情绪手账后端服务启动: http://localhost:${PORT}`);
});

export default app;
