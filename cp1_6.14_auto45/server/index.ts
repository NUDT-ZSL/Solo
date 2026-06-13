import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  createPoll,
  getPoll,
  getPolls,
  getPollCount,
  getPollResults,
  submitVote,
  getVoteRecords,
  exportPollToCSV,
  PollType
} from './db.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;

app.use(express.json());

app.get('/api/polls', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const polls = getPolls(limit, offset);
  const total = getPollCount();
  res.json({ polls, total });
});

app.get('/api/polls/:id', (req, res) => {
  const poll = getPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }
  res.json(poll);
});

app.post('/api/polls', (req, res) => {
  const { title, type, options, deadline } = req.body;

  if (!title || !type || !options || !Array.isArray(options) || options.length < 2) {
    res.status(400).json({ error: '请提供有效的投票标题、类型和至少2个选项' });
    return;
  }

  const validTypes: PollType[] = ['single', 'multiple', 'rating', 'ranking'];
  if (!validTypes.includes(type as PollType)) {
    res.status(400).json({ error: '无效的投票类型' });
    return;
  }

  const poll = createPoll(
    title,
    type as PollType,
    options,
    deadline ? new Date(deadline).getTime() : null
  );

  io.emit('pollCreated', poll);

  res.status(201).json(poll);
});

app.get('/api/polls/:id/results', (req, res) => {
  const results = getPollResults(req.params.id);
  const poll = getPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }
  res.json({ results, participantCount: poll.participant_count });
});

app.post('/api/polls/:id/vote', (req, res) => {
  const { selections } = req.body;
  const pollId = req.params.id;

  if (!selections || !Array.isArray(selections) || selections.length === 0) {
    res.status(400).json({ error: '请选择投票选项' });
    return;
  }

  const poll = getPoll(pollId);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }

  const ip = req.headers['x-forwarded-for'] as string || req.ip || null;

  const result = submitVote(pollId, selections, ip);

  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  const updatedResults = getPollResults(pollId);
  const updatedPoll = getPoll(pollId);
  io.to(pollId).emit('voteUpdated', {
    results: updatedResults,
    participantCount: updatedPoll?.participant_count || 0
  });

  res.json({ success: true });
});

app.get('/api/polls/:id/records', (req, res) => {
  const poll = getPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }
  const records = getVoteRecords(req.params.id);
  res.json(records);
});

app.get('/api/polls/:id/export', (req, res) => {
  const poll = getPoll(req.params.id);
  if (!poll) {
    res.status(404).json({ error: '投票不存在' });
    return;
  }
  const csv = exportPollToCSV(req.params.id);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="poll_${req.params.id}.csv"`);
  res.send(csv);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('joinPoll', (pollId: string) => {
    socket.join(pollId);
    console.log(`Socket ${socket.id} joined poll ${pollId}`);
  });

  socket.on('leavePoll', (pollId: string) => {
    socket.leave(pollId);
    console.log(`Socket ${socket.id} left poll ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`PollVault server running on http://localhost:${PORT}`);
});
