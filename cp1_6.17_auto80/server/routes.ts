import { Router, Request, Response } from 'express';
import {
  getAllEvents, getEventById, createEvent, updateEvent, deleteEvent,
  getAllDevices, getDeviceById, createDevice, updateDevice, deleteDevice,
  getAllBorrowRequests, createBorrowRequest, approveBorrowRequest, returnBorrowRequest,
  getBorrowRequestsByBorrower,
} from './storage.js';

const router = Router();

const notifications: { id: string; borrower: string; message: string; deviceId: string; deviceName: string; timestamp: number }[] = [];

function checkExpiringBorrows() {
  const now = Date.now();
  const borrows = getAllBorrowRequests();
  const devices = getAllDevices();

  borrows.forEach(req => {
    if (!req.approved || req.returned) return;
    const endDate = new Date(req.endDate + 'T23:59:59').getTime();
    const timeLeft = endDate - now;

    if (timeLeft > 0 && timeLeft <= 86400000) {
      const existing = notifications.find(n => n.deviceId === req.deviceId && n.borrower === req.borrower);
      if (!existing) {
        const dev = devices.find(d => d.id === req.deviceId);
        notifications.push({
          id: `${req.deviceId}-${req.borrower}`,
          borrower: req.borrower,
          deviceId: req.deviceId,
          deviceName: dev?.name || '未知设备',
          message: `设备即将到期，请及时归还`,
          timestamp: now,
        });
        console.log(`[NOTIFICATION] 借用到期提醒: ${req.borrower} - ${dev?.name} 将在 ${Math.ceil(timeLeft / 3600000)} 小时后到期`);
      }
    }
  });
}

setInterval(checkExpiringBorrows, 60000);
checkExpiringBorrows();

router.get('/notifications', (_req: Request, res: Response) => {
  res.json(notifications);
});

router.get('/notifications/:borrower', (req: Request, res: Response) => {
  const borrower = req.params.borrower;
  const userNotifs = notifications.filter(n => n.borrower === borrower);
  res.json(userNotifs);
});

router.get('/events', (_req: Request, res: Response) => {
  res.json(getAllEvents());
});

router.get('/events/:id', (req: Request, res: Response) => {
  const item = getEventById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/events', (req: Request, res: Response) => {
  const item = createEvent(req.body);
  res.status(201).json(item);
});

router.put('/events/:id', (req: Request, res: Response) => {
  const item = updateEvent(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.delete('/events/:id', (req: Request, res: Response) => {
  const ok = deleteEvent(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.get('/devices', (_req: Request, res: Response) => {
  const page = parseInt(_req.query.page as string) || 1;
  const limit = parseInt(_req.query.limit as string) || 10;
  const all = getAllDevices();
  const start = (page - 1) * limit;
  res.json({
    data: all.slice(start, start + limit),
    total: all.length,
    page,
    totalPages: Math.ceil(all.length / limit),
  });
});

router.get('/devices/:id', (req: Request, res: Response) => {
  const item = getDeviceById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/devices', (req: Request, res: Response) => {
  const item = createDevice(req.body);
  res.status(201).json(item);
});

router.put('/devices/:id', (req: Request, res: Response) => {
  const item = updateDevice(req.params.id, req.body);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.delete('/devices/:id', (req: Request, res: Response) => {
  const ok = deleteDevice(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

router.get('/borrows', (_req: Request, res: Response) => {
  res.json(getAllBorrowRequests());
});

router.get('/borrows/borrower/:name', (req: Request, res: Response) => {
  res.json(getBorrowRequestsByBorrower(req.params.name));
});

router.post('/borrows', (req: Request, res: Response) => {
  const item = createBorrowRequest(req.body);
  res.status(201).json(item);
});

router.put('/borrows/:id/approve', (req: Request, res: Response) => {
  const item = approveBorrowRequest(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.put('/borrows/:id/return', (req: Request, res: Response) => {
  const item = returnBorrowRequest(req.params.id);
  if (item) {
    const notifIdx = notifications.findIndex(n => n.deviceId === item.deviceId && n.borrower === item.borrower);
    if (notifIdx !== -1) notifications.splice(notifIdx, 1);
  }
  res.json(item);
});

export default router;
