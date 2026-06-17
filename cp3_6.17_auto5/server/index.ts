import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readData, writeData } from './db';
import type { Course, KnowledgePoint, Relation, User, RecommendPathRequest } from './types';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/courses', (_req: Request, res: Response) => {
  const courses = readData('courses');
  res.json(courses);
});

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const courses = readData('courses');
  const course = courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: '课程不存在' });
  res.json(course);
});

app.post('/api/courses', (req: Request, res: Response) => {
  const { title, description, coverUrl } = req.body;
  if (!title || !description) return res.status(400).json({ error: '标题和简介不能为空' });
  const courses = readData('courses');
  const newCourse: Course = {
    id: uuidv4(),
    title,
    description,
    coverUrl: coverUrl || '',
    createdAt: new Date().toISOString(),
  };
  courses.push(newCourse);
  writeData('courses', courses);
  res.status(201).json(newCourse);
});

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const courses = readData('courses');
  const idx = courses.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '课程不存在' });
  courses[idx] = { ...courses[idx], ...req.body, id: courses[idx].id };
  writeData('courses', courses);
  res.json(courses[idx]);
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  let courses = readData('courses');
  courses = courses.filter((c) => c.id !== req.params.id);
  writeData('courses', courses);
  res.json({ success: true });
});

app.get('/api/courses/:courseId/knowledge-points', (req: Request, res: Response) => {
  const { courseId } = req.params;
  const kps = readData('knowledgePoints').filter((k) => k.courseId === courseId);
  res.json(kps);
});

app.post('/api/courses/:courseId/knowledge-points', (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { title, description, difficulty, tags, x, y } = req.body;
  if (!title || !description || !difficulty) {
    return res.status(400).json({ error: '标题、详情、难度不能为空' });
  }
  const tagList = Array.isArray(tags) ? tags.slice(0, 5) : [];
  const kps = readData('knowledgePoints');
  const newKp: KnowledgePoint = {
    id: uuidv4(),
    courseId,
    title,
    description,
    difficulty,
    tags: tagList,
    x: x || 200,
    y: y || 200,
  };
  kps.push(newKp);
  writeData('knowledgePoints', kps);
  res.status(201).json(newKp);
});

app.put('/api/knowledge-points/:id', (req: Request, res: Response) => {
  const kps = readData('knowledgePoints');
  const idx = kps.findIndex((k) => k.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '知识点不存在' });
  const update = { ...req.body };
  if (update.tags && Array.isArray(update.tags)) {
    update.tags = update.tags.slice(0, 5);
  }
  kps[idx] = { ...kps[idx], ...update, id: kps[idx].id };
  writeData('knowledgePoints', kps);
  res.json(kps[idx]);
});

app.delete('/api/knowledge-points/:id', (req: Request, res: Response) => {
  let kps = readData('knowledgePoints');
  let rels = readData('relations');
  const kpId = req.params.id;
  kps = kps.filter((k) => k.id !== kpId);
  rels = rels.filter((r) => r.sourceId !== kpId && r.targetId !== kpId);
  writeData('knowledgePoints', kps);
  writeData('relations', rels);
  res.json({ success: true });
});

app.get('/api/courses/:courseId/relations', (req: Request, res: Response) => {
  const { courseId } = req.params;
  const rels = readData('relations').filter((r) => r.courseId === courseId);
  res.json(rels);
});

app.post('/api/courses/:courseId/relations', (req: Request, res: Response) => {
  const { courseId } = req.params;
  const { sourceId, targetId, curvature } = req.body;
  if (!sourceId || !targetId || sourceId === targetId) {
    return res.status(400).json({ error: '无效的关系参数' });
  }
  const rels = readData('relations');
  if (rels.some((r) => r.courseId === courseId && r.sourceId === sourceId && r.targetId === targetId)) {
    return res.status(409).json({ error: '关系已存在' });
  }
  const newRel: Relation = {
    id: uuidv4(),
    courseId,
    sourceId,
    targetId,
    curvature: curvature || 0,
  };
  rels.push(newRel);
  writeData('relations', rels);
  res.status(201).json(newRel);
});

app.put('/api/relations/:id', (req: Request, res: Response) => {
  const rels = readData('relations');
  const idx = rels.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '关系不存在' });
  rels[idx] = { ...rels[idx], ...req.body, id: rels[idx].id };
  writeData('relations', rels);
  res.json(rels[idx]);
});

app.delete('/api/relations/:id', (req: Request, res: Response) => {
  let rels = readData('relations');
  rels = rels.filter((r) => r.id !== req.params.id);
  writeData('relations', rels);
  res.json({ success: true });
});

app.get('/api/users', (_req: Request, res: Response) => {
  const users = readData('users');
  res.json(users);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const users = readData('users');
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json(user);
});

