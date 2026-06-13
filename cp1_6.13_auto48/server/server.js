const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Datastore = require('nedb-promises');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const bookingsDB = Datastore.create(path.join(__dirname, 'data', 'bookings.db'));
const devicesDB = Datastore.create(path.join(__dirname, 'data', 'devices.db'));
const spacesDB = Datastore.create(path.join(__dirname, 'data', 'spaces.db'));

const spaces = [
  { _id: 'space-1', name: '多功能活动室', capacity: 50, status: 'active' },
  { _id: 'space-2', name: '会议室', capacity: 20, status: 'active' },
  { _id: 'space-3', name: '图书阅览室', capacity: 30, status: 'active' }
];

const devices = [
  { _id: 'device-1', name: '投影仪', status: 'available', borrowCount: 0, description: '高清商务投影仪' },
  { _id: 'device-2', name: '白板', status: 'available', borrowCount: 0, description: '移动白板 120*90cm' },
  { _id: 'device-3', name: '音响系统', status: 'available', borrowCount: 0, description: '便携式蓝牙音响套装' },
  { _id: 'device-4', name: '移动白板支架', status: 'available', borrowCount: 0, description: '可调节高度支架' }
];

async function initData() {
  try {
    const spaceCount = await spacesDB.count({});
    if (spaceCount === 0) {
      await spacesDB.insert(spaces);
      console.log('初始化活动室数据完成');
    }

    const deviceCount = await devicesDB.count({});
    if (deviceCount === 0) {
      await devicesDB.insert(devices);
      console.log('初始化设备数据完成');
    }
  } catch (err) {
    console.error('初始化数据失败:', err);
  }
}

initData();

app.get('/api/spaces', async (req, res) => {
  try {
    const allSpaces = await spacesDB.find({});
    res.json(allSpaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/spaces/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await spacesDB.update({ _id: req.params.id }, { $set: { status } }, { returnUpdatedDocs: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const { date, spaceId } = req.query;
    let query = {};
    if (date) query.date = date;
    if (spaceId) query.spaceId = spaceId;
    const bookings = await bookingsDB.find(query).sort({ date: 1, startTime: 1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { spaceId, spaceName, date, startTime, endTime, peopleCount, devices, notes } = req.body;

    const existingBookings = await bookingsDB.find({
      spaceId,
      date,
      $or: [
        { startTime: { $gte: startTime, $lt: endTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
        { $and: [{ startTime: { $lte: startTime } }, { endTime: { $gte: endTime } }] }
      ]
    });

    if (existingBookings.length > 0) {
      return res.status(400).json({ error: '该时段已被预约，请选择其他时间' });
    }

    const booking = {
      _id: uuidv4(),
      spaceId,
      spaceName,
      date,
      startTime,
      endTime,
      peopleCount: parseInt(peopleCount),
      devices: devices || [],
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    const newBooking = await bookingsDB.insert(booking);
    res.status(201).json(newBooking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await bookingsDB.remove({ _id: req.params.id });
    res.json({ message: '预约已取消' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/devices', async (req, res) => {
  try {
    const allDevices = await devicesDB.find({});
    res.json(allDevices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/borrow', async (req, res) => {
  try {
    const { deviceId, expectedReturnTime } = req.body;
    const device = await devicesDB.findOne({ _id: deviceId });

    if (!device) {
      return res.status(404).json({ error: '设备不存在' });
    }
    if (device.status !== 'available') {
      return res.status(400).json({ error: '设备当前不可借用' });
    }

    const updated = await devicesDB.update(
      { _id: deviceId },
      { $set: { status: 'borrowed', expectedReturnTime, borrowCount: (device.borrowCount || 0) + 1 } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/devices/return', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const updated = await devicesDB.update(
      { _id: deviceId },
      { $set: { status: 'available' }, $unset: { expectedReturnTime: true } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/devices/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await devicesDB.update(
      { _id: req.params.id },
      { $set: { status } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/bookings', async (req, res) => {
  try {
    const allSpaces = await spacesDB.find({ status: 'active' });
    const allBookings = await bookingsDB.find({});

    const stats = allSpaces.map(space => {
      const count = allBookings.filter(b => b.spaceId === space._id).length;
      return { spaceName: space.name, count };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats/devices', async (req, res) => {
  try {
    const allDevices = await devicesDB.find({});
    const stats = allDevices.map(d => ({
      deviceName: d.name,
      count: d.borrowCount || 0
    }));
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
