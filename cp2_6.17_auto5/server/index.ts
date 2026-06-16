import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Alert, Report, Bounds } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_DIR = join(__dirname, 'data');
const ALERTS_FILE = join(DATA_DIR, 'alerts.json');
const REPORTS_FILE = join(DATA_DIR, 'reports.json');

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

async function readAlerts(): Promise<Alert[]> {
  const data = await readFile(ALERTS_FILE, 'utf-8');
  return JSON.parse(data) as Alert[];
}

async function readReports(): Promise<Report[]> {
  const data = await readFile(REPORTS_FILE, 'utf-8');
  return JSON.parse(data) as Report[];
}

async function writeReports(reports: Report[]): Promise<void> {
  await writeFile(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
}

app.get('/api/alerts', async (req: Request, res: Response<Alert[] | { error: string }>) => {
  try {
    const { region, from, to } = req.query;
    let alerts = await readAlerts();
    const now = new Date();

    alerts = alerts.filter(alert => new Date(alert.endTime) > now);

    if (typeof region === 'string' && region.trim()) {
      alerts = alerts.filter(alert => alert.region.includes(region.trim()));
    }

    if (typeof from === 'string' && from) {
      const fromDate = new Date(from);
      alerts = alerts.filter(alert => new Date(alert.startTime) >= fromDate);
    }

    if (typeof to === 'string' && to) {
      const toDate = new Date(to);
      alerts = alerts.filter(alert => new Date(alert.endTime) <= toDate);
    }

    alerts.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/reports', async (req: Request, res: Response<Report[] | { error: string }>) => {
  try {
    const { bounds } = req.query;
    let reports = await readReports();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    reports = reports.filter(report => new Date(report.createdAt) >= twentyFourHoursAgo);

    if (typeof bounds === 'string' && bounds) {
      const [westStr, southStr, eastStr, northStr] = bounds.split(',');
      const west = parseFloat(westStr);
      const south = parseFloat(southStr);
      const east = parseFloat(eastStr);
      const north = parseFloat(northStr);

      if (!isNaN(west) && !isNaN(south) && !isNaN(east) && !isNaN(north)) {
        reports = reports.filter(report => {
          const { lat, lng } = report.coordinates;
          return lng >= west && lng <= east && lat >= south && lat <= north;
        });
      }
    }

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

app.post('/api/reports', async (req: Request<unknown, unknown, Omit<Report, 'id' | 'createdAt'>>, res: Response<Report | { error: string }>) => {
  try {
    const { title, description, type, coordinates, region } = req.body;

    if (!title || !description || !type || !coordinates || !region) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const reports = await readReports();
    const newReport: Report = {
      id: uuidv4(),
      title,
      description,
      type,
      coordinates,
      region,
      createdAt: new Date().toISOString()
    };

    reports.push(newReport);
    await writeReports(reports);

    res.status(201).json(newReport);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create report' });
  }
});

app.get('/api/reports/:id', async (req: Request<{ id: string }>, res: Response<Report | { error: string }>) => {
  try {
    const { id } = req.params;
    const reports = await readReports();
    const report = reports.find(r => r.id === id);

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
