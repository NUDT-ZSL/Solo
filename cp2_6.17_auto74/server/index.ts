import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import type { Tool, BorrowRecord, RepairOrder } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOOLS_FILE = path.join(DATA_DIR, 'tools.json');
const BORROWS_FILE = path.join(DATA_DIR, 'borrows.json');
const REPAIRS_FILE = path.join(DATA_DIR, 'repairs.json');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const readJSONFile = <T>(filePath: string): T => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJSONFile = <T>(filePath: string, data: T): void => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/tools', (_req: Request, res: Response) => {
  try {
    const tools = readJSONFile<Tool[]>(TOOLS_FILE);
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tools' });
  }
});

app.get('/api/tools/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tools = readJSONFile<Tool[]>(TOOLS_FILE);
    const tool = tools.find((t) => t.id === id);

    if (!tool) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }

    const borrows = readJSONFile<BorrowRecord[]>(BORROWS_FILE);
    const toolBorrows = borrows
      .filter((b) => b.toolId === id)
      .sort((a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf())
      .slice(0, 3)
      .map((b) => ({
        id: b.id,
        userName: b.userName,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        condition: b.feedback?.condition || null,
      }));

    res.json({ tool, recentBorrows: toolBorrows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load tool detail' });
  }
});

app.post('/api/borrow', (req: Request, res: Response) => {
  try {
    const { toolId, userId, userName, durationHours } = req.body;

    if (!toolId || !userId || !userName || !durationHours) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const tools = readJSONFile<Tool[]>(TOOLS_FILE);
    const toolIndex = tools.findIndex((t) => t.id === toolId);

    if (toolIndex === -1) {
      res.status(404).json({ error: 'Tool not found' });
      return;
    }

    if (tools[toolIndex].status !== 'available') {
      res.status(400).json({ error: 'Tool is not available for borrowing' });
      return;
    }

    tools[toolIndex].status = 'borrowed';
    writeJSONFile(TOOLS_FILE, tools);

    const startTime = new Date().toISOString();
    const endTime = dayjs(startTime).add(durationHours, 'hour').toISOString();

    const borrowRecord: BorrowRecord = {
      id: uuidv4(),
      toolId,
      toolName: tools[toolIndex].name,
      toolPhoto: tools[toolIndex].photo,
      userName,
      userId,
      durationHours,
      startTime,
      endTime,
      status: 'active',
    };

    const borrows = readJSONFile<BorrowRecord[]>(BORROWS_FILE);
    borrows.unshift(borrowRecord);
    writeJSONFile(BORROWS_FILE, borrows);

    res.json({ success: true, borrow: borrowRecord });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create borrow record' });
  }
});

app.get('/api/borrows', (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const borrows = readJSONFile<BorrowRecord[]>(BORROWS_FILE);

    const updatedBorrows = borrows.map((borrow) => {
      if (borrow.status === 'active' && dayjs(borrow.endTime).isBefore(dayjs())) {
        return { ...borrow, status: 'overdue' as const };
      }
      return borrow;
    });

    const hasOverdueChange = borrows.some(
      (b, i) => b.status !== updatedBorrows[i].status
    );
    if (hasOverdueChange) {
      writeJSONFile(BORROWS_FILE, updatedBorrows);
    }

    let result = updatedBorrows;
    if (userId) {
      result = updatedBorrows.filter((b) => b.userId === userId);
    }

    result.sort(
      (a, b) => dayjs(b.startTime).valueOf() - dayjs(a.startTime).valueOf()
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load borrow records' });
  }
});

app.post('/api/report', (req: Request, res: Response) => {
  try {
    const { borrowId, condition, comment } = req.body;

    if (!borrowId || !condition || comment === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const borrows = readJSONFile<BorrowRecord[]>(BORROWS_FILE);
    const borrowIndex = borrows.findIndex((b) => b.id === borrowId);

    if (borrowIndex === -1) {
      res.status(404).json({ error: 'Borrow record not found' });
      return;
    }

    borrows[borrowIndex].feedback = {
      condition,
      comment,
      submittedAt: new Date().toISOString(),
    };
    borrows[borrowIndex].status = 'returned';

    const tools = readJSONFile<Tool[]>(TOOLS_FILE);
    const toolIndex = tools.findIndex((t) => t.id === borrows[borrowIndex].toolId);

    if (condition === 'damaged') {
      if (toolIndex !== -1) {
        tools[toolIndex].status = 'repairing';
      }

      const repairOrder: RepairOrder = {
        id: uuidv4(),
        toolId: borrows[borrowIndex].toolId,
        toolName: borrows[borrowIndex].toolName,
        reporterId: borrows[borrowIndex].userId,
        reporterName: borrows[borrowIndex].userName,
        description: comment || '工具损坏，需要维修',
        createdAt: new Date().toISOString(),
        status: 'pending',
      };

      const repairs = readJSONFile<RepairOrder[]>(REPAIRS_FILE);
      repairs.unshift(repairOrder);
      writeJSONFile(REPAIRS_FILE, repairs);
    } else if (toolIndex !== -1 && tools[toolIndex].status !== 'repairing') {
      tools[toolIndex].status = 'available';
    }

    writeJSONFile(TOOLS_FILE, tools);
    writeJSONFile(BORROWS_FILE, borrows);

    res.json({ success: true, borrow: borrows[borrowIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

app.get('/api/repairs', (_req: Request, res: Response) => {
  try {
    const repairs = readJSONFile<RepairOrder[]>(REPAIRS_FILE);
    const pending = repairs.filter((r) => r.status === 'pending');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load repair orders' });
  }
});

app.post('/api/repairs/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const repairs = readJSONFile<RepairOrder[]>(REPAIRS_FILE);
    const repairIndex = repairs.findIndex((r) => r.id === id);

    if (repairIndex === -1) {
      res.status(404).json({ error: 'Repair order not found' });
      return;
    }

    repairs[repairIndex].status = 'resolved';
    repairs[repairIndex].resolvedAt = new Date().toISOString();

    const tools = readJSONFile<Tool[]>(TOOLS_FILE);
    const toolIndex = tools.findIndex((t) => t.id === repairs[repairIndex].toolId);
    if (toolIndex !== -1) {
      tools[toolIndex].status = 'available';
      writeJSONFile(TOOLS_FILE, tools);
    }

    writeJSONFile(REPAIRS_FILE, repairs);

    res.json({ success: true, repair: repairs[repairIndex] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve repair order' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Workshop API server running on http://localhost:${PORT}`);
});
