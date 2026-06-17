import { Router, Request, Response } from 'express';
import {
  getMembers,
  getMember,
  getCurrentUser,
  setCurrentUser,
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getDevices,
  getDevice,
  createDevice,
  updateDevice,
  deleteDevice,
  getBorrowRequests,
  getBorrowRequest,
  createBorrowRequest,
  updateBorrowRequest,
  getNotifications,
  markNotificationRead,
  checkBorrowDueDates,
  storage,
} from './storage';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/members', (_req: Request, res: Response) => {
  res.json(getMembers());
});

router.get('/members/:id', (req: Request, res: Response) => {
  const member = getMember(req.params.id);
  if (!member) return res.status(404).json({ error: '成员不存在' });
  res.json(member);
});

router.get('/auth/current', (_req: Request, res: Response) => {
  const user = getCurrentUser();
  if (!user) return res.status(404).json({ error: '未登录' });
  res.json(user);
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { userId } = req.body;
  const member = getMember(userId);
  if (!member) return res.status(404).json({ error: '用户不存在' });
  setCurrentUser(userId);
  res.json(member);
});

router.get('/events', (_req: Request, res: Response) => {
  res.json(getEvents());
});

router.get('/events/:id', (req: Request, res: Response) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: '事件不存在' });
  res.json(event);
});

router.post('/events', (req: Request, res: Response) => {
  const { name, city, venue, date, time, type, participantIds, deviceIds } = req.body;
  if (!name || !city || !venue || !date || !time || !type) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const event = createEvent({
    name,
    city,
    venue,
    date,
    time,
    type,
    participantIds: participantIds || [],
    deviceIds: deviceIds || [],
  });
  res.status(201).json(event);
});

router.put('/events/:id', (req: Request, res: Response) => {
  const updated = updateEvent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '事件不存在' });
  res.json(updated);
});

router.delete('/events/:id', (req: Request, res: Response) => {
  const deleted = deleteEvent(req.params.id);
  if (!deleted) return res.status(404).json({ error: '事件不存在' });
  res.json({ success: true });
});

router.get('/devices', (_req: Request, res: Response) => {
  const devices = getDevices();
  res.json({
    devices,
    total: devices.length,
  });
});

router.get('/devices/paginated', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const devices = getDevices();
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  res.json({
    devices: devices.slice(start, end),
    total: devices.length,
    page,
    pageSize,
    totalPages: Math.ceil(devices.length / pageSize),
  });
});

router.get('/devices/:id', (req: Request, res: Response) => {
  const device = getDevice(req.params.id);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  res.json(device);
});

router.post('/devices', (req: Request, res: Response) => {
  const { name, ownerId, ownerName, purchasePrice } = req.body;
  if (!name || !ownerId || !ownerName || !purchasePrice) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const device = createDevice({ name, ownerId, ownerName, purchasePrice });
  res.status(201).json(device);
});

router.put('/devices/:id', (req: Request, res: Response) => {
  const updated = updateDevice(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: '设备不存在' });
  res.json(updated);
});

router.delete('/devices/:id', (req: Request, res: Response) => {
  const deleted = deleteDevice(req.params.id);
  if (!deleted) return res.status(404).json({ error: '设备不存在' });
  res.json({ success: true });
});

router.get('/borrow-requests', (_req: Request, res: Response) => {
  res.json(getBorrowRequests());
});

router.get('/borrow-requests/pending', (_req: Request, res: Response) => {
  const pending = getBorrowRequests().filter((br) => br.status === 'pending');
  res.json(pending);
});

router.get('/borrow-requests/my/:userId', (req: Request, res: Response) => {
  const myRequests = getBorrowRequests().filter((br) => br.borrowerId === req.params.userId);
  res.json(myRequests);
});

router.get('/borrow-requests/:id', (req: Request, res: Response) => {
  const request = getBorrowRequest(req.params.id);
  if (!request) return res.status(404).json({ error: '请求不存在' });
  res.json(request);
});

router.post('/borrow-requests', (req: Request, res: Response) => {
  const { deviceId, deviceName, borrowerId, borrowerName, startDate, endDate } = req.body;
  if (!deviceId || !deviceName || !borrowerId || !borrowerName || !startDate || !endDate) {
    return res.status(400).json({ error: '缺少必填字段' });
  }
  const device = getDevice(deviceId);
  if (!device) return res.status(404).json({ error: '设备不存在' });
  if (device.status !== 'idle') {
    return res.status(400).json({ error: '设备当前不可借用' });
  }
  const borrow = createBorrowRequest({
    deviceId,
    deviceName,
    borrowerId,
    borrowerName,
    startDate,
    endDate,
  });
  res.status(201).json(borrow);
});

router.put('/borrow-requests/:id/approve', (req: Request, res: Response) => {
  const borrow = getBorrowRequest(req.params.id);
  if (!borrow) return res.status(404).json({ error: '请求不存在' });
  if (borrow.status !== 'pending') {
    return res.status(400).json({ error: '请求状态不允许审批' });
  }
  const device = getDevice(borrow.deviceId);
  if (device) {
    updateDevice(device.id, { status: 'borrowed' });
  }
  const updated = updateBorrowRequest(req.params.id, { status: 'approved' });
  res.json(updated);
});

router.put('/borrow-requests/:id/reject', (req: Request, res: Response) => {
  const borrow = getBorrowRequest(req.params.id);
  if (!borrow) return res.status(404).json({ error: '请求不存在' });
  if (borrow.status !== 'pending') {
    return res.status(400).json({ error: '请求状态不允许审批' });
  }
  const updated = updateBorrowRequest(req.params.id, { status: 'rejected' });
  res.json(updated);
});

router.put('/borrow-requests/:id/return', (req: Request, res: Response) => {
  const borrow = getBorrowRequest(req.params.id);
  if (!borrow) return res.status(404).json({ error: '请求不存在' });
  if (borrow.status !== 'approved') {
    return res.status(400).json({ error: '请求状态不允许归还' });
  }
  const device = getDevice(borrow.deviceId);
  if (device) {
    updateDevice(device.id, { status: 'idle' });
  }
  const updated = updateBorrowRequest(req.params.id, { status: 'returned' });
  res.json(updated);
});

router.get('/notifications/:userId', (req: Request, res: Response) => {
  checkBorrowDueDates();
  res.json(getNotifications(req.params.userId));
});

router.put('/notifications/:id/read', (req: Request, res: Response) => {
  const result = markNotificationRead(req.params.id);
  if (!result) return res.status(404).json({ error: '通知不存在' });
  res.json({ success: true });
});

router.get('/dashboard/:userId', (req: Request, res: Response) => {
  checkBorrowDueDates();
  const userId = req.params.userId;
  const userEvents = getEvents()
    .filter((e) => e.participantIds.includes(userId))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const userBorrows = getBorrowRequests().filter(
    (br) => br.borrowerId === userId && br.status === 'approved'
  );

  const notifications = getNotifications(userId);

  res.json({
    events: userEvents,
    borrows: userBorrows,
    notifications,
  });
});

router.get('/debug/storage', (_req: Request, res: Response) => {
  res.json({
    members: storage.members.length,
    events: storage.events.length,
    devices: storage.devices.length,
    borrowRequests: storage.borrowRequests.length,
    notifications: storage.notifications.length,
  });
});

export default router;
