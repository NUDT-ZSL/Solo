import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  TreeData,
  SaveTreeRequest,
  SaveTreeResponse,
  GetTreesResponse,
  LikeRequest,
  LikeResponse,
  CommentRequest,
  CommentResponse,
  CommentData,
} from '../shared/types.js';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const trees = new Map<string, TreeData>();
const coordinateIndex = new Map<string, string>();

function coordKey(x: number, y: number): string {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function isOccupied(x: number, y: number, threshold: number = 1.5): boolean {
  for (const key of coordinateIndex.keys()) {
    const [cx, cy] = key.split(',').map(Number);
    const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
    if (dist < threshold) return true;
  }
  return false;
}

function findNearestFree(x: number, y: number): { x: number; y: number } {
  const angles = 8;
  for (let r = 2; r <= 30; r += 1.5) {
    for (let a = 0; a < angles; a++) {
      const angle = (a / angles) * Math.PI * 2 + (r * 0.3);
      const nx = Math.max(2, Math.min(98, x + Math.cos(angle) * r));
      const ny = Math.max(2, Math.min(98, y + Math.sin(angle) * r));
      if (!isOccupied(nx, ny)) return { x: nx, y: ny };
    }
  }
  for (let tries = 0; tries < 200; tries++) {
    const rx = Math.random() * 96 + 2;
    const ry = Math.random() * 96 + 2;
    if (!isOccupied(rx, ry)) return { x: rx, y: ry };
  }
  return { x: Math.random() * 96 + 2, y: Math.random() * 96 + 2 };
}

function todayStr(userId: string): string {
  return `${new Date().toISOString().slice(0, 10)}_${userId}`;
}

app.post<{}, SaveTreeResponse, SaveTreeRequest>('/api/tree', (req, res) => {
  try {
    const { userId, nickname, x, y, moodColor, text, streakDays } = req.body;
    if (!userId || !moodColor || x === undefined || y === undefined) {
      return res.status(400).json({ success: false, occupied: false });
    }
    if (isOccupied(x, y)) {
      const near = findNearestFree(x, y);
      return res.json({ success: false, occupied: true, newX: near.x, newY: near.y });
    }
    const tree: TreeData = {
      id: uuidv4(),
      userId,
      nickname: nickname || '匿名旅人',
      x,
      y,
      moodColor,
      text: (text || '').slice(0, 50),
      streakDays: Math.max(1, streakDays || 1),
      createdAt: Date.now(),
      likes: 0,
      likedUsers: {},
      comments: [],
    };
    trees.set(tree.id, tree);
    coordinateIndex.set(coordKey(x, y), tree.id);
    return res.json({ success: true, occupied: false, tree });
  } catch (e) {
    return res.status(500).json({ success: false, occupied: false });
  }
});

app.get<{}, GetTreesResponse>('/api/trees', (_req, res) => {
  const list = Array.from(trees.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 1000);
  res.json({ trees: list });
});

app.post<{}, LikeResponse, LikeRequest>('/api/like', (req, res) => {
  try {
    const { treeId, userId } = req.body;
    const tree = trees.get(treeId);
    if (!tree) return res.status(404).json({ success: false, likes: 0, alreadyLiked: false });
    const key = todayStr(userId);
    if (tree.likedUsers[key]) {
      return res.json({ success: true, likes: tree.likes, alreadyLiked: true });
    }
    tree.likedUsers[key] = key;
    tree.likes += 1;
    return res.json({ success: true, likes: tree.likes, alreadyLiked: false });
  } catch (e) {
    return res.status(500).json({ success: false, likes: 0, alreadyLiked: false });
  }
});

app.post<{}, CommentResponse, CommentRequest>('/api/comment', (req, res) => {
  try {
    const { treeId, userId, nickname, content } = req.body;
    const tree = trees.get(treeId);
    if (!tree) return res.status(404).json({ success: false });
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false });
    }
    const comment: CommentData = {
      id: uuidv4(),
      userId,
      nickname: nickname || '匿名旅人',
      content: content.slice(0, 100),
      createdAt: Date.now(),
    };
    tree.comments.unshift(comment);
    if (tree.comments.length > 100) tree.comments.length = 100;
    return res.json({ success: true, comment });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Mood Map API listening on http://localhost:${PORT}`);
});
