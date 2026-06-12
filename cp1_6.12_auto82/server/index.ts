import express, { Request, Response } from 'express';
import cors from 'cors';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RoutePoint {
  lat: number;
  lng: number;
}

interface RunningRoute {
  id: string;
  date: string;
  distance: number;
  avgPace: number;
  coordinates: RoutePoint[];
}

interface DatabaseData {
  routes: RunningRoute[];
}

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile<DatabaseData>(file);
const defaultData: DatabaseData = { routes: [] };
const db = new Low<DatabaseData>(adapter, defaultData);

await db.read();
if (!db.data) {
  db.data = defaultData;
  await db.write();
}

const generateId = (): string =>
  Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

const haversineDistance = (coords: RoutePoint[]): number => {
  if (coords.length < 2) return 0;
  const R = 6371;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const dLat = ((coords[i].lat - coords[i - 1].lat) * Math.PI) / 180;
    const dLng = ((coords[i].lng - coords[i - 1].lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coords[i - 1].lat * Math.PI) / 180) *
        Math.cos((coords[i].lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    total += R * c;
  }
  return Math.round(total * 100) / 100;
};

app.get('/api/routes', async (_req: Request, res: Response) => {
  try {
    await db.read();
    res.json(db.data!.routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read routes' });
  }
});

app.post('/api/routes', async (req: Request, res: Response) => {
  try {
    const { date, avgPace, coordinates } = req.body as {
      date?: string;
      avgPace?: number;
      coordinates: RoutePoint[];
    };

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 5) {
      return res
        .status(400)
        .json({ error: '至少需要5个坐标点' });
    }

    const validCoords = coordinates
      .filter(
        (p) =>
          typeof p.lat === 'number' &&
          typeof p.lng === 'number' &&
          !isNaN(p.lat) &&
          !isNaN(p.lng)
      );

    if (validCoords.length < 5) {
      return res
        .status(400)
        .json({ error: '有效坐标点不足5个' });
    }

    const distance = haversineDistance(validCoords);
    const finalDate = date || new Date().toISOString().split('T')[0];
    const finalAvgPace =
      typeof avgPace === 'number' && !isNaN(avgPace)
        ? avgPace
        : distance > 0
        ? parseFloat((30 / distance).toFixed(2))
        : 6;

    const newRoute: RunningRoute = {
      id: generateId(),
      date: finalDate,
      distance,
      avgPace: finalAvgPace,
      coordinates: validCoords,
    };

    await db.read();
    db.data!.routes.push(newRoute);
    await db.write();

    res.status(201).json(newRoute);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建路线失败' });
  }
});

app.listen(port, () => {
  console.log(`Running route server listening on port ${port}`);
});
