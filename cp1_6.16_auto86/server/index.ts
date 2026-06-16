import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.wav', '.mp3'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

interface MockUser {
  id: string;
  username: string;
  password: string;
}

interface MockProject {
  id: string;
  name: string;
  userId: string;
  clips: any[];
  lastModified: string;
  thumbnail: string;
}

const users: MockUser[] = [
  { id: 'u1', username: 'demo', password: 'demo123' },
  { id: 'u2', username: 'musician', password: 'music123' },
];

const projects: MockProject[] = [
  {
    id: 'p1',
    name: 'My First Mix',
    userId: 'u1',
    clips: [],
    lastModified: new Date().toISOString(),
    thumbnail: '',
  },
  {
    id: 'p2',
    name: 'Band Session #3',
    userId: 'u1',
    clips: [],
    lastModified: new Date(Date.now() - 86400000).toISOString(),
    thumbnail: '',
  },
];

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ id: user.id, username: user.username, token: `token_${user.id}_${Date.now()}` });
});

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const clipId = path.basename(req.file.filename, path.extname(req.file.filename));
  res.json({
    id: clipId,
    fileName: req.file.originalname,
    filePath: `/uploads/${req.file.filename}`,
    size: req.file.size,
  });
});

app.get('/api/projects', (req, res) => {
  const userId = req.query.userId as string;
  const userProjects = projects.filter((p) => p.userId === userId);
  res.json(userProjects);
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.post('/api/mix/save', (req, res) => {
  const { projectId, name, clips, userId } = req.body;
  const existingIdx = projects.findIndex((p) => p.id === projectId);
  if (existingIdx >= 0) {
    projects[existingIdx] = {
      ...projects[existingIdx],
      name: name || projects[existingIdx].name,
      clips: clips || projects[existingIdx].clips,
      lastModified: new Date().toISOString(),
    };
    return res.json(projects[existingIdx]);
  }
  const newProject: MockProject = {
    id: `p_${Date.now()}`,
    name: name || 'Untitled Project',
    userId,
    clips: clips || [],
    lastModified: new Date().toISOString(),
    thumbnail: '',
  };
  projects.push(newProject);
  res.json(newProject);
});

app.use('/uploads', express.static(uploadDir));

app.listen(PORT, () => {
  console.log(`SoundMix Studio API server running on http://localhost:${PORT}`);
});
