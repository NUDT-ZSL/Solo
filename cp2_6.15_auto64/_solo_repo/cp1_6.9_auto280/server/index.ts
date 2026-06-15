import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore - lowdb v6 ESM compatibility
import { Low } from 'lowdb';
// @ts-ignore - lowdb v6 ESM compatibility
import { Memory } from 'lowdb/node';

interface Node {
  id: string;
  text: string;
  x: number;
  y: number;
  hue: number;
  createdAt: number;
}

interface Edge {
  id: string;
  from: string;
  to: string;
  spark: string;
  likes: number;
  curvature: number;
  createdAt: number;
}

interface Network {
  id: string;
  nodes: Node[];
  edges: Edge[];
  creator: string;
  createdAt: number;
}

interface Database {
  nodes: Record<string, Node>;
  edges: Record<string, Edge>;
  networks: Record<string, Network>;
}

const defaultData: Database = {
  nodes: {},
  edges: {},
  networks: {},
};

const adapter = new Memory<Database>(defaultData);
const db = new Low<Database>(adapter, defaultData);

const synonyms: Record<string, string[]> = {
  创意: ['创新', '灵感', '想法', '点子'],
  爱: ['喜欢', '情感', '温暖', '关怀'],
  梦想: ['理想', '希望', '目标', '愿景'],
  自由: ['独立', '解放', '无拘无束', '自在'],
  艺术: ['美学', '创造', '设计', '美感'],
  科技: ['技术', '未来', '创新', '进步'],
  音乐: ['旋律', '节奏', '和声', '乐章'],
  书: ['阅读', '知识', '文字', '故事'],
  旅行: ['探索', '冒险', '远方', '发现'],
  家: ['温暖', '港湾', '归属', '安全'],
  朋友: ['伙伴', '友情', '陪伴', '信任'],
  工作: ['事业', '奋斗', '成长', '努力'],
  学习: ['成长', '进步', '知识', '探索'],
  自然: ['森林', '大海', '山川', '生态'],
  光: ['希望', '温暖', '明亮', '指引'],
  水: ['流动', '生命', '清澈', '源泉'],
  火: ['热情', '能量', '燃烧', '激情'],
  风: ['自由', '变化', '流动', '轻盈'],
  时间: ['流逝', '永恒', '记忆', '历史'],
  生命: ['存在', '意义', '成长', '奇迹'],
};

const connectors = [
  '×', '+', '∩', '∪', '·', '|', '&', '→', '↔', '⇌',
];

const prefixes = [
  '新生的', '闪耀的', '静默的', '流动的', '永恒的',
  '灵动的', '温暖的', '深邃的', '轻盈的', '炽热的',
  '静谧的', '绚烂的', '纯净的', '自由的', '诗意的',
];

const suffixes = [
  '之舞', '之歌', '之诗', '之光', '之境',
  '之力', '之韵', '之梦', '之心', '之源',
  '之旅', '之翼', '之约', '之痕', '之语',
];

function generateSpark(text1: string, text2: string): string {
  const t1 = text1.trim();
  const t2 = text2.trim();
  
  const s1 = synonyms[t1] || [];
  const s2 = synonyms[t2] || [];
  
  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  const patterns = [
    () => {
      const prefix = random(prefixes);
      const connector = random(connectors);
      return `${prefix}${t1}${connector}${t2}`;
    },
    () => {
      const suffix = random(suffixes);
      const connector = random(connectors);
      return `${t1}${connector}${t2}${suffix}`;
    },
    () => {
      const w1 = s1.length > 0 ? random(s1) : t1;
      const w2 = s2.length > 0 ? random(s2) : t2;
      const prefix = random(prefixes);
      return `${prefix}${w1}·${w2}`;
    },
    () => {
      const w1 = s1.length > 0 ? random(s1) : t1;
      const w2 = s2.length > 0 ? random(s2) : t2;
      return `${t1}→${w2}`;
    },
    () => {
      const prefix = random(prefixes);
      const suffix = random(suffixes);
      return `${prefix}${t1}${t2}${suffix}`;
    },
  ];
  
  const pattern = random(patterns);
  return pattern();
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/nodes', async (req, res) => {
  const { id, text, x, y, hue } = req.body;
  
  if (!text || x === undefined || y === undefined) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  await db.read();
  const nodeId = id || uuidv4();
  const node: Node = {
    id: nodeId,
    text,
    x,
    y,
    hue: hue ?? Math.floor(Math.random() * 360),
    createdAt: db.data.nodes[nodeId]?.createdAt || Date.now(),
  };
  
  db.data.nodes[nodeId] = node;
  await db.write();
  
  res.json(node);
});

