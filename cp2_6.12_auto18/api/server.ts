import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 } from 'uuid';
import app from './app.js';

const PORT = process.env.PORT || 3001;

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const polls = new Map<string, any>();
const comments = new Map<string, any[]>();
const favorites = new Map<string, Set<string>>();

const samplePoll1Id = v4();
const samplePoll2Id = v4();

polls.set(samplePoll1Id, {
  id: samplePoll1Id,
  title: 'Best Programming Language for Beginners',
  description: 'Which programming language should someone start with?',
  options: ['Python', 'JavaScript', 'Go', 'Rust'],
  votes: [42, 35, 12, 8],
  createdBy: 'system',
  createdAt: Date.now() - 86400000,
  duration: 7,
  closed: false,
});

polls.set(samplePoll2Id, {
  id: samplePoll2Id,
  title: 'Remote vs Office Work',
  description: 'What is your preferred work arrangement?',
  options: ['Fully Remote', 'Hybrid', 'Fully In-Office'],
  votes: [56, 30, 10],
  createdBy: 'system',
  createdAt: Date.now() - 43200000,
  duration: 14,
  closed: false,
});

app.set('io', io);
app.set('polls', polls);
app.set('comments', comments);
app.set('favorites', favorites);

const pendingVotes = new Map<string, Map<number, number>>();
const voteTimers = new Map<string, ReturnType<typeof setTimeout>>();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('vote', (data: { pollId: string; optionIndex: number; userId: string }) => {
    const poll = polls.get(data.pollId);
    if (!poll || poll.closed) return;

    if (!pendingVotes.has(data.pollId)) {
      pendingVotes.set(data.pollId, new Map());
    }
    const pollPendingVotes = pendingVotes.get(data.pollId)!;
    pollPendingVotes.set(data.optionIndex, (pollPendingVotes.get(data.optionIndex) || 0) + 1);

    if (!voteTimers.has(data.pollId)) {
      const timer = setTimeout(() => {
        const currentPoll = polls.get(data.pollId);
        const accumulatedVotes = pendingVotes.get(data.pollId);
        if (currentPoll && accumulatedVotes) {
          accumulatedVotes.forEach((count, optionIdx) => {
            currentPoll.votes[optionIdx] += count;
          });
          io.emit('pollUpdated', currentPoll);
        }
        pendingVotes.delete(data.pollId);
        voteTimers.delete(data.pollId);
      }, 100);
      voteTimers.set(data.pollId, timer);
    }
  });

  socket.on('comment', (data: { pollId: string; userId: string; nickname: string; content: string }) => {
    const newComment = {
      id: v4(),
      pollId: data.pollId,
      userId: data.userId,
      nickname: data.nickname,
      content: data.content,
      createdAt: Date.now(),
    };
    if (!comments.has(data.pollId)) comments.set(data.pollId, []);
    comments.get(data.pollId)!.push(newComment);
    io.emit('newComment', newComment);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

function checkExpiredPolls() {
  const now = Date.now();
  for (const [pollId, poll] of polls.entries()) {
    if (!poll.closed && now > poll.createdAt + poll.duration * 86400000) {
      poll.closed = true;
      io.emit('pollClosed', { pollId: poll.id });
      io.emit('pollUpdated', poll);
    }
  }
}

checkExpiredPolls();
setInterval(checkExpiredPolls, 60000);

httpServer.listen(PORT, () => {
  console.log(`Server + Socket.io running on port ${PORT}`);
});
