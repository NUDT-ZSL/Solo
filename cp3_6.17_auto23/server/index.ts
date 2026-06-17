import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Course, KnowledgePoint, Relation, User, UserScore, ReviewPathResult } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

function readJSON<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T[];
}

function writeJSON<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Courses API
app.get('/api/courses', (_req, res) => {
  const courses = readJSON<Course>('courses.json');
  res.json(courses);
});

app.get('/api/courses/:id', (req, res) => {
  const courses = readJSON<Course>('courses.json');
  const course = courses.find(c => c.id === req.params.id);
  if (!course) {
    res.status(404).json({ error: 'Course not found' });
    return;
  }
  res.json(course);
});

app.post('/api/courses', (req, res) => {
  const courses = readJSON<Course>('courses.json');
  const newCourse: Course = {
    id: uuidv4(),
    title: req.body.title,
    description: req.body.description,
    coverUrl: req.body.coverUrl,
    teacherId: req.body.teacherId
  };
  courses.push(newCourse);
  writeJSON('courses.json', courses);
  res.status(201).json(newCourse);
});

// Knowledge Points API
app.get('/api/courses/:courseId/knowledge-points', (req, res) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const coursePoints = points.filter(p => p.courseId === req.params.courseId);
  res.json(coursePoints);
});

app.post('/api/courses/:courseId/knowledge-points', (req, res) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const newPoint: KnowledgePoint = {
    id: uuidv4(),
    courseId: req.params.courseId,
    title: req.body.title,
    description: req.body.description,
    difficulty: req.body.difficulty,
    tags: req.body.tags || [],
    x: req.body.x || 100,
    y: req.body.y || 100
  };
  points.push(newPoint);
  writeJSON('knowledgePoints.json', points);
  res.status(201).json(newPoint);
});

app.put('/api/knowledge-points/:id', (req, res) => {
  const points = readJSON<KnowledgePoint>('knowledgePoints.json');
  const index = points.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Knowledge point not found' });
    return;
  }
  points[index] = { ...points[index], ...req.body };
  writeJSON('knowledgePoints.json', points);
  res.json(points[index]);
});

// Relations API
app.get('/api/courses/:courseId/relations', (req, res) => {
  const relations = readJSON<Relation>('relations.json');
  const courseRelations = relations.filter(r => r.courseId === req.params.courseId);
  res.json(courseRelations);
});

app.post('/api/courses/:courseId/relations', (req, res) => {
  const relations = readJSON<Relation>('relations.json');
  const exists = relations.some(
    r => r.courseId === req.params.courseId &&
      r.sourceId === req.body.sourceId &&
      r.targetId === req.body.targetId
  );
  if (exists) {
    res.status(400).json({ error: 'Relation already exists' });
    return;
  }
  const newRelation: Relation = {
    id: uuidv4(),
    courseId: req.params.courseId,
    sourceId: req.body.sourceId,
    targetId: req.body.targetId,
    curvature: req.body.curvature || 0
  };
  relations.push(newRelation);
  writeJSON('relations.json', relations);
  res.status(201).json(newRelation);
});

app.put('/api/relations/:id', (req, res) => {
  const relations = readJSON<Relation>('relations.json');
  const index = relations.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Relation not found' });
    return;
  }
  relations[index] = { ...relations[index], ...req.body };
  writeJSON('relations.json', relations);
  res.json(relations[index]);
});

app.delete('/api/relations/:id', (req, res) => {
  const relations = readJSON<Relation>('relations.json');
  const filtered = relations.filter(r => r.id !== req.params.id);
  if (filtered.length === relations.length) {
    res.status(404).json({ error: 'Relation not found' });
    return;
  }
  writeJSON('relations.json', filtered);
  res.status(204).send();
});

// Users API
app.get('/api/users', (_req, res) => {
  const users = readJSON<User>('users.json');
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON<User>('users.json');
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

// User Scores API
app.get('/api/users/:userId/scores', (req, res) => {
  const scores = readJSON<UserScore>('userScores.json');
  const userScores = scores.filter(s => s.userId === req.params.userId);
  res.json(userScores);
});

app.put('/api/users/:userId/scores/:kpId', (req, res) => {
  const scores = readJSON<UserScore>('userScores.json');
  const index = scores.findIndex(
    s => s.userId === req.params.userId && s.knowledgePointId === req.params.kpId
  );
  if (index === -1) {
    const newScore: UserScore = {
      userId: req.params.userId,
      knowledgePointId: req.params.kpId,
      score: req.body.score,
      reviewed: req.body.reviewed || false
    };
    scores.push(newScore);
    writeJSON('userScores.json', scores);
    res.status(201).json(newScore);
  } else {
    scores[index] = { ...scores[index], ...req.body };
    writeJSON('userScores.json', scores);
    res.json(scores[index]);
  }
});

// Review Path Calculation
function topologicalSort(points: KnowledgePoint[], relations: Relation[]): string[] {
  const adjacencyMap: Map<string, string[]> = new Map();
  const inDegree: Map<string, number> = new Map();

  points.forEach(p => {
    adjacencyMap.set(p.id, []);
    inDegree.set(p.id, 0);
  });

  relations.forEach(r => {
    const sources = adjacencyMap.get(r.sourceId);
    if (sources) {
      sources.push(r.targetId);
    }
    const deg = inDegree.get(r.targetId);
    if (deg !== undefined) {
      inDegree.set(r.targetId, deg + 1);
    }
  });

  const stack: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) stack.push(id);
  });

  const result: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    result.push(current);
    const neighbors = adjacencyMap.get(current) || [];
    neighbors.forEach(neighbor => {
      const deg = inDegree.get(neighbor);
      if (deg !== undefined) {
        inDegree.set(neighbor, deg - 1);
        if (deg - 1 === 0) {
          stack.push(neighbor);
        }
      }
    });
  }

  return result;
}

