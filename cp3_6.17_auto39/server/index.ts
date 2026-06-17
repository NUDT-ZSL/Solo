import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  createdAt: string;
}

interface KnowledgePoint {
  id: string;
  courseId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  x: number;
  y: number;
}

interface Relation {
  id: string;
  courseId: string;
  sourceId: string;
  targetId: string;
  controlX?: number;
  controlY?: number;
}

interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  email: string;
}

interface Assessment {
  id: string;
  userId: string;
  courseId: string;
  scores: { pointId: string; score: number }[];
  createdAt: string;
}

function readJSON<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content || '[]') as T[];
}

function writeJSON<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

// Courses
app.get('/api/courses', (_req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json');
  res.json(courses);
});

app.get('/api/courses/:id', (req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json');
  const course = courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

app.post('/api/courses', (req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json');
  const { title, description, coverUrl } = req.body;
  const newCourse: Course = {
    id: uuidv4(),
    title,
    description,
    coverUrl,
    createdAt: new Date().toISOString()
  };
  courses.push(newCourse);
  writeJSON('courses.json', courses);
  res.status(201).json(newCourse);
});

app.put('/api/courses/:id', (req: Request, res: Response) => {
  const courses = readJSON<Course>('courses.json');
  const idx = courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Course not found' });
  courses[idx] = { ...courses[idx], ...req.body };
  writeJSON('courses.json', courses);
  res.json(courses[idx]);
});

app.delete('/api/courses/:id', (req: Request, res: Response) => {
  let courses = readJSON<Course>('courses.json');
  courses = courses.filter(c => c.id !== req.params.id);
  writeJSON('courses.json', courses);
  
  let points = readJSON<KnowledgePoint>('knowledgePoints.json');
  points = points.filter(p => p.courseId !== req.params.id);
  writeJSON('knowledgePoints.json', points);
  
  let relations = readJSON<Relation>('relations.json');
  relations = relations.filter(r => r.courseId !== req.params.id);
  writeJSON('relations.json', relations);
  
  res.status(204).end();
});

// Knowledge Points
app.get('/api/courses/:courseId/points', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const coursePoints = points.filter(p => p.courseId === req.params.courseId);
  res.json(coursePoints);
});

app.post('/api/courses/:courseId/points', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const { title, description, difficulty, tags, x, y } = req.body;
  const newPoint: KnowledgePoint = {
    id: uuidv4(),
    courseId: req.params.courseId,
    title,
    description,
    difficulty,
    tags: tags || [],
    x: x || 100,
    y: y || 100
  };
  points.push(newPoint);
  writeJSON('knowledgePoints.json', points);
  res.status(201).json(newPoint);
});

app.put('/api/points/:id', (req: Request, res: Response) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const idx = points.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Point not found' });
  points[idx] = { ...points[idx], ...req.body };
  writeJSON('knowledgePoints.json', points);
  res.json(points[idx]);
});

app.delete('/api/points/:id', (req: Request, res: Response) => {
  let points = readJSON<KnowledgePoint>('knowledgePoints.json');
  points = points.filter(p => p.id !== req.params.id);
  writeJSON('knowledgePoints.json', points);
  
  let relations = readJSON<Relation>('relations.json');
  relations = relations.filter(r => r.sourceId !== req.params.id && r.targetId !== req.params.id);
  writeJSON('relations.json', relations);
  
  res.status(204).end();
});

// Relations
app.get('/api/courses/:courseId/relations', (req: Request, res: Response) => {
  const relations = readJSON<Relation>('relations.json');
  const courseRelations = relations.filter(r => r.courseId === req.params.courseId);
  res.json(courseRelations);
});

app.post('/api/courses/:courseId/relations', (req: Request, res: Response) => {
  const relations = readJSON<Relation>('relations.json');
  const { sourceId, targetId, controlX, controlY } = req.body;
  
  const exists = relations.some(
    r => r.courseId === req.params.courseId && r.sourceId === sourceId && r.targetId === targetId
  );
  if (exists) return res.status(409).json({ error: 'Relation already exists' });
  
  const newRelation: Relation = {
    id: uuidv4(),
    courseId: req.params.courseId,
    sourceId,
    targetId,
    controlX,
    controlY
  };
  relations.push(newRelation);
  writeJSON('relations.json', relations);
  res.status(201).json(newRelation);
});

