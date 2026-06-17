import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dayjs from 'dayjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_DIR = join(__dirname, 'data');

app.use(cors());
app.use(express.json());

const readJSON = (filename) => {
  const filePath = join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const writeJSON = (filename, data) => {
  const filePath = join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const simulateLatency = (req, res, next) => {
  setTimeout(next, 100 + Math.random() * 200);
};

app.use(simulateLatency);

app.get('/api/devices', (req, res) => {
  try {
    const devices = readJSON('devices.json');
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedDevices = devices.slice(start, end);

    res.json({
      data: paginatedDevices,
      total: devices.length,
      page,
      limit,
      totalPages: Math.ceil(devices.length / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.get('/api/devices/:id', (req, res) => {
  try {
    const devices = readJSON('devices.json');
    const device = devices.find(d => d.id === req.params.id);

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const records = readJSON('records.json');
    const deviceRecords = records
      .filter(r => r.deviceId === req.params.id)
      .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));

    res.json({
      ...device,
      borrowHistory: deviceRecords
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch device details' });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const users = readJSON('users.json');
    const user = users.find(u => u.id === req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const records = readJSON('records.json');
    const userRecords = records
      .filter(r => r.userId === req.params.id)
      .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));

    res.json({
      ...user,
      borrowHistory: userRecords
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

app.post('/api/borrow', (req, res) => {
  try {
    const { deviceId, userId } = req.body;

    if (!deviceId || !userId) {
      return res.status(400).json({ error: 'deviceId and userId are required' });
    }

    const devices = readJSON('devices.json');
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    const device = devices[deviceIndex];

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    if (device.status !== 'available') {
      return res.status(400).json({ error: '设备当前不可借用' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.creditScore < device.minCreditScore) {
      return res.status(400).json({
        error: `信用分不足，需要${device.minCreditScore}分，当前${user.creditScore}分`
      });
    }

    devices[deviceIndex] = { ...device, status: 'borrowed' };
    writeJSON('devices.json', devices);

    const borrowTime = new Date().toISOString();
    const expectedReturnTime = dayjs(borrowTime).add(24, 'hour').toISOString();

    const newRecord = {
      id: uuidv4(),
      deviceId,
      deviceName: device.name,
      userId,
      userName: user.name,
      borrowTime,
      returnTime: null,
      expectedReturnTime,
      status: 'borrowing'
    };

    const records = readJSON('records.json');
    records.push(newRecord);
    writeJSON('records.json', records);

    res.json({
      success: true,
      record: newRecord,
      qrCodeData: newRecord.id
    });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(500).json({ error: 'Failed to create borrow record' });
  }
});

app.post('/api/return', (req, res) => {
  try {
    const { recordId } = req.body;

    if (!recordId) {
      return res.status(400).json({ error: 'recordId is required' });
    }

    const records = readJSON('records.json');
    const recordIndex = records.findIndex(r => r.id === recordId);
    const record = records[recordIndex];

    if (!record) {
      return res.status(404).json({ error: 'Borrow record not found' });
    }

    if (record.status !== 'borrowing') {
      return res.status(400).json({ error: '设备已归还' });
    }

    const returnTime = new Date().toISOString();
    const isOverdue = dayjs(returnTime).isAfter(record.expectedReturnTime);

    records[recordIndex] = {
      ...record,
      returnTime,
      status: isOverdue ? 'overdue-returned' : 'returned-on-time'
    };
    writeJSON('records.json', records);

    const devices = readJSON('devices.json');
    const deviceIndex = devices.findIndex(d => d.id === record.deviceId);
    if (deviceIndex !== -1) {
      devices[deviceIndex] = { ...devices[deviceIndex], status: 'available' };
      writeJSON('devices.json', devices);
    }

    const users = readJSON('users.json');
    const userIndex = users.findIndex(u => u.id === record.userId);
    if (userIndex !== -1) {
      const currentScore = users[userIndex].creditScore;
      const newScore = Math.max(0, Math.min(100, currentScore + (isOverdue ? -5 : 1)));
      users[userIndex] = { ...users[userIndex], creditScore: newScore };
      writeJSON('users.json', users);
    }

    res.json({
      success: true,
      record: records[recordIndex],
      isOverdue,
      updatedCreditScore: users[userIndex]?.creditScore
    });
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ error: 'Failed to process return' });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const records = readJSON('records.json');
    const userId = req.query.userId;
    const deviceId = req.query.deviceId;
    const status = req.query.status;

    let filteredRecords = records;

    if (userId) {
      filteredRecords = filteredRecords.filter(r => r.userId === userId);
    }
    if (deviceId) {
      filteredRecords = filteredRecords.filter(r => r.deviceId === deviceId);
    }
    if (status) {
      filteredRecords = filteredRecords.filter(r => r.status === status);
    }

    filteredRecords.sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));

    res.json({
      data: filteredRecords,
      total: filteredRecords.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const devices = readJSON('devices.json');
    const records = readJSON('records.json');
    const users = readJSON('users.json');

    const stats = {
      totalDevices: devices.length,
      availableDevices: devices.filter(d => d.status === 'available').length,
      borrowedDevices: devices.filter(d => d.status === 'borrowed').length,
      maintenanceDevices: devices.filter(d => d.status === 'maintenance').length,
      totalUsers: users.length,
      totalRecords: records.length,
      activeBorrowings: records.filter(r => r.status === 'borrowing').length,
      overdueBorrowings: records.filter(r => {
        if (r.status !== 'borrowing') return false;
        return dayjs().isAfter(r.expectedReturnTime);
      }).length
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
