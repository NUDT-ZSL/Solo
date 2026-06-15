import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'gallery.db');

let originalDb: Buffer | null = null;

beforeAll(async () => {
  if (fs.existsSync(DB_PATH)) {
    originalDb = fs.readFileSync(DB_PATH);
  }

  const { default: app } = await import('../server');
  
  await new Promise<void>((resolve) => {
    const check = () => {
      request(app).get('/api/layout').then((res) => {
        if (res.status === 200) resolve();
        else setTimeout(check, 500);
      }).catch(() => setTimeout(check, 500));
    };
    setTimeout(check, 1000);
  });
});

afterAll(() => {
  if (originalDb && fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, originalDb);
  }
});

describe('Layout API', () => {
  it('GET /api/layout should return layout with empty elements', async () => {
    const { default: app } = await import('../server');
    const res = await request(app).get('/api/layout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'default');
    expect(res.body).toHaveProperty('name', 'Main Gallery');
    expect(res.body).toHaveProperty('width', 600);
    expect(res.body).toHaveProperty('height', 400);
    expect(Array.isArray(res.body.elements)).toBe(true);
  });

  it('PUT /api/layout/:id should update layout elements', async () => {
    const { default: app } = await import('../server');
    const elements = [
      { id: 'wall-1', type: 'wall', x: 50, y: 30, width: 100, height: 10 },
      { id: 'stand-1', type: 'stand', x: 200, y: 150, width: 30, height: 30 },
    ];

    const res = await request(app)
      .put('/api/layout/default')
      .send({ elements })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.elements).toHaveLength(2);
    expect(res.body.elements[0].type).toBe('wall');
    expect(res.body.elements[1].type).toBe('stand');
  });

  it('PUT /api/layout/:id with invalid data should return 400', async () => {
    const { default: app } = await import('../server');
    const res = await request(app)
      .put('/api/layout/default')
      .send({ elements: 'not an array' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });
});

describe('Stand Artwork API', () => {
  it('PUT /api/stand/:standId/artwork should update stand artwork assignment', async () => {
    const { default: app } = await import('../server');

    const elements = [
      { id: 'wall-2', type: 'wall', x: 50, y: 30, width: 100, height: 10 },
      { id: 'stand-2', type: 'stand', x: 200, y: 150, width: 30, height: 30 },
    ];

    await request(app)
      .put('/api/layout/default')
      .send({ elements })
      .set('Content-Type', 'application/json');

    const res = await request(app)
      .put('/api/stand/stand-2/artwork')
      .send({
        artworkId: 'art-test-1',
        artworkColor: '#ff5500',
        artworkName: 'Test Painting',
      })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    const stand = res.body.elements.find((e: any) => e.id === 'stand-2');
    expect(stand.artworkId).toBe('art-test-1');
    expect(stand.artworkColor).toBe('#ff5500');
    expect(stand.artworkName).toBe('Test Painting');
  });
});

describe('Artwork API', () => {
  it('GET /api/artwork should return array', async () => {
    const { default: app } = await import('../server');
    const res = await request(app).get('/api/artwork');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Invite API', () => {
  it('POST /api/invite with valid email should succeed', async () => {
    const { default: app } = await import('../server');
    const res = await request(app)
      .post('/api/invite')
      .send({ email: 'test@example.com' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.invitation.email).toBe('test@example.com');
    expect(res.body.invitation.status).toBe('pending');
  });

  it('POST /api/invite with invalid email should return 400', async () => {
    const { default: app } = await import('../server');
    const res = await request(app)
      .post('/api/invite')
      .send({ email: 'not-an-email' })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
  });
});
