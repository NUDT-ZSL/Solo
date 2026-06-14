import express from 'express';
import cors from 'cors';
import skillsRouter from './routes/skills.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/skills', skillsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SkillTrove API' });
});

app.listen(PORT, () => {
  console.log(`[SkillTrove] Backend API is running on http://localhost:${PORT}`);
});
