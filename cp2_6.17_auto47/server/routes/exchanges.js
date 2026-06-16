const express = require('express');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const { readData, writeData } = require('../utils/fileStorage');

const router = express.Router();

router.get('/', (req, res) => {
  const userId = req.query.userId;
  const data = readData('exchanges.json');
  const userRecords = data.records.filter(
    (r) => r.currentHolderId === userId || r.previousHolderId === userId
  );
  res.json(userRecords);
});

router.get('/recent', (_req, res) => {
  const data = readData('exchanges.json');
  const recent = data.records
    .sort(
      (a, b) => new Date(b.lentAt).getTime() - new Date(a.lentAt).getTime()
    )
    .slice(0, 3);
  res.json(recent);
});

router.get('/requests', (req, res) => {
  const userId = req.query.userId;
  const data = readData('exchanges.json');
  const pendingRequests = data.requests.filter(
    (r) => r.ownerId === userId && r.status === 'pending'
  );
  res.json(pendingRequests);
});

router.post('/request', (req, res) => {
  const data = readData('exchanges.json');
  const { bookId, requesterId, ownerId } = req.body;
  if (requesterId === ownerId) {
    return res.status(400).json({ error: '不能请求自己的图书' });
  }
  const exists = data.requests.find(
    (r) =>
      r.bookId === bookId &&
      r.requesterId === requesterId &&
      r.status === 'pending'
  );
  if (exists) {
    return res.status(400).json({ error: '已有待处理的请求' });
  }
  const newRequest = {
    id: uuidv4(),
    bookId,
    requesterId,
    ownerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  data.requests.push(newRequest);
  writeData('exchanges.json', data);
  res.json(newRequest);
});

router.put('/:id/respond', (req, res) => {
  const data = readData('exchanges.json');
  const { accept } = req.body;
  const reqIdx = data.requests.findIndex((r) => r.id === req.params.id);
  if (reqIdx === -1) return res.status(404).json({ error: '请求不存在' });

  data.requests[reqIdx].status = accept ? 'accepted' : 'rejected';

  if (accept) {
    const request = data.requests[reqIdx];
    const newRecord = {
      id: uuidv4(),
      bookId: request.bookId,
      currentHolderId: request.requesterId,
      previousHolderId: request.ownerId,
      lentAt: new Date().toISOString(),
      expectedReturnAt: dayjs().add(30, 'day').toISOString(),
      returnedAt: null,
      status: 'active',
      chain: [
        {
          fromUserId: request.ownerId,
          toUserId: request.requesterId,
          timestamp: new Date().toISOString(),
          note: '初次交换',
        },
      ],
    };
    data.records.push(newRecord);

    const users = readData('users.json');
    const ownerIdx = users.findIndex((u) => u.id === request.ownerId);
    const requesterIdx = users.findIndex((u) => u.id === request.requesterId);
    if (ownerIdx !== -1) users[ownerIdx].points += 10;
    if (requesterIdx !== -1) users[requesterIdx].points += 10;
    writeData('users.json', users);

    const books = readData('books.json');
    const bookIdx = books.findIndex((b) => b.id === request.bookId);
    if (bookIdx !== -1) books[bookIdx].ownerId = request.requesterId;
    writeData('books.json', books);
  }

  writeData('exchanges.json', data);
  res.json({ success: true });
});

router.get('/:id/history', (req, res) => {
  const data = readData('exchanges.json');
  const record = data.records.find((r) => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: '记录不存在' });
  res.json(record.chain);
});

router.put('/:id/close', (req, res) => {
  const data = readData('exchanges.json');
  const idx = data.records.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '记录不存在' });
  data.records[idx].status = 'closed';
  data.records[idx].returnedAt = new Date().toISOString();
  writeData('exchanges.json', data);
  res.json(data.records[idx]);
});

router.get('/admin/stats', (_req, res) => {
  const books = readData('books.json');
  const data = readData('exchanges.json');
  const activeCount = data.records.filter((r) => r.status === 'active').length;
  const completedCount = data.records.filter(
    (r) => r.status === 'completed' || r.status === 'closed'
  ).length;
  res.json({
    totalBooks: books.length,
    activeExchanges: activeCount,
    completedExchanges: completedCount,
  });
});

router.get('/admin/records', (_req, res) => {
  const data = readData('exchanges.json');
  res.json(data.records);
});

module.exports = router;
