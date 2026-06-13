import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

const nodesDb = Datastore.create(join(__dirname, 'data', 'nodes.db'));
const edgesDb = Datastore.create(join(__dirname, 'data', 'edges.db'));

app.use(express.json());

const NODE_TYPES = ['A', 'B', 'C'];
const TYPE_COUNTS = { A: 20, B: 15, C: 15 };
const EDGE_COUNT = 80;

function generateRandomPosition() {
  return {
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 20,
    z: (Math.random() - 0.5) * 20
  };
}

async function initializeDatabase() {
  const existingNodes = await nodesDb.count({});
  const existingEdges = await edgesDb.count({});

  if (existingNodes === 0) {
    console.log('Initializing database with sample data...');
    const nodes = [];
    let nodeIndex = 1;

    for (const type of NODE_TYPES) {
      for (let i = 0; i < TYPE_COUNTS[type]; i++) {
        const position = generateRandomPosition();
        nodes.push({
          _id: uuidv4(),
          id: `node-${nodeIndex}`,
          name: `节点-${nodeIndex}`,
          type: type,
          position: position,
          initialPosition: { ...position },
          radius: 0.3 + Math.random() * 0.5
        });
        nodeIndex++;
      }
    }

    await nodesDb.insert(nodes);
    console.log(`Inserted ${nodes.length} nodes`);
  }

  if (existingEdges === 0) {
    const allNodes = await nodesDb.find({});
    const edges = [];
    const existingPairs = new Set();

    while (edges.length < EDGE_COUNT) {
      const sourceIdx = Math.floor(Math.random() * allNodes.length);
      const targetIdx = Math.floor(Math.random() * allNodes.length);

      if (sourceIdx === targetIdx) continue;

      const sourceId = allNodes[sourceIdx].id;
      const targetId = allNodes[targetIdx].id;

      const pairKey = [sourceId, targetId].sort().join('-');
      if (existingPairs.has(pairKey)) continue;

      existingPairs.add(pairKey);
      edges.push({
        _id: uuidv4(),
        id: `edge-${edges.length + 1}`,
        sourceId: sourceId,
        targetId: targetId
      });
    }

    await edgesDb.insert(edges);
    console.log(`Inserted ${edges.length} edges`);
  }

  console.log('Database initialized successfully');
}

app.get('/api/nodes', async (req, res) => {
  try {
    const { type } = req.query;
    const query = {};

    if (type && NODE_TYPES.includes(type)) {
      query.type = type;
    }

    const nodes = await nodesDb.find(query);
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

app.get('/api/edges', async (req, res) => {
  try {
    const edges = await edgesDb.find({});
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`FlowViz server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET /api/nodes`);
    console.log(`  GET /api/edges`);
    console.log(`  GET /api/health`);
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