app.put('/api/relations/:id', (req: Request, res: Response) => {
  const relations = readJSON<Relation>('relations.json');
  const idx = relations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Relation not found' });
  relations[idx] = { ...relations[idx], ...req.body };
  writeJSON('relations.json', relations);
  res.json(relations[idx]);
});

app.delete('/api/relations/:id', (req: Request, res: Response) => {
  let relations = readJSON<Relation>('relations.json');
  relations = relations.filter(r => r.id !== req.params.id);
  writeJSON('relations.json', relations);
  res.status(204).end();
});

// Users
app.get('/api/users', (_req: Request, res: Response) => {
  const users = readJSON<User>('users.json');
  res.json(users);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const users = readJSON<User>('users.json');
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.post('/api/users', (req: Request, res: Response) => {
  const users = readJSON<User>('users.json');
  const { name, role, email } = req.body;
  const newUser: User = {
    id: uuidv4(),
    name,
    role,
    email
  };
  users.push(newUser);
  writeJSON('users.json', users);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const users = readJSON<User>('users.json');
  const idx = users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  users[idx] = { ...users[idx], ...req.body };
  writeJSON('users.json', users);
  res.json(users[idx]);
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
  let users = readJSON<User>('users.json');
  users = users.filter(u => u.id !== req.params.id);
  writeJSON('users.json', users);
  res.status(204).end();
});

// Assessments
app.get('/api/users/:userId/assessments/:courseId', (req: Request, res: Response) => {
  const assessments = readJSON<Assessment>('assessments.json');
  const assessment = assessments.find(
    a => a.userId === req.params.userId && a.courseId === req.params.courseId
  );
  res.json(assessment || null);
});

app.post('/api/users/:userId/assessments/:courseId', (req: Request, res: Response) => {
  const assessments = readJSON<Assessment>('assessments.json');
  const existingIdx = assessments.findIndex(
    a => a.userId === req.params.userId && a.courseId === req.params.courseId
  );
  
  const { scores } = req.body;
  
  if (existingIdx !== -1) {
    assessments[existingIdx].scores = scores;
    assessments[existingIdx].createdAt = new Date().toISOString();
    writeJSON('assessments.json', assessments);
    return res.json(assessments[existingIdx]);
  }
  
  const newAssessment: Assessment = {
    id: uuidv4(),
    userId: req.params.userId,
    courseId: req.params.courseId,
    scores,
    createdAt: new Date().toISOString()
  };
  assessments.push(newAssessment);
  writeJSON('assessments.json', assessments);
  res.status(201).json(newAssessment);
});

// Recommend Path API
app.post('/api/recommend-path', (req: Request, res: Response) => {
  const { courseId, userId, maxNodes = 5 } = req.body;
  
  const points = readJSON<KnowledgePoint>('knowledgePoints.json').filter(p => p.courseId === courseId);
  const relations = readJSON<Relation>('relations.json').filter(r => r.courseId === courseId);
  const assessments = readJSON<Assessment>('assessments.json');
  const assessment = assessments.find(a => a.userId === userId && a.courseId === courseId);
  
  const scoreMap = new Map<string, number>();
  if (assessment) {
    assessment.scores.forEach(s => scoreMap.set(s.pointId, s.score));
  }
  
  const pointMap = new Map<string, KnowledgePoint>();
  points.forEach(p => pointMap.set(p.id, p));
  
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  points.forEach(p => {
    inDegree.set(p.id, 0);
    adjacency.set(p.id, []);
  });
  
  relations.forEach(r => {
    if (pointMap.has(r.sourceId) && pointMap.has(r.targetId)) {
      const current = inDegree.get(r.targetId) || 0;
      inDegree.set(r.targetId, current + 1);
      const adj = adjacency.get(r.sourceId) || [];
      adj.push(r.targetId);
      adjacency.set(r.sourceId, adj);
    }
  });
  
  const weakPoints = points.filter(p => {
    const score = scoreMap.get(p.id);
    return score !== undefined && score < 60;
  });
  
  if (weakPoints.length === 0) {
    const sortedByScore = [...points].sort((a, b) => {
      const sa = scoreMap.get(a.id) ?? 100;
      const sb = scoreMap.get(b.id) ?? 100;
      return sa - sb;
    });
    const startPoint = sortedByScore[0];
    if (!startPoint) return res.json([]);
    weakPoints.push(startPoint);
  }
  
  function getPrerequisites(pointId: string): string[] {
    const prereqs: string[] = [];
    const visited = new Set<string>();
    const stack: string[] = [pointId];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      relations.forEach(r => {
        if (r.targetId === current && pointMap.has(r.sourceId)) {
          prereqs.push(r.sourceId);
          stack.push(r.sourceId);
        }
      });
    }
    
    return prereqs;
  }
  
  function getDescendants(pointId: string): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>();
    const stack: string[] = [pointId];
    
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const children = adjacency.get(current) || [];
      children.forEach(child => {
        descendants.push(child);
        stack.push(child);
      });
    }
    
    return descendants;
  }
  
  const allCandidateIds = new Set<string>();
  
  weakPoints.forEach(wp => {
    allCandidateIds.add(wp.id);
    const prereqs = getPrerequisites(wp.id);
    prereqs.forEach(p => allCandidateIds.add(p));
    const descendants = getDescendants(wp.id);
    descendants.forEach(d => allCandidateIds.add(d));
  });
  
  const candidatePoints = points.filter(p => allCandidateIds.has(p.id));
  
  const candidateInDegree = new Map<string, number>();
  candidatePoints.forEach(p => {
    candidateInDegree.set(p.id, 0);
  });
  
  relations.forEach(r => {
    if (candidateInDegree.has(r.sourceId) && candidateInDegree.has(r.targetId)) {
      const current = candidateInDegree.get(r.targetId) || 0;
      candidateInDegree.set(r.targetId, current + 1);
    }
  });
  
  function topologicalSort(): string[] {
    const result: string[] = [];
    const tempInDegree = new Map(candidateInDegree);
    const tempAdjacency = new Map<string, string[]>();
    
    candidatePoints.forEach(p => {
      const children: string[] = [];
      relations.forEach(r => {
        if (r.sourceId === p.id && tempInDegree.has(r.targetId)) {
          children.push(r.targetId);
        }
      });
      tempAdjacency.set(p.id, children);
    });
    
    const queue: string[] = [];
    tempInDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });
    
    while (queue.length > 0) {
      queue.sort((a, b) => {
        const scoreA = scoreMap.get(a) ?? 100;
        const scoreB = scoreMap.get(b) ?? 100;
        return scoreA - scoreB;
      });
      
      const current = queue.shift()!;
      result.push(current);
      
      const children = tempAdjacency.get(current) || [];
      children.forEach(child => {
        const deg = tempInDegree.get(child)! - 1;
        tempInDegree.set(child, deg);
        if (deg === 0) queue.push(child);
      });
    }
    
    return result;
  }
  
  const topoOrder = topologicalSort();
  
  let startIdx = 0;
  let minScore = Infinity;
  topoOrder.forEach((id, idx) => {
    const score = scoreMap.get(id) ?? 100;
    if (score < minScore) {
      minScore = score;
      startIdx = idx;
    }
  });
  
  const path: string[] = [];
  
  function buildPath(startId: string, maxLen: number): string[] {
    const result: string[] = [startId];
    let current = startId;
    
    while (result.length < maxLen) {
      const children = adjacency.get(current) || [];
      if (children.length === 0) break;
      
      let bestChild = children[0];
      let bestScore = scoreMap.get(bestChild) ?? 100;
      
      children.forEach(child => {
        const score = scoreMap.get(child) ?? 100;
        if (score < bestScore) {
          bestScore = score;
          bestChild = child;
        }
      });
      
      if (result.includes(bestChild)) break;
      result.push(bestChild);
      current = bestChild;
    }
    
    return result;
  }
  
  const startPointId = topoOrder[startIdx];
  if (startPointId) {
    const forwardPath = buildPath(startPointId, maxNodes);
    path.push(...forwardPath);
  }
  
  function getPredecessors(pointId: string): string[] {
    const preds: string[] = [];
    relations.forEach(r => {
      if (r.targetId === pointId && pointMap.has(r.sourceId)) {
        preds.push(r.sourceId);
      }
    });
    return preds;
  }
  
  while (path.length < maxNodes) {
    const firstInPath = path[0];
    if (!firstInPath) break;
    
    const preds = getPredecessors(firstInPath).filter(p => !path.includes(p));
    if (preds.length === 0) break;
    
    let bestPred = preds[0];
    let bestScore = scoreMap.get(bestPred) ?? 100;
    
    preds.forEach(pred => {
      const score = scoreMap.get(pred) ?? 100;
      if (score < bestScore) {
        bestScore = score;
        bestPred = pred;
      }
    });
    
    path.unshift(bestPred);
    if (path.length >= maxNodes) break;
  }
  
  const finalPath = path.slice(0, maxNodes);
  
  res.json(finalPath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
