import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { db, Course, Booking, CourseType, Coach, Member, Notification } from './db.js';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

const PORT = 3001;

interface WSMessage {
  type: string;
  data?: any;
}

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(msg: WSMessage) {
  const data = JSON.stringify(msg);
  clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}

async function checkCoachScheduleConflict(
  coachId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeCourseId?: string
) {
  const query: any = {
    coachId,
    date,
    $or: [
      { startTime: { $gte: startTime, $lt: endTime } },
      { endTime: { $gt: startTime, $lte: endTime } },
      { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
    ],
    status: 'active'
  };
  if (excludeCourseId) {
    query._id = { $ne: excludeCourseId };
  }
  const conflict = await db.courses.findOne(query);
  return conflict;
}

await db.initMockData();

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/course-types', async (_req, res) => {
  const list = await db.courseTypes.find({});
  res.json(list);
});

app.post('/api/course-types', async (req, res) => {
  const body = req.body as Partial<CourseType>;
  const ct = await db.courseTypes.insert({
    _id: uuidv4(),
    name: body.name!,
    color: body.color!,
    duration: body.duration || 60
  });
  res.json(ct);
});

app.put('/api/course-types/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Partial<CourseType>;
  const ct = await db.courseTypes.update({ _id: id }, { $set: body }, { returnUpdatedDocs: true });
  res.json(ct);
});

app.delete('/api/course-types/:id', async (req, res) => {
  const { id } = req.params;
  await db.courseTypes.remove({ _id: id }, {});
  res.json({ success: true });
});

app.get('/api/coaches', async (_req, res) => {
  const list = await db.coaches.find({});
  res.json(list);
});

app.post('/api/coaches', async (req, res) => {
  const body = req.body as Partial<Coach>;
  const coach = await db.coaches.insert({
    _id: uuidv4(),
    name: body.name!,
    phone: body.phone || ''
  });
  res.json(coach);
});

app.put('/api/coaches/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Partial<Coach>;
  const coach = await db.coaches.update({ _id: id }, { $set: body }, { returnUpdatedDocs: true });
  res.json(coach);
});

app.delete('/api/coaches/:id', async (req, res) => {
  const { id } = req.params;
  await db.coaches.remove({ _id: id }, {});
  res.json({ success: true });
});

app.get('/api/members', async (_req, res) => {
  const list = await db.members.find({});
  res.json(list);
});

app.get('/api/courses', async (req, res) => {
  const { startDate, endDate, coachId } = req.query;
  const query: any = {};
  if (startDate && endDate) {
    query.date = { $gte: String(startDate), $lte: String(endDate) };
  }
  if (coachId) query.coachId = String(coachId);
  const list = await db.courses.find(query).sort({ date: 1, startTime: 1 });
  res.json(list);
});

app.get('/api/courses/:id', async (req, res) => {
  const course = await db.courses.findOne({ _id: req.params.id });
  if (!course) return res.status(404).json({ error: 'Not found' });
  res.json(course);
});

app.post('/api/courses', async (req, res) => {
  const body = req.body as Partial<Course>;
  const conflict = await checkCoachScheduleConflict(
    body.coachId!,
    body.date!,
    body.startTime!,
    body.endTime!
  );
  if (conflict) {
    return res.status(409).json({ error: '该教练在此时段已有课程安排', conflict });
  }
  const course = await db.courses.insert({
    _id: uuidv4(),
    date: body.date!,
    startTime: body.startTime!,
    endTime: body.endTime!,
    courseTypeId: body.courseTypeId!,
    coachId: body.coachId!,
    capacity: body.capacity || 15,
    bookedCount: 0,
    status: 'active'
  });
  broadcast({ type: 'course:created', data: course });
  res.json(course);
});

app.put('/api/courses/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body as Partial<Course>;
  const existing = await db.courses.findOne({ _id: id });
  if (!existing) return res.status(404).json({ error: '课程不存在' });

  const coachId = body.coachId ?? existing.coachId;
  const date = body.date ?? existing.date;
  const startTime = body.startTime ?? existing.startTime;
  const endTime = body.endTime ?? existing.endTime;

  const conflict = await checkCoachScheduleConflict(
    coachId,
    date,
    startTime,
    endTime,
    id
  );
  if (conflict) {
    return res.status(409).json({ error: '该教练在此时段已有课程安排', conflict });
  }

  const course = await db.courses.update({ _id: id }, { $set: body }, { returnUpdatedDocs: true });
  broadcast({ type: 'course:updated', data: course });
  res.json(course);
});