app.get('/api/nodes/:id', async (req, res) => {
  const { id } = req.params;
  await db.read();
  const node = db.data.nodes[id];
  
  if (!node) {
    return res.status(404).json({ error: '节点不存在' });
  }
  
  res.json(node);
});

app.post('/api/edges', async (req, res) => {
  const { from, to } = req.body;
  
  if (!from || !to) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  await db.read();
  
  const node1 = db.data.nodes[from];
  const node2 = db.data.nodes[to];
  
  if (!node1 || !node2) {
    return res.status(404).json({ error: '节点不存在' });
  }
  
  const edgeId = uuidv4();
  const spark = generateSpark(node1.text, node2.text);
  const edge: Edge = {
    id: edgeId,
    from,
    to,
    spark,
    likes: 0,
    curvature: 0.2 + Math.random() * 0.3,
    createdAt: Date.now(),
  };
  
  db.data.edges[edgeId] = edge;
  await db.write();
  
  res.json(edge);
});

app.post('/api/edges/:id/like', async (req, res) => {
  const { id } = req.params;
  await db.read();
  
  const edge = db.data.edges[id];
  if (!edge) {
    return res.status(404).json({ error: '连线不存在' });
  }
  
  edge.likes += 1;
  await db.write();
  
  res.json({ id, likes: edge.likes });
});

app.get('/api/sparks/top', async (_req, res) => {
  await db.read();
  
  const edges = Object.values(db.data.edges)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10)
    .map((edge) => {
      const fromNode = db.data.nodes[edge.from];
      const toNode = db.data.nodes[edge.to];
      return {
        id: edge.id,
        spark: edge.spark,
        likes: edge.likes,
        fromText: fromNode?.text || '',
        toText: toNode?.text || '',
        fromHue: fromNode?.hue ?? 0,
        toHue: toNode?.hue ?? 0,
      };
    });
  
  res.json(edges);
});

app.post('/api/networks/save', async (req, res) => {
  const { nodes, edges, creator } = req.body;
  
  if (!nodes || !edges) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  await db.read();
  
  nodes.forEach((n: Omit<Node, 'createdAt'> & { createdAt?: number }) => {
    db.data.nodes[n.id] = {
      ...n,
      createdAt: n.createdAt || Date.now(),
    };
  });
  
  edges.forEach((e: Omit<Edge, 'createdAt'> & { createdAt?: number }) => {
    db.data.edges[e.id] = {
      ...e,
      createdAt: e.createdAt || Date.now(),
    };
  });
  
  const networkId = uuidv4();
  const network: Network = {
    id: networkId,
    nodes: nodes.map((n: Node) => db.data.nodes[n.id]),
    edges: edges.map((e: Edge) => db.data.edges[e.id]),
    creator: creator || '匿名创作者',
    createdAt: Date.now(),
  };
  
  db.data.networks[networkId] = network;
  await db.write();
  
  res.json({ url: `/network/${networkId}`, ...network, id: networkId });
});

app.get('/api/networks/:id', async (req, res) => {
  const { id } = req.params;
  await db.read();
  
  const network = db.data.networks[id];
  if (!network) {
    return res.status(404).json({ error: '网络不存在' });
  }
  
  res.json(network);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`灵感织网后端服务器运行在 http://localhost:${PORT}`);
});
