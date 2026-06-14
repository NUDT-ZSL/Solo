import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const ROUTES_FILE = path.join(DATA_DIR, 'routes.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let fileLock = Promise.resolve();

async function withFileLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const previousLock = fileLock;
  let releaseLock: () => void;
  fileLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  try {
    await previousLock;
    return await fn();
  } finally {
    releaseLock!();
  }
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROUTES_FILE)) {
    fs.writeFileSync(ROUTES_FILE, JSON.stringify({ routes: [] }, null, 2));
  }
}

function readRoutesSync(): any {
  ensureDataDir();
  const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeRoutesSync(data: any): void {
  ensureDataDir();
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

app.get('/api/routes', async (_req, res) => {
  try {
    const data = await withFileLock(() => readRoutesSync());
    res.json(data.routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read routes' });
  }
});

app.post('/api/routes', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const { name, description, waypoints } = req.body;
      const newRoute = {
        id: generateId(),
        name: name || '新路线',
        description: description || '',
        waypoints: waypoints || [],
        isFavorite: false,
        reviews: [],
        createdAt: new Date().toISOString(),
      };
      data.routes.push(newRoute);
      writeRoutesSync(data);
      return newRoute;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.get('/api/routes/:id', async (req, res) => {
  try {
    const route = await withFileLock(() => {
      const data = readRoutesSync();
      return data.routes.find((r: any) => r.id === req.params.id);
    });
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read route' });
  }
});

app.post('/api/routes/:id/photos', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const route = data.routes.find((r: any) => r.id === req.params.id);
      if (!route) return { error: 'Route not found', status: 404 };

      const { waypointId, file, name, thumbnail } = req.body;
      const newPhoto = {
        id: generateId(),
        url: file,
        thumbnail: thumbnail || file,
        name: name || 'photo.jpg',
      };

      const waypoint = route.waypoints.find((w: any) => w.id === waypointId);
      if (!waypoint) return { error: 'Waypoint not found', status: 404 };

      waypoint.photos.push(newPhoto);
      writeRoutesSync(data);
      return { photo: newPhoto, status: 201 };
    });

    if (result.status === 404) {
      return res.status(404).json({ error: result.error });
    }
    res.status(201).json(result.photo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

app.get('/api/routes/:id/playback', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const route = data.routes.find((r: any) => r.id === req.params.id);
      if (!route) return null;

      const sortedWaypoints = [...route.waypoints].sort(
        (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const pathCoords = sortedWaypoints.map((w: any) => [w.lat, w.lng]);

      return {
        waypoints: sortedWaypoints,
        path: pathCoords,
      };
    });

    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playback data' });
  }
});

app.post('/api/routes/:id/favorite', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const route = data.routes.find((r: any) => r.id === req.params.id);
      if (!route) return null;
      route.isFavorite = !route.isFavorite;
      writeRoutesSync(data);
      return route;
    });
    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

app.post('/api/routes/:id/reviews', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const route = data.routes.find((r: any) => r.id === req.params.id);
      if (!route) return null;
      const { userName, content, rating, avatar } = req.body;
      const newReview = {
        id: generateId(),
        userId: generateId(),
        userName: userName || '匿名用户',
        avatar: avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        content: content || '',
        rating: rating || 5,
        createdAt: new Date().toISOString(),
      };
      route.reviews.push(newReview);
      writeRoutesSync(data);
      return newReview;
    });
    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

app.put('/api/routes/:id', async (req, res) => {
  try {
    const result = await withFileLock(() => {
      const data = readRoutesSync();
      const routeIndex = data.routes.findIndex((r: any) => r.id === req.params.id);
      if (routeIndex === -1) return null;
      data.routes[routeIndex] = { ...data.routes[routeIndex], ...req.body };
      writeRoutesSync(data);
      return data.routes[routeIndex];
    });
    if (!result) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update route' });
  }
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`RouteRecall backend server running on port ${PORT}`);
});