app.delete('/api/courses/:id', async (req, res) => {
  const { reason } = req.body as { reason?: string };
  const course = await db.courses.findOne({ _id: req.params.id });
  if (!course) return res.status(404).json({ error: 'Not found' });

  const courseTypes = await db.courseTypes.findOne({ _id: course.courseTypeId });
  const relatedBookings = await db.bookings.find({ courseId: course._id, status: 'booked' });
  const memberIds = relatedBookings.map((b) => b.memberId);

  await db.courses.update(
    { _id: course._id },
    { $set: { status: 'cancelled', cancelReason: reason || '临时取消' } },
    {}
  );

  if (memberIds.length > 0) {
    const notification: Partial<Notification> = {
      _id: uuidv4(),
      courseId: course._id,
      courseName: courseTypes?.name || '课程',
      originalTime: `${course.date} ${course.startTime}`,
      reason: reason || '临时取消',
      memberIds,
      readMemberIds: [],
      createdAt: new Date().toISOString()
    };
    await db.notifications.insert(notification);
    broadcast({ type: 'notification:new', data: notification });
  }

  broadcast({ type: 'course:cancelled', data: { id: course._id } });
  res.json({ success: true });
});

app.get('/api/bookings', async (req, res) => {
  const { courseId, memberId } = req.query;
  const query: any = {};
  if (courseId) query.courseId = String(courseId);
  if (memberId) query.memberId = String(memberId);
  const list = await db.bookings.find(query).sort({ createdAt: -1 });
  const result = await Promise.all(
    list.map(async (b) => {
      const course = await db.courses.findOne({ _id: b.courseId });
      const courseType = course ? await db.courseTypes.findOne({ _id: course.courseTypeId }) : null;
      const coach = course ? await db.coaches.findOne({ _id: course.coachId }) : null;
      return { ...b, course, courseType, coach };
    })
  );
  res.json(result);
});

app.post('/api/bookings', async (req, res) => {
  const { courseId, memberId, memberName } = req.body;
  const course = await db.courses.findOne({ _id: courseId });
  if (!course) return res.status(404).json({ error: '课程不存在' });
  if (course.status === 'cancelled') return res.status(400).json({ error: '课程已取消' });
  if (course.bookedCount >= course.capacity) return res.status(400).json({ error: '课程已满' });

  const existing = await db.bookings.findOne({
    courseId,
    memberId,
    status: 'booked'
  });
  if (existing) return res.status(400).json({ error: '您已预约该课程' });

  const booking: Partial<Booking> = {
    _id: uuidv4(),
    courseId,
    memberId,
    memberName,
    createdAt: new Date().toISOString(),
    status: 'booked'
  };
  await db.bookings.insert(booking);
  const updated = await db.courses.update(
    { _id: courseId },
    { $inc: { bookedCount: 1 } },
    { returnUpdatedDocs: true }
  );
  broadcast({ type: 'booking:changed', data: { courseId, bookedCount: (updated as any).bookedCount } });
  res.json(booking);
});

app.delete('/api/bookings/:id', async (req, res) => {
  const booking = await db.bookings.findOne({ _id: req.params.id });
  if (!booking) return res.status(404).json({ error: 'Not found' });
  await db.bookings.update({ _id: booking._id }, { $set: { status: 'cancelled' } }, {});
  const updated = await db.courses.update(
    { _id: booking.courseId },
    { $inc: { bookedCount: -1 } },
    { returnUpdatedDocs: true }
  );
  broadcast({
    type: 'booking:changed',
    data: { courseId: booking.courseId, bookedCount: (updated as any).bookedCount }
  });
  res.json({ success: true });
});

app.get('/api/notifications', async (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.json([]);
  const list = await db.notifications
    .find({ memberIds: String(memberId) })
    .sort({ createdAt: -1 });
  const unread = list.filter((n) => !n.readMemberIds.includes(String(memberId)));
  res.json(unread);
});

app.post('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  await db.notifications.update({ _id: id }, { $addToSet: { readMemberIds: memberId } }, {});
  res.json({ success: true });
});

server.listen(PORT, () => {
  console.log(`Gym server running on http://localhost:${PORT}`);
  console.log(`WS on ws://localhost:${PORT}/ws`);
});
