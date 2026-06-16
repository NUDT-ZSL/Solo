import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = path.join(__dirname, 'data', 'templates');

const app = express();
app.use(cors());
app.use(express.json());

async function loadTemplates() {
  const files = await fs.readdir(TEMPLATES_DIR);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const templates = [];
  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(TEMPLATES_DIR, file), 'utf-8');
    templates.push(JSON.parse(content));
  }
  return templates;
}

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await loadTemplates();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { name, sculpture } = req.body;
    const id = uuidv4();
    const template = { id, name, sculpture, createdAt: new Date().toISOString() };
    await fs.writeFile(
      path.join(TEMPLATES_DIR, `${id}.json`),
      JSON.stringify(template, null, 2)
    );
    res.json({ template });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(TEMPLATES_DIR, `${req.params.id}.json`));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/color-schemes', (req, res) => {
  res.json({
    colorSchemes: [
      { id: 'nebula', name: '星云', colors: ['#6c63ff', '#ff6b9d', '#00d4ff', '#ff9a56', '#a855f7'] },
      { id: 'crystal', name: '晶体', colors: ['#00ffcc', '#0088ff', '#ffffff', '#66ffdd', '#0044aa'] },
      { id: 'coral', name: '珊瑚', colors: ['#ff6b6b', '#ffa07a', '#ff4757', '#ff7675', '#e17055'] },
      { id: 'em', name: '电磁', colors: ['#00ff88', '#ffff00', '#ff00ff', '#00ffff', '#88ff00'] },
      { id: 'petal', name: '花瓣', colors: ['#ff69b4', '#ffb6c1', '#dda0dd', '#ff1493', '#c71585'] },
      { id: 'jelly', name: '水母', colors: ['#00bfff', '#1e90ff', '#00ced1', '#48d1cc', '#7fffd4'] },
    ],
  });
});

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();

