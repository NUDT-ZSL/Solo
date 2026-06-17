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
const BORROW_PERIOD_HOURS = 24 * 7;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const devicesPath = path.join(dataDir, 'devices.json');
const usersPath = path.join(dataDir, 'users.json');
const recordsPath = path.join(dataDir, 'records.json');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/devices', (req, res) => {
  try {
    const devices = readJson(devicesPath);
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: '读取设备数据失败' });
  }
});

app.get('/api/devices/:id', (req, res) => {
  try {
    const devices = readJson(devicesPath);
    const device = devices.find(d => d.id === req.params.id);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    res.json(device);
  } catch (err) {
    res.status(500).json({ error: '读取设备数据失败' });
  }
});

app.get('/api/users/:id', (req, res) => {
  try {
    const users = readJson(usersPath);
    const user = users.find(u => u.id === req.params.id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '读取用户数据失败' });
  }
});

app.get('/api/records', (req, res) => {
  try {
    const records = readJson(recordsPath);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '读取借用记录失败' });
  }
});

app.post('/api/borrow', (req, res) => {
  try {
    const { deviceId, userId } = req.body;
    if (!deviceId || !userId) {
      return res.status(400).json({ error: '缺少必要参数 deviceId 或 userId' });
    }

    const devices = readJson(devicesPath);
    const users = readJson(usersPath);
    const records = readJson(recordsPath);

    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    if (device.status !== 'available') {
      return res.status(400).json({ error: '设备不可借用' });
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    if (user.creditScore < device.minCreditScore) {
      return res.status(400).json({
        error: `信用分不足，当前信用分 ${user.creditScore}，需要 ${device.minCreditScore}`
      });
    }

    device.status = 'borrowed';
    writeJson(devicesPath, devices);

    const newRecord = {
      id: uuidv4(),
      deviceId,
      userId,
      borrowTime: dayjs().toISOString(),
      returnTime: null,
      status: 'not_returned'
    };
    records.push(newRecord);
    writeJson(recordsPath, records);

    res.json(newRecord);
  } catch (err) {
    res.status(500).json({ error: '创建借用记录失败' });
  }
});

app.post('/api/return', (req, res) => {
  try {
    const { recordId } = req.body;
    if (!recordId) {
      return res.status(400).json({ error: '缺少必要参数 recordId' });
    }

    const devices = readJson(devicesPath);
    const users = readJson(usersPath);
    const records = readJson(recordsPath);

    const record = records.find(r => r.id === recordId);
    if (!record) {
      return res.status(404).json({ error: '借用记录不存在' });
    }
    if (record.status !== 'not_returned') {
      return res.status(400).json({ error: '该设备已归还' });
    }

    const device = devices.find(d => d.id === record.deviceId);
    const user = users.find(u => u.id === record.userId);

    if (device) {
      device.status = 'available';
      writeJson(devicesPath, devices);
    }

    const now = dayjs();
    const borrowTime = dayjs(record.borrowTime);
    const hoursDiff = now.diff(borrowTime, 'hour');
    record.returnTime = now.toISOString();

    let creditChange = 0;
    if (hoursDiff <= BORROW_PERIOD_HOURS) {
      record.status = 'returned_on_time';
      creditChange = 1;
    } else {
      record.status = 'returned_overdue';
      creditChange = -5;
    }

    if (user) {
      user.creditScore = Math.max(0, Math.min(100, user.creditScore + creditChange));
      writeJson(usersPath, users);
    }

    writeJson(recordsPath, records);

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: '归还设备失败' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`);
});
