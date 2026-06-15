import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import { stringify } from 'csv-stringify';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const activitiesDb = Datastore.create(path.join(dataDir, 'activities.db'));
const volunteersDb = Datastore.create(path.join(dataDir, 'volunteers.db'));
const registrationsDb = Datastore.create(path.join(dataDir, 'registrations.db'));
const schedulesDb = Datastore.create(path.join(dataDir, 'schedules.db'));
const notificationsDb = Datastore.create(path.join(dataDir, 'notifications.db'));

async function initMockData() {
  const volunteerCount = await volunteersDb.count({});
  if (volunteerCount === 0) {
    const volunteers = [
      { _id: uuidv4(), name: '张明华' },
      { _id: uuidv4(), name: '李雪梅' },
      { _id: uuidv4(), name: '王建国' },
      { _id: uuidv4(), name: '赵晓燕' },
      { _id: uuidv4(), name: '陈思远' },
    ];
    for (const v of volunteers) {
      await volunteersDb.insert(v);
    }
  }

  const activityCount = await activitiesDb.count({});
  if (activityCount === 0) {
    const now = new Date();
    const activities = [
      {
        _id: uuidv4(),
        name: '社区环保宣传活动',
        dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        location: '阳光社区广场',
        maxParticipants: 20,
        description: '向社区居民宣传环保知识，分发宣传手册，组织垃圾分类讲解。',
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '敬老院爱心探访',
        dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        location: '幸福敬老院',
        maxParticipants: 15,
        description: '探访敬老院老人，陪伴聊天，表演节目，帮助打扫卫生。',
        createdAt: new Date().toISOString(),
      },
      {
        _id: uuidv4(),
        name: '图书馆志愿服务',
        dateTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        location: '市图书馆',
        maxParticipants: 10,
        description: '协助图书馆整理书籍，引导读者，维护阅读秩序。',
        createdAt: new Date().toISOString(),
      },
    ];
    for (const a of activities) {
      await activitiesDb.insert(a);
    }

    const allVolunteers = await volunteersDb.find({});
    const allActivities = await activitiesDb.find({});

    for (const activity of allActivities) {
      const numReg = Math.min(Math.floor(Math.random() * activity.maxParticipants) + 3, activity.maxParticipants);
      for (let i = 0; i < numReg; i++) {
        if (allVolunteers[i]) {
          await registrationsDb.insert({
            _id: uuidv4(),
            activityId: activity._id,
            volunteerName: allVolunteers[i].name,
            registeredAt: new Date().toISOString(),
          });
        }
      }

      const numSched = Math.min(Math.floor(Math.random() * 5) + 2, allVolunteers.length);
      for (let i = 0; i < numSched; i++) {
        if (allVolunteers[i]) {
          await schedulesDb.insert({
            _id: uuidv4(),
            activityId: activity._id,
            volunteerId: allVolunteers[i]._id,
            volunteerName: allVolunteers[i].name,
          });
        }
      }
    }
  }
}

initMockData().then(() => {
  console.log('Mock data initialized');
});

