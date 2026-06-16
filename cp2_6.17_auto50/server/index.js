import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DEVICES_FILE = path.join(DATA_DIR, 'devices.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const RECORDS_FILE = path.join(DATA_DIR, 'records.json');

function readJSON(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getDeviceBorrowRecords(deviceId) {
  const records = readJSON(RECORDS_FILE);
  return records.filter(r => r.deviceId === deviceId);
}

function getUserBorrowRecords(userId) {
  const records = readJSON(RECORDS_FILE);
  return records.filter(r => r.userId === userId);
}

function updateUserCreditScore(userId, delta) {
  const users = readJSON(USERS_FILE);
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    users[userIndex].creditScore = Math.max(0, Math.min(100, users[userIndex].creditScore + delta));
    writeJSON(USERS_FILE, users);
    return users[userIndex];
  }
  return null;
}

app.get('/api/devices', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  res.json(devices);
});

app.get('/api/devices/:id', (req, res) => {
  const devices = readJSON(DEVICES_FILE);
  const device = devices.find(d => d.id === req.params.id);
  
  if (!device) {
    return res.status(404).json({ error: '设备不存在' });
  }
  
  const records = getDeviceBorrowRecords(device.id);
  const recordsWithUserInfo = records.map(record => {
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.id === record.userId);
    return {
      ...record,
      userName: user ? user.name : '未知用户'
    };
  });
  
  res.json({
    ...device,
    borrowRecords: recordsWithUserInfo
  });
});

app.get('/api/users/:id', (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  const records = getUserBorrowRecords(user.id);
  const recordsWithDeviceInfo = records.map(record => {
    const devices = readJSON(DEVICES_FILE);
    const device = devices.find(d => d.id === record.deviceId);
    return {
      ...record,
      deviceName: device ? device.name : '未知设备'
    };
  });
  
  res.json({
    ...user,
    borrowRecords: recordsWithDeviceInfo
  });
});

app.post('/api/borrow', (req, res) => {
  const { deviceId, userId } = req.body;
  
  if (!deviceId || !userId) {
    return res.status(400).json({ error: '设备ID和用户ID不能为空' });
  }
  
  const devices = readJSON(DEVICES_FILE);
  const deviceIndex = devices.findIndex(d => d.id === deviceId);
  
  if (deviceIndex === -1) {
    return res.status(404).json({ error: '设备不存在' });
  }
  
  const device = devices[deviceIndex];
  
  if (device.status !== 'available') {
    return res.status(400).json({ error: '设备当前不可借用' });
  }
  
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  if (user.creditScore < device.minCreditScore) {
    return res.status(400).json({ error: '信用分不足，无法借用此设备' });
  }
  
  devices[deviceIndex].status = 'borrowed';
  writeJSON(DEVICES_FILE, devices);
  
  const records = readJSON(RECORDS_FILE);
  const newRecord = {
    id: uuidv4(),
    deviceId,
    userId,
    borrowTime: new Date().toISOString(),
    returnTime: null,
    status: 'borrowing'
  };
  records.push(newRecord);
  writeJSON(RECORDS_FILE, records);
  
  res.json({
    success: true,
    record: newRecord,
    device: devices[deviceIndex]
  });
});

app.post('/api/return', (req, res) => {
  const { recordId } = req.body;
  
  if (!recordId) {
    return res.status(400).json({ error: '记录ID不能为空' });
  }
  
  const records = readJSON(RECORDS_FILE);
  const recordIndex = records.findIndex(r => r.id === recordId);
  
  if (recordIndex === -1) {
    return res.status(404).json({ error: '借用记录不存在' });
  }
  
  const record = records[recordIndex];
  
  if (record.status !== 'borrowing') {
    return res.status(400).json({ error: '该记录已归还' });
  }
  
  const returnTime = new Date().toISOString();
  records[recordIndex].returnTime = returnTime;
  
  const borrowTime = dayjs(record.borrowTime);
  const returnTimeDayjs = dayjs(returnTime);
  const diffHours = returnTimeDayjs.diff(borrowTime, 'hour');
  
  if (diffHours > 24) {
    records[recordIndex].status = 'overdue_returned';
    updateUserCreditScore(record.userId, -5);
  } else {
    records[recordIndex].status = 'returned_on_time';
    updateUserCreditScore(record.userId, 1);
  }
  
  writeJSON(RECORDS_FILE, records);
  
  const devices = readJSON(DEVICES_FILE);
  const deviceIndex = devices.findIndex(d => d.id === record.deviceId);
  if (deviceIndex !== -1) {
    devices[deviceIndex].status = 'available';
    writeJSON(DEVICES_FILE, devices);
  }
  
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === record.userId);
  
  res.json({
    success: true,
    record: records[recordIndex],
    creditScore: user ? user.creditScore : null
  });
});

app.get('/api/records', (req, res) => {
  const records = readJSON(RECORDS_FILE);
  const devices = readJSON(DEVICES_FILE);
  const users = readJSON(USERS_FILE);
  
  const recordsWithInfo = records.map(record => {
    const device = devices.find(d => d.id === record.deviceId);
    const user = users.find(u => u.id === record.userId);
    return {
      ...record,
      deviceName: device ? device.name : '未知设备',
      userName: user ? user.name : '未知用户'
    };
  });
  
  res.json(recordsWithInfo);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