app.post('/api/users', (req: Request, res: Response) => {
  const { name, role, email, avatar } = req.body;
  if (!name || !role) return res.status(400).json({ error: '名称和角色不能为空' });
  const users = readData('users');
  const newUser: User = {
    id: uuidv4(),
    name,
    role,
    email: email || '',
    avatar: avatar || '',
  };
  users.push(newUser);
  writeData('users', users);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const users = readData('users');
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  users[idx] = { ...users[idx], ...req.body, id: users[idx].id };
  writeData('users', users);
  res.json(users[idx]);
});

app.post('/api/users/:userId/assessment', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { courseId, scores } = req.body;
  const users = readData('users');
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  if (!users[idx].assessments) users[idx].assessments = {};
  users[idx].assessments = {
    ...users[idx].assessments,
    [courseId]: {
      ...(users[idx].assessments[courseId] || {}),
      ...scores,
    },
  };
  writeData('users', users);
  res.json(users[idx]);
});

app.post('/api/users/:userId/reviewed', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { courseId, kpId } = req.body;
  const users = readData('users');
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return res.status(404).json({ error: '用户不存在' });
  if (!users[idx].reviewedNodes) users[idx].reviewedNodes = {};
  const courseReviewed = users[idx].reviewedNodes[courseId] || [];
  if (!courseReviewed.includes(kpId)) {
    courseReviewed.push(kpId);
  }
  users[idx].reviewedNodes[courseId] = courseReviewed;
  writeData('users', users);
  res.json({ reviewedNodes: courseReviewed });
});

function computeRecommendPath(userId: string, courseId: string): string[] {
  const users = readData('users');
  const user = users.find((u) => u.id === userId);
  if (!user) return [];
  const kps = readData('knowledgePoints').filter((k) => k.courseId === courseId);
  const rels = readData('relations').filter((r) => r.courseId === courseId);
  const scores = (user.assessments && user.assessments[courseId]) || {};

  const adjList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  kps.forEach((kp) => {
    adjList[kp.id] = [];
    inDegree[kp.id] = 0;
  });
  rels.forEach((r) => {
    if (adjList[r.sourceId]) {
      adjList[r.sourceId].push(r.targetId);
      inDegree[r.targetId] = (inDegree[r.targetId] || 0) + 1;
    }
  });

  const topoOrder: string[] = [];
  const visited = new Set<string>();
  const tempMark = new Set<string>();
  function dfs(node: string): boolean {
    if (tempMark.has(node)) return false;
    if (visited.has(node)) return true;
    tempMark.add(node);
    for (const next of adjList[node] || []) {
      if (!dfs(next)) return false;
    }
    tempMark.delete(node);
    visited.add(node);
    topoOrder.unshift(node);
    return true;
  }
  const nodeIds = kps.map((k) => k.id);
  for (const id of nodeIds) {
    if (!visited.has(id)) {
      if (!dfs(id)) break;
    }
  }

  const weakIds = kps
    .filter((kp) => {
      const s = scores[kp.id];
      return s !== undefined && s < 60;
    })
    .sort((a, b) => (scores[a.id] || 0) - (scores[b.id] || 0))
    .map((k) => k.id);

  if (weakIds.length === 0) return topoOrder.slice(0, 5);

  const startId = weakIds[0];
  const startIdx = topoOrder.indexOf(startId);
  const ordered = [...topoOrder];

  const idSet = new Set<string>();
  const result: string[] = [];
  for (let i = Math.max(0, startIdx); i < ordered.length && result.length < 5; i++) {
    if (!idSet.has(ordered[i])) {
      result.push(ordered[i]);
      idSet.add(ordered[i]);
    }
  }
  let j = Math.max(0, startIdx) - 1;
  while (result.length < 5 && j >= 0) {
    if (!idSet.has(ordered[j])) {
      result.unshift(ordered[j]);
      idSet.add(ordered[j]);
    }
    j--;
  }
  const weakSet = new Set(weakIds);
  let weakFirst = [...result].sort((a, b) => {
    const aWeak = weakSet.has(a) ? 0 : 1;
    const bWeak = weakSet.has(b) ? 0 : 1;
    if (aWeak !== bWeak) return aWeak - bWeak;
    return (scores[a] || 100) - (scores[b] || 100);
  });
  const finalPath: string[] = [];
  const used = new Set<string>();
  for (const id of weakFirst) {
    if (!used.has(id)) {
      finalPath.push(id);
      used.add(id);
    }
  }
  return finalPath.slice(0, 5);
}

app.post('/api/recommend-path', (req: Request<{}, {}, RecommendPathRequest>, res: Response) => {
  const { userId, courseId } = req.body;
  if (!userId || !courseId) return res.status(400).json({ error: '参数缺失' });
  const path = computeRecommendPath(userId, courseId);
  res.json({ path });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
