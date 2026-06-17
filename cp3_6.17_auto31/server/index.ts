import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Course, KnowledgePoint, Relation, User, AssessmentScore, ReviewedNode } from './types';

const app = express();
const PORT = 4000;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

const readJSON = <T>(filename: string): T[] => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content || '[]');
};

const writeJSON = <T>(filename: string, data: T[]): void => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/courses', (_req: Request, res: Response<Course[]>) => {
  const courses = readJSON<Course>('courses.json');
  res.json(courses);
});

app.post('/api/courses', (req: Request<unknown, unknown, Omit<Course, 'id'>>, res: Response<Course>) => {
  const courses = readJSON<Course>('courses.json');
  const newCourse: Course = { id: uuidv4(), ...req.body };
  courses.push(newCourse);
  writeJSON('courses.json', courses);
  res.json(newCourse);
});

app.put('/api/courses/:id', (req: Request<{ id: string }, unknown, Partial<Course>>, res: Response<Course | { error: string }>) => {
  const courses = readJSON<Course>('courses.json');
  const index = courses.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }
  courses[index] = { ...courses[index], ...req.body };
  writeJSON('courses.json', courses);
  res.json(courses[index]);
});

app.delete('/api/courses/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean } | { error: string }>) => {
  const courses = readJSON<Course>('courses.json');
  const filtered = courses.filter(c => c.id !== req.params.id);
  if (filtered.length === courses.length) {
    return res.status(404).json({ error: 'Course not found' });
  }
  writeJSON('courses.json', filtered);

  const kps = readJSON<KnowledgePoint>('knowledgePoints.json').filter(kp => kp.courseId !== req.params.id);
  writeJSON('knowledgePoints.json', kps);

  const rels = readJSON<Relation>('relations.json').filter(r => r.courseId !== req.params.id);
  writeJSON('relations.json', rels);

  res.json({ success: true });
});

app.get('/api/knowledge-points', (req: Request<unknown, unknown, unknown, { courseId?: string }>, res: Response<KnowledgePoint[]>) => {
  let kps = readJSON<KnowledgePoint>('knowledgePoints.json');
  if (req.query.courseId) {
    kps = kps.filter(kp => kp.courseId === req.query.courseId);
  }
  res.json(kps);
});

app.post('/api/knowledge-points', (req: Request<unknown, unknown, Omit<KnowledgePoint, 'id'>>, res: Response<KnowledgePoint>) => {
  const kps = readJSON<KnowledgePoint>('knowledgePoints.json');
  const newKp: KnowledgePoint = { id: uuidv4(), ...req.body };
  kps.push(newKp);
  writeJSON('knowledgePoints.json', kps);
  res.json(newKp);
});

app.put('/api/knowledge-points/:id', (req: Request<{ id: string }, unknown, Partial<KnowledgePoint>>, res: Response<KnowledgePoint | { error: string }>) => {
  const kps = readJSON<KnowledgePoint>('knowledgePoints.json');
  const index = kps.findIndex(kp => kp.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Knowledge point not found' });
  }
  kps[index] = { ...kps[index], ...req.body };
  writeJSON('knowledgePoints.json', kps);
  res.json(kps[index]);
});

app.delete('/api/knowledge-points/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean } | { error: string }>) => {
  const kps = readJSON<KnowledgePoint>('knowledgePoints.json');
  const filtered = kps.filter(kp => kp.id !== req.params.id);
  if (filtered.length === kps.length) {
    return res.status(404).json({ error: 'Knowledge point not found' });
  }
  writeJSON('knowledgePoints.json', filtered);

  const rels = readJSON<Relation>('relations.json').filter(r => r.sourceId !== req.params.id && r.targetId !== req.params.id);
  writeJSON('relations.json', rels);

  res.json({ success: true });
});

app.get('/api/relations', (req: Request<unknown, unknown, unknown, { courseId?: string }>, res: Response<Relation[]>) => {
  let rels = readJSON<Relation>('relations.json');
  if (req.query.courseId) {
    rels = rels.filter(r => r.courseId === req.query.courseId);
  }
  res.json(rels);
});

