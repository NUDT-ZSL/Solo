import express, { Request, Response } from 'express';
import cors from 'cors';
import cuid from 'cuid';

export interface Idea {
  id: string;
  memberName: string;
  content: string;
  type: 'progress' | 'blocker' | 'plan';
  timestamp: number;
  voiceUrl?: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

let ideas: Idea[] = [];

app.get('/api/ideas', (req: Request, res: Response) => {
  const { date } = req.query;
  let filteredIdeas = ideas;

  if (date && typeof date === 'string') {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    filteredIdeas = ideas.filter((idea) => {
      const ideaDate = new Date(idea.timestamp);
      return ideaDate >= targetDate && ideaDate < nextDate;
    });
  }

  filteredIdeas.sort((a, b) => b.timestamp - a.timestamp);
  res.json(filteredIdeas);
});

app.post('/api/ideas', (req: Request, res: Response) => {
  const { memberName, content, type, voiceBase64 } = req.body;

  if (!memberName || !content || !type) {
    return res.status(400).json({ error: '缺少必填字段: memberName, content, type' });
  }

  if (type !== 'progress' && type !== 'blocker' && type !== 'plan') {
    return res.status(400).json({ error: 'type 必须是 progress, blocker 或 plan' });
  }

  const newIdea: Idea = {
    id: cuid(),
    memberName: String(memberName),
    content: String(content),
    type: type as 'progress' | 'blocker' | 'plan',
    timestamp: Date.now(),
  };

  if (voiceBase64 && typeof voiceBase64 === 'string') {
    newIdea.voiceUrl = voiceBase64;
  }

  ideas.push(newIdea);
  res.status(201).json(newIdea);
});

app.get('/api/members', (_req: Request, res: Response) => {
  const memberSet = new Set<string>();
  ideas.forEach((idea) => memberSet.add(idea.memberName));
  res.json(Array.from(memberSet));
});

app.listen(PORT, () => {
  console.log(`声流站会后端服务已启动: http://localhost:${PORT}`);
});