app.get('/api/activities', async (req, res) => {
  try {
    const { month } = req.query;
    let query = {};
    if (month && typeof month === 'string') {
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1).toISOString();
      const end = new Date(year, mon, 1).toISOString();
      query = { dateTime: { $gte: start, $lt: end } };
    }
    const activities = await activitiesDb.find(query).sort({ dateTime: 1 });
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.get('/api/activities/:id', async (req, res) => {
  try {
    const activity = await activitiesDb.findOne({ _id: req.params.id });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { name, dateTime, location, maxParticipants, description } = req.body;
    if (!name || !dateTime || !location || !maxParticipants) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const activity = {
      _id: uuidv4(),
      name,
      dateTime,
      location,
      maxParticipants: Number(maxParticipants),
      description: description || '',
      createdAt: new Date().toISOString(),
    };
    const result = await activitiesDb.insert(activity);

    const notification = {
      _id: uuidv4(),
      activityId: result._id,
      activityName: result.name,
      message: `新活动创建：${result.name}`,
      type: 'success',
      createdAt: new Date().toISOString(),
      dismissed: false,
    };
    await notificationsDb.insert(notification);

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

app.put('/api/activities/:id', async (req, res) => {
  try {
    const { name, dateTime, location, maxParticipants, description } = req.body;
    const activity = await activitiesDb.update(
      { _id: req.params.id },
      { $set: { name, dateTime, location, maxParticipants, description } },
      { returnUpdatedDocs: true }
    );
    if (!activity) return res.status(404).json({ error: 'Activity not found' });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    const numRemoved = await activitiesDb.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Activity not found' });
    await registrationsDb.remove({ activityId: req.params.id }, { multi: true });
    await schedulesDb.remove({ activityId: req.params.id }, { multi: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

app.get('/api/activities/:id/registrations', async (req, res) => {
  try {
    const registrations = await registrationsDb.find({ activityId: req.params.id });
    res.json(registrations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

app.post('/api/activities/:id/register', async (req, res) => {
  try {
    const { volunteerName } = req.body;
    if (!volunteerName) return res.status(400).json({ error: 'Volunteer name required' });

    const activity = await activitiesDb.findOne({ _id: req.params.id });
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const existing = await registrationsDb.findOne({ activityId: req.params.id, volunteerName });
    if (existing) return res.status(409).json({ error: 'Already registered' });

    const count = await registrationsDb.count({ activityId: req.params.id });
    if (count >= activity.maxParticipants) return res.status(400).json({ error: 'Activity full' });

    const registration = {
      _id: uuidv4(),
      activityId: req.params.id,
      volunteerName,
      registeredAt: new Date().toISOString(),
    };
    const result = await registrationsDb.insert(registration);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const volunteers = await volunteersDb.find({});
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
});

app.get('/api/schedules', async (req, res) => {
  try {
    const { activityId } = req.query;
    let query = {};
    if (activityId) query = { activityId };
    const schedules = await schedulesDb.find(query);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

app.post('/api/schedules', async (req, res) => {
  try {
    const { activityId, volunteerId, volunteerName } = req.body;
    if (!activityId || !volunteerId || !volunteerName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await schedulesDb.findOne({ activityId, volunteerId });
    if (existing) return res.status(409).json({ error: 'Already scheduled' });

    const schedule = {
      _id: uuidv4(),
      activityId,
      volunteerId,
      volunteerName,
    };
    const result = await schedulesDb.insert(schedule);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  try {
    const numRemoved = await schedulesDb.remove({ _id: req.params.id }, {});
    if (numRemoved === 0) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

app.get('/api/notifications', async (req, res) => {
  try {
    const notifications = await notificationsDb.find({ dismissed: { $ne: true } }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.post('/api/notifications/check', async (req, res) => {
  try {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const upcomingActivities = await activitiesDb.find({
      dateTime: { $gte: now.toISOString(), $lte: twoHoursLater.toISOString() },
    });

    const newNotifications = [];
    for (const activity of upcomingActivities) {
      const existing = await notificationsDb.findOne({
        activityId: activity._id,
        type: 'reminder',
        dismissed: { $ne: true },
      });
      if (!existing) {
        const notification = {
          _id: uuidv4(),
          activityId: activity._id,
          activityName: activity.name,
          message: `活动即将开始：${activity.name}`,
          type: 'reminder',
          createdAt: new Date().toISOString(),
          dismissed: false,
        };
        const result = await notificationsDb.insert(notification);
        newNotifications.push(result);
      }
    }
    res.json(newNotifications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check notifications' });
  }
});

app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const result = await notificationsDb.update(
      { _id: req.params.id },
      { $set: { dismissed: true } },
      { returnUpdatedDocs: true }
    );
    if (!result) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

app.get('/api/report/schedule', async (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year ? Number(year) : new Date().getFullYear();
    const m = month ? Number(month) : new Date().getMonth() + 1;

    const start = new Date(y, m - 1, 1).toISOString();
    const end = new Date(y, m, 1).toISOString();

    const activities = await activitiesDb.find({ dateTime: { $gte: start, $lt: end } }).sort({ dateTime: 1 });
    const rows = [];
    for (const activity of activities) {
      const schedules = await schedulesDb.find({ activityId: activity._id });
      const registrations = await registrationsDb.find({ activityId: activity._id });
      const date = new Date(activity.dateTime);
      const dateStr = date.toLocaleDateString('zh-CN');
      const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

      if (schedules.length > 0) {
        for (const s of schedules) {
          rows.push({
            活动名称: activity.name,
            日期: dateStr,
            时间: timeStr,
            地点: activity.location,
            最大人数: activity.maxParticipants,
            已报名人数: registrations.length,
            排班志愿者: s.volunteerName,
          });
        }
      } else {
        rows.push({
          活动名称: activity.name,
          日期: dateStr,
          时间: timeStr,
          地点: activity.location,
          最大人数: activity.maxParticipants,
          已报名人数: registrations.length,
          排班志愿者: '-',
        });
      }
    }

    const fileName = `schedule_${y}_${String(m).padStart(2, '0')}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.write('\uFEFF');

    stringify(rows, { header: true }, (err, output) => {
      if (err) return res.status(500).json({ error: 'Failed to generate CSV' });
      res.send(output);
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to export schedule' });
  }
});

app.get('/api/stats/completion-rate', async (req, res) => {
  try {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      const dayStart = day.toISOString();
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      const dayEnd = nextDay.toISOString();

      const activities = await activitiesDb.find({ dateTime: { $gte: dayStart, $lt: dayEnd } });
      let scheduledCount = 0;
      let totalSlots = 0;

      for (const activity of activities) {
        const schedules = await schedulesDb.find({ activityId: activity._id });
        scheduledCount += Math.min(schedules.length, activity.maxParticipants);
        totalSlots += activity.maxParticipants;
      }

      const rate = totalSlots > 0 ? Math.round((scheduledCount / totalSlots) * 100) : 0;
      result.push({
        date: day.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
        rate,
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
