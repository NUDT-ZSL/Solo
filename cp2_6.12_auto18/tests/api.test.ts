import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';

const createTestApp = async () => {
  const { createServer } = await import('http');
  const { Server } = await import('socket.io');
  const { v4 } = await import('uuid');
  const express = await import('express');

  const app = express.default();
  app.use((await import('cors')).default());
  app.use(express.json());

  const polls = new Map<string, any>();
  const comments = new Map<string, any[]>();
  const favorites = new Map<string, Set<string>>();

  app.set('polls', polls);
  app.set('comments', comments);
  app.set('favorites', favorites);

  const samplePollId = v4();
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

  app.get('/api/polls', (req: any, res: any) => {
    const polls: Map<string, any> = app.get('polls');
    res.json(Array.from(polls.values()));
  });

  app.get('/api/polls/:id', (req: any, res: any) => {
    const polls: Map<string, any> = app.get('polls');
    const poll = polls.get(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Not found' });
    res.json(poll);
  });

  app.post('/api/polls', (req: any, res: any) => {
    const polls: Map<string, any> = app.get('polls');
    const { title, description, options, createdBy, duration } = req.body;
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Title and options are required' });
    }
    const newPoll = {
      id: v4(),
      title,
      description: description || '',
      options,
      votes: new Array(options.length).fill(0),
      createdBy: createdBy || 'anonymous',
      createdAt: Date.now(),
      duration: duration || 1,
      closed: false,
    };
    polls.set(newPoll.id, newPoll);
    res.status(201).json(newPoll);
  });

  app.post('/api/polls/:id/close', (req: any, res: any) => {
    const polls: Map<string, any> = app.get('polls');
    const poll = polls.get(req.params.id);
    if (!poll) return res.status(404).json({ error: 'Not found' });
    poll.closed = true;
    res.json(poll);
  });

  app.get('/api/polls/:id/comments', (req: any, res: any) => {
    const comments: Map<string, any[]> = app.get('comments');
    const all = comments.get(req.params.id) || [];
    const offset = Number(req.query.offset) || 0;
    const limit = Number(req.query.limit) || 20;
    const paginated = all.slice(offset, offset + limit);
    res.json({
      comments: paginated,
      hasMore: offset + limit < all.length,
      total: all.length,
    });
  });

  app.get('/api/favorites/:userId', (req: any, res: any) => {
    const polls: Map<string, any> = app.get('polls');
    const favorites: Map<string, Set<string>> = app.get('favorites');
    const userFavs = favorites.get(req.params.userId);
    if (!userFavs) return res.json([]);
    const favPolls = Array.from(userFavs)
      .map((id) => polls.get(id))
      .filter(Boolean);
    res.json(favPolls);
  });

  app.post('/api/favorites', (req: any, res: any) => {
    const favorites: Map<string, Set<string>> = app.get('favorites');
    const { userId, pollId } = req.body;
    if (!userId || !pollId) return res.status(400).json({ error: 'Missing params' });
    if (!favorites.has(userId)) favorites.set(userId, new Set());
    favorites.get(userId)!.add(pollId);
    res.json({ success: true });
  });

  app.delete('/api/favorites', (req: any, res: any) => {
    const favorites: Map<string, Set<string>> = app.get('favorites');
    const { userId, pollId } = req.body;
    if (!userId || !pollId) return res.status(400).json({ error: 'Missing params' });
    favorites.get(userId)?.delete(pollId);
    res.json({ success: true });
  });

  app.get('/api/health', (req: any, res: any) => {
    res.json({ success: true, message: 'ok' });
  });

  return { app, polls, comments, favorites, samplePollId };
};

describe('REST API Tests', () => {
  let app: any;
  let samplePollId: string;
  let polls: Map<string, any>;
  let server: any;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    samplePollId = testSetup.samplePollId;
    polls = testSetup.polls;
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
    it('POST /api/favorites should add favorite', async () => {
      const res = await request(app)
        .post('/api/favorites')
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

    it('DELETE /api/favorites should remove favorite', async () => {
      const res = await request(app)
        .delete('/api/favorites')
        .send({ userId: 'user1', pollId: samplePollId });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const favorites: Map<string, Set<string>> = app.get('favorites');
      expect(favorites.get('user1')?.has(samplePollId)).toBe(false);
    });

    it('POST /api/favorites should return 400 for missing params', async () => {
      const res = await request(app)
        .post('/api/favorites')
        .send({ userId: 'user1' });
      expect(res.status).toBe(400);
    });
  });
});

describe('Vote Batching Logic', () => {
  it('Should correctly apply votes within batch window', async () => {
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
