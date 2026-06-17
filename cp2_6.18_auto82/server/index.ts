import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Tool, Borrow, Repair } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, '../data');

app.use(cors());
app.use(express.json());

const readJSON = <T>(filename: string): T => {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJSON = <T>(filename: string, data: T): void => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/tools', (req, res) => {
  const tools = readJSON<Tool[]>('tools.json');
  res.json(tools);
});

app.get('/api/tools/:id', (req, res) => {
  const tools = readJSON<Tool[]>('tools.json');
  const tool = tools.find(t => t.id === req.params.id);
  if (!tool) {
    res.status(404).json({ error: 'Tool not found' });
    return;
  }
  res.json(tool);
});

app.post('/api/borrow', (req, res) => {
  const { toolId, memberName, duration } = req.body;

  if (!toolId || !memberName || !duration) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const tools = readJSON<Tool[]>('tools.json');
  const tool = tools.find(t => t.id === toolId);

  if (!tool) {
    res.status(404).json({ error: 'Tool not found' });
    return;
  }

  if (tool.status !== 'available') {
    res.status(400).json({ error: 'Tool is not available' });
    return;
  }

  const startTime = dayjs().toISOString();
  const endTime = dayjs().add(duration, 'hour').toISOString();

  const borrow: Borrow = {
    id: uuidv4(),
    toolId,
    toolName: tool.name,
    memberName,
    duration,
    startTime,
    endTime,
    status: 'active',
  };

  const borrows = readJSON<Borrow[]>('borrows.json');
  borrows.push(borrow);
  writeJSON('borrows.json', borrows);

  const toolIndex = tools.findIndex(t => t.id === toolId);
  tools[toolIndex].status = 'borrowed';
  writeJSON('tools.json', tools);

  res.json(borrow);
});

app.get('/api/borrows', (req, res) => {
  const borrows = readJSON<Borrow[]>('borrows.json');
  
  const now = dayjs();
  let hasUpdates = false;
  
  const updatedBorrows = borrows.map(borrow => {
    if (borrow.status === 'active' && now.isAfter(dayjs(borrow.endTime))) {
      hasUpdates = true;
      return { ...borrow, status: 'overdue' as const };
    }
    return borrow;
  });

  if (hasUpdates) {
    writeJSON('borrows.json', updatedBorrows);
  }

  res.json(updatedBorrows);
});

app.post('/api/report/:id', (req, res) => {
  const { id } = req.params;
  const { condition, comment, reporter } = req.body;

  if (!condition || !reporter) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const borrows = readJSON<Borrow[]>('borrows.json');
  const borrowIndex = borrows.findIndex(b => b.id === id);

  if (borrowIndex === -1) {
    res.status(404).json({ error: 'Borrow record not found' });
    return;
  }

  borrows[borrowIndex].status = 'returned';
  borrows[borrowIndex].feedback = {
    condition,
    comment,
    timestamp: dayjs().toISOString(),
  };
  writeJSON('borrows.json', borrows);

  const tools = readJSON<Tool[]>('tools.json');
  const toolIndex = tools.findIndex(t => t.id === borrows[borrowIndex].toolId);

  let repair: Repair | null = null;

  if (condition === 'damaged') {
    repair = {
      id: uuidv4(),
      toolId: borrows[borrowIndex].toolId,
      toolName: borrows[borrowIndex].toolName,
      reporter,
      description: comment,
      createdAt: dayjs().toISOString(),
      status: 'pending',
    };

    const repairs = readJSON<Repair[]>('repairs.json');
    repairs.push(repair);
    writeJSON('repairs.json', repairs);

    if (toolIndex !== -1) {
      tools[toolIndex].status = 'repairing';
      writeJSON('tools.json', tools);
    }
  } else {
    if (toolIndex !== -1) {
      tools[toolIndex].status = 'available';
      writeJSON('tools.json', tools);
    }
  }

  res.json({ borrow: borrows[borrowIndex], repair });
});

app.get('/api/repairs', (req, res) => {
  const repairs = readJSON<Repair[]>('repairs.json');
  const pendingRepairs = repairs.filter(r => r.status === 'pending');
  res.json(pendingRepairs);
});

app.post('/api/repairs/:id/fix', (req, res) => {
  const { id } = req.params;

  const repairs = readJSON<Repair[]>('repairs.json');
  const repairIndex = repairs.findIndex(r => r.id === id);

  if (repairIndex === -1) {
    res.status(404).json({ error: 'Repair ticket not found' });
    return;
  }

  repairs[repairIndex].status = 'fixed';
  writeJSON('repairs.json', repairs);

  const tools = readJSON<Tool[]>('tools.json');
  const toolIndex = tools.findIndex(t => t.id === repairs[repairIndex].toolId);

  if (toolIndex !== -1) {
    tools[toolIndex].status = 'available';
    writeJSON('tools.json', tools);
  }

  res.json(repairs[repairIndex]);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
