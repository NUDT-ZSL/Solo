import express from 'express';
import cors from 'cors';
import {
  getCurrentSession,
  getSamples,
  getProjects,
  getProjectById,
  saveProject,
  deleteProject
} from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get('/api/session', async (req, res) => {
  try {
    const session = await getCurrentSession();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/samples', async (req, res) => {
  try {
    const { category, search } = req.query;
    const samples = await getSamples(category || null, search || '');
    res.json(samples);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    const formatted = projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      trackCount: (p.tracks || []).filter(t => t.sampleId).length
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: '作品不存在' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const project = await saveProject(req.body);
    res.status(201).json({
      message: '作品保存成功',
      project: {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        trackCount: (project.tracks || []).filter(t => t.sampleId).length
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    await deleteProject(req.params.id);
    res.json({ message: '作品删除成功' });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`RemixBoard API server running on http://localhost:${PORT}`);
});

export default app;
