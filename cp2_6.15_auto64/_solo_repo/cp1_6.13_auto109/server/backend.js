import express from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, 'data');
const activitiesDB = Datastore.create({ filename: join(dbDir, 'activities.db'), autoload: true });
const milestonesDB = Datastore.create({ filename: join(dbDir, 'milestones.db'), autoload: true });
const guestsDB = Datastore.create({ filename: join(dbDir, 'guests.db'), autoload: true });
const remindersDB = Datastore.create({ filename: join(dbDir, 'reminders.db'), autoload: true });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

const seedData = async () => {
  const count = await activitiesDB.count({});
  if (count > 0) return;

  const activity1Id = uuidv4();
  const activity2Id = uuidv4();
  const activity3Id = uuidv4();

  const now = new Date();
  const future1 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const future2 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  await activitiesDB.insert([
    {
      _id: activity1Id,
      name: '2026年度产品发布会',
      date: future1.toISOString().split('T')[0],
      status: 'preparing',
      location: '上海国际会议中心',
      description: '年度旗舰产品发布盛典',
      createdAt: now.toISOString(),
    },
    {
      _id: activity2Id,
      name: '春季客户答谢晚宴',
      date: future2.toISOString().split('T')[0],
      status: 'in_progress',
      location: '北京华尔道夫酒店',
      description: '感谢重要客户一年来的支持',
      createdAt: now.toISOString(),
    },
    {
      _id: activity3Id,
      name: 'Q1季度总结会议',
      date: past.toISOString().split('T')[0],
      status: 'finished',
      location: '公司总部会议室A',
      description: '第一季度工作总结与复盘',
      createdAt: now.toISOString(),
    },
  ]);

  await milestonesDB.insert([
    { _id: uuidv4(), activityId: activity1Id, title: '确定活动主题', description: '与设计团队确认发布会视觉主题', date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], order: 0, completed: true },
    { _id: uuidv4(), activityId: activity1Id, title: '邀请嘉宾名单确认', description: '确定VIP客户与媒体名单', date: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], order: 1, completed: false },
    { _id: uuidv4(), activityId: activity1Id, title: '场地布置完成', description: '舞台、灯光、音响调试完毕', date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], order: 2, completed: false },
    { _id: uuidv4(), activityId: activity1Id, title: '发布会正式开始', description: '主活动日', date: future1.toISOString().split('T')[0], order: 3, completed: false },

    { _id: uuidv4(), activityId: activity2Id, title: '菜单与酒水敲定', description: '与酒店确认晚宴菜单', date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], order: 0, completed: false },
    { _id: uuidv4(), activityId: activity2Id, title: '座位安排', description: '根据客户重要性排定桌次', date: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], order: 1, completed: false },
    { _id: uuidv4(), activityId: activity2Id, title: '晚宴当天', description: '客户答谢晚宴正式举办', date: future2.toISOString().split('T')[0], order: 2, completed: false },
  ]);

  await guestsDB.insert([
    { _id: uuidv4(), activityId: activity1Id, name: '张明', email: 'zhangming@example.com', phone: '13800138001', role: 'VIP客户', status: 'confirmed', note: '需要VIP停车位' },
    { _id: uuidv4(), activityId: activity1Id, name: '李华', email: 'lihua@example.com', phone: '13800138002', role: '媒体记者', status: 'pending', note: '财经日报' },
    { _id: uuidv4(), activityId: activity1Id, name: '王芳', email: 'wangfang@example.com', phone: '13800138003', role: '合作伙伴', status: 'confirmed', note: '' },

    { _id: uuidv4(), activityId: activity2Id, name: '陈强', email: 'chenqiang@example.com', phone: '13900139001', role: '大客户', status: 'confirmed', note: '对海鲜过敏' },
    { _id: uuidv4(), activityId: activity2Id, name: '赵丽', email: 'zhaoli@example.com', phone: '13900139002', role: '战略客户', status: 'pending', note: '' },
  ]);

  await remindersDB.insert([
    { _id: uuidv4(), activityId: activity1Id, title: '发布会前3天提醒', type: 'email', daysBefore: 3, enabled: true, message: '距离产品发布会还有3天，请确保所有准备工作就绪。' },
    { _id: uuidv4(), activityId: activity1Id, title: '发布会当天提醒', type: 'sms', daysBefore: 0, enabled: true, message: '今天是产品发布会！请准时到达上海国际会议中心。' },
  ]);

  console.log('Seed data inserted successfully!');
};

seedData();

