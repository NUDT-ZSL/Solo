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
const PORT = 3002;
const DATA_DIR = path.join(__dirname, '..', 'data');

app.use(cors());
app.use(express.json());

const readJson = (filename) => {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const writeJson = (filename, data) => {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/devices', (req, res) => {
  try {
    const devices = readJson('devices.json');
    res.json({ success: true, data: devices });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/devices/:id', (req, res) => {
  try {
    const devices = readJson('devices.json');
    const device = devices.find(d => d.id === req.params.id);
    if (!device) {
      return res.json({ success: false, error: '设备不存在' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/borrow', (req, res) => {
  try {
    const { deviceId, userId } = req.body;

    if (!deviceId || !userId) {
      return res.json({ success: false, error: '缺少必要参数' });
    }

    const devices = readJson('devices.json');
    const users = readJson('users.json');
    const records = readJson('records.json');

    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.json({ success: false, error: '设备不存在' });
    }

    if (device.status !== 'available') {
      return res.json({ success: false, error: '设备不可用' });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.json({ success: false, error: '用户不存在' });
    }

    if (user.creditScore < device.minCreditScore) {
      return res.json({ success: false, error: '用户信用分不足' });
    }

    const now = dayjs();
    const newRecord = {
      id: uuidv4(),
      deviceId,
      userId,
      borrowTime: now.toISOString(),
      expectedReturnTime: now.add(24, 'hour').toISOString(),
      actualReturnTime: null,
      status: 'borrowing'
    };

    const updatedDevices = devices.map(d =>
      d.id === deviceId ? { ...d, status: 'borrowed' } : d
    );

    records.push(newRecord);

    writeJson('devices.json', updatedDevices);
    writeJson('records.json', records);

    res.json({ success: true, data: newRecord });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/return', (req, res) => {
  try {
    const { recordId } = req.body;

    if (!recordId) {
      return res.json({ success: false, error: '缺少必要参数' });
    }

    const records = readJson('records.json');
    const devices = readJson('devices.json');
    const users = readJson('users.json');

    const recordIndex = records.findIndex(r => r.id === recordId);
    if (recordIndex === -1) {
      return res.json({ success: false, error: '记录不存在' });
    }

    const record = records[recordIndex];
    if (record.status === 'returned_on_time' || record.status === 'returned_overdue') {
      return res.json({ success: false, error: '设备已归还' });
    }

    const now = dayjs();
    const expectedTime = dayjs(record.expectedReturnTime);
    const isOverdue = now.isAfter(expectedTime.add(24, 'hour'));

    const updatedRecord = {
      ...record,
      actualReturnTime: now.toISOString(),
      status: isOverdue ? 'returned_overdue' : 'returned_on_time'
    };

    const updatedDevices = devices.map(d =>
      d.id === record.deviceId ? { ...d, status: 'available' } : d
    );

    const updatedUsers = users.map(u => {
      if (u.id === record.userId) {
        const scoreChange = isOverdue ? -5 : 1;
        return { ...u, creditScore: u.creditScore + scoreChange };
      }
      return u;
    });

    records[recordIndex] = updatedRecord;

    writeJson('records.json', records);
    writeJson('devices.json', updatedDevices);
    writeJson('users.json', updatedUsers);

    res.json({
      success: true,
      data: {
        record: updatedRecord,
        overdue: isOverdue,
        scoreChange: isOverdue ? -5 : 1
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const users = readJson('users.json');
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      return res.json({ success: false, error: '用户不存在' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const { userId } = req.query;
    let records = readJson('records.json');

    if (userId) {
      records = records.filter(r => r.userId === userId);
    }

    res.json({ success: true, data: records });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
