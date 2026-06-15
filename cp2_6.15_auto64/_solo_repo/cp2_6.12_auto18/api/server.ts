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
const votedUsers = new Map<string, Set<string>>();

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

votedUsers.set(samplePoll1Id, new Set());
votedUsers.set(samplePoll2Id, new Set());

app.set('io', io);
app.set('polls', polls);
app.set('comments', comments);
app.set('favorites', favorites);
app.set('votedUsers', votedUsers);

const pendingVotes = new Map<string, Map<number, number>>();
const voteTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingVoteUsers = new Map<string, Set<string>>();

const flushPendingVotes = (pollId: string) => {
  const poll = polls.get(pollId);
  const accumulatedVotes = pendingVotes.get(pollId);
  if (poll && accumulatedVotes) {
    accumulatedVotes.forEach((count, optionIdx) => {
      poll.votes[optionIdx] += count;
    });
    io.emit('pollUpdated', poll);
  }
  pendingVotes.delete(pollId);
  pendingVoteUsers.delete(pollId);
  const timer = voteTimers.get(pollId);
  if (timer) {
    clearTimeout(timer);
  }
  voteTimers.delete(pollId);
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('vote', (data: { pollId: string; optionIndex: number; userId: string }) => {
    const { pollId, optionIndex, userId } = data;
    const poll = polls.get(pollId);

    if (!poll || poll.closed) {
      return;
    }

    const endTime = poll.createdAt + poll.duration * 86400000;
    if (Date.now() > endTime) {
      return;
    }

    if (!votedUsers.has(pollId)) {
      votedUsers.set(pollId, new Set());
    }

    if (votedUsers.get(pollId)!.has(userId)) {
      return;
    }

    if (!pendingVoteUsers.has(pollId)) {
      pendingVoteUsers.set(pollId, new Set());
    }

    if (pendingVoteUsers.get(pollId)!.has(userId)) {
      return;
    }

    pendingVoteUsers.get(pollId)!.add(userId);
    votedUsers.get(pollId)!.add(userId);

    if (!pendingVotes.has(pollId)) {
      pendingVotes.set(pollId, new Map<number, number>());
    }

    const pollPendingVotes = pendingVotes.get(pollId)!;
    const currentCount = pollPendingVotes.get(optionIndex) || 0;
    pollPendingVotes.set(optionIndex, currentCount + 1);

    if (!voteTimers.has(pollId)) {
      const timer = setTimeout(() => {
        flushPendingVotes(pollId);
      }, 100);
      voteTimers.set(pollId, timer);
    }
  });

  socket.on('comment', (data: { pollId: string; userId: string; nickname: string; content: string }) => {
    const trimmedContent = data.content?.trim();
    if (!trimmedContent || trimmedContent.length > 200) {
      return;
    }

    const newComment = {
      id: v4(),
      pollId: data.pollId,
      userId: data.userId,
      nickname: data.nickname?.trim() || '匿名用户',
      content: trimmedContent,
      createdAt: Date.now(),
    };

    if (!comments.has(data.pollId)) {
      comments.set(data.pollId, []);
    }

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
    const endTime = poll.createdAt + poll.duration * 86400000;
    if (!poll.closed && now > endTime) {
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

export { io, polls, comments, favorites, votedUsers };
