import Database from 'better-sqlite3';
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

let db: Database.Database;

export function initDatabase() {
  const dbDir = path.join(__dirname, '..');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'learning.db');
  db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      prerequisites TEXT NOT NULL,
      x REAL DEFAULT 0,
      y REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      nodeIds TEXT NOT NULL,
      progress REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS progress_records (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      nodeId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      completedAt TEXT,
      UNIQUE(userId, nodeId)
    );
  `);

  const existing = db.prepare('SELECT COUNT(*) as count FROM knowledge_nodes').get() as { count: number };
  if (existing.count === 0) {
    seedData();
  }

  return db;
}

function seedData() {
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

  const insertNode = db.prepare(
    'INSERT INTO knowledge_nodes (id, name, category, prerequisites, x, y) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertProgress = db.prepare(
    'INSERT OR IGNORE INTO progress_records (id, userId, nodeId, status) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction(() => {
    for (let i = 0; i < nodes.length; i++) {
      const angle = (i / nodes.length) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      insertNode.run(
        nodes[i].id,
        nodes[i].name,
        nodes[i].category,
        JSON.stringify(nodes[i].prerequisites),
        x,
        y
      );
    }

    for (const node of nodes) {
      insertProgress.run(`pr_${userId}_${node.id}`, userId, node.id, 'not_started');
    }
  });

  insertMany();
}

export function getAllNodes(): KnowledgeNode[] {
  const rows = db.prepare('SELECT * FROM knowledge_nodes').all() as any[];
  return rows.map((row) => ({
    ...row,
    prerequisites: JSON.parse(row.prerequisites),
  }));
}

export function updateNodePosition(id: string, x: number, y: number) {
  db.prepare('UPDATE knowledge_nodes SET x = ?, y = ? WHERE id = ?').run(x, y, id);
}

export function createNode(node: KnowledgeNode) {
  db.prepare(
    'INSERT INTO knowledge_nodes (id, name, category, prerequisites, x, y) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(node.id, node.name, node.category, JSON.stringify(node.prerequisites), node.x, node.y);
}

export function updateNode(id: string, updates: Partial<KnowledgeNode>) {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    values.push(key === 'prerequisites' ? JSON.stringify(value) : value);
  }
  values.push(id);
  db.prepare(`UPDATE knowledge_nodes SET ${fields.join(', ')} WHERE id = ?`).run(values as any);
}

export function deleteNode(id: string) {
  db.prepare('DELETE FROM knowledge_nodes WHERE id = ?').run(id);
}

export function findShortestPath(startId: string | null, targetId: string): string[] {
  const nodes = getAllNodes();
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

export function getProgressByUser(userId: string): ProgressRecord[] {
  return db.prepare('SELECT * FROM progress_records WHERE userId = ?').all(userId) as ProgressRecord[];
}

export function updateProgress(userId: string, nodeId: string, status: 'completed' | 'in_progress' | 'not_started') {
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  db.prepare(
    'INSERT INTO progress_records (id, userId, nodeId, status, completedAt) VALUES (?, ?, ?, ?, ?) ' +
    'ON CONFLICT(userId, nodeId) DO UPDATE SET status = excluded.status, completedAt = excluded.completedAt'
  ).run(`pr_${userId}_${nodeId}`, userId, nodeId, status, completedAt);

  updatePathProgress(userId);
}

function updatePathProgress(userId: string) {
  const paths = db.prepare('SELECT * FROM learning_paths WHERE userId = ?').all(userId) as any[];
  for (const path of paths) {
    const nodeIds = JSON.parse(path.nodeIds);
    const placeholders = nodeIds.map(() => '?').join(',');
    const progress = db.prepare(
      `SELECT status FROM progress_records WHERE userId = ? AND nodeId IN (${placeholders})`
    ).all(userId, ...nodeIds) as { status: string }[];
    const completed = progress.filter((p) => p.status === 'completed').length;
    const progressPercent = nodeIds.length > 0 ? (completed / nodeIds.length) * 100 : 0;
    db.prepare('UPDATE learning_paths SET progress = ? WHERE id = ?').run(progressPercent, path.id);
  }
}

export function createLearningPath(userId: string, nodeIds: string[]) {
  const id = `path_${userId}_${Date.now()}`;
  db.prepare(
    'INSERT INTO learning_paths (id, userId, nodeIds, progress) VALUES (?, ?, ?, ?)'
  ).run(id, userId, JSON.stringify(nodeIds), 0);
  return { id, userId, nodeIds, progress: 0 };
}

export function getLearningPaths(userId: string): LearningPath[] {
  const rows = db.prepare('SELECT * FROM learning_paths WHERE userId = ?').all(userId) as any[];
  return rows.map((row) => ({
    ...row,
    nodeIds: JSON.parse(row.nodeIds),
  }));
}

export function getRecentCompleted(userId: string, limit: number = 5) {
  return db.prepare(
    'SELECT pr.*, kn.name, kn.category FROM progress_records pr ' +
    'JOIN knowledge_nodes kn ON pr.nodeId = kn.id ' +
    'WHERE pr.userId = ? AND pr.status = ? ' +
    'ORDER BY pr.completedAt DESC LIMIT ?'
  ).all(userId, 'completed', limit);
}
