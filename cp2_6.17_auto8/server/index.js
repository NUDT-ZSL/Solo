import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const TEAM_FILE = path.join(DATA_DIR, 'team.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

const readJsonFile = (filePath) => {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(rawData);
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/team', (req, res) => {
  try {
    const team = readJsonFile(TEAM_FILE);
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load team data' });
  }
});

app.post('/api/team/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const team = readJsonFile(TEAM_FILE);
    const memberIndex = team.findIndex((m) => m.id === id);

    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }

    team[memberIndex].likes = (team[memberIndex].likes || 0) + 1;
    writeJsonFile(TEAM_FILE, team);
    res.json({ likes: team[memberIndex].likes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update likes' });
  }
});

app.get('/api/tasks', (req, res) => {
  try {
    const tasks = readJsonFile(TASKS_FILE);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.post('/api/tasks/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const tasks = readJsonFile(TASKS_FILE);
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    tasks[taskIndex].status = status;
    writeJsonFile(TASKS_FILE, tasks);
    res.json(tasks[taskIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

app.post('/api/tasks/:id/claim', (req, res) => {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;

    if (!assigneeId) {
      return res.status(400).json({ error: 'assigneeId is required' });
    }

    const tasks = readJsonFile(TASKS_FILE);
    const team = readJsonFile(TEAM_FILE);
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const memberExists = team.some((m) => m.id === assigneeId);
    if (!memberExists) {
      return res.status(404).json({ error: 'Assignee not found' });
    }

    tasks[taskIndex].assigneeId = assigneeId;
    tasks[taskIndex].status = 'in_progress';
    writeJsonFile(TASKS_FILE, tasks);
    res.json(tasks[taskIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to claim task' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
