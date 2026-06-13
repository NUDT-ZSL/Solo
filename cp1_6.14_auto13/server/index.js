import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'data');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const users = Datastore.create({ filename: path.join(dbPath, 'users.db'), autoload: true });
const courses = Datastore.create({ filename: path.join(dbPath, 'courses.db'), autoload: true });
const bookings = Datastore.create({ filename: path.join(dbPath, 'bookings.db'), autoload: true });
const records = Datastore.create({ filename: path.join(dbPath, 'records.db'), autoload: true });

async function seedData() {
  const userCount = await users.count({});
  if (userCount === 0) {
    await users.insert([
      { _id: 'user1', name: '张三', role: 'member', avatar: '' },
      { _id: 'user2', name: '李教练', role: 'coach', avatar: '' },
      { _id: 'user3', name: '王会员', role: 'member', avatar: '' },
    ]);
  }

  const courseCount = await courses.count({});
  if (courseCount === 0) {
    const now = new Date();
    const sampleCourses = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split('T')[0];
      sampleCourses.push(
        { _id: uuidv4(), name: '瑜伽基础', coachId: 'user2', coachName: '李教练', date: dateStr, time: '09:00', duration: 60, capacity: 15, type: 'group' },
        { _id: uuidv4(), name: '力量训练', coachId: 'user2', coachName: '李教练', date: dateStr, time: '14:00', duration: 45, capacity: 15, type: 'group' },
        { _id: uuidv4(), name: '私教拉伸', coachId: 'user2', coachName: '李教练', date: dateStr, time: '16:00', duration: 30, capacity: 1, type: 'private' },
      );
    }
    await courses.insert(sampleCourses);
  }
}

seedData().catch(console.error);

app.post('/api/users/login', async (req, res) => {
  try {
    const { name } = req.body;
    let user = await users.findOne({ name });
    if (!user) {
      user = await users.insert({ _id: uuidv4(), name, role: 'member', avatar: '' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await users.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/courses', async (req, res) => {
  try {
    const allCourses = await courses.find({});
    const now = new Date();
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    const upcoming = allCourses.filter(c => {
      const cDate = new Date(c.date);
      return cDate >= new Date(now.toISOString().split('T')[0]) && cDate <= weekLater;
    });

    for (const course of upcoming) {
      const bookingCount = await bookings.count({ courseId: course._id, status: { $ne: 'cancelled' } });
      course.bookedCount = bookingCount;
      course.remaining = course.capacity - bookingCount;
    }

    res.json(upcoming);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', async (req, res) => {
  try {
    const course = { _id: uuidv4(), ...req.body, bookedCount: 0, remaining: req.body.capacity || 15 };
    await courses.insert(course);
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/courses/:id', async (req, res) => {
  try {
    const updated = await courses.update({ _id: req.params.id }, { $set: req.body });
    if (updated === 0) return res.status(404).json({ error: 'Course not found' });
    const course = await courses.findOne({ _id: req.params.id });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const removed = await courses.remove({ _id: courseId });
    if (removed === 0) return res.status(404).json({ error: 'Course not found' });
    const cancelledBookings = await bookings.find({ courseId, status: 'booked' });
    await bookings.update({ courseId, status: 'booked' }, { $set: { status: 'cancelled' } }, { multi: true });
    res.json({ success: true, cancelledBookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { userId, courseId } = req.body;
    const course = await courses.findOne({ _id: courseId });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const user = await users.findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await bookings.findOne({ userId, courseId, status: { $ne: 'cancelled' } });
    if (existing) return res.status(400).json({ error: 'Already booked' });

    const bookingCount = await bookings.count({ courseId, status: { $ne: 'cancelled' } });
    if (bookingCount >= course.capacity) return res.status(400).json({ error: 'Course is full' });

    const booking = {
      _id: uuidv4(),
      userId,
      userName: user.name,
      courseId,
      courseName: course.name,
      coachName: course.coachName,
      date: course.date,
      time: course.time,
      duration: course.duration,
      status: 'booked',
      createdAt: new Date().toISOString(),
    };
    await bookings.insert(booking);
    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const { userId, courseId, status, days } = req.query;
    const query = {};
    if (userId) query.userId = userId;
    if (courseId) query.courseId = courseId;
    if (status) query.status = status;

    let result = await bookings.find(query);

    if (days) {
      const now = new Date();
      const future = new Date(now);
      future.setDate(future.getDate() + parseInt(days));
      result = result.filter(b => {
        const bDate = new Date(b.date);
        return bDate >= new Date(now.toISOString().split('T')[0]) && bDate <= future;
      });
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await bookings.findOne({ _id: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'checked-in') return res.status(400).json({ error: 'Cannot cancel checked-in booking' });

    await bookings.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bookings/:id/checkin', async (req, res) => {
  try {
    const booking = await bookings.findOne({ _id: req.params.id });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'cancelled') return res.status(400).json({ error: 'Cannot check in cancelled booking' });

    await bookings.update({ _id: req.params.id }, { $set: { status: 'checked-in' } });
    const updated = await bookings.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userRecords = await records.find({ userId });
    userRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(userRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/records', async (req, res) => {
  try {
    const record = {
      _id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    await records.insert(record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/records/:userId/trend', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'week' } = req.query;
    const userRecords = await records.find({ userId, type: 'body' });
    userRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    const now = new Date();
    let startDate = new Date(now);
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const filtered = userRecords.filter(r => new Date(r.date) >= startDate);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`FitHub server running on http://localhost:${PORT}`);
});
