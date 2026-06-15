import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

export interface KnowledgeNode {
  id: string;
  name: string;
  category: string;
  prerequisites: string[];
  x: number;
  y: number;
}

export interface LearningPath {
  id: string;
  userId: string;
  nodeIds: string[];
  progress: number;
}

export interface ProgressRecord {
  id: string;
  userId: string;
  nodeId: string;
  status: 'completed' | 'in_progress' | 'not_started';
  completedAt: string | null;
}

interface DatabaseData {
  knowledge_nodes: KnowledgeNode[];
  learning_paths: LearningPath[];
  progress_records: ProgressRecord[];
}

const defaultData: DatabaseData = {
  knowledge_nodes: [],
  learning_paths: [],
  progress_records: [],
};

let db: Low<DatabaseData>;

export async function initDatabase() {
  const dbDir = path.join(__dirname, '..');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'learning.json');
  const adapter = new JSONFile<DatabaseData>(dbPath);
  db = new Low(adapter, defaultData);

  await db.read();

  if (db.data.knowledge_nodes.length === 0) {
    await seedData();
  }

  return db;
}

async function seedData() {
  const nodes: Omit<KnowledgeNode, 'x' | 'y'>[] = [
    { id: 'js', name: 'JavaScript', category: '编程', prerequisites: [] },
    { id: 'html', name: 'HTML', category: '编程', prerequisites: [] },
    { id: 'css', name: 'CSS', category: '编程', prerequisites: ['html'] },
    { id: 'ts', name: 'TypeScript', category: '编程', prerequisites: ['js'] },
    { id: 'react', name: 'React', category: '编程', prerequisites: ['js', 'html', 'css'] },
    { id: 'algo', name: '算法基础', category: '数学', prerequisites: [] },
    { id: 'ds', name: '数据结构', category: '数学', prerequisites: ['algo'] },
    { id: 'ui', name: 'UI设计', category: '设计', prerequisites: ['css'] },
    { id: 'ux', name: 'UX设计', category: '设计', prerequisites: ['ui'] },
    { id: 'node', name: 'Node.js', category: '编程', prerequisites: ['js'] },
  ];

  const centerX = 400;
  const centerY = 300;
  const radius = 200;

  const userId = 'user_1';
  const progressRecords: ProgressRecord[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const angle = (i / nodes.length) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    db.data.knowledge_nodes.push({
      ...nodes[i],
      x,
      y,
    });
    progressRecords.push({
      id: `pr_${userId}_${nodes[i].id}`,
      userId,
      nodeId: nodes[i].id,
      status: 'not_started',
      completedAt: null,
    });
  }

  db.data.progress_records.push(...progressRecords);
  await db.write();
}

export async function getAllNodes(): Promise<KnowledgeNode[]> {
  await db.read();
  return db.data.knowledge_nodes;
}

export async function updateNodePosition(id: string, x: number, y: number) {
  await db.read();
  const node = db.data.knowledge_nodes.find(n => n.id === id);
  if (node) {
    node.x = x;
    node.y = y;
    await db.write();
  }
}

export async function createNode(node: KnowledgeNode) {
  await db.read();
  db.data.knowledge_nodes.push(node);
  await db.write();
}

export async function updateNode(id: string, updates: Partial<KnowledgeNode>) {
  await db.read();
  const node = db.data.knowledge_nodes.find(n => n.id === id);
  if (node) {
    Object.assign(node, updates);
    await db.write();
  }
}

export async function deleteNode(id: string) {
  await db.read();
  db.data.knowledge_nodes = db.data.knowledge_nodes.filter(n => n.id !== id);
  await db.write();
}

export async function findShortestPath(startId: string | null, targetId: string): Promise<string[]> {
  await db.read();
  const nodes = db.data.knowledge_nodes;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const target = nodeMap.get(targetId);
  if (!target) return [];

  if (!startId) {
    const path: string[] = [];
    const visited = new Set<string>();

    function collectPrereqs(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) return;
      for (const pre of node.prerequisites) {
        collectPrereqs(pre);
      }
      path.push(nodeId);
    }

    collectPrereqs(targetId);
    return path;
  }

  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === targetId) return path;

    const node = nodeMap.get(current);
    if (!node) continue;

    const nextNodes: string[] = [];
    for (const n of nodes) {
      if (n.prerequisites.includes(current) && !visited.has(n.id)) {
        nextNodes.push(n.id);
      }
    }
    if (node.prerequisites.length === 0 || path.length > 1) {
      for (const pre of node.prerequisites) {
        if (!visited.has(pre)) nextNodes.push(pre);
      }
    }

    for (const next of nextNodes) {
      visited.add(next);
      queue.push([...path, next]);
    }
  }

  return [];
}

export async function getProgressByUser(userId: string): Promise<ProgressRecord[]> {
  await db.read();
  return db.data.progress_records.filter(p => p.userId === userId);
}

export async function updateProgress(userId: string, nodeId: string, status: 'completed' | 'in_progress' | 'not_started') {
  await db.read();
  const record = db.data.progress_records.find(p => p.userId === userId && p.nodeId === nodeId);
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  if (record) {
    record.status = status;
    record.completedAt = completedAt;
  } else {
    db.data.progress_records.push({
      id: `pr_${userId}_${nodeId}`,
      userId,
      nodeId,
      status,
      completedAt,
    });
  }
  await db.write();
  await updatePathProgress(userId);
}

async function updatePathProgress(userId: string) {
  await db.read();
  const paths = db.data.learning_paths.filter(p => p.userId === userId);
  for (const path of paths) {
    const progress = db.data.progress_records.filter(
      p => p.userId === userId && path.nodeIds.includes(p.nodeId)
    );
    const completed = progress.filter(p => p.status === 'completed').length;
    const progressPercent = path.nodeIds.length > 0 ? (completed / path.nodeIds.length) * 100 : 0;
    path.progress = progressPercent;
  }
  await db.write();
}

export async function createLearningPath(userId: string, nodeIds: string[]) {
  await db.read();
  const id = `path_${userId}_${Date.now()}`;
  const learningPath: LearningPath = {
    id,
    userId,
    nodeIds,
    progress: 0,
  };
  db.data.learning_paths.push(learningPath);
  await db.write();
  return learningPath;
}

export async function getLearningPaths(userId: string): Promise<LearningPath[]> {
  await db.read();
  return db.data.learning_paths.filter(p => p.userId === userId);
}

export async function getRecentCompleted(userId: string, limit: number = 5) {
  await db.read();
  const progress = db.data.progress_records
    .filter(p => p.userId === userId && p.status === 'completed')
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, limit);

  return progress.map(p => {
    const node = db.data.knowledge_nodes.find(n => n.id === p.nodeId);
    return {
      ...p,
    name: node?.name || '',
    category: node?.category || '',
    };
  });
}
