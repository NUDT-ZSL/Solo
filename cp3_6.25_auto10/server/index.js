const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

function readData() {
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/projects', (req, res) => {
  try {
    const data = readData();
    res.json(data.projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/features', (req, res) => {
  try {
    const { id } = req.params;
    const { sort = 'order' } = req.query;
    const data = readData();
    let features = data.features.filter(f => f.projectId === id);

    if (sort === 'net') {
      features = features.sort((a, b) => {
        const netA = a.likes.length - a.dislikes.length;
        const netB = b.likes.length - b.dislikes.length;
        return netB - netA;
      });
    } else {
      features = features.sort((a, b) => a.order - b.order);
    }

    res.json(features);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/features/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = readData();
    const index = data.features.findIndex(f => f.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    data.features[index] = { ...data.features[index], ...req.body, id: data.features[index].id, projectId: data.features[index].projectId };
    writeData(data);
    res.json(data.features[index]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/features/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { author, content } = req.body;
    if (!author || !content) {
      return res.status(400).json({ error: 'author and content are required' });
    }
    const data = readData();
    const feature = data.features.find(f => f.id === id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    const newComment = {
      id: uuidv4(),
      author,
      content,
      timestamp: new Date().toISOString()
    };
    feature.comments.push(newComment);
    writeData(data);
    res.status(201).json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/features/:id/tasks/:taskId', (req, res) => {
  try {
    const { id, taskId } = req.params;
    const { completed } = req.body;
    const data = readData();
    const feature = data.features.find(f => f.id === id);
    if (!feature) {
      return res.status(404).json({ error: 'Feature not found' });
    }
    const task = feature.tasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (typeof completed !== 'undefined') {
      task.completed = completed;
    } else {
      task.completed = !task.completed;
    }
    writeData(data);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});