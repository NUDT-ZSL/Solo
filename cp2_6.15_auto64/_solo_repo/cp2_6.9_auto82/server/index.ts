import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasProject, StickyNote, Connection } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const projects: Map<string, CanvasProject> = new Map();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', projects: projects.size });
});

app.post('/api/stickies', (req, res) => {
  try {
    const { stickies, connections } = req.body as {
      stickies: StickyNote[];
      connections: Connection[];
    };

    const projectId = uuidv4();
    const project: CanvasProject = {
      id: projectId,
      stickies,
      connections,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    projects.set(projectId, project);
    res.json({ id: projectId, success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save project', success: false });
  }
});

app.get('/api/stickies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = projects.get(id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load project' });
  }
});

app.post('/api/export', (_req, res) => {
  try {
    res.json({ success: true, message: 'Export endpoint ready' });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Brainstorm canvas server running on http://localhost:${PORT}`);
});
