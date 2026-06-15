import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mockIdeas } from '../src/data/mockData';
import { Idea, Comment } from '../src/modules/ideaEngine';

const app = express();
const PORT = 3001;

app.use(express.json());

let ideas: Idea[] = JSON.parse(JSON.stringify(mockIdeas));

app.get('/api/ideas', (_req, res) => {
  res.json(ideas);
});

app.post('/api/ideas', (req, res) => {
  const { title, description, category, intuitionScore } = req.body;
  const newIdea: Idea = {
    id: uuidv4(),
    title: title || '',
    description: description || '',
    category: category || '增长',
    intuitionScore: intuitionScore ?? 50,
    createdAt: new Date().toISOString(),
    comments: [],
  };
  ideas.unshift(newIdea);
  res.json(newIdea);
});

app.put('/api/ideas/:id', (req, res) => {
  const { id } = req.params;
  const index = ideas.findIndex((i) => i.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Idea not found' });
    return;
  }
  ideas[index] = { ...ideas[index], ...req.body, id, category: ideas[index].category };
  res.json(ideas[index]);
});

app.delete('/api/ideas/:id', (req, res) => {
  const { id } = req.params;
  ideas = ideas.filter((i) => i.id !== id);
  res.json({ success: true });
});

app.post('/api/ideas/:id/comments', (req, res) => {
  const { id } = req.params;
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    res.status(404).json({ error: 'Idea not found' });
    return;
  }
  const { author, content } = req.body;
  const comment: Comment = {
    id: uuidv4(),
    author: author || 'Anonymous',
    content: content || '',
    createdAt: new Date().toISOString(),
  };
  idea.comments.push(comment);
  res.json(comment);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
