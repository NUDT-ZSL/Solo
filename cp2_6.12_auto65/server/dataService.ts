import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  initDatabase,
  getAllScenes,
  insertScore,
  getRadarData,
  type ScoreRecord
} from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initDatabase();
console.log('[SERVER] SQLite database initialized');

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/scenes', (_req, res) => {
  try {
    const scenes = getAllScenes();
    res.json({
      success: true,
      data: scenes,
      count: scenes.length
    });
  } catch (error) {
    console.error('[GET /api/scenes] error:', error);
    res.status(500).json({ success: false, error: 'Failed to load scenes' });
  }
});

app.post('/api/scores', (req, res) => {
  try {
    const body = req.body as Partial<ScoreRecord> & { userId?: string; sceneId?: string };

    if (!body.userId || !body.sceneId) {
      res.status(400).json({ success: false, error: 'userId and sceneId are required' });
      return;
    }

    const record: Omit<ScoreRecord, 'id'> & { id?: string } = {
      id: body.id || uuidv4(),
      userId: body.userId,
      sceneId: body.sceneId,
      selectedOptionId: body.selectedOptionId || '',
      correctOptionId: body.correctOptionId || '',
      semanticScore: typeof body.semanticScore === 'number' ? body.semanticScore : 0,
      speedScore: typeof body.speedScore === 'number' ? body.speedScore : 0,
      totalScore: typeof body.totalScore === 'number' ? body.totalScore : 0,
      responseTime: typeof body.responseTime === 'number' ? body.responseTime : 0,
      isCorrect: body.isCorrect ? 1 : 0,
      timestamp: body.timestamp || Date.now()
    };

    const ok = insertScore(record);
    if (ok) {
      res.json({ success: true, id: record.id });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save score' });
    }
  } catch (error) {
    console.error('[POST /api/scores] error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/radar/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }
    const result = getRadarData(userId);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[GET /api/radar/:userId] error:', error);
    res.status(500).json({ success: false, error: 'Failed to load radar data' });
  }
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] Improv Line Trainer backend running on http://localhost:${PORT}`);
  console.log(`[SERVER] Endpoints: GET /api/scenes, POST /api/scores, GET /api/radar/:userId`);
});

export default app;
