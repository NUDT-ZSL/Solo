import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Member, Box, Order, Notification } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');

const readJSON = <T>(filename: string): T[] => {
  const filePath = path.join(dataDir, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
};

const writeJSON = <T>(filename: string, data: T[]): void => {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

let notifications: Notification[] = [];

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const members = readJSON<Member>('members.json');
  const member = members.find(
    (m) => m.email === email && m.password === password
  );
  if (member) {
    const { password: _, ...memberWithoutPassword } = member;
    res.json({ success: true, member: memberWithoutPassword });
  } else {
    res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, phone, address } = req.body;
  const members = readJSON<Member>('members.json');

  if (members.find((m) => m.email === email)) {
    return res
      .status(400)
      .json({ success: false, message: '该邮箱已被注册' });
  }

  const newMember: Member = {
    id: uuidv4(),
    email,
    password,
    name,
    phone,
    address,
    isAdmin: false,
    createdAt: new Date().toISOString(),
  };

  members.push(newMember);
  writeJSON('members.json', members);

  const { password: _, ...memberWithoutPassword } = newMember;
  res.json({ success: true, member: memberWithoutPassword });
});

app.get('/api/boxes', (req, res) => {
  const boxes = readJSON<Box>('boxes.json');
  const activeOnly = req.query.activeOnly === 'true';
  const result = activeOnly ? boxes.filter((b) => b.isActive) : boxes;
  result.sort((a, b) => a.sortOrder - b.sortOrder);
  res.json(result);
});

app.get('/api/boxes/:id', (req, res) => {
  const boxes = readJSON<Box>('boxes.json');
  const box = boxes.find((b) => b.id === req.params.id);
  if (box) {
    res.json(box);
  } else {
    res.status(404).json({ message: '蔬菜箱不存在' });
  }
});

app.post('/api/boxes', (req, res) => {
  const boxes = readJSON<Box>('boxes.json');
  const newBox: Box = {
    ...req.body,
    id: uuidv4(),
    sortOrder: boxes.length + 1,
    isActive: true,
  };
  boxes.push(newBox);
  writeJSON('boxes.json', boxes);
  res.json(newBox);
});

app.put('/api/boxes/:id', (req, res) => {
  const boxes = readJSON<Box>('boxes.json');
  const index = boxes.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: '蔬菜箱不存在' });
  }
  boxes[index] = { ...boxes[index], ...req.body, id: req.params.id };
  writeJSON('boxes.json', boxes);
  res.json(boxes[index]);
});

app.delete('/api/boxes/:id', (req, res) => {
  const boxes = readJSON<Box>('boxes.json');
  const index = boxes.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: '蔬菜箱不存在' });
  }
  boxes[index].isActive = false;
  writeJSON('boxes.json', boxes);
  res.json({ success: true });
});

app.post('/api/boxes/reorder', (req, res) => {
  const { ids } = req.body as { ids: string[] };
  const boxes = readJSON<Box>('boxes.json');
  ids.forEach((id, index) => {
    const box = boxes.find((b) => b.id === id);
    if (box) box.sortOrder = index + 1;
  });
  writeJSON('boxes.json', boxes);
  res.json({ success: true });
});

app.get('/api/orders', (req, res) => {
  const orders = readJSON<Order>('orders.json');
  const memberId = req.query.memberId as string;
  const status = req.query.status as string;
  const date = req.query.date as string;

  let result = orders;
  if (memberId) result = result.filter((o) => o.memberId === memberId);
  if (status) result = result.filter((o) => o.status === status);
  if (date) result = result.filter((o) => o.deliveryDate === date);

  result.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(result);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = readJSON<Order>('orders.json');
  const order = orders.find((o) => o.id === req.params.id);
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: '订单不存在' });
  }
});

app.post('/api/orders', (req, res) => {
  const orders = readJSON<Order>('orders.json');
  const now = new Date().toISOString();
  const newOrder: Order = {
    ...req.body,
    id: uuidv4(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  orders.push(newOrder);
  writeJSON('orders.json', orders);
  res.json(newOrder);
});

app.put('/api/orders/:id/status', (req, res) => {
  const orders = readJSON<Order>('orders.json');
  const index = orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: '订单不存在' });
  }
  const oldStatus = orders[index].status;
  orders[index].status = req.body.status;
  orders[index].updatedAt = new Date().toISOString();
  writeJSON('orders.json', orders);

  if (oldStatus !== req.body.status && req.body.status === 'delivering') {
    const notification: Notification = {
      id: uuidv4(),
      memberId: orders[index].memberId,
      type: 'status',
      title: '订单配送中',
      message: `您的订单 ${orders[index].id.slice(-8)} 正在配送中`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    notifications.push(notification);
  }

  res.json(orders[index]);
});

app.put('/api/orders/batch-status', (req, res) => {
  const { ids, status } = req.body;
  const orders = readJSON<Order>('orders.json');
  const now = new Date().toISOString();

  ids.forEach((id: string) => {
    const order = orders.find((o) => o.id === id);
    if (order) {
      order.status = status;
      order.updatedAt = now;

      if (status === 'delivering') {
        notifications.push({
          id: uuidv4(),
          memberId: order.memberId,
          type: 'status',
          title: '订单配送中',
          message: `您的订单 ${order.id.slice(-8)} 正在配送中`,
          read: false,
          createdAt: now,
        });
      }
    }
  });

  writeJSON('orders.json', orders);
  res.json({ success: true, updated: ids.length });
});

app.put('/api/orders/:id/cancel', (req, res) => {
  const orders = readJSON<Order>('orders.json');
  const index = orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: '订单不存在' });
  }
  if (
    orders[index].status === 'delivering' ||
    orders[index].status === 'delivered'
  ) {
    return res
      .status(400)
      .json({ message: '该订单状态不允许取消' });
  }
  orders[index].status = 'cancelled';
  orders[index].updatedAt = new Date().toISOString();
  writeJSON('orders.json', orders);
  res.json(orders[index]);
});

app.get('/api/notifications/:memberId', (req, res) => {
  const memberId = req.params.memberId;
  const memberNotifications = notifications.filter(
    (n) => n.memberId === memberId
  );
  memberNotifications.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(memberNotifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const notification = notifications.find((n) => n.id === req.params.id);
  if (notification) {
    notification.read = true;
    res.json({ success: true });
  } else {
    res.status(404).json({ message: '通知不存在' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
