import express from 'express';
import cors from 'cors';
import db from './database.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/scores', async (req, res) => {
  try {
    const { nickname, score, difficulty } = req.body;

    if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid nickname' });
    }

    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ success: false, error: 'Invalid score' });
    }

    if (!difficulty || typeof difficulty !== 'string') {
      return res.status(400).json({ success: false, error: 'Invalid difficulty' });
    }

    const result = await db.insertScore(nickname.trim(), score, difficulty);

    if (result) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to save score' });
    }
  } catch (error) {
    console.error('Error in POST /api/scores:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const { difficulty } = req.query;
    const difficultyParam = difficulty ? String(difficulty) : undefined;

    const leaderboard = await db.getTopScores(difficultyParam, 20);
    return res.json(leaderboard);
  } catch (error) {
    console.error('Error in GET /api/leaderboard:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