app.get('/api/activities', async (req, res) => {
  try {
    const activities = await activitiesDB.find({}).sort({ date: 1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  try {
    const activity = await activitiesDB.findOne({ _id: req.params.id });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const activity = {
      _id: uuidv4(),
      ...req.body,
      status: req.body.status || 'preparing',
      createdAt: new Date().toISOString(),
    };
    const result = await activitiesDB.insert(activity);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/activities/:id', async (req, res) => {
  try {
    const result = await activitiesDB.update({ _id: req.params.id }, { $set: req.body }, { returnUpdatedDocs: true });
    if (result.numAffected === 0) return res.status(404).json({ error: 'Activity not found' });
    res.json(result.updatedDocuments[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    const numRemoved = await activitiesDB.remove({ _id: req.params.id }, {});
    await milestonesDB.remove({ activityId: req.params.id }, { multi: true });
    await guestsDB.remove({ activityId: req.params.id }, { multi: true });
    await remindersDB.remove({ activityId: req.params.id }, { multi: true });
    if (numRemoved === 0) return res.status(404).json({ error: 'Activity not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/:id/milestones', async (req, res) => {
  try {
    const milestones = await milestonesDB.find({ activityId: req.params.id }).sort({ order: 1 });
    res.json(milestones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities/:id/milestones', async (req, res) => {
  try {
    const milestone = {
      _id: uuidv4(),
      activityId: req.params.id,
      ...req.body,
      completed: req.body.completed || false,
    };
    const result = await milestonesDB.insert(milestone);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/milestones/:id', async (req, res) => {
  try {
    const result = await milestonesDB.update({ _id: req.params.id }, { $set: req.body }, { returnUpdatedDocs: true });
    if (result.numAffected === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json(result.updatedDocuments[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/milestones/:id/reorder', async (req, res) => {
  try {
    const { newOrder, activityId } = req.body;
    const milestones = await milestonesDB.find({ activityId }).sort({ order: 1 });
    const current = milestones.find((m) => m._id === req.params.id);
    if (!current) return res.status(404).json({ error: 'Milestone not found' });

    const activity = await activitiesDB.findOne({ _id: activityId });
    const activityDate = activity ? new Date(activity.date) : new Date();
    const totalMilestones = milestones.length;
    const msPerDay = 24 * 60 * 60 * 1000;

    const removed = milestones.filter((m) => m._id !== req.params.id);
    removed.splice(newOrder, 0, current);

    for (let i = 0; i < removed.length; i++) {
      const m = removed[i];
      const daysFromEnd = (totalMilestones - 1 - i);
      const newDate = new Date(activityDate.getTime() - daysFromEnd * 3 * msPerDay);
      await milestonesDB.update(
        { _id: m._id },
        { $set: { order: i, date: newDate.toISOString().split('T')[0] } }
      );
    }

    const updated = await milestonesDB.find({ activityId }).sort({ order: 1 });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/milestones/:id', async (req, res) => {
  try {
    const numRemoved = await milestonesDB.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Milestone not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/:id/guests', async (req, res) => {
  try {
    const guests = await guestsDB.find({ activityId: req.params.id });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities/:id/guests', async (req, res) => {
  try {
    const guest = {
      _id: uuidv4(),
      activityId: req.params.id,
      ...req.body,
      status: req.body.status || 'pending',
    };
    const result = await guestsDB.insert(guest);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/guests/:id', async (req, res) => {
  try {
    const result = await guestsDB.update({ _id: req.params.id }, { $set: req.body }, { returnUpdatedDocs: true });
    if (result.numAffected === 0) return res.status(404).json({ error: 'Guest not found' });
    res.json(result.updatedDocuments[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/guests/:id', async (req, res) => {
  try {
    const numRemoved = await guestsDB.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Guest not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/activities/:id/reminders', async (req, res) => {
  try {
    const reminders = await remindersDB.find({ activityId: req.params.id });
    res.json(reminders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities/:id/reminders', async (req, res) => {
  try {
    const reminder = {
      _id: uuidv4(),
      activityId: req.params.id,
      ...req.body,
      enabled: req.body.enabled !== undefined ? req.body.enabled : true,
    };
    const result = await remindersDB.insert(reminder);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/reminders/:id', async (req, res) => {
  try {
    const result = await remindersDB.update({ _id: req.params.id }, { $set: req.body }, { returnUpdatedDocs: true });
    if (result.numAffected === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json(result.updatedDocuments[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reminders/:id', async (req, res) => {
  try {
    const numRemoved = await remindersDB.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FestivePlanner API server running on port ${PORT}`);
});
