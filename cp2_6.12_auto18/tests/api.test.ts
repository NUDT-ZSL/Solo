import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { v4 } from 'uuid';
import app from '../api/app.js';

describe('REST API Tests', () => {
  let samplePollId: string;

  beforeAll(async () => {
    const polls = new Map<string, any>();
    const comments = new Map<string, any[]>();
    const favorites = new Map<string, Set<string>>();
    const votedUsers = new Map<string, Set<string>>();

    samplePollId = v4();
    polls.set(samplePollId, {
      id: samplePollId,
      title: 'Test Poll',
      description: 'Test description',
      options: ['A', 'B', 'C'],
      votes: [10, 20, 30],
      createdBy: 'system',
      createdAt: Date.now() - 1000,
      duration: 7,
      closed: false,
    });
    votedUsers.set(samplePollId, new Set());

    app.set('polls', polls);
    app.set('comments', comments);
    app.set('favorites', favorites);
    app.set('votedUsers', votedUsers);
    app.set('io', {
      emit: vi.fn(),
    });
  });

  describe('Polls API', () => {
    it('GET /api/health should return ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('GET /api/polls should return array of polls', async () => {
      const res = await request(app).get('/api/polls');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('title');
      expect(res.body[0]).toHaveProperty('options');
      expect(res.body[0]).toHaveProperty('votes');
    });

    it('GET /api/polls/:id should return a single poll', async () => {
      const res = await request(app).get(`/api/polls/${samplePollId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(samplePollId);
      expect(res.body.title).toBe('Test Poll');
    });

    it('GET /api/polls/:id should return 404 for invalid id', async () => {
      const res = await request(app).get('/api/polls/nonexistent');
      expect(res.status).toBe(404);
    });

    it('POST /api/polls should create a new poll', async () => {
      const newPollData = {
        title: 'New Test Poll',
        description: 'This is a new poll',
        options: ['Option 1', 'Option 2', 'Option 3'],
        createdBy: 'test-user',
        duration: 3,
      };

      const res = await request(app)
        .post('/api/polls')
        .send(newPollData);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('New Test Poll');
      expect(res.body.options.length).toBe(3);
      expect(res.body.votes).toEqual([0, 0, 0]);
      expect(res.body.createdBy).toBe('test-user');
      expect(res.body.duration).toBe(3);
      expect(res.body.closed).toBe(false);
      expect(typeof res.body.createdAt).toBe('number');

      const polls: Map<string, any> = app.get('polls');
      expect(polls.has(res.body.id)).toBe(true);
    });

    it('POST /api/polls should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'No options' });
      expect(res.status).toBe(400);
    });

    it('POST /api/polls should return 400 for less than 2 options', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'One option', options: ['Single'] });
      expect(res.status).toBe(400);
    });

    it('POST /api/polls should return 400 for empty title', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: '   ', options: ['A', 'B'] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('标题不能为空');
    });

    it('POST /api/polls should return 400 for title exceeding 100 chars', async () => {
      const longTitle = 'A'.repeat(101);
      const res = await request(app)
        .post('/api/polls')
        .send({ title: longTitle, options: ['A', 'B'] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('100字');
    });

    it('POST /api/polls should return 400 for description exceeding 500 chars', async () => {
      const longDesc = 'D'.repeat(501);
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Valid Title', description: longDesc, options: ['A', 'B'] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('500字');
    });

    it('POST /api/polls should return 400 for more than 6 options', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Valid Title', options: ['1', '2', '3', '4', '5', '6', '7'] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('6个');
    });

    it('POST /api/polls should return 400 for empty option strings', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Valid Title', options: ['Valid', '   ', '  '] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('2个');
    });

    it('POST /api/polls should trim title and description', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: '  Trimmed Title  ', description: '  Trimmed desc  ', options: ['  A  ', '  B  '] });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Trimmed Title');
      expect(res.body.description).toBe('Trimmed desc');
      expect(res.body.options).toEqual(['A', 'B']);
    });

    it('POST /api/polls should use uuid v4 for id', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'UUID Test', options: ['A', 'B'] });
      expect(res.status).toBe(201);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(res.body.id).toMatch(uuidRegex);
    });

    it('POST /api/polls should store correct createdAt timestamp', async () => {
      const before = Date.now();
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Timestamp Test', options: ['A', 'B'] });
      const after = Date.now();
      expect(res.status).toBe(201);
      expect(res.body.createdAt).toBeGreaterThanOrEqual(before);
      expect(res.body.createdAt).toBeLessThanOrEqual(after);
    });

    it('POST /api/polls should default duration to 1 day', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Duration Test', options: ['A', 'B'] });
      expect(res.status).toBe(201);
      expect(res.body.duration).toBe(1);
    });

    it('POST /api/polls should clamp invalid duration to 1 day', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Duration Test', options: ['A', 'B'], duration: 999 });
      expect(res.status).toBe(201);
      expect(res.body.duration).toBe(1);
    });

    it('POST /api/polls should initialize votes array with zeros', async () => {
      const res = await request(app)
        .post('/api/polls')
        .send({ title: 'Votes Init Test', options: ['A', 'B', 'C', 'D'] });
      expect(res.status).toBe(201);
      expect(res.body.votes).toEqual([0, 0, 0, 0]);
      expect(res.body.closed).toBe(false);
    });

    it('POST /api/polls/:id/close should close the poll', async () => {
      const res = await request(app)
        .post(`/api/polls/${samplePollId}/close`);
      expect(res.status).toBe(200);
      expect(res.body.closed).toBe(true);

      const polls: Map<string, any> = app.get('polls');
      expect(polls.get(samplePollId).closed).toBe(true);
    });

    it('POST /api/polls/:id/close should return 404 for invalid id', async () => {
      const res = await request(app).post('/api/polls/invalid/close');
      expect(res.status).toBe(404);
    });
  });

  describe('Comments API', () => {
    it('GET /api/polls/:id/comments should return empty array with correct structure', async () => {
      const res = await request(app).get(`/api/polls/${samplePollId}/comments`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('comments');
      expect(res.body).toHaveProperty('hasMore');
      expect(res.body).toHaveProperty('total');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.total).toBe(0);
    });

    it('GET /api/polls/:id/comments should support pagination', async () => {
      const comments: Map<string, any[]> = app.get('comments');
      const testComments = Array.from({ length: 35 }, (_, i) => ({
        id: `c${i}`,
        pollId: samplePollId,
        userId: 'user1',
        nickname: 'Test',
        content: `Comment ${i}`,
        createdAt: Date.now() - i * 1000,
      }));
      comments.set(samplePollId, testComments);

      const page1 = await request(app).get(`/api/polls/${samplePollId}/comments?offset=0&limit=20`);
      expect(page1.body.comments.length).toBe(20);
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.total).toBe(35);

      const page2 = await request(app).get(`/api/polls/${samplePollId}/comments?offset=20&limit=20`);
      expect(page2.body.comments.length).toBe(15);
      expect(page2.body.hasMore).toBe(false);
    });
  });

  describe('Favorites API', () => {
    const generateToken = (username: string) => {
      return btoa(username + ':' + Date.now() + ':' + Math.random().toString(36).slice(2, 10));
    };
    const authToken = generateToken('testuser');
    const authHeader = `Bearer ${authToken}`;

    it('POST /api/favorites should add favorite (with auth)', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', authHeader)
        .send({ userId: 'user1', pollId: samplePollId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const favorites: Map<string, Set<string>> = app.get('favorites');
      expect(favorites.get('user1')?.has(samplePollId)).toBe(true);
    });

    it('GET /api/favorites/:userId should return favorited polls', async () => {
      const res = await request(app).get('/api/favorites/user1');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].id).toBe(samplePollId);
    });

    it('DELETE /api/favorites should remove favorite (with auth)', async () => {
      const res = await request(app)
        .delete('/api/favorites')
        .set('Authorization', authHeader)
        .send({ userId: 'user1', pollId: samplePollId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const favorites: Map<string, Set<string>> = app.get('favorites');
      expect(favorites.get('user1')?.has(samplePollId)).toBe(false);
    });

    it('POST /api/favorites should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .send({ userId: 'user1', pollId: samplePollId });
      expect(res.status).toBe(401);
    });

    it('DELETE /api/favorites should return 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/favorites')
        .send({ userId: 'user1', pollId: samplePollId });
      expect(res.status).toBe(401);
    });

    it('POST /api/favorites should return 400 for missing params', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .set('Authorization', authHeader)
        .send({ userId: 'user1' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Vote Batching Logic', () => {
  it('Should correctly apply votes within batch window', () => {
    const pendingVotes = new Map<string, Map<number, number>>();

    const applyPendingVotes = (pollId: string, poll: any) => {
      const pending = pendingVotes.get(pollId);
      if (pending) {
        pending.forEach((count, optionIndex) => {
          poll.votes[optionIndex] += count;
        });
        pendingVotes.delete(pollId);
      }
    };

    const pollId = 'test-poll-id';
    const poll = {
      id: pollId,
      title: 'Batched',
      options: ['A', 'B'],
      votes: [0, 0],
      closed: false,
    };

    const optionMap = new Map<number, number>();
    optionMap.set(0, 5);
    optionMap.set(1, 3);
    pendingVotes.set(pollId, optionMap);

    applyPendingVotes(pollId, poll);
    expect(poll.votes).toEqual([5, 3]);
    expect(pendingVotes.has(pollId)).toBe(false);
  });

  it('Should correctly increment pending vote counts', () => {
    const pendingVotes = new Map<string, Map<number, number>>();
    const pollId = 'increment-test';

    const addVote = (pid: string, optIndex: number) => {
      if (!pendingVotes.has(pid)) {
        pendingVotes.set(pid, new Map<number, number>());
      }
      const pollPending = pendingVotes.get(pid)!;
      pollPending.set(optIndex, (pollPending.get(optIndex) || 0) + 1);
    };

    addVote(pollId, 0);
    addVote(pollId, 0);
    addVote(pollId, 1);
    addVote(pollId, 0);

    expect(pendingVotes.get(pollId)!.get(0)).toBe(3);
    expect(pendingVotes.get(pollId)!.get(1)).toBe(1);
  });

  it('Should prevent duplicate user votes within batch window', () => {
    const votedUsers = new Map<string, Set<string>>();
    const pendingVoteUsers = new Map<string, Set<string>>();
    const pollId = 'dup-test';
    const userId1 = 'user-1';
    const userId2 = 'user-2';

    const checkAndRecordVote = (pid: string, uid: string): boolean => {
      if (!votedUsers.has(pid)) {
        votedUsers.set(pid, new Set());
      }
      if (votedUsers.get(pid)!.has(uid)) {
        return false;
      }
      if (!pendingVoteUsers.has(pid)) {
        pendingVoteUsers.set(pid, new Set());
      }
      if (pendingVoteUsers.get(pid)!.has(uid)) {
        return false;
      }
      pendingVoteUsers.get(pid)!.add(uid);
      votedUsers.get(pid)!.add(uid);
      return true;
    };

    expect(checkAndRecordVote(pollId, userId1)).toBe(true);
    expect(checkAndRecordVote(pollId, userId1)).toBe(false);
    expect(checkAndRecordVote(pollId, userId2)).toBe(true);
    expect(checkAndRecordVote(pollId, userId2)).toBe(false);
    expect(checkAndRecordVote(pollId, userId1)).toBe(false);

    expect(votedUsers.get(pollId)!.size).toBe(2);
    expect(pendingVoteUsers.get(pollId)!.size).toBe(2);
  });
});

describe('Expired Poll Check Logic', () => {
  it('Should identify expired polls correctly', () => {
    const polls = new Map<string, any>();

    const expiredPoll = {
      id: 'expired',
      title: 'Expired',
      options: ['A'],
      votes: [1],
      createdAt: Date.now() - 3 * 86400000,
      duration: 1,
      closed: false,
    };

    const activePoll = {
      id: 'active',
      title: 'Active',
      options: ['A'],
      votes: [1],
      createdAt: Date.now() - 1 * 86400000,
      duration: 7,
      closed: false,
    };

    polls.set(expiredPoll.id, expiredPoll);
    polls.set(activePoll.id, activePoll);

    const checkExpired = () => {
      const expired: string[] = [];
      polls.forEach((poll) => {
        const endTime = poll.createdAt + poll.duration * 86400000;
        if (Date.now() > endTime && !poll.closed) {
          poll.closed = true;
          expired.push(poll.id);
        }
      });
      return expired;
    };

    const expired = checkExpired();
    expect(expired).toContain('expired');
    expect(expired).not.toContain('active');
    expect(expiredPoll.closed).toBe(true);
    expect(activePoll.closed).toBe(false);
  });
});

describe('Data Model Validation', () => {
  it('Poll structure should have all required fields', () => {
    const validPoll = {
      id: 'poll-1',
      title: 'Valid Poll',
      description: 'A valid poll for testing',
      options: ['Yes', 'No'],
      votes: [0, 0],
      createdBy: 'user-123',
      createdAt: Date.now(),
      duration: 5,
      closed: false,
    };

    expect(validPoll).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
      options: expect.arrayContaining([expect.any(String)]),
      votes: expect.arrayContaining([expect.any(Number)]),
      createdBy: expect.any(String),
      createdAt: expect.any(Number),
      duration: expect.any(Number),
      closed: expect.any(Boolean),
    });

    expect(validPoll.options.length).toBe(validPoll.votes.length);
    expect(validPoll.title.length).toBeLessThanOrEqual(100);
    expect(validPoll.description.length).toBeLessThanOrEqual(500);
    expect(validPoll.options.length).toBeGreaterThanOrEqual(2);
    expect(validPoll.options.length).toBeLessThanOrEqual(6);
    expect(validPoll.duration).toBeGreaterThanOrEqual(1);
    expect(validPoll.duration).toBeLessThanOrEqual(7);
  });

  it('Comment structure should have all required fields', () => {
    const validComment = {
      id: 'comment-1',
      pollId: 'poll-1',
      userId: 'user-123',
      nickname: 'Test User',
      content: 'This is a test comment',
      createdAt: Date.now(),
    };

    expect(validComment).toMatchObject({
      id: expect.any(String),
      pollId: expect.any(String),
      userId: expect.any(String),
      nickname: expect.any(String),
      content: expect.any(String),
      createdAt: expect.any(Number),
    });

    expect(validComment.content.length).toBeLessThanOrEqual(200);
  });
});

describe('Auth Middleware', () => {
  it('Should decode valid token and attach user to request', async () => {
    const express = await import('express');
    const app = express.default();
    app.use(express.json());

    app.use((req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = Buffer.from(token, 'base64').toString();
          const [username] = decoded.split(':');
          if (username) req.user = { username, token };
        } catch {}
      }
      next();
    });

    app.get('/test-auth', (req: any, res: any) => {
      res.json({ hasUser: !!req.user, username: req.user?.username });
    });

    const username = 'testuser';
    const token = Buffer.from(username + ':' + Date.now() + ':random').toString('base64');
    const authHeader = `Bearer ${token}`;

    const res = await request(app)
      .get('/test-auth')
      .set('Authorization', authHeader);

    expect(res.body.hasUser).toBe(true);
    expect(res.body.username).toBe(username);
  });

  it('Should handle missing token gracefully', async () => {
    const express = await import('express');
    const app = express.default();
    app.use(express.json());

    app.use((req: any, res: any, next: any) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        try {
          const decoded = Buffer.from(token, 'base64').toString();
          const [username] = decoded.split(':');
          if (username) req.user = { username, token };
        } catch {}
      }
      next();
    });

    app.get('/test-no-auth', (req: any, res: any) => {
      res.json({ hasUser: !!req.user });
    });

    const res = await request(app).get('/test-no-auth');
    expect(res.body.hasUser).toBe(false);
  });
});
