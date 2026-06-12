import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import type { Poll, Comment, VoteData, CommentData } from './types';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

const dbDir = path.resolve(process.cwd(), 'data');
const pollsDb = Datastore.create({ filename: path.join(dbDir, 'polls.db'), autoload: true });
const commentsDb = Datastore.create({ filename: path.join(dbDir, 'comments.db'), autoload: true });

const OPTION_COLORS = ['#f43f5e', '#3b82f6', '#22c55e', '#f59e0b'];

let currentPollId: string | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let remainingTime = 0;

function broadcastPollUpdate() {
  if (currentPollId) {
    pollsDb.findOne({ _id: currentPollId }).then((poll) => {
      if (poll) {
        io.emit('poll:update', poll);
      }
    });
  }
}

function broadcastComments() {
  if (currentPollId) {
    commentsDb.find({ pollId: currentPollId }).sort({ createdAt: -1 }).limit(50).then((comments) => {
      io.emit('comments:update', comments);
    });
  }
}

setInterval(() => {
  broadcastPollUpdate();
  broadcastComments();
}, 1000);

app.get('/api/polls', async (_req, res) => {
  try {
    const polls = await pollsDb.find({}).sort({ createdAt: -1 }).limit(10);
    res.json(polls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

app.get('/api/polls/:id', async (req, res) => {
  try {
    const poll = await pollsDb.findOne({ _id: req.params.id });
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }
    res.json(poll);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

app.get('/api/polls/:id/comments', async (req, res) => {
  try {
    const comments = await commentsDb
      .find({ pollId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

app.post('/api/polls', async (req, res) => {
  try {
    const { title, options: optionTexts, duration = 10 } = req.body;

    if (!title || !Array.isArray(optionTexts) || optionTexts.length === 0) {
      res.status(400).json({ error: 'Title and options are required' });
      return;
    }

    const poll: Poll = {
      _id: uuidv4(),
      title,
      options: optionTexts.slice(0, 4).map((text: string, index: number) => ({
        id: uuidv4(),
        text,
        color: OPTION_COLORS[index % OPTION_COLORS.length],
        votes: 0,
      })),
      duration,
      status: 'pending',
      createdAt: Date.now(),
    };

    await pollsDb.insert(poll);
    res.status(201).json(poll);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

app.post('/api/polls/:id/start', async (req, res) => {
  try {
    const poll = await pollsDb.findOne({ _id: req.params.id });
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    if (currentPollId && closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    currentPollId = poll._id!;
    remainingTime = poll.duration;

    const updatedPoll: Poll = {
      ...poll,
      status: 'active',
      startedAt: Date.now(),
    };
    await pollsDb.update({ _id: poll._id }, { $set: { status: 'active', startedAt: Date.now() } });

    io.emit('poll:update', updatedPoll);
    io.emit('countdown:start', poll.duration);

    countdownTimer = setInterval(() => {
      remainingTime -= 1;
      io.emit('countdown:tick', remainingTime);
      if (remainingTime <= 0 && countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    }, 1000);

    closeTimer = setTimeout(async () => {
      if (currentPollId) {
        await pollsDb.update(
          { _id: currentPollId },
          { $set: { status: 'closed', closedAt: Date.now() } }
        );
        const closedPoll = await pollsDb.findOne({ _id: currentPollId });
        io.emit('poll:update', closedPoll);
        io.emit('poll:closed', closedPoll);
      }
    }, poll.duration * 1000);

    res.json(updatedPoll);
  } catch (err) {
    res.status(500).json({ error: 'Failed to start poll' });
  }
});

app.post('/api/polls/:id/close', async (req, res) => {
  try {
    const poll = await pollsDb.findOne({ _id: req.params.id });
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const updatedPoll: Poll = {
      ...poll,
      status: 'closed',
      closedAt: Date.now(),
    };
    await pollsDb.update({ _id: poll._id }, { $set: { status: 'closed', closedAt: Date.now() } });

    if (currentPollId === poll._id) {
      currentPollId = null;
    }

    io.emit('poll:update', updatedPoll);
    io.emit('poll:closed', updatedPoll);

    res.json(updatedPoll);
  } catch (err) {
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

app.post('/api/votes', async (req, res) => {
  try {
    const { pollId, optionId }: VoteData = req.body;

    if (!pollId || !optionId) {
      res.status(400).json({ error: 'Poll ID and option ID are required' });
      return;
    }

    const poll = await pollsDb.findOne({ _id: pollId });
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    if (poll.status !== 'active') {
      res.status(400).json({ error: 'Poll is not active' });
      return;
    }

    const optionIndex = poll.options.findIndex((opt) => opt.id === optionId);
    if (optionIndex === -1) {
      res.status(404).json({ error: 'Option not found' });
      return;
    }

    poll.options[optionIndex].votes += 1;
    await pollsDb.update(
      { _id: pollId, 'options.id': optionId },
      { $inc: { 'options.$.votes': 1 } }
    );

    const updatedPoll = await pollsDb.findOne({ _id: pollId });
    io.emit('poll:update', updatedPoll);

    res.json({ success: true, option: updatedPoll?.options[optionIndex] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { pollId, text }: CommentData = req.body;

    if (!pollId || !text || text.trim().length === 0) {
      res.status(400).json({ error: 'Poll ID and comment text are required' });
      return;
    }

    if (text.length > 40) {
      res.status(400).json({ error: 'Comment too long (max 40 characters)' });
      return;
    }

    const comment: Comment = {
      _id: uuidv4(),
      pollId,
      text: text.trim(),
      createdAt: Date.now(),
    };

    await commentsDb.insert(comment);
    io.emit('comment:new', comment);

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit comment' });
  }
});

io.on('connection', (socket) => {
  socket.emit('hello', { message: 'Connected to StreamVote server' });

  if (currentPollId) {
    pollsDb.findOne({ _id: currentPollId }).then((poll) => {
      if (poll) {
        socket.emit('poll:update', poll);
        if (poll.status === 'active') {
          socket.emit('countdown:start', remainingTime);
        }
      }
    });
    commentsDb
      .find({ pollId: currentPollId })
      .sort({ createdAt: -1 })
      .limit(50)
      .then((comments) => {
        socket.emit('comments:update', comments);
      });
  }

  socket.on('vote:submit', async (data: VoteData) => {
    try {
      const { pollId, optionId } = data;
      const poll = await pollsDb.findOne({ _id: pollId });
      if (poll && poll.status === 'active') {
        const optionIndex = poll.options.findIndex((opt) => opt.id === optionId);
        if (optionIndex !== -1) {
          await pollsDb.update(
            { _id: pollId, 'options.id': optionId },
            { $inc: { 'options.$.votes': 1 } }
          );
          const updatedPoll = await pollsDb.findOne({ _id: pollId });
          io.emit('poll:update', updatedPoll);
        }
      }
    } catch (_err) {
      // ignore
    }
  });

  socket.on('comment:submit', async (data: CommentData) => {
    try {
      const { pollId, text } = data;
      if (pollId && text && text.trim().length > 0 && text.length <= 40) {
        const comment: Comment = {
          _id: uuidv4(),
          pollId,
          text: text.trim(),
          createdAt: Date.now(),
        };
        await commentsDb.insert(comment);
        io.emit('comment:new', comment);
      }
    } catch (_err) {
      // ignore
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`StreamVote server running on http://localhost:${PORT}`);
});
