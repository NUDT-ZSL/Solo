import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  Course,
  KnowledgePoint,
  KnowledgeRelation,
  User,
  Assessment,
  ReviewRecord,
  RecommendPathRequest,
  RecommendPathResponse,
} from '../src/types';

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use(express.json());

async function readJsonFile<T>(filename: string): Promise<T[]> {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch {
    return [];
  }
}

async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/courses', async (_req: Request, res: Response) => {
  const courses = await readJsonFile<Course>('courses.json');
  res.json(courses);
});

app.get('/api/courses/:id', async (req: Request, res: Response) => {
  const courses = await readJsonFile<Course>('courses.json');
  const course = courses.find((c) => c.id === req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

app.post('/api/courses', async (req: Request, res: Response) => {
  const courses = await readJsonFile<Course>('courses.json');
  const newCourse: Course = {
    id: uuidv4(),
    ...req.body,
    createdAt: Date.now(),
  };
  courses.push(newCourse);
  await writeJsonFile('courses.json', courses);
  res.status(201).json(newCourse);
});

app.get('/api/courses/:id/points', async (req: Request, res: Response) => {
  const points = await readJsonFile<KnowledgePoint>('knowledgePoints.json');
  const coursePoints = points.filter((p) => p.courseId === req.params.id);
  res.json(coursePoints);
});

app.post('/api/points', async (req: Request, res: Response) => {
  const points = await readJsonFile<KnowledgePoint>('knowledgePoints.json');
  const newPoint: KnowledgePoint = {
    id: uuidv4(),
    ...req.body,
    createdAt: Date.now(),
  };
  points.push(newPoint);
  await writeJsonFile('knowledgePoints.json', points);
  res.status(201).json(newPoint);
});

app.put('/api/points/:id', async (req: Request, res: Response) => {
  const points = await readJsonFile<KnowledgePoint>('knowledgePoints.json');
  const index = points.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Point not found' });
  points[index] = { ...points[index], ...req.body };
  await writeJsonFile('knowledgePoints.json', points);
  res.json(points[index]);
});

app.delete('/api/points/:id', async (req: Request, res: Response) => {
  const points = await readJsonFile<KnowledgePoint>('knowledgePoints.json');
  const filtered = points.filter((p) => p.id !== req.params.id);
  await writeJsonFile('knowledgePoints.json', filtered);
  
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const filteredRelations = relations.filter(
    (r) => r.sourceId !== req.params.id && r.targetId !== req.params.id
  );
  await writeJsonFile('relations.json', filteredRelations);
  
  res.json({ success: true });
});

app.get('/api/courses/:id/relations', async (req: Request, res: Response) => {
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const courseRelations = relations.filter((r) => r.courseId === req.params.id);
  res.json(courseRelations);
});

app.post('/api/relations', async (req: Request, res: Response) => {
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const newRelation: KnowledgeRelation = {
    id: uuidv4(),
    ...req.body,
    curvature: req.body.curvature ?? 0.5,
    createdAt: Date.now(),
  };
  relations.push(newRelation);
  await writeJsonFile('relations.json', relations);
  res.status(201).json(newRelation);
});

app.put('/api/relations/:id', async (req: Request, res: Response) => {
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const index = relations.findIndex((r) => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Relation not found' });
  relations[index] = { ...relations[index], ...req.body };
  await writeJsonFile('relations.json', relations);
  res.json(relations[index]);
});

app.delete('/api/relations/:id', async (req: Request, res: Response) => {
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const filtered = relations.filter((r) => r.id !== req.params.id);
  await writeJsonFile('relations.json', filtered);
  res.json({ success: true });
});

app.post('/api/users/login', async (req: Request, res: Response) => {
  const users = await readJsonFile<User>('users.json');
  const { username, role } = req.body;
  let user = users.find((u) => u.username === username && u.role === role);
  if (!user) {
    user = {
      id: uuidv4(),
      username,
      role,
      createdAt: Date.now(),
    };
    users.push(user);
    await writeJsonFile('users.json', users);
  }
  res.json(user);
});

app.get('/api/users/:id/assessments', async (req: Request, res: Response) => {
  const assessments = await readJsonFile<Assessment>('assessments.json');
  const userAssessments = assessments.filter((a) => a.userId === req.params.id);
  res.json(userAssessments);
});

app.post('/api/assessments', async (req: Request, res: Response) => {
  const assessments = await readJsonFile<Assessment>('assessments.json');
  const existingIndex = assessments.findIndex(
    (a) => a.userId === req.body.userId && a.pointId === req.body.pointId
  );
  if (existingIndex !== -1) {
    assessments[existingIndex] = {
      ...assessments[existingIndex],
      score: req.body.score,
      completedAt: Date.now(),
    };
    await writeJsonFile('assessments.json', assessments);
    return res.json(assessments[existingIndex]);
  }
  const newAssessment: Assessment = {
    id: uuidv4(),
    ...req.body,
    completedAt: Date.now(),
  };
  assessments.push(newAssessment);
  await writeJsonFile('assessments.json', assessments);
  res.status(201).json(newAssessment);
});

function buildGraph(
  points: KnowledgePoint[],
  relations: KnowledgeRelation[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  points.forEach((p) => graph.set(p.id, []));
  relations.forEach((r) => {
    const targets = graph.get(r.sourceId) || [];
    targets.push(r.targetId);
    graph.set(r.sourceId, targets);
  });
  return graph;
}

function reverseGraph(
  points: KnowledgePoint[],
  relations: KnowledgeRelation[]
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  points.forEach((p) => graph.set(p.id, []));
  relations.forEach((r) => {
    const sources = graph.get(r.targetId) || [];
    sources.push(r.sourceId);
    graph.set(r.targetId, sources);
  });
  return graph;
}

function dfsTopologicalSort(
  startId: string,
  graph: Map<string, string[]>,
  weakPoints: Set<string>,
  maxNodes: number,
  reviewedIds: Set<string>
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId) || result.length >= maxNodes) return;
    visited.add(nodeId);
    
    if (!reviewedIds.has(nodeId)) {
      result.push(nodeId);
    }

    const neighbors = graph.get(nodeId) || [];
    neighbors.sort((a, b) => {
      const aWeak = weakPoints.has(a) ? 1 : 0;
      const bWeak = weakPoints.has(b) ? 1 : 0;
      return bWeak - aWeak;
    });

    for (const neighbor of neighbors) {
      if (result.length >= maxNodes) break;
      dfs(neighbor);
    }
  }

  dfs(startId);
  return result.slice(0, maxNodes);
}

app.post('/api/recommend-path', async (req: Request<{}, {}, RecommendPathRequest>, res: Response) => {
  const { userId, courseId, maxNodes = 5 } = req.body;

  const points = await readJsonFile<KnowledgePoint>('knowledgePoints.json');
  const coursePoints = points.filter((p) => p.courseId === courseId);
  
  const relations = await readJsonFile<KnowledgeRelation>('relations.json');
  const courseRelations = relations.filter((r) => r.courseId === courseId);
  
  const assessments = await readJsonFile<Assessment>('assessments.json');
  const userAssessments = assessments.filter(
    (a) => a.userId === userId && a.courseId === courseId
  );
  
  const reviews = await readJsonFile<ReviewRecord>('reviews.json');
  const userReviews = reviews.filter((r) => r.userId === userId);
  const reviewedIds = new Set(userReviews.map((r) => r.pointId));

  const weakPoints = new Set<string>();
  userAssessments.forEach((a) => {
    if (a.score < 60) {
      weakPoints.add(a.pointId);
    }
  });

  if (weakPoints.size === 0) {
    const unreviewed = coursePoints
      .filter((p) => !reviewedIds.has(p.id))
      .slice(0, maxNodes)
      .map((p) => p.id);
    return res.json({ path: unreviewed } as RecommendPathResponse);
  }

  const forwardGraph = buildGraph(coursePoints, courseRelations);
  const reverseGraphMap = reverseGraph(coursePoints, courseRelations);

  let bestPath: string[] = [];
  let maxWeakCount = -1;

  for (const weakPointId of weakPoints) {
    const prerequisites: string[] = [];
    const visited = new Set<string>();
    
    function collectPrereqs(nodeId: string) {
      if (visited.has(nodeId) || nodeId === weakPointId) return;
      visited.add(nodeId);
      if (!reviewedIds.has(nodeId)) {
        prerequisites.unshift(nodeId);
      }
      const parents = reverseGraphMap.get(nodeId) || [];
      for (const parent of parents) {
        collectPrereqs(parent);
      }
    }
    
    const directParents = reverseGraphMap.get(weakPointId) || [];
    for (const parent of directParents) {
      collectPrereqs(parent);
    }

    const startPoint = prerequisites.length > 0 ? prerequisites[0] : weakPointId;
    const path = dfsTopologicalSort(
      startPoint,
      forwardGraph,
      weakPoints,
      maxNodes,
      reviewedIds
    );

    const weakCount = path.filter((id) => weakPoints.has(id)).length;
    if (weakCount > maxWeakCount || (weakCount === maxWeakCount && path.length > bestPath.length)) {
      maxWeakCount = weakCount;
      bestPath = path;
    }
  }

  res.json({ path: bestPath } as RecommendPathResponse);
});

app.post('/api/reviews', async (req: Request, res: Response) => {
  const reviews = await readJsonFile<ReviewRecord>('reviews.json');
  const existing = reviews.find(
    (r) => r.userId === req.body.userId && r.pointId === req.body.pointId
  );
  if (existing) {
    return res.json(existing);
  }
  const newReview: ReviewRecord = {
    id: uuidv4(),
    ...req.body,
    reviewedAt: Date.now(),
  };
  reviews.push(newReview);
  await writeJsonFile('reviews.json', reviews);
  res.status(201).json(newReview);
});

app.get('/api/users/:id/reviews', async (req: Request, res: Response) => {
  const reviews = await readJsonFile<ReviewRecord>('reviews.json');
  const userReviews = reviews.filter((r) => r.userId === req.params.id);
  res.json(userReviews);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