app.post('/api/relations', (req: Request<unknown, unknown, Omit<Relation, 'id'>>, res: Response<Relation>) => {
  const rels = readJSON<Relation>('relations.json');
  const newRel: Relation = { id: uuidv4(), ...req.body };
  rels.push(newRel);
  writeJSON('relations.json', rels);
  res.json(newRel);
});

app.put('/api/relations/:id', (req: Request<{ id: string }, unknown, Partial<Relation>>, res: Response<Relation | { error: string }>) => {
  const rels = readJSON<Relation>('relations.json');
  const index = rels.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Relation not found' });
  }
  rels[index] = { ...rels[index], ...req.body };
  writeJSON('relations.json', rels);
  res.json(rels[index]);
});

app.delete('/api/relations/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean } | { error: string }>) => {
  const rels = readJSON<Relation>('relations.json');
  const filtered = rels.filter(r => r.id !== req.params.id);
  if (filtered.length === rels.length) {
    return res.status(404).json({ error: 'Relation not found' });
  }
  writeJSON('relations.json', filtered);
  res.json({ success: true });
});

app.get('/api/users', (_req: Request, res: Response<User[]>) => {
  const users = readJSON<User>('users.json');
  res.json(users);
});

app.post('/api/users', (req: Request<unknown, unknown, Omit<User, 'id'>>, res: Response<User>) => {
  const users = readJSON<User>('users.json');
  const newUser: User = { id: uuidv4(), ...req.body };
  users.push(newUser);
  writeJSON('users.json', users);
  res.json(newUser);
});

app.get('/api/assessment-scores', (req: Request<unknown, unknown, unknown, { userId?: string }>, res: Response<AssessmentScore[]>) => {
  let scores = readJSON<AssessmentScore>('assessmentScores.json');
  if (req.query.userId) {
    scores = scores.filter(s => s.userId === req.query.userId);
  }
  res.json(scores);
});

app.post('/api/assessment-scores', (req: Request<unknown, unknown, Omit<AssessmentScore, 'id'>>, res: Response<AssessmentScore>) => {
  const scores = readJSON<AssessmentScore>('assessmentScores.json');
  const existingIndex = scores.findIndex(s => s.userId === req.body.userId && s.knowledgePointId === req.body.knowledgePointId);
  if (existingIndex !== -1) {
    scores[existingIndex] = { ...scores[existingIndex], ...req.body };
    writeJSON('assessmentScores.json', scores);
    return res.json(scores[existingIndex]);
  }
  const newScore: AssessmentScore = { id: uuidv4(), ...req.body };
  scores.push(newScore);
  writeJSON('assessmentScores.json', scores);
  res.json(newScore);
});

app.get('/api/reviewed-nodes', (req: Request<unknown, unknown, unknown, { userId?: string }>, res: Response<ReviewedNode[]>) => {
  let reviewed = readJSON<ReviewedNode>('reviewedNodes.json');
  if (req.query.userId) {
    reviewed = reviewed.filter(r => r.userId === req.query.userId);
  }
  res.json(reviewed);
});

app.post('/api/reviewed-nodes', (req: Request<unknown, unknown, Omit<ReviewedNode, 'id' | 'reviewedAt'>>, res: Response<ReviewedNode>) => {
  const reviewed = readJSON<ReviewedNode>('reviewedNodes.json');
  const existingIndex = reviewed.findIndex(r => r.userId === req.body.userId && r.knowledgePointId === req.body.knowledgePointId);
  if (existingIndex !== -1) {
    reviewed[existingIndex].reviewedAt = new Date().toISOString();
    writeJSON('reviewedNodes.json', reviewed);
    return res.json(reviewed[existingIndex]);
  }
  const newReviewed: ReviewedNode = { id: uuidv4(), reviewedAt: new Date().toISOString(), ...req.body };
  reviewed.push(newReviewed);
  writeJSON('reviewedNodes.json', reviewed);
  res.json(newReviewed);
});

interface RecommendPathQuery {
  userId: string;
  courseId: string;
}

