import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const STOP_WORDS = [
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人',
  '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '他',
  '她', '它', '们', '但', '还', '而', '与', '及', '或', '以',
  '为', '对', '从', '把', '被', '让', '使', '将', '给', '向',
  '比', '如', '啊', '呢', '吧', '吗', '哦', '嗯', '哈', '呀'
];

interface KeywordData {
  keyword: string;
  weight: number;
  trend: number[];
}

interface HistoryRecord {
  id: string;
  text: string;
  timestamp: string;
  keywords: KeywordData[];
}

let history: HistoryRecord[] = [];

function extractKeywords(text: string): KeywordData[] {
  const words: string[] = [];
  const chineseRegex = /[\u4e00-\u9fa5]{2,4}/g;
  const chineseMatches = text.match(chineseRegex);
  if (chineseMatches) {
    words.push(...chineseMatches);
  }
  const englishRegex = /[a-zA-Z]{3,}/g;
  const englishMatches = text.match(englishRegex);
  if (englishMatches) {
    words.push(...englishMatches.map(w => w.toLowerCase()));
  }

  const frequencyMap: Record<string, number> = {};
  for (const word of words) {
    if (STOP_WORDS.includes(word)) continue;
    frequencyMap[word] = (frequencyMap[word] || 0) + 1;
  }

  const sorted = Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const maxFreq = sorted.length > 0 ? sorted[0][1] : 1;

  return sorted.map(([keyword, freq]) => {
    const weight = Math.round((freq / maxFreq) * 100);
    const trend: number[] = [];
    for (let i = 0; i < 7; i++) {
      trend.push(Math.floor(Math.random() * 91) + 10);
    }
    return { keyword, weight, trend };
  });
}

app.post('/api/analyze', (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: '文本长度不能少于20字' });
  }

  const keywords = extractKeywords(text);

  if (keywords.length === 0) {
    return res.status(400).json({ error: '未能提取到有效关键词' });
  }

  const record: HistoryRecord = {
    id: uuidv4(),
    text: text.trim(),
    timestamp: new Date().toISOString(),
    keywords,
  };

  history.unshift(record);
  if (history.length > 50) {
    history = history.slice(0, 50);
  }

  setTimeout(() => {
    res.json(record);
  }, 500 + Math.random() * 1500);
});

app.get('/api/history', (_req, res) => {
  res.json(history);
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const idx = history.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '记录不存在' });
  }
  history.splice(idx, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
