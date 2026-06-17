import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

const DATA_DIR = path.join(__dirname, 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

app.use(cors());
app.use(express.json());

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getUserInitial(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.charAt(0);
}

function enrichRecord(record, devices, users) {
  const device = devices.find(d => d.id === record.deviceId);
  const user = users.find(u => u.id === record.userId);
  return {
    ...record,
    deviceName: device ? device.name : '未知设备',
    userName: user ? user.name : '未知用户',
    userInitial: user ? getUserInitial(user.name) : '?'
  };
}

function delayResponse(res, data) {
  setTimeout(() => res.json(data), 50 + Math.random() * 150);
}

app.get('/api/devices', (_req, res) => {
  const devices = readJsonFile(DEVICES_FILE);
  delayResponse(res, devices);
});

app.get('/api/devices/:id', (req, res) => {
  const { id } = req.params;
  const devices = readJsonFile(DEVICES_FILE);
  const users = readJsonFile(USERS_FILE);
  const records = readJsonFile(RECORDS_FILE);

  const device = devices.find(d => d.id === id);
  if (!device) {
    return res.status(404).json({ error: '设备不存在' });
  }

  const deviceRecords = records
    .filter(r => r.deviceId === id)
    .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime))
    .map(r => enrichRecord(r, devices, users));

  const result = { ...device, borrowHistory: deviceRecords };
  delayResponse(res, result);
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const devices = readJsonFile(DEVICES_FILE);
  const users = readJsonFile(USERS_FILE);
  const records = readJsonFile(RECORDS_FILE);

  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const userRecords = records
    .filter(r => r.userId === id)
    .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime))
    .map(r => enrichRecord(r, devices, users));

  const result = { ...user, borrowHistory: userRecords };
  delayResponse(res, result);
});

app.post('/api/borrow', (req, res) => {
  const { deviceId, userId } = req.body || {};

  if (!deviceId || !userId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const devices = readJsonFile(DEVICES_FILE);
  const users = readJsonFile(USERS_FILE);
  const records = readJsonFile(RECORDS_FILE);

  const device = devices.find(d => d.id === deviceId);
  const user = users.find(u => u.id === userId);

  if (!device) {
    return res.status(404).json({ error: '设备不存在' });
  }
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  if (device.status !== 'available') {
    return res.status(400).json({ error: '设备当前不可借' });
  }
  if (user.creditScore < device.creditRequirement) {
    return res.status(400).json({ error: '信用分不足' });
  }

  const newRecord = {
    id: 'rec-' + uuidv4().split('-')[0],
    deviceId,
    userId,
    borrowTime: new Date().toISOString(),
    returnTime: null,
    status: 'borrowing'
  };

  records.push(newRecord);

  const deviceIndex = devices.findIndex(d => d.id === deviceId);
  if (deviceIndex !== -1) {
    devices[deviceIndex].status = 'borrowed';
  }

  writeJsonFile(RECORDS_FILE, records);
  writeJsonFile(DEVICES_FILE, devices);

  delayResponse(res, newRecord);
});

app.post('/api/return', (req, res) => {
  const { recordId } = req.body || {};

  if (!recordId) {
    return res.status(400).json({ error: '缺少记录ID' });
  }

  const devices = readJsonFile(DEVICES_FILE);
  const users = readJsonFile(USERS_FILE);
  const records = readJsonFile(RECORDS_FILE);

  const recordIndex = records.findIndex(r => r.id === recordId);
  if (recordIndex === -1) {
    return res.status(404).json({ error: '借用记录不存在' });
  }

  const record = records[recordIndex];
  if (record.status !== 'borrowing') {
    return res.status(400).json({ error: '该记录已归还' });
  }

  const now = new Date();
  const borrowTime = new Date(record.borrowTime);
  const hoursDiff = (now - borrowTime) / (1000 * 60 * 60);
  const isOverdue = hoursDiff > 24;

  let creditChanged = 0;
  if (isOverdue) {
    creditChanged = -5;
    records[recordIndex].status = 'returned_overdue';
  } else {
    creditChanged = 1;
    records[recordIndex].status = 'returned_on_time';
  }
  records[recordIndex].returnTime = now.toISOString();

  const deviceIndex = devices.findIndex(d => d.id === record.deviceId);
  if (deviceIndex !== -1) {
    devices[deviceIndex].status = 'available';
  }

  const userIndex = users.findIndex(u => u.id === record.userId);
  if (userIndex !== -1) {
    users[userIndex].creditScore = Math.max(0, Math.min(100, users[userIndex].creditScore + creditChanged));
  }

  writeJsonFile(RECORDS_FILE, records);
  writeJsonFile(DEVICES_FILE, devices);
  writeJsonFile(USERS_FILE, users);

  delayResponse(res, { success: true, creditChanged });
});

app.get('/api/records', (_req, res) => {
  const devices = readJsonFile(DEVICES_FILE);
  const users = readJsonFile(USERS_FILE);
  const records = readJsonFile(RECORDS_FILE);

  const enriched = records
    .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime))
    .map(r => enrichRecord(r, devices, users));

  delayResponse(res, enriched);
});

app.listen(PORT, () => {
  console.log(`[Server] 设备共享后端服务已启动: http://localhost:${PORT}`);
  console.log(`[Server] API 基础路径: http://localhost:${PORT}/api`);
});