app.get('/api/recommend-path', (req: Request<unknown, unknown, unknown, RecommendPathQuery>, res: Response<string[]>) => {
  const { userId, courseId } = req.query;
  if (!userId || !courseId) {
    return res.status(400).json([] as unknown as string[]);
  }

  const kps = readJSON<KnowledgePoint>('knowledgePoints.json').filter(kp => kp.courseId === courseId);
  const rels = readJSON<Relation>('relations.json').filter(r => r.courseId === courseId);
  const scores = readJSON<AssessmentScore>('assessmentScores.json').filter(s => s.userId === userId);
  const reviewed = readJSON<ReviewedNode>('reviewedNodes.json').filter(r => r.userId === userId);
  const reviewedIds = new Set(reviewed.map(r => r.knowledgePointId));

  const scoreMap = new Map<string, number>();
  scores.forEach(s => scoreMap.set(s.knowledgePointId, s.score));

  const weakPoints = kps.filter(kp => {
    const score = scoreMap.get(kp.id) ?? 0;
    return score < 60 && !reviewedIds.has(kp.id);
  });

  if (weakPoints.length === 0) {
    return res.json([]);
  }

  const adjList = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  kps.forEach(kp => {
    adjList.set(kp.id, []);
    inDegree.set(kp.id, 0);
  });
  rels.forEach(r => {
    adjList.get(r.sourceId)?.push(r.targetId);
    inDegree.set(r.targetId, (inDegree.get(r.targetId) ?? 0) + 1);
  });

  const reverseAdj = new Map<string, string[]>();
  kps.forEach(kp => reverseAdj.set(kp.id, []));
  rels.forEach(r => reverseAdj.get(r.targetId)?.push(r.sourceId));

  const sorted = weakPoints.slice().sort((a, b) => {
    const sa = scoreMap.get(a.id) ?? 0;
    const sb = scoreMap.get(b.id) ?? 0;
    return sa - sb;
  });

  const visited = new Set<string>();
  const result: string[] = [];
  const MAX_NODES = 5;

  function collectPrerequisites(kpId: string): string[] {
    const prereqs: string[] = [];
    const stack = [...(reverseAdj.get(kpId) ?? [])];
    const localVisited = new Set<string>();
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (localVisited.has(curr) || visited.has(curr)) continue;
      localVisited.add(curr);
      prereqs.push(curr);
      for (const p of reverseAdj.get(curr) ?? []) {
        if (!localVisited.has(p) && !visited.has(p)) {
          stack.push(p);
        }
      }
    }
    return prereqs.reverse();
  }

  for (const wp of sorted) {
    if (visited.has(wp.id)) continue;
    const prereqs = collectPrerequisites(wp.id);
    const prereqsFiltered = prereqs.filter(p => {
      if (visited.has(p)) return false;
      const s = scoreMap.get(p) ?? 100;
      return s < 60 || !reviewedIds.has(p);
    });
    for (const p of prereqsFiltered) {
      if (result.length >= MAX_NODES) break;
      if (!visited.has(p)) {
        result.push(p);
        visited.add(p);
      }
    }
    if (result.length >= MAX_NODES) break;
    if (!visited.has(wp.id)) {
      result.push(wp.id);
      visited.add(wp.id);
    }
    if (result.length >= MAX_NODES) break;
  }

  const kpIdMap = new Map(kps.map(kp => [kp.id, kp]));
  const inTopo = new Set<string>();
  const ordered: string[] = [];
  const tempInDeg = new Map(inDegree);
  const queue: string[] = [];
  const resultSet = new Set(result);
  for (const id of result) {
    if ((tempInDeg.get(id) ?? 0) === 0) queue.push(id);
  }
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (inTopo.has(curr) || !resultSet.has(curr)) continue;
    ordered.push(curr);
    inTopo.add(curr);
    for (const neighbor of adjList.get(curr) ?? []) {
      if (!resultSet.has(neighbor)) continue;
      tempInDeg.set(neighbor, (tempInDeg.get(neighbor) ?? 1) - 1);
      if (tempInDeg.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }

  for (const id of result) {
    if (!inTopo.has(id)) ordered.push(id);
  }

  const finalResult = ordered.slice(0, MAX_NODES).filter(id => kpIdMap.has(id));
  res.json(finalResult);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
