import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const DATA_DIR = path.join(__dirname, 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const TRASH_FILE = path.join(DATA_DIR, 'trash.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const PREDEFINED_TAGS = ['工作', '学习', '生活', '灵感', '待办'];

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTES_FILE)) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify([]));
  }
  if (!fs.existsSync(TRASH_FILE)) {
    fs.writeFileSync(TRASH_FILE, JSON.stringify([]));
  }
};

ensureDataDir();

const readNotes = () => {
  try {
    const data = fs.readFileSync(NOTES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeNotes = (notes) => {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2));
};

const readTrash = () => {
  try {
    const data = fs.readFileSync(TRASH_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const writeTrash = (trash) => {
  fs.writeFileSync(TRASH_FILE, JSON.stringify(trash, null, 2));
};

app.get('/api/tags', (req, res) => {
  res.json({ tags: PREDEFINED_TAGS });
});

app.get('/api/notes', (req, res) => {
  let notes = readNotes();
  const { search, sort = 'desc', tag } = req.query;

  if (tag) {
    notes = notes.filter(note => note.tags && note.tags.includes(tag));
  }

  if (search) {
    const keyword = String(search).toLowerCase();
    notes = notes.filter(note =>
      note.title.toLowerCase().includes(keyword) ||
      note.content.toLowerCase().includes(keyword)
    );
  }

  notes.sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return sort === 'asc' ? timeA - timeB : timeB - timeA;
  });

  res.json({ notes });
});

app.get('/api/notes/:id', (req, res) => {
  const notes = readNotes();
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    res.json({ note });
  } else {
    res.status(404).json({ error: '笔记不存在' });
  }
});

app.post('/api/notes', (req, res) => {
  const notes = readNotes();
  const now = new Date().toISOString();
  const newNote = {
    id: uuidv4(),
    title: req.body.title || '无标题笔记',
    content: req.body.content || '',
    tags: req.body.tags || [],
    createdAt: now,
    updatedAt: now,
    cursorPosition: req.body.cursorPosition || 0
  };
  notes.unshift(newNote);
  writeNotes(notes);
  res.status(201).json({ note: newNote });
});

app.put('/api/notes/:id', (req, res) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  const now = new Date().toISOString();
  notes[index] = {
    ...notes[index],
    title: req.body.title !== undefined ? req.body.title : notes[index].title,
    content: req.body.content !== undefined ? req.body.content : notes[index].content,
    tags: req.body.tags !== undefined ? req.body.tags : notes[index].tags,
    updatedAt: now,
    cursorPosition: req.body.cursorPosition !== undefined ? req.body.cursorPosition : notes[index].cursorPosition
  };
  writeNotes(notes);
  res.json({ note: notes[index] });
});

app.delete('/api/notes/:id', (req, res) => {
  const notes = readNotes();
  const index = notes.findIndex(n => n.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  const [deletedNote] = notes.splice(index, 1);
  writeNotes(notes);

  const trash = readTrash();
  trash.unshift({
    ...deletedNote,
    deletedAt: new Date().toISOString()
  });
  writeTrash(trash);

  res.json({ message: '已移至回收站', note: deletedNote });
});

app.get('/api/trash', (req, res) => {
  let trash = readTrash();
  const { search } = req.query;

  if (search) {
    const keyword = String(search).toLowerCase();
    trash = trash.filter(note =>
      note.title.toLowerCase().includes(keyword) ||
      note.content.toLowerCase().includes(keyword)
    );
  }

  trash.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  res.json({ trash });
});

app.post('/api/trash/:id/restore', (req, res) => {
  const trash = readTrash();
  const index = trash.findIndex(n => n.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '回收站中未找到该笔记' });
  }
  const [restoredNote] = trash.splice(index, 1);
  delete restoredNote.deletedAt;
  writeTrash(trash);

  const notes = readNotes();
  notes.unshift(restoredNote);
  writeNotes(notes);

  res.json({ message: '笔记已恢复', note: restoredNote });
});

app.delete('/api/trash/:id', (req, res) => {
  const trash = readTrash();
  const index = trash.findIndex(n => n.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '回收站中未找到该笔记' });
  }
  const [permanentlyDeleted] = trash.splice(index, 1);
  writeTrash(trash);
  res.json({ message: '已永久删除', note: permanentlyDeleted });
});

app.delete('/api/trash', (req, res) => {
  writeTrash([]);
  res.json({ message: '回收站已清空' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`浮墨记服务器运行在 http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
