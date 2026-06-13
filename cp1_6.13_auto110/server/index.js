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
    let nodeIndex = 0;

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
    const nodeConnections = new Map();

    allNodes.forEach(node => nodeConnections.set(node.id, 0));

    const nodesByType: Record<string, typeof allNodes> = {
      A: allNodes.filter(n => n.type === 'A'),
      B: allNodes.filter(n => n.type === 'B'),
      C: allNodes.filter(n => n.type === 'C')
    };

    function addEdge(sourceId: string, targetId: string): boolean {
      if (sourceId === targetId) return false;
      const pairKey = [sourceId, targetId].sort().join('-');
      if (existingPairs.has(pairKey)) return false;

      existingPairs.add(pairKey);
      edges.push({
        _id: uuidv4(),
        id: `edge-${edges.length + 1}`,
        sourceId: sourceId,
        targetId: targetId
      });
      nodeConnections.set(sourceId, (nodeConnections.get(sourceId) || 0) + 1);
      nodeConnections.set(targetId, (nodeConnections.get(targetId) || 0) + 1);
      return true;
    }

    allNodes.forEach((node, idx) => {
      const sameTypeNodes = nodesByType[node.type].filter(n => n.id !== node.id);
      if (sameTypeNodes.length > 0) {
        const randomSameType = sameTypeNodes[Math.floor(Math.random() * sameTypeNodes.length)];
        addEdge(node.id, randomSameType.id);
      }
    });

    const SAME_TYPE_RATIO = 0.6;
    while (edges.length < EDGE_COUNT) {
      const isSameType = Math.random() < SAME_TYPE_RATIO;
      let sourceIdx: number, targetIdx: number;

      if (isSameType) {
        const type = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
        const typeNodes = nodesByType[type];
        if (typeNodes.length < 2) continue;
        sourceIdx = allNodes.findIndex(n => n.id === typeNodes[Math.floor(Math.random() * typeNodes.length)].id);
        targetIdx = allNodes.findIndex(n => n.id === typeNodes[Math.floor(Math.random() * typeNodes.length)].id);
      } else {
        let type1 = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
        let type2 = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
        while (type1 === type2) {
          type2 = NODE_TYPES[Math.floor(Math.random() * NODE_TYPES.length)];
        }
        const type1Nodes = nodesByType[type1];
        const type2Nodes = nodesByType[type2];
        sourceIdx = allNodes.findIndex(n => n.id === type1Nodes[Math.floor(Math.random() * type1Nodes.length)].id);
        targetIdx = allNodes.findIndex(n => n.id === type2Nodes[Math.floor(Math.random() * type2Nodes.length)].id);
      }

      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) continue;

      const sourceId = allNodes[sourceIdx].id;
      const targetId = allNodes[targetIdx].id;
      addEdge(sourceId, targetId);
    }

    const isolatedNodes = allNodes.filter(n => (nodeConnections.get(n.id) || 0) === 0);
    console.log(`Isolated nodes before fix: ${isolatedNodes.length}`);

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
