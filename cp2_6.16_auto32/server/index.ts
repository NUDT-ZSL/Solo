import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  initDatabase,
  getAllNodes,
  updateNodePosition,
  createNode,
  updateNode,
  deleteNode,
  findShortestPath,
  getProgressByUser,
  updateProgress,
  createLearningPath,
  getLearningPaths,
  getRecentCompleted,
  KnowledgeNode,
} from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const USER_ID = 'user_1';

app.get('/api/nodes', async (req, res) => {
  try {
    const nodes = await getAllNodes();
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

app.post('/api/nodes/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const { x, y } = req.body;
    await updateNodePosition(id, x, y);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update node position' });
  }
});

app.post('/api/nodes', async (req, res) => {
  try {
    const node: KnowledgeNode = {
      ...req.body,
      id: uuidv4(),
    };
    await createNode(node);
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create node' });
  }
});

app.put('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await updateNode(id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update node' });
  }
});

app.delete('/api/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteNode(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete node' });
  }
});

app.get('/api/path/generate', async (req, res) => {
  try {
    const { targetId, startId } = req.query;
    if (!targetId) {
      return res.status(400).json({ error: 'targetId is required' });
    }
    const path = await findShortestPath(startId as string | null, targetId as string);
    const nodes = await getAllNodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const pathNodes = path.map(id => nodeMap.get(id)!).filter(Boolean);
    const learningPath = await createLearningPath(USER_ID, path);
    res.json({
      path: learningPath,
      nodes: pathNodes,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate path' });
  }
});

app.get('/api/paths', async (req, res) => {
  try {
    const paths = await getLearningPaths(USER_ID);
    res.json(paths);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch paths' });
  }
});

app.get('/api/progress', async (req, res) => {
  try {
    const progress = await getProgressByUser(USER_ID);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

app.post('/api/progress/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { status } = req.body;
    await updateProgress(USER_ID, nodeId, status);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

app.get('/api/report', async (req, res) => {
  try {
    const progress = await getProgressByUser(USER_ID);
    const recent = await getRecentCompleted(USER_ID);
    const nodes = await getAllNodes();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const stats = {
      completed: progress.filter(p => p.status === 'completed').length,
      in_progress: progress.filter(p => p.status === 'in_progress').length,
      not_started: progress.filter(p => p.status === 'not_started').length,
      total: progress.length,
    };

    const categories = new Map<string, { total: number; completed: number }>();
    for (const p of progress) {
      const node = nodeMap.get(p.nodeId);
      if (!node) continue;
      if (!categories.has(node.category)) {
        categories.set(node.category, { total: 0, completed: 0 });
      }
      const cat = categories.get(node.category)!;
      cat.total++;
      if (p.status === 'completed') cat.completed++;
    }

    const categoryProgress = Array.from(categories.entries()).map(([name, data]) => ({
      category: name,
      progress: data.total > 0 ? (data.completed / data.total) * 100 : 0,
    }));

    res.json({
      stats,
      categoryProgress,
      recentCompleted: recent,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

try {
  initDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (error: any) {
  console.error('Failed to initialize database:', error);
}
