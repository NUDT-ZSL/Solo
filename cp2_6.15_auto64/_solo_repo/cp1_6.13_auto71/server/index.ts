import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { subDays, format } from 'date-fns';
import { initReminderService } from './reminderService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

const plantsDb = Datastore.create({ filename: path.join(dataDir, 'plants.db'), autoload: true });
const recordsDb = Datastore.create({ filename: path.join(dataDir, 'records.db'), autoload: true });
const remindersDb = Datastore.create({ filename: path.join(dataDir, 'reminders.db'), autoload: true });

const app = express();
app.use(cors());
app.use(express.json());

async function seedData() {
  const count = await plantsDb.count({});
  if (count > 0) return;

  const now = new Date();
  const plants = [
    { _id: uuidv4(), name: '番茄', type: '番茄', wateringFrequency: 2, lastWatered: subDays(now, 3).toISOString(), createdAt: now.toISOString() },
    { _id: uuidv4(), name: '薄荷', type: '薄荷', wateringFrequency: 1, lastWatered: subDays(now, 1).toISOString(), createdAt: now.toISOString() },
    { _id: uuidv4(), name: '辣椒', type: '辣椒', wateringFrequency: 3, lastWatered: subDays(now, 2).toISOString(), createdAt: now.toISOString() },
    { _id: uuidv4(), name: '草莓', type: '草莓', wateringFrequency: 2, lastWatered: subDays(now, 0).toISOString(), createdAt: now.toISOString() },
    { _id: uuidv4(), name: '黄瓜', type: '黄瓜', wateringFrequency: 2, lastWatered: subDays(now, 4).toISOString(), createdAt: now.toISOString() },
    { _id: uuidv4(), name: '生菜', type: '生菜', wateringFrequency: 1, lastWatered: subDays(now, 2).toISOString(), createdAt: now.toISOString() },
  ];

  for (const p of plants) {
    await plantsDb.insert(p);
  }

  const tomatoId = plants[0]._id;
  const mintId = plants[1]._id;
  const pepperId = plants[2]._id;

  const records = [
    { _id: uuidv4(), plantId: tomatoId, type: 'plant', date: subDays(now, 30).toISOString(), note: '播种，选择优良品种', createdAt: subDays(now, 30).toISOString() },
    { _id: uuidv4(), plantId: tomatoId, type: 'water', date: subDays(now, 28).toISOString(), note: '第一次浇水，保持土壤湿润', createdAt: subDays(now, 28).toISOString() },
    { _id: uuidv4(), plantId: tomatoId, type: 'fertilize', date: subDays(now, 20).toISOString(), note: '施基肥，有机堆肥', createdAt: subDays(now, 20).toISOString() },
    { _id: uuidv4(), plantId: tomatoId, type: 'water', date: subDays(now, 15).toISOString(), note: '常规浇水', createdAt: subDays(now, 15).toISOString() },
    { _id: uuidv4(), plantId: tomatoId, type: 'prune', date: subDays(now, 10).toISOString(), note: '修剪侧枝，促进主干生长', createdAt: subDays(now, 10).toISOString() },
    { _id: uuidv4(), plantId: tomatoId, type: 'water', date: subDays(now, 3).toISOString(), note: '正常浇水', createdAt: subDays(now, 3).toISOString() },
    { _id: uuidv4(), plantId: mintId, type: 'plant', date: subDays(now, 20).toISOString(), note: '移栽薄荷苗', createdAt: subDays(now, 20).toISOString() },
    { _id: uuidv4(), plantId: mintId, type: 'water', date: subDays(now, 18).toISOString(), note: '浇水，注意不要积水', createdAt: subDays(now, 18).toISOString() },
    { _id: uuidv4(), plantId: mintId, type: 'prune', date: subDays(now, 12).toISOString(), note: '采摘顶部嫩叶促进分枝', createdAt: subDays(now, 12).toISOString() },
    { _id: uuidv4(), plantId: mintId, type: 'water', date: subDays(now, 1).toISOString(), note: '日常浇水', createdAt: subDays(now, 1).toISOString() },
    { _id: uuidv4(), plantId: pepperId, type: 'plant', date: subDays(now, 25).toISOString(), note: '播种辣椒种子', createdAt: subDays(now, 25).toISOString() },
    { _id: uuidv4(), plantId: pepperId, type: 'water', date: subDays(now, 23).toISOString(), note: '种子发芽后首次浇水', createdAt: subDays(now, 23).toISOString() },
    { _id: uuidv4(), plantId: pepperId, type: 'fertilize', date: subDays(now, 15).toISOString(), note: '追施复合肥', createdAt: subDays(now, 15).toISOString() },
    { _id: uuidv4(), plantId: pepperId, type: 'water', date: subDays(now, 2).toISOString(), note: '正常浇水', createdAt: subDays(now, 2).toISOString() },
  ];

  for (const r of records) {
    await recordsDb.insert(r);
  }

  await remindersDb.insert({
    _id: uuidv4(),
    plantId: tomatoId,
    plantName: '番茄',
    type: 'water',
    message: '番茄需要浇水了！已超过3天未浇水',
    read: false,
    createdAt: subDays(now, 0).toISOString(),
  });
  await remindersDb.insert({
    _id: uuidv4(),
    plantId: plants[4]._id,
    plantName: '黄瓜',
    type: 'water',
    message: '黄瓜需要浇水了！已超过4天未浇水',
    read: false,
    createdAt: subDays(now, 0).toISOString(),
  });
}

