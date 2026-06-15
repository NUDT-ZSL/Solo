import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

export interface PhotoData {
  id: string;
  imageData: string;
  originalImage: string;
  dominantColor: string;
  lat: number;
  lng: number;
  position: { x: number; y: number; z: number };
  title: string;
  description: string;
}

export interface SphereState {
  rotation: { x: number; y: number };
  zoom: number;
}

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e8,
});

const photos: PhotoData[] = [];
const MAX_PHOTOS = 15;
const SPHERE_RADIUS = 5;

function latLngToVector(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function distributeOnSphere(index: number, total: number) {
  const offset = 2 / total;
  const increment = Math.PI * (3 - Math.sqrt(5));
  const y = index * offset - 1 + offset / 2;
  const r = Math.sqrt(1 - y * y);
  const phi = index * increment;
  const x = Math.cos(phi) * r;
  const z = Math.sin(phi) * r;
  const lat = 90 - (Math.acos(y) * 180) / Math.PI;
  const lng = (phi * 180) / Math.PI - 180;
  return { lat, lng, x: x * SPHERE_RADIUS, y: y * SPHERE_RADIUS, z: z * SPHERE_RADIUS };
}

app.get('/api/photos', (_req, res) => {
  res.json({ photos, count: photos.length, max: MAX_PHOTOS });
});

app.get('/api/photos/:id', (req, res) => {
  const photo = photos.find(p => p.id === req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  res.json(photo);
});

app.post('/api/photos', async (req, res) => {
  try {
    const { imageData, originalImage, dominantColor, title, description } = req.body;
    if (photos.length >= MAX_PHOTOS) {
      return res.status(400).json({ error: `Max ${MAX_PHOTOS} photos allowed` });
    }
    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    const index = photos.length;
    const { lat, lng, x, y, z } = distributeOnSphere(index, MAX_PHOTOS);

    const photo: PhotoData = {
      id: uuidv4(),
      imageData,
      originalImage,
      dominantColor,
      lat,
      lng,
      position: { x, y, z },
      title: title || `照片 ${index + 1}`,
      description: description || '',
    };

    photos.push(photo);
    io.emit('photos:updated', { photos });
    io.emit('photo:added', { photo });
    res.json({ photo, count: photos.length, max: MAX_PHOTOS });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/photos/:id', (req, res) => {
  const idx = photos.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Photo not found' });
  const [removed] = photos.splice(idx, 1);
  photos.forEach((p, i) => {
    const { lat, lng, x, y, z } = distributeOnSphere(i, MAX_PHOTOS);
    p.lat = lat; p.lng = lng; p.position = { x, y, z };
  });
  io.emit('photos:updated', { photos });
  io.emit('photo:removed', { id: removed.id });
  res.json({ count: photos.length, max: MAX_PHOTOS });
});

app.delete('/api/photos', (_req, res) => {
  photos.length = 0;
  io.emit('photos:updated', { photos: [] });
  res.json({ count: 0, max: MAX_PHOTOS });
});

app.post('/api/sphere/state', (req, res) => {
  const state = req.body as SphereState;
  io.emit('sphere:state', state);
  res.json({ ok: true });
});

io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  socket.emit('photos:updated', { photos });

  socket.on('sphere:rotate', (state: SphereState) => {
    socket.broadcast.emit('sphere:state', state);
  });

  socket.on('photo:click', (data: { photoId: string }) => {
    socket.broadcast.emit('photo:clicked', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
