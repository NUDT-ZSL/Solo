import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Project, Comment, FundingRecord } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data.json');

interface DataStore {
  projects: Project[];
  comments: Comment[];
  fundingRecords: FundingRecord[];
}

const readData = (): DataStore => {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
};

const writeData = (data: DataStore) => {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
};

app.get('/api/projects', (req, res) => {
  const data = readData();
  const sorted = [...data.projects].sort((a, b) => {
    const scoreA = a.likes + a.fundedAmount / 10;
    const scoreB = b.likes + b.fundedAmount / 10;
    return scoreB - scoreA;
  });
  res.json(sorted.slice(0, 8));
});

app.get('/api/projects/:id', (req, res) => {
  const data = readData();
  const project = data.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const comments = data.comments.filter((c) => c.projectId === req.params.id);
  const fundingRecords = data.fundingRecords
    .filter((r) => r.projectId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({ project, comments, fundingRecords });
});

app.post('/api/projects', (req, res) => {
  const data = readData();
  const newProject: Project = {
    id: uuidv4(),
    name: req.body.name,
    description: req.body.description,
    developer: req.body.developer || '独立开发者',
    screenshots: req.body.screenshots || [],
    demoLink: req.body.demoLink || '',
    progress: req.body.progress || 0,
    likes: 0,
    fundedAmount: 0,
    fundingGoal: req.body.fundingGoal || 10000,
    createdAt: new Date().toISOString(),
  };
  data.projects.push(newProject);
  writeData(data);
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req, res) => {
  const data = readData();
  const index = data.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  data.projects[index] = { ...data.projects[index], ...req.body };
  writeData(data);
  res.json(data.projects[index]);
});

app.delete('/api/projects/:id', (req, res) => {
  const data = readData();
  const index = data.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  data.projects.splice(index, 1);
  data.comments = data.comments.filter((c) => c.projectId !== req.params.id);
  data.fundingRecords = data.fundingRecords.filter((r) => r.projectId !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/projects/:id/like', (req, res) => {
  const data = readData();
  const project = data.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  project.likes += 1;
  writeData(data);
  res.json({ likes: project.likes });
});

app.post('/api/projects/:id/comments', (req, res) => {
  const data = readData();
  const project = data.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const newComment: Comment = {
    id: uuidv4(),
    projectId: req.params.id,
    nickname: req.body.nickname || '匿名用户',
    content: req.body.content,
    createdAt: new Date().toISOString(),
  };
  data.comments.push(newComment);
  writeData(data);
  res.status(201).json(newComment);
});

app.post('/api/projects/:id/fund', (req, res) => {
  const data = readData();
  const project = data.projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: '项目不存在' });
    return;
  }
  const amount = Number(req.body.amount) || 0;
  if (amount <= 0) {
    res.status(400).json({ error: '金额必须大于0' });
    return;
  }
  project.fundedAmount += amount;

  const newRecord: FundingRecord = {
    id: uuidv4(),
    projectId: req.params.id,
    nickname: req.body.nickname || '',
    amount,
    createdAt: new Date().toISOString(),
  };
  data.fundingRecords.push(newRecord);
  writeData(data);

  const fundingRecords = data.fundingRecords
    .filter((r) => r.projectId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({ fundedAmount: project.fundedAmount, fundingRecords });
});

app.post('/api/developer/login', (req, res) => {
  const { password } = req.body;
  if (password === 'developer123') {
    res.json({ success: true, token: 'dev-token-123' });
  } else {
    res.status(401).json({ error: '密码错误' });
  }
});

app.get('/api/developer/projects', (req, res) => {
  const data = readData();
  res.json(data.projects);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
