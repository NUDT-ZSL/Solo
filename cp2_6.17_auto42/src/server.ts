import express from 'express';
import cors from 'cors';
import {
  initData,
  readUsers,
  writeUsers,
  readTasks,
  writeTasks,
  readTransactions,
  writeTransactions,
  User,
  Task,
  Transaction,
  TaskStatus
} from './data/db';
import { generateUUID, calculatePublisherReward, calculateAcceptorReward } from './utils/helpers';

const app = express();
const PORT = 4001;

app.use(cors());
app.use(express.json());

initData();

app.get('/api/users', (_req, res) => {
  const users = readUsers();
  res.json(users);
});

app.get('/api/users/:id', (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(user);
});

app.post('/api/users', (req, res) => {
  const users = readUsers();
  const { nickname, avatarUrl, building } = req.body;

  if (!nickname || !building) {
    res.status(400).json({ error: '昵称和楼栋不能为空' });
    return;
  }

  const newUser: User = {
    id: generateUUID(),
    nickname,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nickname)}`,
    building,
    creditScore: 100,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsers(users);
  res.status(201).json(newUser);
});

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const { type, title, description, expectedTime, rewardPoints, publisherId } = req.body;

  if (!type || !title || !publisherId) {
    res.status(400).json({ error: '任务类型、标题和发布者不能为空' });
    return;
  }

  if (rewardPoints < 1 || rewardPoints > 10) {
    res.status(400).json({ error: '奖励积分必须在1-10分之间' });
    return;
  }

  const users = readUsers();
  const publisher = users.find((u) => u.id === publisherId);
  if (!publisher) {
    res.status(404).json({ error: '发布者不存在' });
    return;
  }

  const newTask: Task = {
    id: generateUUID(),
    type,
    title,
    description: description || '',
    expectedTime: expectedTime || '',
    rewardPoints,
    publisherId,
    acceptorId: null,
    status: 'active',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.push(newTask);
  writeTasks(tasks);
  res.status(201).json(newTask);
});

app.get('/api/tasks', (req, res) => {
  const tasks = readTasks();
  const { building, status, userId } = req.query;

  let filteredTasks = tasks;

  if (status) {
    filteredTasks = filteredTasks.filter((t) => t.status === status);
  }

  if (userId) {
    filteredTasks = filteredTasks.filter(
      (t) => t.publisherId === userId || t.acceptorId === userId
    );
  }

  if (building) {
    const users = readUsers();
    const buildingUsers = users.filter((u) => u.building === building).map((u) => u.id);
    filteredTasks = filteredTasks.filter((t) => buildingUsers.includes(t.publisherId));
  }

  filteredTasks.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(filteredTasks);
});

app.get('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }
  res.json(task);
});

app.put('/api/tasks/:id/accept', (req, res) => {
  const tasks = readTasks();
  const { acceptorId } = req.body;
  const taskIndex = tasks.findIndex((t) => t.id === req.params.id);

  if (taskIndex === -1) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const task = tasks[taskIndex];
  if (task.status !== 'active') {
    res.status(400).json({ error: '任务状态不允许接单' });
    return;
  }

  if (task.publisherId === acceptorId) {
    res.status(400).json({ error: '不能接受自己发布的任务' });
    return;
  }

  const users = readUsers();
  const acceptor = users.find((u) => u.id === acceptorId);
  if (!acceptor) {
    res.status(404).json({ error: '接单人不存在' });
    return;
  }

  tasks[taskIndex] = {
    ...task,
    acceptorId,
    status: 'in-progress' as TaskStatus
  };

  writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

app.put('/api/tasks/:id/complete', (req, res) => {
  const tasks = readTasks();
  const taskIndex = tasks.findIndex((t) => t.id === req.params.id);

  if (taskIndex === -1) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const task = tasks[taskIndex];
  if (task.status !== 'in-progress') {
    res.status(400).json({ error: '任务状态不允许完成' });
    return;
  }

  const users = readUsers();
  const transactions = readTransactions();
  const publisherIndex = users.findIndex((u) => u.id === task.publisherId);
  const acceptorIndex = users.findIndex((u) => u.id === task.acceptorId);

  const publisherReward = calculatePublisherReward();
  const acceptorReward = calculateAcceptorReward(task.rewardPoints);

  if (publisherIndex !== -1) {
    users[publisherIndex] = {
      ...users[publisherIndex],
      creditScore: users[publisherIndex].creditScore + publisherReward
    };
    transactions.push({
      id: generateUUID(),
      userId: task.publisherId,
      taskId: task.id,
      pointsChange: publisherReward,
      reason: '发布任务完成奖励',
      createdAt: new Date().toISOString()
    });
  }

  if (acceptorIndex !== -1) {
    users[acceptorIndex] = {
      ...users[acceptorIndex],
      creditScore: users[acceptorIndex].creditScore + acceptorReward
    };
    transactions.push({
      id: generateUUID(),
      userId: task.acceptorId!,
      taskId: task.id,
      pointsChange: acceptorReward,
      reason: `完成任务获得${acceptorReward}积分`,
      createdAt: new Date().toISOString()
    });
  }

  tasks[taskIndex] = {
    ...task,
    status: 'completed' as TaskStatus,
    completedAt: new Date().toISOString()
  };

  writeUsers(users);
  writeTasks(tasks);
  writeTransactions(transactions);
  res.json(tasks[taskIndex]);
});

app.put('/api/tasks/:id/cancel', (req, res) => {
  const tasks = readTasks();
  const taskIndex = tasks.findIndex((t) => t.id === req.params.id);

  if (taskIndex === -1) {
    res.status(404).json({ error: '任务不存在' });
    return;
  }

  const task = tasks[taskIndex];
  if (task.status === 'completed') {
    res.status(400).json({ error: '已完成的任务不能取消' });
    return;
  }

  tasks[taskIndex] = {
    ...task,
    status: 'cancelled' as TaskStatus
  };

  writeTasks(tasks);
  res.json(tasks[taskIndex]);
});

app.get('/api/transactions', (req, res) => {
  const transactions = readTransactions();
  const { userId } = req.query;
  let filtered = transactions;
  if (userId) {
    filtered = filtered.filter((t) => t.userId === userId);
  }
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json(filtered);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
