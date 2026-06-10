import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface MindMapNode {
  id: string;
  title: string;
  x: number;
  y: number;
}

interface MindMapConnection {
  id: string;
  fromId: string;
  toId: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  sketchData: string;
  mindMapNodes: MindMapNode[];
  mindMapConnections: MindMapConnection[];
  createdAt: number;
  updatedAt: number;
}

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

const notesStore = new Map<string, Note>();
const shareTokens = new Map<string, string>();

const createSampleNote = (): Note => {
  const now = Date.now();
  return {
    id: uuidv4(),
    title: '欢迎使用织梦笔记',
    content: '<h2>开始创建你的第一篇笔记</h2><p>这是一款支持<strong>富文本编辑</strong>、<em>手绘草图</em>和<u>思维导图</u>的知识管理工具。</p><ul><li>点击上方工具栏可以格式化文本</li><li>从编辑器拖拽内容到右侧生成思维导图节点</li><li>在节点之间拖拽创建关联线</li></ul><pre><code>const greeting = "Hello, 织梦笔记!";\nconsole.log(greeting);</code></pre>',
    sketchData: '',
    mindMapNodes: [
      { id: uuidv4(), title: '核心概念', x: 80, y: 80 },
      { id: uuidv4(), title: '使用方法', x: 320, y: 80 },
      { id: uuidv4(), title: '进阶技巧', x: 200, y: 220 },
    ],
    mindMapConnections: [],
    createdAt: now,
    updatedAt: now,
  };
};

const sampleNote = createSampleNote();
notesStore.set(sampleNote.id, sampleNote);

app.get('/api/notes', (_req, res) => {
  const notes = Array.from(notesStore.values()).map(n => ({
    id: n.id,
    title: n.title,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
  res.json(notes);
});

app.get('/api/notes/:id', (req, res) => {
  const note = notesStore.get(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  res.json(note);
});

app.post('/api/notes', (req, res) => {
  const now = Date.now();
  const note: Note = {
    id: uuidv4(),
    title: req.body.title || '新建笔记',
    content: '',
    sketchData: '',
    mindMapNodes: [],
    mindMapConnections: [],
    createdAt: now,
    updatedAt: now,
  };
  notesStore.set(note.id, note);
  res.status(201).json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const note = notesStore.get(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  const updated: Note = {
    ...note,
    ...req.body,
    id: note.id,
    createdAt: note.createdAt,
    updatedAt: Date.now(),
  };
  notesStore.set(note.id, updated);
  res.json(updated);
});

app.delete('/api/notes/:id', (req, res) => {
  const deleted = notesStore.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/notes/:id/share', (req, res) => {
  const note = notesStore.get(req.params.id);
  if (!note) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }
  const token = uuidv4().slice(0, 8);
  shareTokens.set(token, note.id);
  const shareUrl = `${req.protocol}://${req.get('host')}/share/${token}`;
  res.json({ shareUrl });
});

app.listen(PORT, () => {
  console.log(`织梦笔记后端服务运行在 http://localhost:${PORT}`);
});
