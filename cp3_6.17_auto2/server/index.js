import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/* 数据流说明：
   data/*.json (持久化存储)
     ↕ 读写
   server/index.js (Express REST API 层)
     ↕ HTTP JSON
   前端 src/api/borrowApi.ts → src/hooks/useBorrow.ts → src/pages/* 与 src/components/*
*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const PORT = 3001; // 与 vite.config.js 中代理目标端口保持一致

const app = express();
app.use(cors());
app.use(express.json());

function readJson(file) {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
}
function writeJson(file, data) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8');
}

function getDevices() { return readJson('devices.json'); }
function getUsers() { return readJson('users.json'); }
function getRecords() { return readJson('records.json'); }
function saveDevices(d) { writeJson('devices.json', d); }
function saveUsers(u) { writeJson('users.json', u); }
function saveRecords(r) { writeJson('records.json', r); }

// GET /api/devices - 返回所有设备列表
app.get('/api/devices', (req, res) => {
  const devices = getDevices();
  res.json(devices);
});

// GET /api/devices/:id - 返回设备详情（含历史借用记录）
app.get('/api/devices/:id', (req, res) => {
  const devices = getDevices();
  const records = getRecords();
  const device = devices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  const history = records.filter((r) => r.deviceId === device.id);
  res.json({ ...device, history });
});

// GET /api/users/:id - 返回用户信息（含借用记录）
app.get('/api/users/:id', (req, res) => {
  const users = getUsers();
  const records = getRecords();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  const userRecords = records.filter((r) => r.userId === user.id);
  res.json({ ...user, records: userRecords });
});

// GET /api/records - 返回所有借用记录（管理面板使用）
app.get('/api/records', (req, res) => {
  const records = getRecords();
  res.json(records);
});

// POST /api/borrow - 创建借用记录
// 校验：设备状态空闲、用户信用分满足设备要求
app.post('/api/borrow', (req, res) => {
  const { deviceId, userId } = req.body;
  const devices = getDevices();
  const users = getUsers();
  const records = getRecords();

  const device = devices.find((d) => d.id === deviceId);
  const user = users.find((u) => u.id === userId);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (device.status !== 'idle') return res.status(400).json({ error: '设备当前不可借用' });
  if (user.creditScore < device.minCreditScore) {
    return res.status(403).json({ error: `信用分不足，需达到 ${device.minCreditScore} 分` });
  }

  const now = new Date().toISOString();
  const record = {
    id: 'rec-' + uuidv4().slice(0, 8),
    deviceId,
    deviceName: device.name,
    userId,
    userName: user.name,
    borrowTime: now,
    returnTime: null,
    status: 'ongoing',
  };

  records.push(record);
  saveRecords(records);

  // 借用成功后设备状态变为被借
  device.status = 'borrowed';
  saveDevices(devices);

  res.json({ record, device });
});

// POST /api/return - 归还设备，更新信用分
// 规则：超时（>24h）扣5分并标记 overdue，按时归还加1分并标记 on-time
app.post('/api/return', (req, res) => {
  const { recordId } = req.body;
  const devices = getDevices();
  const users = getUsers();
  const records = getRecords();

  const record = records.find((r) => r.id === recordId);
  if (!record) return res.status(404).json({ error: '借用记录不存在' });
  if (record.status !== 'ongoing') return res.status(400).json({ error: '该记录已归还' });

  const returnTime = new Date().toISOString();
  const borrowMs = new Date(returnTime).getTime() - new Date(record.borrowTime).getTime();
  const overdue = borrowMs > 24 * 60 * 60 * 1000;

  record.returnTime = returnTime;
  record.status = overdue ? 'overdue' : 'on-time';

  const user = users.find((u) => u.id === record.userId);
  if (user) {
    user.creditScore = overdue
      ? Math.max(0, user.creditScore - 5)
      : Math.min(100, user.creditScore + 1);
    saveUsers(users);
  }

  const device = devices.find((d) => d.id === record.deviceId);
  if (device) {
    device.status = 'idle';
    saveDevices(devices);
  }

  saveRecords(records);
  res.json({ record, user, device });
});

app.listen(PORT, () => {
  console.log(`[server] 设备共享后端运行于 http://localhost:${PORT}`);
});