function broadcast(event, data, exclude = null) {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client !== exclude && client.readyState === 1) {
      client.send(message);
    }
  }
}

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  loadTemplates().then((templates) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'templates:list', data: { templates } }));
    }
  });

  ws.on('message', async (raw) => {
    try {
      const { event, data } = JSON.parse(raw);
      if (event === 'sculpture:update') {
        broadcast('sculpture:update', data, ws);
      } else if (event === 'template:save') {
        const id = uuidv4();
        const template = {
          id,
          name: data.name,
          sculpture: data.sculpture,
          createdAt: new Date().toISOString(),
        };
        await fs.writeFile(
          path.join(TEMPLATES_DIR, `${id}.json`),
          JSON.stringify(template, null, 2)
        );
        broadcast('template:created', { template });
      } else if (event === 'ping') {
        ws.send(JSON.stringify({ event: 'pong' }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 60000);

wss.on('close', () => clearInterval(heartbeat));

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function makeNode(position, size, color) {
  return {
    id: uuidv4(),
    position: { x: position.x, y: position.y, z: position.z },
    size,
    color,
    emissiveIntensity: 2,
    velocity: { x: 0, y: 0, z: 0 },
    restPosition: { x: position.x, y: position.y, z: position.z },
  };
}

function makeConnection(fromId, toId, fromPos, toPos) {
  return {
    fromId,
    toId,
    strength: 0.5,
    opacity: 0.5,
    restLength: dist(fromPos, toPos),
  };
}

function buildNebulaSpiral() {
  const colors = ['#6c63ff', '#ff6b9d', '#00d4ff', '#ff9a56', '#a855f7'];
  const nodes = [];
  for (let i = 0; i < 12; i++) {
    const angle = i * 0.8;
    const radius = 2 + i * 0.8;
    const y = Math.sin(i * 0.5) * 3;
    const pos = { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    nodes.push(makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
  }
  const connections = [];
  for (let i = 0; i < 11; i++) {
    connections.push(makeConnection(nodes[i].id, nodes[i + 1].id, nodes[i].position, nodes[i + 1].position));
  }
  for (let i = 0; i < 10; i++) {
    connections.push(makeConnection(nodes[i].id, nodes[i + 2].id, nodes[i].position, nodes[i + 2].position));
  }
  return { nodes, connections, colorSchemeId: 'nebula' };
}

function buildCrystalGrid() {
  const colors = ['#00ffcc', '#0088ff', '#ffffff', '#66ffdd', '#0044aa'];
  const positions = [
    { x: -4, y: -4, z: -4 },
    { x: -4, y: -4, z: 4 },
    { x: -4, y: 4, z: -4 },
    { x: -4, y: 4, z: 4 },
    { x: 4, y: -4, z: -4 },
    { x: 4, y: -4, z: 4 },
    { x: 4, y: 4, z: -4 },
    { x: 4, y: 4, z: 4 },
  ];
  const nodes = positions.map((pos, i) => makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
  const edges = [
    [0, 1], [1, 5], [5, 4], [4, 0],
    [2, 3], [3, 7], [7, 6], [6, 2],
    [0, 2], [1, 3], [4, 6], [5, 7],
  ];
  const connections = edges.map(([a, b]) =>
    makeConnection(nodes[a].id, nodes[b].id, nodes[a].position, nodes[b].position)
  );
  return { nodes, connections, colorSchemeId: 'crystal' };
}

function buildCoralBranch() {
  const colors = ['#ff6b6b', '#ffa07a', '#ff4757', '#ff7675', '#e17055'];
  const positions = [
    { x: 0, y: 0, z: 0 },
    { x: 2, y: 3, z: 1 },
    { x: -2, y: 3, z: -1 },
    { x: 4, y: 6, z: 2 },
    { x: 1, y: 6, z: 0 },
    { x: -4, y: 6, z: -2 },
    { x: -1, y: 6, z: 0 },
    { x: 5, y: 9, z: 3 },
    { x: 3, y: 9, z: 1 },
    { x: -5, y: 9, z: -3 },
  ];
  const nodes = positions.map((pos, i) => makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
  const edges = [
    [0, 1], [0, 2],
    [1, 3], [1, 4],
    [2, 5], [2, 6],
    [3, 7], [3, 8],
    [5, 9],
  ];
  const connections = edges.map(([a, b]) =>
    makeConnection(nodes[a].id, nodes[b].id, nodes[a].position, nodes[b].position)
  );
  return { nodes, connections, colorSchemeId: 'coral' };
}

function buildElectromagnetic() {
  const colors = ['#00ff88', '#ffff00', '#ff00ff', '#00ffff', '#88ff00'];
  const positions = [
    { x: 6, y: 0, z: 0 },
    { x: 6, y: 3, z: 0 },
    { x: 6, y: 0, z: 3 },
    { x: 6, y: -2, z: -2 },
    { x: -6, y: 0, z: 0 },
    { x: -6, y: 3, z: 0 },
    { x: -6, y: 0, z: -3 },
    { x: -6, y: -3, z: 0 },
    { x: -6, y: 2, z: 2 },
  ];
  const nodes = positions.map((pos, i) => makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
  const edges = [
    [0, 1], [0, 2], [0, 3], [1, 2],
    [4, 5], [4, 6], [4, 7], [4, 8], [5, 8],
    [0, 4], [1, 5],
  ];
  const connections = edges.map(([a, b]) =>
    makeConnection(nodes[a].id, nodes[b].id, nodes[a].position, nodes[b].position)
  );
  return { nodes, connections, colorSchemeId: 'em' };
}

function buildPetalLayers() {
  const colors = ['#ff69b4', '#ffb6c1', '#dda0dd', '#ff1493', '#c71585'];
  const nodes = [];
  const layerConfigs = [
    { y: 0, radius: 3, offset: 0 },
    { y: 4, radius: 5, offset: Math.PI / 5 },
    { y: 8, radius: 7, offset: 0 },
  ];
  for (const config of layerConfigs) {
    for (let i = 0; i < 5; i++) {
      const angle = config.offset + (i * 2 * Math.PI) / 5;
      const pos = {
        x: Math.cos(angle) * config.radius,
        y: config.y,
        z: Math.sin(angle) * config.radius,
      };
      nodes.push(makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
    }
  }
  const connections = [];
  for (let layer = 0; layer < 3; layer++) {
    const base = layer * 5;
    for (let i = 0; i < 5; i++) {
      connections.push(
        makeConnection(
          nodes[base + i].id,
          nodes[base + ((i + 1) % 5)].id,
          nodes[base + i].position,
          nodes[base + ((i + 1) % 5)].position
        )
      );
    }
  }
  for (let layer = 0; layer < 2; layer++) {
    const base1 = layer * 5;
    const base2 = (layer + 1) * 5;
    for (let i = 0; i < 5; i++) {
      connections.push(
        makeConnection(
          nodes[base1 + i].id,
          nodes[base2 + i].id,
          nodes[base1 + i].position,
          nodes[base2 + i].position
        )
      );
      connections.push(
        makeConnection(
          nodes[base1 + i].id,
          nodes[base2 + ((i + 1) % 5)].id,
          nodes[base1 + i].position,
          nodes[base2 + ((i + 1) % 5)].position
        )
      );
    }
  }
  return { nodes, connections, colorSchemeId: 'petal' };
}

function buildJellyfishTentacles() {
  const colors = ['#00bfff', '#1e90ff', '#00ced1', '#48d1cc', '#7fffd4'];
  const positions = [
    { x: 0, y: 4, z: 0 },
    { x: -3, y: 2, z: 0 },
    { x: 3, y: 2, z: 0 },
    { x: 0, y: 2, z: -3 },
    { x: -2, y: -1, z: 0 },
    { x: -1, y: -3, z: 0 },
    { x: 2, y: -1, z: 0 },
    { x: 1, y: -3, z: 0 },
    { x: 0, y: -1, z: -2 },
    { x: 0, y: -3, z: -1 },
    { x: -1, y: -5, z: 0 },
    { x: 1, y: -5, z: 0 },
  ];
  const nodes = positions.map((pos, i) => makeNode(pos, 1.0 + Math.random() * 0.5, colors[i % colors.length]));
  const edges = [
    [0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [1, 3],
    [1, 4], [4, 5], [5, 10],
    [2, 6], [6, 7], [7, 11],
    [3, 8], [8, 9],
  ];
  const connections = edges.map(([a, b]) =>
    makeConnection(nodes[a].id, nodes[b].id, nodes[a].position, nodes[b].position)
  );
  return { nodes, connections, colorSchemeId: 'jelly' };
}

async function seedTemplates() {
  await fs.mkdir(TEMPLATES_DIR, { recursive: true });
  const files = await fs.readdir(TEMPLATES_DIR);
  if (files.length > 0) return;

  const builders = [
    { name: '星云螺旋', build: buildNebulaSpiral },
    { name: '晶体网格', build: buildCrystalGrid },
    { name: '珊瑚分支', build: buildCoralBranch },
    { name: '电磁场', build: buildElectromagnetic },
    { name: '花瓣层叠', build: buildPetalLayers },
    { name: '水母触须', build: buildJellyfishTentacles },
  ];

  for (const { name, build } of builders) {
    const { nodes, connections, colorSchemeId } = build();
    const sculptureId = uuidv4();
    const template = {
      id: uuidv4(),
      name,
      sculpture: { id: sculptureId, name, nodes, connections, colorSchemeId },
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(
      path.join(TEMPLATES_DIR, `${template.id}.json`),
      JSON.stringify(template, null, 2)
    );
  }

  console.log(`Seeded ${builders.length} templates`);
}

seedTemplates().then(() => {
  httpServer.listen(3001, () => console.log('Server running on port 3001'));
});
