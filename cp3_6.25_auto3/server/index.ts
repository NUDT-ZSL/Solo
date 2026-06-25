import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

const DATA_DIR = path.join(__dirname, 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readJSON = (filePath: string): any[] => {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  return content ? JSON.parse(content) : [];
};

const writeJSON = (filePath: string, data: any[]) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

if (!fs.existsSync(DEVICES_FILE)) {
  const initialDevices = [
    { id: '1', name: '3D打印机 A1', model: 'Ultimaker S5', status: 'idle', maintenance: false },
    { id: '2', name: '3D打印机 A2', model: 'Prusa i3 MK3S', status: 'in-use', maintenance: false },
    { id: '3', name: '激光切割机 B1', model: 'Epilog Fusion Pro', status: 'idle', maintenance: false },
    { id: '4', name: '激光切割机 B2', model: 'Trotec Speedy 400', status: 'maintenance', maintenance: true },
    { id: '5', name: 'CNC铣床 C1', model: 'ShopBot Desktop', status: 'idle', maintenance: false },
    { id: '6', name: '3D打印机 A3', model: 'Formlabs Form 3+', status: 'idle', maintenance: false },
  ];
  writeJSON(DEVICES_FILE, initialDevices);
}

if (!fs.existsSync(BOOKINGS_FILE)) {
  const initialBookings = [
    { id: 'b1', deviceId: '2', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', note: '模型打印', userId: 'user1' },
    { id: 'b2', deviceId: '1', date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '15:00', note: '原型制作', userId: 'user2' },
    { id: 'b3', deviceId: '3', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', note: '亚克力切割', userId: 'user3' },
  ];
  writeJSON(BOOKINGS_FILE, initialBookings);
}

app.get('/api/devices', (_req, res) => {
  const devices = readJSON(DEVICES_FILE);
  res.json(devices);
});

app.post('/api/devices', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  const newDevice = { id: uuidv4(), ...req.body };
  devices.push(newDevice);
  writeJSON(DEVICES_FILE, devices);
  res.status(201).json(newDevice);
});

app.put('/api/devices/:id', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  const index = devices.findIndex((d: any) => d.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: '设备不存在' });
  }
  devices[index] = { ...devices[index], ...req.body };
  writeJSON(DEVICES_FILE, devices);
  res.json(devices[index]);
});

app.delete('/api/devices/:id', (req, res) => {
  let devices = readJSON(DEVICES_FILE);
  devices = devices.filter((d: any) => d.id !== req.params.id);
  writeJSON(DEVICES_FILE, devices);
  res.json({ message: '删除成功' });
});

app.get('/api/bookings', (_req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  res.json(bookings);
});

app.post('/api/bookings', (req, res) => {
  const bookings = readJSON(BOOKINGS_FILE);
  const { deviceId, date, startTime, endTime } = req.body;

  const conflict = bookings.find(
    (b: any) =>
      b.deviceId === deviceId &&
      b.date === date &&
      !(endTime <= b.startTime || startTime >= b.endTime)
  );

  if (conflict) {
    return res.status(409).json({ error: '该时段已被预约' });
  }

  const newBooking = { id: uuidv4(), ...req.body };
  bookings.push(newBooking);
  writeJSON(BOOKINGS_FILE, bookings);
  res.status(201).json(newBooking);
});

app.delete('/api/bookings/:id', (req, res) => {
  let bookings = readJSON(BOOKINGS_FILE);
  bookings = bookings.filter((b: any) => b.id !== req.params.id);
  writeJSON(BOOKINGS_FILE, bookings);
  res.json({ message: '删除成功' });
});

app.get('/api/stats', (_req, res) => {
  const devices = readJSON(DEVICES_FILE);
  const bookings = readJSON(BOOKINGS_FILE);
  res.json({ devices, bookings });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
