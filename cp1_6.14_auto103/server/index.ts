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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ROUTES_FILE)) {
    fs.writeFileSync(ROUTES_FILE, JSON.stringify({ routes: [] }, null, 2));
  }
}

function readRoutes(): any {
  ensureDataDir();
  const content = fs.readFileSync(ROUTES_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeRoutes(data: any): void {
  ensureDataDir();
  fs.writeFileSync(ROUTES_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

app.get('/api/routes', (_req, res) => {
  try {
    const data = readRoutes();
    res.json(data.routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read routes' });
  }
});

app.post('/api/routes', (req, res) => {
  try {
    const data = readRoutes();
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
    writeRoutes(data);
    res.status(201).json(newRoute);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create route' });
  }
});

app.get('/api/routes/:id', (req, res) => {
  try {
    const data = readRoutes();
    const route = data.routes.find((r: any) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read route' });
  }
});

app.post('/api/routes/:id/photos', (req, res) => {
  try {
    const data = readRoutes();
    const route = data.routes.find((r: any) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const { waypointId, file, name, thumbnail } = req.body;
    const newPhoto = {
      id: generateId(),
      url: file,
      thumbnail: thumbnail || file,
      name: name || 'photo.jpg',
    };

    const waypoint = route.waypoints.find((w: any) => w.id === waypointId);
    if (waypoint) {
      waypoint.photos.push(newPhoto);
      writeRoutes(data);
      res.status(201).json(newPhoto);
    } else {
      res.status(404).json({ error: 'Waypoint not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

app.get('/api/routes/:id/playback', (req, res) => {
  try {
    const data = readRoutes();
    const route = data.routes.find((r: any) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const sortedWaypoints = [...route.waypoints].sort(
      (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const pathCoords = sortedWaypoints.map((w: any) => [w.lat, w.lng]);

    res.json({
      waypoints: sortedWaypoints,
      path: pathCoords,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playback data' });
  }
});

app.post('/api/routes/:id/favorite', (req, res) => {
  try {
    const data = readRoutes();
    const route = data.routes.find((r: any) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    route.isFavorite = !route.isFavorite;
    writeRoutes(data);
    res.json(route);
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

app.post('/api/routes/:id/reviews', (req, res) => {
  try {
    const data = readRoutes();
    const route = data.routes.find((r: any) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
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
    writeRoutes(data);
    res.status(201).json(newReview);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add review' });
  }
});

app.put('/api/routes/:id', (req, res) => {
  try {
    const data = readRoutes();
    const routeIndex = data.routes.findIndex((r: any) => r.id === req.params.id);
    if (routeIndex === -1) {
      return res.status(404).json({ error: 'Route not found' });
    }
    data.routes[routeIndex] = { ...data.routes[routeIndex], ...req.body };
    writeRoutes(data);
    res.json(data.routes[routeIndex]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update route' });
  }
});

app.listen(PORT, () => {
  ensureDataDir();
  console.log(`RouteRecall backend server running on port ${PORT}`);
});
