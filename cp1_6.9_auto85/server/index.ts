import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

export interface GraphNode {
  id: string;
  name: string;
  description: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface Snapshot {
  id: string;
  data: GraphData;
  createdAt: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = {
  nodes: new Map<string, GraphNode>(),
  links: new Map<string, GraphLink>(),
  snapshots: new Map<string, Snapshot>(),
};

const generateShortId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const seedData = (): void => {
  const meId = uuidv4();
  const zhangsanId = uuidv4();
  const lisiId = uuidv4();
  const wangwuId = uuidv4();
  const zhaoliuId = uuidv4();

  const seedNodes: GraphNode[] = [
    { id: meId, name: '我', description: '中心节点 - 自己', color: '#e94560', size: 30 },
    { id: zhangsanId, name: '张三', description: '大学室友，多年挚友', color: '#0f3460', size: 22 },
    { id: lisiId, name: '李四', description: '现在的同事，项目经理', color: '#16213e', size: 20 },
    { id: wangwuId, name: '王五', description: '家人 - 表哥', color: '#e94560', size: 24 },
    { id: zhaoliuId, name: '赵六', description: '健身房认识的朋友', color: '#0f3460', size: 18 },
  ];

  const seedLinks: GraphLink[] = [
    { id: uuidv4(), source: meId, target: zhangsanId, type: '朋友', weight: 9 },
    { id: uuidv4(), source: meId, target: lisiId, type: '同事', weight: 7 },
    { id: uuidv4(), source: meId, target: wangwuId, type: '家人', weight: 10 },
    { id: uuidv4(), source: meId, target: zhaoliuId, type: '朋友', weight: 5 },
    { id: uuidv4(), source: zhangsanId, target: lisiId, type: '朋友', weight: 4 },
    { id: uuidv4(), source: wangwuId, target: zhangsanId, type: '认识', weight: 3 },
  ];

  seedNodes.forEach(n => storage.nodes.set(n.id, n));
  seedLinks.forEach(l => storage.links.set(l.id, l));
};

seedData();

app.get('/api/graph', (_req: Request, res: Response<GraphData>) => {
  const nodes = Array.from(storage.nodes.values());
  const links = Array.from(storage.links.values());
  res.json({ nodes, links });
});

app.put('/api/graph', (req: Request<{}, {}, GraphData>, res: Response<{ success: boolean }>) => {
  const { nodes, links } = req.body;
  if (!Array.isArray(nodes) || !Array.isArray(links)) {
    res.status(400);
    return;
  }
  storage.nodes.clear();
  storage.links.clear();
  nodes.forEach(n => storage.nodes.set(n.id, n));
  links.forEach(l => storage.links.set(l.id, l));
  res.json({ success: true });
});

app.post('/api/nodes', (req: Request<{}, {}, Omit<GraphNode, 'id'>>, res: Response<GraphNode>) => {
  const { name, description, color, size, x, y } = req.body;
  if (!name) {
    res.status(400);
    return;
  }
  const newNode: GraphNode = {
    id: uuidv4(),
    name,
    description: description || '',
    color: color || '#16213e',
    size: size || 20,
    x,
    y,
  };
  storage.nodes.set(newNode.id, newNode);
  res.status(201).json(newNode);
});

app.put('/api/nodes/:id', (req: Request<{ id: string }, {}, Partial<GraphNode>>, res: Response<GraphNode>) => {
  const id = req.params.id;
  const node = storage.nodes.get(id);
  if (!node) {
    res.status(404);
    return;
  }
  const updated = { ...node, ...req.body, id };
  storage.nodes.set(id, updated);
  res.json(updated);
});

app.delete('/api/nodes/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean }>) => {
  const id = req.params.id;
  if (!storage.nodes.has(id)) {
    res.status(404);
    return;
  }
  storage.nodes.delete(id);
  for (const [linkId, link] of storage.links) {
    if (link.source === id || link.target === id) {
      storage.links.delete(linkId);
    }
  }
  res.json({ success: true });
});

app.post('/api/links', (req: Request<{}, {}, Omit<GraphLink, 'id'>>, res: Response<GraphLink>) => {
  const { source, target, type, weight } = req.body;
  if (!source || !target) {
    res.status(400);
    return;
  }
  if (!storage.nodes.has(source) || !storage.nodes.has(target)) {
    res.status(404);
    return;
  }
  const newLink: GraphLink = {
    id: uuidv4(),
    source,
    target,
    type: type || '关系',
    weight: weight || 5,
  };
  storage.links.set(newLink.id, newLink);
  res.status(201).json(newLink);
});

app.put('/api/links/:id', (req: Request<{ id: string }, {}, Partial<GraphLink>>, res: Response<GraphLink>) => {
  const id = req.params.id;
  const link = storage.links.get(id);
  if (!link) {
    res.status(404);
    return;
  }
  const updated = { ...link, ...req.body, id };
  storage.links.set(id, updated);
  res.json(updated);
});

app.delete('/api/links/:id', (req: Request<{ id: string }>, res: Response<{ success: boolean }>) => {
  const id = req.params.id;
  if (!storage.links.has(id)) {
    res.status(404);
    return;
  }
  storage.links.delete(id);
  res.json({ success: true });
});

app.post('/api/snapshots', (req: Request<{}, {}, GraphData>, res: Response<{ id: string; url: string }>) => {
  const data = req.body;
  if (!data.nodes || !data.links) {
    res.status(400);
    return;
  }
  let shortId = generateShortId();
  while (storage.snapshots.has(shortId)) {
    shortId = generateShortId();
  }
  storage.snapshots.set(shortId, {
    id: shortId,
    data,
    createdAt: Date.now(),
  });
  res.json({ id: shortId, url: `/snapshot/${shortId}` });
});

app.get('/api/snapshots/:id', (req: Request<{ id: string }>, res: Response<Snapshot>) => {
  const id = req.params.id;
  const snapshot = storage.snapshots.get(id);
  if (!snapshot) {
    res.status(404);
    return;
  }
  res.json(snapshot);
});

app.listen(PORT, () => {
  console.log(`Memory Graph API server running on http://localhost:${PORT}`);
});