app.get('/api/plants', async (req, res) => {
  try {
    const plants = await plantsDb.find({}).sort({ createdAt: 1 });
    res.json(plants);
  } catch (err) {
    res.status(500).json({ error: '获取植物列表失败' });
  }
});

app.post('/api/plants', async (req, res) => {
  try {
    const { name, type, wateringFrequency } = req.body;
    if (!name || !type || !wateringFrequency) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }
    const plant = {
      _id: uuidv4(),
      name,
      type,
      wateringFrequency: Number(wateringFrequency),
      lastWatered: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await plantsDb.insert(plant);
    res.status(201).json(plant);
  } catch (err) {
    res.status(500).json({ error: '添加植物失败' });
  }
});

app.get('/api/plants/:id', async (req, res) => {
  try {
    const plant = await plantsDb.findOne({ _id: req.params.id });
    if (!plant) {
      res.status(404).json({ error: '植物不存在' });
      return;
    }
    const records = await recordsDb.find({ plantId: req.params.id }).sort({ date: -1 });
    res.json({ ...plant, records });
  } catch (err) {
    res.status(500).json({ error: '获取植物详情失败' });
  }
});

app.put('/api/plants/:id', async (req, res) => {
  try {
    const { name, type, wateringFrequency, lastWatered } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (type !== undefined) updateFields.type = type;
    if (wateringFrequency !== undefined) updateFields.wateringFrequency = Number(wateringFrequency);
    if (lastWatered !== undefined) updateFields.lastWatered = lastWatered;
    await plantsDb.update({ _id: req.params.id }, { $set: updateFields });
    const updated = await plantsDb.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '更新植物失败' });
  }
});

app.delete('/api/plants/:id', async (req, res) => {
  try {
    await plantsDb.remove({ _id: req.params.id }, {});
    await recordsDb.remove({ plantId: req.params.id }, { multi: true });
    await remindersDb.remove({ plantId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '删除植物失败' });
  }
});

app.get('/api/plants/:id/records', async (req, res) => {
  try {
    const records = await recordsDb.find({ plantId: req.params.id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: '获取养护记录失败' });
  }
});

app.post('/api/plants/:id/records', async (req, res) => {
  try {
    const { type, date, note } = req.body;
    if (!type || !date) {
      res.status(400).json({ error: '缺少必填字段' });
      return;
    }
    const plant = await plantsDb.findOne({ _id: req.params.id });
    if (!plant) {
      res.status(404).json({ error: '植物不存在' });
      return;
    }
    const record = {
      _id: uuidv4(),
      plantId: req.params.id,
      type,
      date,
      note: note || '',
      createdAt: new Date().toISOString(),
    };
    await recordsDb.insert(record);

    if (type === 'water') {
      await plantsDb.update({ _id: req.params.id }, { $set: { lastWatered: date } });
      await remindersDb.remove({ plantId: req.params.id, read: false }, { multi: true });
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: '添加养护记录失败' });
  }
});

app.get('/api/reminders', async (req, res) => {
  try {
    const reminders = await remindersDb.find({}).sort({ createdAt: -1 });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: '获取提醒列表失败' });
  }
});

app.put('/api/reminders/:id/read', async (req, res) => {
  try {
    await remindersDb.update({ _id: req.params.id }, { $set: { read: true } });
    const updated = await remindersDb.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: '标记提醒已读失败' });
  }
});

app.put('/api/reminders/read-all', async (req, res) => {
  try {
    await remindersDb.update({}, { $set: { read: true } }, { multi: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '标记全部已读失败' });
  }
});

app.put('/api/plants/:id/water', async (req, res) => {
  try {
    const now = new Date().toISOString();
    await plantsDb.update({ _id: req.params.id }, { $set: { lastWatered: now } });
    await remindersDb.remove({ plantId: req.params.id, read: false }, { multi: true });
    const record = {
      _id: uuidv4(),
      plantId: req.params.id,
      type: 'water',
      date: now,
      note: '快捷浇水',
      createdAt: now,
    };
    await recordsDb.insert(record);
    res.json({ success: true, lastWatered: now });
  } catch (err) {
    res.status(500).json({ error: '浇水操作失败' });
  }
});

async function start() {
  await seedData();
  initReminderService(plantsDb, remindersDb);
  app.listen(4000, () => {
    console.log('🌱 GrowSync server running on http://localhost:4000');
  });
}

start();
