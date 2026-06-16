import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getScorePath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

function getVersionsPath(id: string) {
  return path.join(DATA_DIR, `${id}_versions.json`);
}

function readJsonFile(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getClientIp(req: express.Request): string {
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const parts = ip.replace('::ffff:', '').split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  return ip.substring(0, 8);
}

app.get('/api/scores', (_req, res) => {
  try {
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json') && !f.includes('_versions'));
    const scores = files.map(f => {
      const data = readJsonFile(path.join(DATA_DIR, f));
      return data;
    }).filter(Boolean);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list scores' });
  }
});

app.get('/api/scores/:id', (req, res) => {
  const data = readJsonFile(getScorePath(req.params.id));
  if (!data) {
    return res.status(404).json({ error: 'Score not found' });
  }
  res.json(data);
});

app.post('/api/scores', (req, res) => {
  const scoreData = req.body;
  const id = scoreData.id || uuidv4();
  scoreData.id = id;

  writeJsonFile(getScorePath(id), scoreData);

  const versionsPath = getVersionsPath(id);
  const versions = readJsonFile(versionsPath) || [];
  const nextVersion = versions.length + 1;
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);
  const authorIp = getClientIp(req);

  versions.push({
    version: nextVersion,
    timestamp,
    authorIp,
    data: { ...scoreData },
  });

  writeJsonFile(versionsPath, versions);

  res.json({ version: nextVersion, id });
});

app.get('/api/scores/:id/versions', (req, res) => {
  const versions = readJsonFile(getVersionsPath(req.params.id));
  if (!versions) {
    return res.json([]);
  }
  const summary = versions.map((v: any) => ({
    version: v.version,
    timestamp: v.timestamp,
    authorIp: v.authorIp,
  }));
  res.json(summary);
});

app.get('/api/scores/:id/versions/:version', (req, res) => {
  const versions = readJsonFile(getVersionsPath(req.params.id));
  if (!versions) {
    return res.status(404).json({ error: 'No versions found' });
  }
  const ver = versions.find((v: any) => v.version === parseInt(req.params.version));
  if (!ver) {
    return res.status(404).json({ error: 'Version not found' });
  }
  res.json(ver);
});

app.listen(PORT, () => {
  console.log(`🎵 Score server running on http://localhost:${PORT}`);
});