function calculateDependencyDepth(
  nodeId: string,
  reverseAdjacency: Map<string, string[]>,
  weakPointIds: string[],
  memo: Map<string, number>
): number {
  if (memo.has(nodeId)) {
    return memo.get(nodeId)!;
  }

  const prereqs = reverseAdjacency.get(nodeId) || [];
  const weakPrereqs = prereqs.filter(p => weakPointIds.includes(p));

  if (weakPrereqs.length === 0) {
    memo.set(nodeId, 0);
    return 0;
  }

  let maxDepth = 0;
  for (const prereq of weakPrereqs) {
    const depth = calculateDependencyDepth(prereq, reverseAdjacency, weakPointIds, memo);
    maxDepth = Math.max(maxDepth, depth + 1);
  }

  memo.set(nodeId, maxDepth);
  return maxDepth;
}

app.post('/api/review-path', (req, res) => {
  const { userId, courseId } = req.body;

  const points = readJSON<KnowledgePoint>('knowledgePoints.json').filter(p => p.courseId === courseId);
  const relations = readJSON<Relation>('relations.json').filter(r => r.courseId === courseId);
  const scores = readJSON<UserScore>('userScores.json').filter(s => s.userId === userId);

  const scoreMap: Map<string, number> = new Map();
  scores.forEach(s => scoreMap.set(s.knowledgePointId, s.score));

  const weakPointList = points
    .filter(p => {
      const score = scoreMap.get(p.id);
      return score !== undefined && score < 60;
    });

  if (weakPointList.length === 0) {
    res.json({ path: [], weakPoints: [] } as ReviewPathResult);
    return;
  }

  const topoOrder = topologicalSort(points, relations);

  const adjacencyMap: Map<string, string[]> = new Map();
  relations.forEach(r => {
    if (!adjacencyMap.has(r.sourceId)) {
      adjacencyMap.set(r.sourceId, []);
    }
    adjacencyMap.get(r.sourceId)!.push(r.targetId);
  });

  const reverseAdjacency: Map<string, string[]> = new Map();
  relations.forEach(r => {
    if (!reverseAdjacency.has(r.targetId)) {
      reverseAdjacency.set(r.targetId, []);
    }
    reverseAdjacency.get(r.targetId)!.push(r.sourceId);
  });

  const weakPointIds = weakPointList.map(p => p.id);
  const depthMemo = new Map<string, number>();

  const sortedByDepth = [...weakPointList].sort((a, b) => {
    const depthA = calculateDependencyDepth(a.id, reverseAdjacency, weakPointIds, depthMemo);
    const depthB = calculateDependencyDepth(b.id, reverseAdjacency, weakPointIds, depthMemo);

    if (depthB !== depthA) {
      return depthB - depthA;
    }

    const scoreA = scoreMap.get(a.id) || 0;
    const scoreB = scoreMap.get(b.id) || 0;
    return scoreA - scoreB;
  });

  const sortedWeakPointIds = sortedByDepth.map(p => p.id);

  const startPoint = sortedWeakPointIds[0];
  const path: string[] = [];
  const visited = new Set<string>();

  function collectPrerequisites(nodeId: string): void {
    if (path.length >= 5) return;
    const prereqs = reverseAdjacency.get(nodeId) || [];
    const sortedPrereqs = prereqs
      .filter(p => sortedWeakPointIds.includes(p) && !visited.has(p))
      .sort((a, b) => topoOrder.indexOf(a) - topoOrder.indexOf(b));

    for (const prereq of sortedPrereqs) {
      if (path.length >= 5) break;
      if (!visited.has(prereq)) {
        visited.add(prereq);
        collectPrerequisites(prereq);
        path.push(prereq);
      }
    }
  }

  visited.add(startPoint);
  collectPrerequisites(startPoint);
  path.push(startPoint);

  function collectDependents(nodeId: string): void {
    if (path.length >= 5) return;
    const dependents = adjacencyMap.get(nodeId) || [];
    const sortedDependents = dependents
      .filter(d => sortedWeakPointIds.includes(d) && !visited.has(d))
      .sort((a, b) => topoOrder.indexOf(a) - topoOrder.indexOf(b));

    for (const dep of sortedDependents) {
      if (path.length >= 5) break;
      if (!visited.has(dep)) {
        visited.add(dep);
        path.push(dep);
        collectDependents(dep);
      }
    }
  }

  collectDependents(startPoint);

  if (path.length < 5) {
    const remainingWeak = sortedWeakPointIds
      .filter(id => !visited.has(id));

    for (const wp of remainingWeak) {
      if (path.length >= 5) break;
      if (!visited.has(wp)) {
        visited.add(wp);
        path.push(wp);
      }
    }
  }

  const finalPath = path.slice(0, 5);

  res.json({
    path: finalPath,
    weakPoints: sortedWeakPointIds
  } as ReviewPathResult);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
