import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Node {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  tagId?: string;
  characterId?: string;
  timelinePosition?: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Character {
  id: string;
  name: string;
  description?: string;
}

let nodes: Node[] = [
  {
    id: 'node-1',
    x: 100,
    y: 120,
    title: '开端',
    description: '故事的开始',
    tagId: 'tag-1',
    timelinePosition: 0,
  },
  {
    id: 'node-2',
    x: 400,
    y: 180,
    title: '发展',
    description: '情节推进中',
    tagId: 'tag-2',
    timelinePosition: 1,
  },
];

let edges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    label: '引发',
  },
];

let tags: Tag[] = [
  { id: 'tag-1', name: '主线', color: '#00cec9' },
  { id: 'tag-2', name: '支线', color: '#fd79a8' },
  { id: 'tag-3', name: '伏笔', color: '#636e72' },
];

let characters: Character[] = [
  { id: 'char-1', name: '主角', description: '故事的主人公' },
  { id: 'char-2', name: '配角', description: '重要的配角' },
];

app.get('/nodes', (req, res) => {
  res.json(nodes);
});

app.post('/nodes', (req, res) => {
  const newNode: Node = { id: uuidv4(), ...req.body };
  nodes.push(newNode);
  res.status(201).json(newNode);
});

app.put('/nodes/:id', (req, res) => {
  const { id } = req.params;
  const index = nodes.findIndex((n) => n.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Node not found' });
    return;
  }
  nodes[index] = { ...nodes[index], ...req.body };
  res.json(nodes[index]);
});

app.delete('/nodes/:id', (req, res) => {
  const { id } = req.params;
  nodes = nodes.filter((n) => n.id !== id);
  edges = edges.filter((e) => e.source !== id && e.target !== id);
  res.json({ success: true });
});

app.get('/edges', (req, res) => {
  res.json(edges);
});

app.post('/edges', (req, res) => {
  const newEdge: Edge = { id: uuidv4(), ...req.body };
  edges.push(newEdge);
  res.status(201).json(newEdge);
});

app.put('/edges/:id', (req, res) => {
  const { id } = req.params;
  const index = edges.findIndex((e) => e.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Edge not found' });
    return;
  }
  edges[index] = { ...edges[index], ...req.body };
  res.json(edges[index]);
});

app.delete('/edges/:id', (req, res) => {
  const { id } = req.params;
  edges = edges.filter((e) => e.id !== id);
  res.json({ success: true });
});

app.get('/tags', (req, res) => {
  res.json(tags);
});

app.post('/tags', (req, res) => {
  const newTag: Tag = { id: uuidv4(), ...req.body };
  tags.push(newTag);
  res.status(201).json(newTag);
});

app.put('/tags/:id', (req, res) => {
  const { id } = req.params;
  const index = tags.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Tag not found' });
    return;
  }
  tags[index] = { ...tags[index], ...req.body };
  res.json(tags[index]);
});

app.delete('/tags/:id', (req, res) => {
  const { id } = req.params;
  tags = tags.filter((t) => t.id !== id);
  res.json({ success: true });
});

app.get('/characters', (req, res) => {
  res.json(characters);
});

app.post('/characters', (req, res) => {
  const newCharacter: Character = { id: uuidv4(), ...req.body };
  characters.push(newCharacter);
  res.status(201).json(newCharacter);
});

app.put('/characters/:id', (req, res) => {
  const { id } = req.params;
  const index = characters.findIndex((c) => c.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  characters[index] = { ...characters[index], ...req.body };
  res.json(characters[index]);
});

app.delete('/characters/:id', (req, res) => {
  const { id } = req.params;
  characters = characters.filter((c) => c.id !== id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
